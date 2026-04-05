// src/main/context-assembler.cjs
'use strict';

function safeParseMeta(raw) {
  if (!raw || typeof raw !== 'string') return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/**
 * Format-specific system prompt templates.
 * Each returns instructions the LLM follows to produce the right output shape.
 */
const FORMAT_TEMPLATES = {
  prompt: `OUTPUT FORMAT: Generate a structured AI prompt.
Include: role assignment, clear deliverables, constraints, and output specification.
Only use this format — the user wants a prompt they can feed into another AI.`,

  email: `OUTPUT FORMAT: Generate a complete, ready-to-send email.
Match the appropriate tone and detail level based on context.
Include a natural greeting, well-developed body (not just 2-3 generic sentences), and sign-off.
Do NOT include a subject line unless explicitly asked.
Do NOT use corporate clichés ("I hope this email finds you well", "per our conversation").`,

  info_dump: `OUTPUT FORMAT: Generate organized information.
Use bullet points, sections, or numbered lists as appropriate.
Present facts, specs, and details clearly.
Do NOT wrap this as a prompt — the user wants raw information, not a prompt template.`,

  quick_action: `OUTPUT FORMAT: Give the shortest possible answer.
One-liner, command, snippet, or brief instruction.
No preamble, no explanation unless the user asked for one.`,

  communication: `OUTPUT FORMAT: Generate a casual message (Slack, text, DM).
Match the platform's norms — short, conversational, no formality.
No greeting or sign-off unless it fits the context.`,

  document: `OUTPUT FORMAT: Generate structured long-form content.
Use headers, sections, and clear organization.
Develop ideas fully — this is not a quick response.`,
};

Object.freeze(FORMAT_TEMPLATES);

function formatEntityLines(entities) {
  return entities.map(e => {
    const meta = safeParseMeta(e.metadata);
    const metaStr = Object.keys(meta).length > 0
      ? ` (${Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(', ')})`
      : '';
    return `- ${e.name || 'Unknown'} [${e.type || 'unknown'}]${metaStr}`;
  });
}

function formatRelationshipLines(relationships) {
  return relationships.map(r =>
    `- ${r.subject_name} ${r.verb} ${r.object_name}`
  );
}

function formatRecentLines(recentPrompts) {
  return recentPrompts.map(p =>
    `- "${p.raw_transcript}" → [${p.category}]`
  );
}

/**
 * Build a dynamic system prompt from modular sections.
 *
 * @param {object} options
 * @param {object|null} options.hint - Merged generation hint from signal scanner
 * @param {object[]} options.entities - Relevant entities from memory
 * @param {object[]} options.relationships - Relevant relationships from memory
 * @param {object|null} options.preference - Output preference from memory
 * @param {object|null} options.activeProject - Active project context
 * @param {string|null} options.foregroundApp - Currently focused macOS app
 * @param {object[]} options.recentPrompts - Last N prompts for continuity
 * @param {string|null} options.emailSignOffName - User's sign-off name for emails
 * @returns {string} The assembled system prompt
 */
function assembleSystemPrompt({
  hint = null,
  entities = [],
  relationships = [],
  preference = null,
  activeProject = null,
  foregroundApp = null,
  recentPrompts = [],
  emailSignOffName = null,
}) {
  const sections = [];

  // 1. Base instructions
  sections.push(`You are Verby, an intelligent assistant that transforms voice input and text into polished, contextually aware output. Adapt your response format, tone, and detail level to what the user actually needs right now.`);

  // 2. Format template
  const format = hint?.format || preference?.preferred_format || 'prompt';
  const template = FORMAT_TEMPLATES[format] || FORMAT_TEMPLATES.prompt;
  sections.push(template);

  // 3. Tone and detail guidance
  const tone = hint?.tone || preference?.preferred_tone || 'professional';
  const detail = hint?.detail || preference?.preferred_detail || 'medium';
  sections.push(`TONE: ${tone}. DETAIL LEVEL: ${detail}.`);

  // 4. Email sign-off name
  if (format === 'email' && emailSignOffName) {
    sections.push(`Sign off emails with the name: ${emailSignOffName}`);
  }

  // 5. Entity context
  if (entities.length > 0) {
    const entityLines = formatEntityLines(entities);
    sections.push(`KNOWN CONTEXT — People, projects, and tools the user works with:\n${entityLines.join('\n')}`);
  }

  // 6. Relationships
  if (relationships.length > 0) {
    const relLines = formatRelationshipLines(relationships);
    sections.push(`RELATIONSHIPS:\n${relLines.join('\n')}`);
  }

  // 7. Active project
  if (activeProject) {
    sections.push(`ACTIVE PROJECT: ${activeProject.project_name}\nDescription: ${activeProject.description}`);
  }

  // 8. Foreground app context
  if (foregroundApp) {
    sections.push(`USER'S CURRENT APP: ${foregroundApp} — adjust output to be relevant to what they're doing in this app.`);
  }

  // 9. Recent history for continuity
  if (recentPrompts.length > 0) {
    const recentLines = formatRecentLines(recentPrompts);
    sections.push(`RECENT CONTEXT (last ${recentPrompts.length} interactions):\n${recentLines.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Build a fallback system prompt for LLM classification.
 * Used when the signal scanner doesn't match anything.
 * Asks the LLM to classify the input AND generate the output in one pass.
 */
function assembleFallbackPrompt({
  entities = [],
  relationships = [],
  activeProject = null,
  foregroundApp = null,
  recentPrompts = [],
  emailSignOffName = null,
}) {
  const sections = [];

  sections.push(`You are Verby, an intelligent assistant. The user's input is vague or doesn't match any known pattern. Your job:

1. CLASSIFY the input into one of these formats: prompt, email, info_dump, quick_action, communication, document
2. GENERATE the output in that format

Choose the format that best serves what the user seems to need. When in doubt, prefer "prompt" for AI-related requests and "info_dump" for general questions.`);

  // Include all available context so the LLM can make a good decision
  if (entities.length > 0) {
    const entityLines = formatEntityLines(entities);
    sections.push(`KNOWN CONTEXT:\n${entityLines.join('\n')}`);
  }

  if (relationships.length > 0) {
    const relLines = formatRelationshipLines(relationships);
    sections.push(`RELATIONSHIPS:\n${relLines.join('\n')}`);
  }

  if (activeProject) {
    sections.push(`ACTIVE PROJECT: ${activeProject.project_name}\nDescription: ${activeProject.description}`);
  }

  if (foregroundApp) {
    sections.push(`USER'S CURRENT APP: ${foregroundApp}`);
  }

  if (recentPrompts.length > 0) {
    const recentLines = formatRecentLines(recentPrompts);
    sections.push(`RECENT CONTEXT:\n${recentLines.join('\n')}`);
  }

  if (emailSignOffName) {
    sections.push(`If generating an email, sign off with: ${emailSignOffName}`);
  }

  return sections.join('\n\n');
}

module.exports = { assembleSystemPrompt, assembleFallbackPrompt, FORMAT_TEMPLATES };
