import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { PROVIDERS } from '../../shared/constants.js';

class LLMDispatch {
  constructor({ anthropicKey, openaiKey }) {
    if (anthropicKey) this.anthropic = new Anthropic({ apiKey: anthropicKey });
    if (openaiKey) this.openai = new OpenAI({ apiKey: openaiKey });
  }

  async send(prompt, provider = PROVIDERS.CLAUDE) {
    if (provider === PROVIDERS.CLAUDE && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content[0].text;
    }

    if (provider === PROVIDERS.OPENAI && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0].message.content;
    }

    throw new Error(`Provider "${provider}" not configured`);
  }
}

export default LLMDispatch;
