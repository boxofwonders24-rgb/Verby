'use strict';

// ---------------------------------------------------------------------------
// Signal Scanner -- fast, local keyword detection layer for the Verby
// Intelligence Engine.  Runs before any LLM API call to produce generation
// hints that guide output format, tone and detail level.
// ---------------------------------------------------------------------------

const BUILT_IN_SIGNALS = [
  {
    group: 'communication',
    keywords: ['email', 'message', 'slack', 'text', 'reply', 'respond', 'write to', 'tell'],
    hint: { format: 'email', tone: 'professional', detail: 'high' },
    confidence: 0.8,
  },
  {
    group: 'troubleshooting',
    keywords: ['fix', 'debug', 'error', 'broken', 'not working', 'issue', 'bug', 'crash'],
    hint: { format: 'prompt', tone: 'technical', detail: 'high' },
    confidence: 0.85,
  },
  {
    group: 'creation',
    keywords: ['write', 'draft', 'create', 'build', 'make', 'generate', 'design'],
    hint: { format: 'prompt', tone: 'professional', detail: 'medium' },
    confidence: 0.6,
  },
  {
    group: 'information',
    keywords: ['explain', 'what is', 'how does', 'tell me about', 'summary', 'summarize', 'overview', 'describe'],
    hint: { format: 'info_dump', tone: 'concise', detail: 'medium' },
    confidence: 0.8,
  },
  {
    group: 'quick',
    keywords: ['command for', 'snippet', 'one-liner', 'shortcut', 'quick', 'just give me'],
    hint: { format: 'quick_action', tone: 'concise', detail: 'low' },
    confidence: 0.85,
  },
  {
    group: 'document',
    keywords: ['document', 'article', 'blog post', 'report', 'proposal', 'outline'],
    hint: { format: 'document', tone: 'professional', detail: 'high' },
    confidence: 0.75,
  },
  {
    group: 'casual_communication',
    keywords: ['text message', 'dm', 'casual message', 'quick message', 'chat'],
    hint: { format: 'communication', tone: 'casual', detail: 'low' },
    confidence: 0.75,
  },
  {
    group: 'comment',
    keywords: [
      // Explicit comment intent — high confidence, won't collide with prompts
      'comment', 'leave a comment', 'write a comment', 'post a comment', 'drop a comment',
      'reply to', 'leave a reply', 'post a reply', 'write a reply',
      'respond to this', 'respond to that', 'respond to their',
      // Platform-specific comment phrases — require comment/reply context,
      // bare platform names like "reddit" alone would hijack creation intents
      // (e.g. "create an ad campaign for Reddit" is creation, not a comment)
      'reddit comment', 'subreddit comment', 'on reddit',
      'twitter reply', 'tweet reply', 'on twitter', 'x post', 'quote tweet', 'retweet',
      'youtube comment', 'yt comment', 'on youtube',
      'instagram comment', 'ig comment', 'on instagram', 'on ig',
      'linkedin comment', 'on linkedin',
      'hacker news', 'on hn',
      'facebook comment', 'fb comment', 'on facebook',
      'tiktok comment', 'on tiktok',
      'on discord', 'discord message',
      'forum post', 'forum reply', 'blog comment',
      // Multi-word phrases that are clearly comment intent — not generic verbs
      'chime in on', 'weigh in on', 'jump in on',
      'add to the conversation', 'join the discussion', 'join the thread',
      'put my two cents', 'throw in my two cents',
      'share my thoughts on', 'give my take on', 'give my opinion on',
      'clap back at', 'fire back at', 'push back on this', 'push back on that',
      'call them out', 'call this out', 'call that out',
      // Referencing someone else's post — clearly social context
      'under this post', 'under that post', 'under their post',
      'on this post', 'on that post', 'on their post', 'on his post', 'on her post',
      'this guy said', 'this person said', 'someone posted', 'someone said',
      'saw a post about', 'saw a thread about', 'saw a tweet about',
      'this thread about', 'that thread about',
      // Opinion framing that implies public reply
      'hot take on', 'my take on this', 'my take on that',
      'what i think about this', 'how i feel about this',
      'let them know that', 'let people know', 'let the people know',
      'tell them that', 'tell the people',
      // More natural patterns
      'say something back', 'write something back', 'get back to them',
      'sound off on', 'speak on this', 'speak on that',
      'shout out', 'give a shoutout',
      'roast this', 'roast that', 'drag this',
      'cosign this', 'cosign that', 'co-sign',
      'ratio this', 'dunk on',
    ],
    hint: { format: 'comment', tone: 'conversational', detail: 'medium' },
    confidence: 0.85,
  },
];

// ---------------------------------------------------------------------------
// scanSignals(input, customSignals?, learnedSignals?)
//
// Checks input against built-in, custom, and learned signal groups.
// Returns matches sorted by confidence (highest first).
// Only one match per built-in group is returned.
// ---------------------------------------------------------------------------

function scanSignals(input, customSignals, learnedSignals) {
  if (!input || typeof input !== 'string') return [];

  const lower = input.toLowerCase();
  const matches = [];
  const seenGroups = new Set();

  // Helper: test all keywords in a signal group, return first match.
  const testSignal = (signal, source) => {
    for (const kw of signal.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return {
          group: signal.group,
          keyword: kw,
          hint: { ...signal.hint },
          confidence: signal.confidence,
          source, // 'builtin' | 'custom' | 'learned'
        };
      }
    }
    return null;
  };

  // 1. Custom signals -- always checked first, no group-uniqueness constraint.
  if (Array.isArray(customSignals)) {
    for (const sig of customSignals) {
      const match = testSignal(sig, 'custom');
      if (match) {
        matches.push(match);
        seenGroups.add(sig.group);
      }
    }
  }

  // 2. Built-in signals -- one match per group max.
  for (const sig of BUILT_IN_SIGNALS) {
    if (seenGroups.has(sig.group)) continue;
    const match = testSignal(sig, 'builtin');
    if (match) {
      matches.push(match);
      seenGroups.add(sig.group);
    }
  }

  // 3. Learned signals -- skip groups already matched.
  if (Array.isArray(learnedSignals)) {
    for (const sig of learnedSignals) {
      if (seenGroups.has(sig.group)) continue;
      const match = testSignal(sig, 'learned');
      if (match) {
        matches.push(match);
        seenGroups.add(sig.group);
      }
    }
  }

  // Sort by confidence descending.
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches;
}

// ---------------------------------------------------------------------------
// mergeHints(matches)
//
// Merge an array of signal matches into a single generation hint.
// Priority rules:
//   - "custom" source always wins over builtin/learned.
//   - "communication" group overrides "creation" group.
//   - Highest-confidence match is the base; overrides applied on top.
// ---------------------------------------------------------------------------

function mergeHints(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { format: 'prompt', tone: 'professional', detail: 'medium', confidence: 0, signals: [], entities: [] };
  }

  // Start with the highest-confidence match (array already sorted).
  const base = { ...matches[0].hint };
  let topConfidence = matches[0].confidence;

  const signals = matches.map((m) => m.group);
  const entities = [];

  // Apply override rules.
  let customMatch = false;
  for (const m of matches) {
    // Custom source always wins -- overwrite everything.
    if (m.source === 'custom') {
      base.format = m.hint.format;
      base.tone = m.hint.tone;
      base.detail = m.hint.detail;
      if (m.confidence > topConfidence) topConfidence = m.confidence;
      customMatch = true;
      break; // first custom wins
    }
  }

  // Override rules (only when no custom signal was applied — custom is final authority).
  if (!customMatch) {
    const hasComm = matches.some((m) => m.group === 'communication' || m.group === 'casual_communication');
    const hasCreation = matches.some((m) => m.group === 'creation');
    const hasComment = matches.some((m) => m.group === 'comment');

    // Communication overrides creation when both present.
    if (hasComm && hasCreation) {
      const commMatch = matches.find((m) => m.group === 'communication' || m.group === 'casual_communication');
      if (commMatch) {
        base.format = commMatch.hint.format;
        base.tone = commMatch.hint.tone;
        base.detail = commMatch.hint.detail;
      }
    }

    // Creation overrides comment when both present — "create an ad for Reddit"
    // is creation intent, not a comment. Comment only wins when there's no
    // creation signal (e.g. "reply to this thread on reddit").
    if (hasCreation && hasComment && !hasComm) {
      const creationMatch = matches.find((m) => m.group === 'creation');
      if (creationMatch) {
        base.format = creationMatch.hint.format;
        base.tone = creationMatch.hint.tone;
        base.detail = creationMatch.hint.detail;
      }
    }
  }

  return {
    format: base.format,
    tone: base.tone,
    detail: base.detail,
    confidence: topConfidence,
    signals,
    entities,
  };
}

// ---------------------------------------------------------------------------
// extractPotentialEntities(input)
//
// Regex-based extraction of:
//   - Capitalized words after prepositions (to/for/about/with/from/in/on/at)
//   - Multi-word capitalized phrases (e.g. "Project Alpha", "John Smith")
// Returns an array of unique entity strings.
// ---------------------------------------------------------------------------

function extractPotentialEntities(input) {
  if (!input || typeof input !== 'string') return [];

  const entities = new Set();

  // 1. Capitalized words after common prepositions.
  const prepPattern = /\b(?:to|for|about|with|from|in|on|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  let m;
  while ((m = prepPattern.exec(input)) !== null) {
    entities.add(m[1].trim());
  }

  // 2. Multi-word capitalized phrases (2+ consecutive capitalized words).
  //    Skip words at the very start of the sentence to reduce false positives.
  const multiCapPattern = /(?:^|[.!?]\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  while ((m = multiCapPattern.exec(input)) !== null) {
    const phrase = m[1].trim();
    // Only add if it's not at position 0 (sentence start noise).
    if (m.index > 0) {
      entities.add(phrase);
    }
  }

  return [...entities];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  scanSignals,
  mergeHints,
  extractPotentialEntities,
  BUILT_IN_SIGNALS,
};
