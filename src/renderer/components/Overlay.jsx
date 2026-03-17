import React, { useState, useEffect, useCallback } from 'react';
import RecordingIndicator from './RecordingIndicator';
import PromptCard from './PromptCard';
import useRecording from '../hooks/useRecording';
import usePrompts from '../hooks/usePrompts';
import { transcribeAudio, onToggleRecording } from '../lib/ipc';

const CATEGORIES = ['general', 'business', 'coding', 'marketing', 'automation'];

export default function Overlay() {
  const { isRecording, audioBlob, toggleRecording } = useRecording();
  const { history, loading, loadHistory, optimize, toggleFav, remove, copy, sendLLM } = usePrompts();
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [category, setCategory] = useState('general');
  const [view, setView] = useState('main');
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    onToggleRecording(() => toggleRecording());
  }, [toggleRecording]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!audioBlob) return;

    const process = async () => {
      setStatus('transcribing');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const raw = await transcribeAudio(arrayBuffer);
      setTranscript(raw);

      setStatus('optimizing');
      const result = await optimize(raw, category);
      setCurrentPrompt({ ...result, raw_transcript: raw, optimized_prompt: result.optimized });
      setStatus('idle');
    };

    process().catch((err) => {
      console.error(err);
      setStatus('idle');
    });
  }, [audioBlob, category, optimize]);

  return (
    <div className="w-[640px] max-h-[480px] rounded-3xl overflow-hidden"
      style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(40px)',
        border: '1px solid var(--border)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            VerbyPrompt
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView(view === 'main' ? 'history' : 'main')}
            className="px-2 py-1 rounded-md text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            {view === 'main' ? 'History' : 'Back'}
          </button>
        </div>
      </div>

      {view === 'main' ? (
        <div className="p-5">
          {/* Category selector */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all"
                style={{
                  background: category === cat ? 'var(--accent)' : 'transparent',
                  color: category === cat ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${category === cat ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Record button / Status */}
          <div className="flex items-center justify-center mb-4">
            {status === 'idle' && !currentPrompt && (
              <button
                onClick={toggleRecording}
                className="group flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-200"
                style={{
                  background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(124,92,252,0.1)',
                  border: `1px solid ${isRecording ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                }}
              >
                {isRecording ? (
                  <RecordingIndicator isRecording={true} />
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Click or press Cmd+Shift+Space to speak
                    </span>
                  </>
                )}
              </button>
            )}

            {status === 'transcribing' && (
              <p className="text-sm animate-pulse" style={{ color: 'var(--accent)' }}>
                Transcribing...
              </p>
            )}

            {status === 'optimizing' && (
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  &ldquo;{transcript}&rdquo;
                </p>
                <p className="text-sm animate-pulse" style={{ color: 'var(--accent)' }}>
                  Optimizing prompt...
                </p>
              </div>
            )}
          </div>

          {/* Current prompt result */}
          {currentPrompt && status === 'idle' && (
            <div>
              <PromptCard
                prompt={currentPrompt}
                onCopy={copy}
                onSendLLM={sendLLM}
                onToggleFav={toggleFav}
                onDelete={remove}
              />
              <button
                onClick={() => { setCurrentPrompt(null); setTranscript(''); }}
                className="w-full py-2 text-xs rounded-xl mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                New prompt
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5 overflow-y-auto max-h-[380px]">
          {history.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No prompts yet. Start speaking!
            </p>
          ) : (
            history.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                onCopy={copy}
                onSendLLM={sendLLM}
                onToggleFav={toggleFav}
                onDelete={remove}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
