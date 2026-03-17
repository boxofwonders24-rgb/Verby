import React, { useState } from 'react';

export default function PromptCard({ prompt, onCopy, onSendLLM, onToggleFav, onDelete }) {
  const [llmResponse, setLlmResponse] = useState(null);
  const [sending, setSending] = useState(false);

  const handleSend = async (provider) => {
    setSending(true);
    const response = await onSendLLM(prompt.optimized_prompt, provider);
    setLlmResponse(response);
    setSending(false);
  };

  return (
    <div className="rounded-2xl p-4 mb-3 border transition-all duration-200"
      style={{
        background: 'var(--bg-glass)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(20px)',
      }}>
      <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
        &ldquo;{prompt.raw_transcript}&rdquo;
      </p>

      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
        {prompt.optimized_prompt || prompt}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onCopy(prompt.optimized_prompt)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Copy
        </button>
        <button
          onClick={() => handleSend('claude')}
          disabled={sending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          {sending ? '...' : 'Send to Claude'}
        </button>
        <button
          onClick={() => handleSend('openai')}
          disabled={sending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          {sending ? '...' : 'Send to GPT'}
        </button>
        <button
          onClick={() => onToggleFav(prompt.id)}
          className="ml-auto text-lg"
        >
          {prompt.is_favorite ? '\u2605' : '\u2606'}
        </button>
      </div>

      {llmResponse && (
        <div className="mt-3 p-3 rounded-xl text-sm leading-relaxed"
          style={{ background: 'rgba(124, 92, 252, 0.1)', color: 'var(--text-primary)' }}>
          {llmResponse}
        </div>
      )}
    </div>
  );
}
