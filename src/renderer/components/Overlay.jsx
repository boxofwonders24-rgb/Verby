import React, { useState, useEffect, useRef } from 'react';
import PromptCard from './PromptCard';
import useRecording from '../hooks/useRecording';
import usePrompts from '../hooks/usePrompts';
import { transcribeAudio, onToggleRecording } from '../lib/ipc';

const CATEGORIES = ['general', 'business', 'coding', 'marketing', 'automation'];

const MicIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const Icons = {
  sun: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  history: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  back: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  arrow: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  sparkle: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.09 6.26L20 10.27l-4.91 3.82L16.18 22 12 18l-4.18 4 1.09-7.91L4 10.27l5.91-2.01z"/></svg>,
};

const Waveform = () => (
  <div className="flex items-center gap-[3px] h-6">
    {[...Array(7)].map((_, i) => (
      <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.08}s`, animationDuration: `${0.4 + Math.random() * 0.4}s` }} />
    ))}
  </div>
);

const LoadingDots = () => (
  <div className="flex gap-1.5">
    {[0, 1, 2].map((i) => <div key={i} className="bounce-dot" style={{ animationDelay: `${i * 0.15}s` }} />)}
  </div>
);

const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Activity Feed Item — shows before/after with timestamp
function ActivityItem({ entry, onCopy }) {
  return (
    <div className="glass-card-sm p-4 mb-2 prompt-reveal">
      {/* Timestamp */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="text-[10px] font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
          {formatTime(entry.created_at || new Date())}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
          {entry.category || 'general'}
        </span>
      </div>

      {/* Before */}
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--error)' }}>
          Before — Raw Speech
        </p>
        <p className="text-xs leading-relaxed italic px-3 py-2 rounded-lg" style={{ color: 'var(--text-muted)', background: 'rgba(244,63,94,0.04)', borderLeft: '2px solid var(--error)' }}>
          &ldquo;{entry.raw_transcript}&rdquo;
        </p>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-center my-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
          {Icons.sparkle}
          <span className="text-[10px] font-medium">Enhanced</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      {/* After */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--success)' }}>
          After — Optimized Prompt
        </p>
        <p className="text-xs leading-[1.7] px-3 py-2 rounded-lg" style={{ color: 'var(--text-primary)', background: 'rgba(16,185,129,0.04)', borderLeft: '2px solid var(--success)' }}>
          {entry.optimized_prompt}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => onCopy(entry.optimized_prompt)}
          className="text-[10px] font-medium px-2.5 py-1 rounded-lg"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
        >
          Copy prompt
        </button>
        {entry.is_favorite && (
          <span className="text-[10px]" style={{ color: 'var(--accent)' }}>★ Favorite</span>
        )}
      </div>
    </div>
  );
}

export default function Overlay({ onOpenSettings, theme, onToggleTheme }) {
  const { isRecording, audioBlob, toggleRecording } = useRecording();
  const { history, loadHistory, optimize, toggleFav, remove, copy, sendLLM } = usePrompts();
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [category, setCategory] = useState('general');
  const [view, setView] = useState('main'); // main | history | feed
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [sessionLog, setSessionLog] = useState([]); // live session activity
  const scrollRef = useRef(null);

  useEffect(() => { onToggleRecording(() => toggleRecording()); }, [toggleRecording]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Auto-scroll feed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessionLog, status]);

  useEffect(() => {
    if (!audioBlob) return;
    const run = async () => {
      setError(null);
      setStatus('transcribing');
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const raw = await transcribeAudio(arrayBuffer);
        if (!raw) throw new Error('No speech detected. Try again.');
        setTranscript(raw);
        setStatus('optimizing');
        const result = await optimize(raw, category);
        const entry = {
          ...result,
          raw_transcript: raw,
          optimized_prompt: result.optimized,
          category,
          created_at: new Date().toISOString(),
        };
        setCurrentPrompt(entry);
        setSessionLog((prev) => [...prev, entry]);
        setStatus('idle');
        await loadHistory();
      } catch (err) {
        setError(err.message || 'Something went wrong. Check your API keys.');
        setStatus('error');
      }
    };
    run();
  }, [audioBlob, category, optimize, loadHistory]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000); };
  const handleCopy = (text) => { copy(text); showToast('Copied to clipboard'); };

  return (
    <div className="w-full max-w-[700px]">
      {toast && <div className="toast" style={{ background: 'var(--success)', color: '#fff' }}>{toast}</div>}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 mb-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-3))' }} />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-30" style={{ background: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-bold tracking-tight gradient-text">VerbyPrompt</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onToggleTheme} className="icon-btn">{theme === 'dark' ? Icons.sun : Icons.moon}</button>
          <button
            onClick={() => setView(view === 'main' ? 'feed' : view === 'feed' ? 'history' : 'main')}
            className="icon-btn"
            title={view === 'main' ? 'Activity Feed' : view === 'feed' ? 'Full History' : 'Back'}
          >
            {view === 'history' ? Icons.back : Icons.history}
          </button>
          <button onClick={onOpenSettings} className="icon-btn">{Icons.settings}</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 mx-5 mb-4 p-1 rounded-xl" style={{ background: 'var(--bg-card)' }}>
        {[
          { key: 'main', label: 'Prompt' },
          { key: 'feed', label: 'Activity' },
          { key: 'history', label: 'History' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center transition-all"
            style={view === tab.key
              ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }
              : { color: 'var(--text-muted)' }
            }
          >
            {tab.label}
            {tab.key === 'feed' && sessionLog.length > 0 && (
              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
                {sessionLog.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* === PROMPT TAB === */}
      {view === 'main' && (
        <div className="px-5 pb-5">
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)} className={`pill-btn capitalize ${category === cat ? 'active' : ''}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center mb-4">
            {(status === 'idle' || status === 'error') && !currentPrompt && (
              <>
                <button
                  onClick={() => { setError(null); setStatus('idle'); toggleRecording(); }}
                  className={`rec-btn flex items-center gap-4 shine-on-hover ${isRecording ? 'recording' : ''}`}
                >
                  {isRecording ? (
                    <div className="flex items-center gap-4">
                      <Waveform />
                      <span className="text-sm font-medium" style={{ color: 'var(--error)' }}>Listening... click to stop</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-2.5 rounded-xl" style={{ background: 'var(--accent-subtle)' }}>
                        <MicIcon color="var(--accent)" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium block" style={{ color: 'var(--text-primary)' }}>Tap to speak</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>or hold Option + Space</span>
                      </div>
                    </>
                  )}
                </button>
                {error && (
                  <div className="mt-4 px-4 py-3 rounded-xl text-xs max-w-md text-center prompt-reveal"
                    style={{ background: 'rgba(244,63,94,0.06)', color: 'var(--error)', border: '1px solid rgba(244,63,94,0.12)' }}>
                    {error}
                  </div>
                )}

                {/* Session stats */}
                {sessionLog.length > 0 && (
                  <div className="mt-5 flex gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold gradient-text">{sessionLog.length}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Prompts crafted</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: 'var(--success)' }}>
                        {Math.round(sessionLog.reduce((acc, e) => acc + (e.optimized_prompt?.length || 0) - (e.raw_transcript?.length || 0), 0) / Math.max(sessionLog.length, 1))}+
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg chars added</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {status === 'transcribing' && (
              <div className="flex flex-col items-center gap-4 py-6 prompt-reveal">
                <LoadingDots />
                <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Transcribing your voice...</p>
              </div>
            )}

            {status === 'optimizing' && (
              <div className="flex flex-col items-center gap-4 py-6 prompt-reveal">
                <p className="text-xs italic px-6 text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  &ldquo;{transcript}&rdquo;
                </p>
                <LoadingDots />
                <p className="text-sm font-medium gradient-text">Crafting the perfect prompt...</p>
              </div>
            )}
          </div>

          {currentPrompt && status === 'idle' && (
            <div className="prompt-reveal">
              <PromptCard prompt={currentPrompt} onCopy={handleCopy} onSendLLM={sendLLM} onToggleFav={toggleFav} onDelete={remove} />
              <button
                onClick={() => { setCurrentPrompt(null); setTranscript(''); setError(null); }}
                className="w-full py-3 text-xs font-medium rounded-xl mt-2 glass-card-sm"
              >
                + New prompt
              </button>
            </div>
          )}
        </div>
      )}

      {/* === ACTIVITY FEED TAB === */}
      {view === 'feed' && (
        <div className="px-5 pb-5 overflow-y-auto max-h-[420px]" ref={scrollRef}>
          {sessionLog.length === 0 && history.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-4 prompt-reveal">
              <div className="p-4 rounded-2xl" style={{ background: 'var(--accent-subtle)' }}>
                <MicIcon size={28} color="var(--accent)" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No activity yet</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Speak a prompt to see before → after transformations</p>
              </div>
            </div>
          ) : (
            <>
              {/* Session activity */}
              {sessionLog.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                    This Session
                  </p>
                  {sessionLog.map((entry, i) => (
                    <ActivityItem key={i} entry={entry} onCopy={handleCopy} />
                  ))}
                </div>
              )}

              {/* Past history as timeline */}
              {history.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                    Previous
                  </p>
                  {history.slice(0, 10).map((entry) => (
                    <ActivityItem key={entry.id} entry={entry} onCopy={handleCopy} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === HISTORY TAB === */}
      {view === 'history' && (
        <div className="px-5 pb-5 overflow-y-auto max-h-[420px]">
          {history.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-4 prompt-reveal">
              <div className="p-4 rounded-2xl" style={{ background: 'var(--accent-subtle)' }}>
                <MicIcon size={28} color="var(--accent)" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No prompts yet</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your prompt history will appear here</p>
              </div>
            </div>
          ) : (
            history.map((p, i) => (
              <div key={p.id} className="prompt-reveal" style={{ animationDelay: `${i * 40}ms` }}>
                <PromptCard prompt={p} onCopy={handleCopy} onSendLLM={sendLLM} onToggleFav={toggleFav} onDelete={remove} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
