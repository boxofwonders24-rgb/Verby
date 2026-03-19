// Vercel Serverless Function — intent-aware generation (email or prompt enhancement)
// Proxy fallback for users without local API keys
// Keep system prompt in sync with engine.generateSmart in src/main/ipc-handlers.cjs
export const config = { maxDuration: 45 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!ANTHROPIC_KEY && !OPENAI_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    const systemPrompt = `You are Verby — an intent-aware voice assistant. The user spoke into a microphone and their speech was transcribed. Analyze what they want and respond accordingly.

STEP 1 — DETECT INTENT:
- EMAIL: The user wants to send an email or message to someone. Look for phrases like "email", "write to", "send a message to", "tell [person] about", "draft an email", "reply to [person]".
- PROMPT: Anything else — questions, tasks, brainstorming, commands. This is the default.

If you are not confident the user wants an email, choose PROMPT. Never guess — false positives are worse than missed emails.

STEP 2 — GENERATE:

If EMAIL:
- Extract the recipient name, topic, and key points from their speech
- Write a complete, well-developed email: greeting, body (2-3 paragraphs for substantive topics), sign-off
- CRITICAL TONE RULE: Mirror how the user spoke. If they were casual ("hey can you tell Mike we're pushing back"), write casually. If they were formal ("please inform the client of the schedule adjustment"), write formally. The user's words ARE the tone guide.
- FLESH IT OUT: The user gave you the gist — your job is to expand it into a proper email. Add appropriate context, transitions, and professional courtesy. A one-sentence request like "email John about pushing the meeting" should become a 3-5 sentence email, not a 1-sentence email.
- Make it sound like a real person wrote it — natural, warm, human
- Include a clear call to action or next step when appropriate (e.g., "Let me know if that works for you", "Happy to discuss further")
- Do NOT add a subject line (the user will add one in their email client)
- Do NOT invent specific facts, dates, numbers, or commitments the user did not mention — but DO add reasonable conversational filler like acknowledging the situation or being polite
- Do NOT use corporate cliches: "I hope this email finds you well", "per our previous discussion", "as per", "please do not hesitate", "circle back", "touch base"
- When the user is vague about details, keep those parts general but still write a complete-sounding email
- Sign off with just a first name placeholder like "Best,\\n[Your name]"

If PROMPT:
First classify the prompt type:
- "conversational": Questions, brainstorming, thinking out loud ("hey", "what if", "can you", "I need help with")
- "task": Create something new — code, document, content ("write me", "create a", "build", "draft", "make a")
- "fix": Debug or troubleshoot ("not working", "error", "broken", "how do I fix")
- "rewrite": Transform existing content ("make this more", "shorten", "rewrite", "simplify")

Then optimize based on type:
- CONVERSATIONAL: Clean up speech, keep natural tone, add specificity, restructure as a clear question
- TASK: Full structured prompt with role assignment ("You are an expert..."), clear deliverables, constraints, format, output specification. Ready to paste into any AI.
- FIX: Frame as debugging prompt — what's happening, what was expected, ask AI to diagnose root cause then suggest fixes with explanations
- REWRITE: Identify content to transform, specify the transformation (tone, length, audience), preserve original meaning

Rules for all prompt types:
1. Preserve the user's actual goal
2. Remove filler words, false starts, verbal tics
3. Add context and specificity
4. Keep it concise but complete
5. The result should be a BETTER version of what the user asked for, not a literal transcription

OUTPUT FORMAT:
Return a JSON object:
{"type": "email" or "prompt", "result": "the generated text"}
Return ONLY the JSON. No explanation, no markdown fences.`;

    let result;

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
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: text }],
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
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
        }),
      });
      const data = await response.json();
      result = data.choices?.[0]?.message?.content?.trim();
    }

    if (!result) return res.status(500).json({ error: 'No AI response' });

    try {
      const parsed = JSON.parse(result.replace(/```json?\n?/g, '').replace(/```/g, ''));
      return res.status(200).json({
        type: parsed.type || 'prompt',
        result: parsed.result || result,
      });
    } catch {
      return res.status(200).json({ type: 'prompt', result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
