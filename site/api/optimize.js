// Vercel Serverless Function — proxies Claude/GPT prompt optimization
// App sends raw text, we call the AI with OUR key and return the optimized prompt
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!ANTHROPIC_KEY && !OPENAI_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const { text, category, context, recentPrompts, patterns } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    // Build system prompt (same logic as ipc-handlers.cjs)
    let systemPrompt = `You are Verby — an intelligent prompt engineer that detects how the user is speaking and responds accordingly.

STEP 1 — CLASSIFY THE INPUT TYPE:
- "conversational": Questions, brainstorming. Phrases like "hey", "what if", "can you"
- "task": Create something new. Phrases like "write me", "create a", "build"
- "fix": Debug/troubleshoot. Phrases like "not working", "error", "broken"
- "rewrite": Transform existing content. Phrases like "make this more", "shorten", "translate"

STEP 2 — OPTIMIZE BASED ON TYPE:
If CONVERSATIONAL: Clean up, keep natural tone, add specificity
If TASK: Full structured prompt with role + constraints + output format
If FIX: Diagnostic prompt with root cause + fixes + explanation
If REWRITE: Specify transformation, preserve meaning

RULES: Preserve goal, remove filler, add context, keep concise`;

    if (context) {
      systemPrompt += `\n\nACTIVE PROJECT CONTEXT:\nProject: ${context.name}\nDescription: ${context.description}`;
    }
    if (patterns && patterns.length > 0) {
      systemPrompt += `\n\nUSER'S COMMON PATTERNS:`;
      for (const p of patterns.slice(0, 3)) {
        systemPrompt += `\n- ${p.category} (${p.frequency}x)`;
      }
    }
    if (recentPrompts && recentPrompts.length > 0) {
      systemPrompt += `\n\nRECENT PROMPTS:`;
      for (const r of recentPrompts.slice(0, 5)) {
        systemPrompt += `\n- [${r.category}] "${r.raw?.substring(0, 60)}"`;
      }
    }

    systemPrompt += `\n\nOUTPUT FORMAT:
Return JSON: {"optimized": "text", "type": "conversational|task|fix|rewrite", "category": "coding|business|marketing|creative|research|automation|general"}
Return ONLY JSON.`;

    const userMessage = category && category !== 'general'
      ? `[Hint: "${category}"]\n\n${text}` : text;

    let result;

    // Try Claude first, fall back to GPT
    if (ANTHROPIC_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await response.json();
      result = data.content?.[0]?.text?.trim();
    } else if (OPENAI_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });
      const data = await response.json();
      result = data.choices?.[0]?.message?.content?.trim();
    }

    if (!result) return res.status(500).json({ error: 'No AI response' });

    // Parse JSON response
    try {
      const parsed = JSON.parse(result.replace(/```json?\n?/g, '').replace(/```/g, ''));
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({ optimized: result, type: 'task', category: category || 'general' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
