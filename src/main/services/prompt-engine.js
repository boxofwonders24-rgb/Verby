const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { CATEGORIES, PROVIDERS } = require('../../shared/constants');

const SYSTEM_PROMPT = `You are VerbyPrompt — an expert prompt engineer. Your job is to take raw, messy speech transcriptions and transform them into perfectly structured AI prompts.

RULES:
1. Detect the user's intent from their raw speech
2. Determine the best category: general, business, coding, marketing, or automation
3. Rewrite into a structured prompt that includes:
   - An appropriate role assignment ("You are an expert...")
   - A clear, specific task definition
   - Relevant constraints or requirements
   - A specified output format when helpful
4. Preserve the user's actual goal — don't change what they want, just express it better
5. Remove filler words, false starts, and verbal tics
6. Add context and specificity that makes the prompt more effective
7. Keep it concise — don't pad with unnecessary instructions

OUTPUT FORMAT:
Return ONLY the optimized prompt text. No explanation, no preamble, no markdown wrapping.

EXAMPLES:

Input: "uh help me make money online with no experience"
Output: You are an expert business strategist. Provide a step-by-step plan for a complete beginner to start making money online. Include specific platforms, tools, and actionable first steps. Focus on low-cost, scalable methods that don't require prior experience. Organize by time investment: quick wins (1-2 hours/day) vs. long-term plays.

Input: "write me a python script that like scrapes some websites or whatever"
Output: You are a senior Python developer. Write a clean, well-documented Python web scraping script using the requests and BeautifulSoup libraries. The script should: accept a URL as input, extract all text content and links, handle common errors (timeouts, 404s, rate limiting), and output results as structured JSON. Include a requirements.txt and usage example.

Input: "I need to email my team about the deadline change"
Output: You are a professional communications expert. Draft a clear, concise email to a team informing them of a deadline change. The tone should be direct but empathetic. Include: the original deadline, the new deadline, the reason for the change, any adjusted expectations, and a clear call to action. Keep it under 200 words.`;

class PromptEngine {
  constructor({ anthropicKey, openaiKey, defaultProvider = PROVIDERS.CLAUDE }) {
    this.defaultProvider = defaultProvider;
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  async optimize(rawText, { category = CATEGORIES.GENERAL, provider } = {}) {
    const useProvider = provider || this.defaultProvider;
    const userMessage = category !== CATEGORIES.GENERAL
      ? `[Category: ${category}]\n\n${rawText}`
      : rawText;

    if (useProvider === PROVIDERS.CLAUDE && this.anthropic) {
      return this._optimizeWithClaude(userMessage);
    }
    if (useProvider === PROVIDERS.OPENAI && this.openai) {
      return this._optimizeWithOpenAI(userMessage);
    }
    throw new Error(`Provider "${useProvider}" not configured`);
  }

  async _optimizeWithClaude(userMessage) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    return response.content[0].text.trim();
  }

  async _optimizeWithOpenAI(userMessage) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });
    return response.choices[0].message.content.trim();
  }
}

module.exports = PromptEngine;
