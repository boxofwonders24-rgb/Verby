'use strict';

// ---------------------------------------------------------------------------
// Intelligence Engine — Core Pipeline
//
// Unified generation pipeline: signals → context → LLM → post-learning.
// Wires together memory.cjs, signals.cjs, and context-assembler.cjs.
//
// The engine runs alongside the existing generateSmart() pipeline and is
// activated by a feature flag.  The callLLM function is injected at init
// time because the actual LLM call logic lives in ipc-handlers.cjs.
// ---------------------------------------------------------------------------

const { scanSignals, mergeHints, extractPotentialEntities } = require('./signals.cjs');
const { memory } = require('./memory.cjs');
const { assembleSystemPrompt, assembleFallbackPrompt } = require('./context-assembler.cjs');

// -- Module-scoped injected dependencies ------------------------------------
let _callLLM = null;
let _getActiveContext = null;
let _getRecentPrompts = null;
let _getSetting = null;
let _getForegroundApp = null;

// ---------------------------------------------------------------------------
// initEngine(deps)
//
// Accepts injected dependencies and stores them in module-scoped variables.
// Must be called before generate().
// ---------------------------------------------------------------------------

function initEngine({ callLLMFn, getActiveContext, getRecentPrompts, getSetting, getForegroundApp }) {
  if (typeof callLLMFn !== 'function') {
    throw new Error('initEngine: callLLMFn is required and must be a function');
  }
  _callLLM = callLLMFn;
  _getActiveContext = getActiveContext || (() => null);
  _getRecentPrompts = getRecentPrompts || (() => []);
  _getSetting = getSetting || (() => null);
  _getForegroundApp = getForegroundApp || (() => null);
}

// ---------------------------------------------------------------------------
// buildLearnedSignals()
//
// Reads output_preferences from memory, filters to patterns with 3+
// successes, and maps them into the signal format expected by scanSignals.
// ---------------------------------------------------------------------------

function buildLearnedSignals() {
  try {
    const prefs = memory.getTopPreferences(20);
    return prefs
      .filter((p) => p.success_count >= 3)
      .map((p) => ({
        group: `learned_${p.context_pattern}`,
        keywords: [p.context_pattern],
        hint: {
          format: p.preferred_format || 'prompt',
          tone: p.preferred_tone || 'professional',
          detail: p.preferred_detail || 'medium',
        },
        confidence: Math.min(0.9, 0.5 + p.success_count * 0.05),
      }));
  } catch (err) {
    console.warn('intelligence-engine: buildLearnedSignals failed:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// generate(input, provider)
//
// Main pipeline:
//   1. Load custom + learned signals
//   2. Run signal scanner → matches
//   3. Merge hints
//   4. Extract potential entities from input
//   5. Gather context (active project, recent prompts, foreground app, email sign-off)
//   6. Branch on hint confidence:
//      - >= 0.5 → targeted context (specific entities + relationships)
//      - <  0.5 → broad context (top entities + all relationships)
//   7. Assemble system prompt
//   8. Call LLM
//   9. Post-generation learning (non-blocking)
//  10. Return { output, hint, entities, format, debugInfo }
// ---------------------------------------------------------------------------

async function generate(input, provider) {
  if (!_callLLM) {
    throw new Error('Intelligence engine not initialized. Call initEngine() first.');
  }
  if (!input || typeof input !== 'string') {
    throw new Error('generate: input is required and must be a non-empty string');
  }

  // 1. Load custom signals (from user settings) and learned signals (from memory)
  const customSignals = _getSetting('customSignals') || [];
  const learnedSignals = buildLearnedSignals();

  // 2. Run signal scanner
  const matches = scanSignals(input, customSignals, learnedSignals);

  // 3. Merge hints
  const hint = mergeHints(matches);

  // 4. Extract potential entities from input
  const potentialEntities = extractPotentialEntities(input);

  // 5. Gather context
  const activeProject = _getActiveContext();
  const recentPrompts = _getRecentPrompts();
  const foregroundApp = _getForegroundApp();
  const emailSignOffName = _getSetting('emailSignOffName') || null;

  // 6. Branch: targeted vs. broad context
  let entities = [];
  let relationships = [];

  if (hint.confidence >= 0.5) {
    // Targeted path — pull specific entities mentioned in input + their relationships
    for (const name of potentialEntities) {
      const entity = memory.getEntity(name);
      if (entity) {
        entities.push(entity);
        const rels = memory.getRelationshipsFor(entity.id);
        for (const r of rels) {
          relationships.push(r);
        }
      }
    }
  } else {
    // Broad path — pull top entities and all their relationships
    entities = memory.getTopEntities(10);
    for (const entity of entities) {
      const rels = memory.getRelationshipsFor(entity.id);
      for (const r of rels) {
        relationships.push(r);
      }
    }
  }

  // De-duplicate relationships by id
  const seenRelIds = new Set();
  relationships = relationships.filter((r) => {
    if (seenRelIds.has(r.id)) return false;
    seenRelIds.add(r.id);
    return true;
  });

  // Look up stored preference for the top signal group
  const preferenceKey = hint.signals.length > 0 ? hint.signals[0] : null;
  const preference = preferenceKey ? memory.getPreference(preferenceKey) : null;

  // 7. Assemble system prompt
  const contextPayload = {
    hint,
    entities,
    relationships,
    preference,
    activeProject,
    foregroundApp,
    recentPrompts,
    emailSignOffName,
  };

  const systemPrompt =
    hint.confidence >= 0.5
      ? assembleSystemPrompt(contextPayload)
      : assembleFallbackPrompt(contextPayload);

  // 8. Call LLM
  const output = await _callLLM(input, systemPrompt, provider);

  // 9. Post-generation learning (non-blocking — fire and forget)
  try {
    postGenerationLearn(input, output, hint, potentialEntities);
  } catch (err) {
    console.warn('intelligence-engine: postGenerationLearn failed:', err.message);
  }

  // 10. Return result
  return {
    output,
    hint,
    entities: potentialEntities,
    format: hint.format || 'prompt',
    debugInfo: {
      signalMatches: matches.length,
      signals: hint.signals,
      confidence: hint.confidence,
      contextPath: hint.confidence >= 0.5 ? 'targeted' : 'broad',
      entityCount: entities.length,
      relationshipCount: relationships.length,
      learnedSignalCount: learnedSignals.length,
      preferenceKey,
    },
  };
}

// ---------------------------------------------------------------------------
// postGenerationLearn(input, output, hint, potentialEntities)
//
// Post-generation learning:
//   - Upserts entities extracted from input
//   - Creates co-occurrence relationships between entities
//   - Records output preferences for the top signal group
// ---------------------------------------------------------------------------

function postGenerationLearn(input, output, hint, potentialEntities) {
  // 1. Upsert entities — mark them as 'mentioned' type until we know better
  const upsertedEntities = [];
  for (const name of potentialEntities) {
    try {
      const entity = memory.upsertEntity(name, 'mentioned', { lastInput: input.slice(0, 200) });
      upsertedEntities.push(entity);
    } catch (err) {
      console.warn(`intelligence-engine: upsertEntity("${name}") failed:`, err.message);
    }
  }

  // 2. Create co-occurrence relationships between all pairs of entities
  for (let i = 0; i < upsertedEntities.length; i++) {
    for (let j = i + 1; j < upsertedEntities.length; j++) {
      try {
        memory.upsertRelationship(
          upsertedEntities[i].id,
          'co-occurs-with',
          upsertedEntities[j].id
        );
      } catch (err) {
        console.warn('intelligence-engine: upsertRelationship failed:', err.message);
      }
    }
  }

  // 3. Record output preferences for the top signal group
  if (hint.signals.length > 0) {
    try {
      memory.recordPreference(
        hint.signals[0],
        hint.format || 'prompt',
        hint.tone || 'professional',
        hint.detail || 'medium'
      );
    } catch (err) {
      console.warn('intelligence-engine: recordPreference failed:', err.message);
    }
  }
}

// ---------------------------------------------------------------------------
// recordCopy(hint)
//
// Called when the user copies the generated output.
// Records a success for the matched pattern.
// ---------------------------------------------------------------------------

function recordCopy(hint) {
  if (!hint || !hint.signals || hint.signals.length === 0) return;
  try {
    memory.recordSuccess(hint.signals[0]);
  } catch (err) {
    console.warn('intelligence-engine: recordCopy failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// recordRegenerate(hint)
//
// Called when the user regenerates (rejects the output).
// Records a rejection for the matched pattern.
// ---------------------------------------------------------------------------

function recordRegenerate(hint) {
  if (!hint || !hint.signals || hint.signals.length === 0) return;
  try {
    memory.recordReject(hint.signals[0]);
  } catch (err) {
    console.warn('intelligence-engine: recordRegenerate failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// getInspectorData()
//
// Returns data for the dev/inspector panel:
//   - entities: all top entities from memory
//   - preferences: all top output preferences
//   - learnedSignals: current learned signal set
// ---------------------------------------------------------------------------

function getInspectorData() {
  try {
    const entities = memory.getTopEntities(50);
    const preferences = memory.getTopPreferences(20);
    const learnedSignals = buildLearnedSignals();
    return { entities, preferences, learnedSignals };
  } catch (err) {
    console.warn('intelligence-engine: getInspectorData failed:', err.message);
    return { entities: [], preferences: [], learnedSignals: [] };
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  initEngine,
  generate,
  recordCopy,
  recordRegenerate,
  getInspectorData,
};
