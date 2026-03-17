import React, { useState, useEffect } from 'react';
import RecordingIndicator from './RecordingIndicator';
import PromptCard from './PromptCard';
import useRecording from '../hooks/useRecording';
import usePrompts from '../hooks/usePrompts';
import { transcribeAudio, onToggleRecording } from '../lib/ipc';

const CATEGORIES = ['general', 'business', 'coding', 'marketing', 'automation'];

export default function Overlay({ onOpenSettings, theme, onToggleTheme }) {
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
    const run = async () => {
      setStatus('transcribing');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const raw = await transcribeAudio(arrayBuffer);
      setTranscript(raw);
      setStatus('optimizing');
      const result = await optimize(raw, category);
      setCurrentPrompt({ ...result, raw_transcript: raw, optimized_prompt: result.optimized });
      setStatus('idle');
    };
    run().catch((err) => {
      console.error(err);
      setStatus('idle');
    });
  }, [audioBlob, category, optimize]);

  return (
    <div className="w-full max-w-[640px]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 mb-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }}
          />
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            VerbyPrompt
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-md text-xs"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
          >
            {theme === 'dark' ? '\u2600\uFE0E' : '\u263E\uFE0E'}
          </button>
          <button
            onClick={() => setView(view === 'main' ? 'history' : 'main')}
            className="h-7 px-2.5 rounded-md text-xs font-medium"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
          >
            {view === 'main' ? 'History' : 'Back'}
          </button>
          <button
            onClick={onOpenSettings}
            className="w-7 h-7 flex items-center justify-center rounded-md text-xs"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
          >
            {'\u2699\uFE0E'}
          </button>
        </div>
      </div>

      {view === 'main' ? (
        <div className="px-5 pb-5">
          {/* Category pills */}
          <div className="flex gap-1.5 mb-6 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-medium capitalize"
                style={{
                  background: category === cat ? 'var(--accent)' : 'var(--bg-card)',
                  color: category === cat ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${category === cat ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Record / Status */}
          <div className="flex items-center justify-center mb-4">
            {status === 'idle' && !currentPrompt && (
              <button
                onClick={toggleRecording}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl"
                style={{
                  background: isRecording
                    ? 'rgba(239,68,68,0.1)'
                    : 'var(--bg-card)',
                  border: `1px solid ${isRecording ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                }}
              >
                {isRecording ? (
                  <RecordingIndicator isRecording={true} />
                ) : (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Click or press Option+Space
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
              <div className="text-center">
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  &ldquo;{transcript}&rdquo;
                </p>
                <p className="text-sm animate-pulse" style={{ color: 'var(--accent)' }}>
                  Optimizing prompt...
                </p>
              </div>
            )}
          </div>

          {/* Result */}
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
                onClick={() => {
                  setCurrentPrompt(null);
                  setTranscript('');
                }}
                className="w-full py-2.5 text-xs font-medium rounded-xl mt-2"
                style={{
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                }}
              >
                New prompt
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 pb-5 overflow-y-auto max-h-[380px]">
          {history.length === 0 ? (
            <p
              className="text-sm text-center py-12"
              style={{ color: 'var(--text-muted)' }}
            >
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
