import React, { useState } from 'react';

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const SendIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'var(--accent)' : 'none'} stroke={filled ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

export default function PromptCard({ prompt, onCopy, onSendLLM, onToggleFav, onDelete }) {
  const [llmResponse, setLlmResponse] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);

  const handleSend = async (provider) => {
    setSending(true);
    setSendingTo(provider);
    try {
      const response = await onSendLLM(prompt.optimized_prompt, provider);
      setLlmResponse(response);
    } catch (err) {
      setLlmResponse(`Error: ${err.message || 'Failed to get response'}`);
    }
    setSending(false);
    setSendingTo(null);
  };

  return (
    <div className="glass-card-sm p-4 mb-3 shine-on-hover">
      {/* Raw transcript */}
      <p className="text-[11px] italic mb-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        &ldquo;{prompt.raw_transcript}&rdquo;
      </p>

      {/* Optimized prompt */}
      <p className="text-[13px] leading-[1.7] mb-4" style={{ color: 'var(--text-primary)' }}>
        {prompt.optimized_prompt || prompt}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onCopy(prompt.optimized_prompt)}
          className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-[10px] text-xs font-medium"
          style={{ background: `linear-gradient(135deg, var(--gradient-1), var(--gradient-2))`, color: '#fff', boxShadow: '0 2px 10px var(--accent-glow)' }}
        >
          <CopyIcon /> Copy
        </button>
        <button
          onClick={() => handleSend('claude')}
          disabled={sending}
          className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-[10px] text-xs font-medium glass-card-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          <SendIcon /> {sendingTo === 'claude' ? 'Sending...' : 'Claude'}
        </button>
        <button
          onClick={() => handleSend('openai')}
          disabled={sending}
          className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-[10px] text-xs font-medium glass-card-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          <SendIcon /> {sendingTo === 'openai' ? 'Sending...' : 'GPT-4o'}
        </button>

        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={() => onToggleFav(prompt.id)} className="icon-btn" style={{ width: 30, height: 30 }}>
            <StarIcon filled={prompt.is_favorite} />
          </button>
          {onDelete && (
            <button onClick={() => onDelete(prompt.id)} className="icon-btn" style={{ width: 30, height: 30, color: 'var(--text-muted)' }}>
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {/* LLM Response */}
      {llmResponse && (
        <div className="mt-3 p-4 rounded-xl text-[13px] leading-[1.7] prompt-reveal"
          style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 gradient-text">Response</p>
          <p style={{ color: 'var(--text-primary)' }}>{llmResponse}</p>
        </div>
      )}
    </div>
  );
}
