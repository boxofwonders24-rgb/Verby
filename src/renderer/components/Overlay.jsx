import React, { useState, useEffect, useRef } from 'react';
import PromptCard from './PromptCard';
import Logo from './Logo';
import useRecording from '../hooks/useRecording';
import usePrompts from '../hooks/usePrompts';
import useDictation from '../hooks/useDictation';
import { transcribeAudio, onToggleRecording, chatOptimize, setContext, getContext, onOpenSettings } from '../lib/ipc';
import { intelligenceGenerate, intelligenceRecordCopy } from '../lib/ipc';
import MemoryInspector from './MemoryInspector';
import HelpPanel from './HelpPanel.jsx';

const CATEGORIES = ['general', 'business', 'coding', 'marketing', 'creative', 'research', 'automation'];

const QUICK_STARTS = [
  { icon: '✉️', title: 'Write an Email', desc: 'Professional email with the right tone', prompt: 'Write a professional email about ' },
  { icon: '💬', title: 'Slack Message', desc: 'Quick, clear team communication', prompt: 'Write a clear Slack message about ' },
  { icon: '📝', title: 'Meeting Notes', desc: 'Summarize key points & actions', prompt: 'Summarize meeting notes about ' },
  { icon: '🧠', title: 'Brainstorm', desc: 'Expand and refine your ideas', prompt: 'Help me brainstorm ideas for ' },
  { icon: '💻', title: 'Code Docs', desc: 'Clean up code explanations', prompt: 'Write clear documentation for ' },
  { icon: '📣', title: 'Social Post', desc: 'Engaging copy for any platform', prompt: 'Write an engaging social post about ' },
];

const TONES = [
  { emoji: '🎯', label: 'Direct', desc: 'Clear & concise' },
  { emoji: '👔', label: 'Formal', desc: 'Professional' },
  { emoji: '😊', label: 'Casual', desc: 'Friendly & warm' },
];

const USE_CASES = [
  { icon: '💼', label: 'Work', desc: 'Emails, reports, presentations', bg: 'rgba(99,102,241,0.1)' },
  { icon: '🏠', label: 'Personal', desc: 'Texts, social media, casual notes', bg: 'rgba(16,185,129,0.1)' },
  { icon: '🎨', label: 'Creative', desc: 'Blog posts, stories, marketing copy', bg: 'rgba(244,63,94,0.1)' },
  { icon: '💻', label: 'Technical', desc: 'Documentation, code comments, specs', bg: 'rgba(234,179,8,0.1)' },
];

const MicIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const Icons = {
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
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

export default function Overlay({ onOpenSettings, theme, onToggleTheme }) {
  const { isRecording, audioBlob, toggleRecording } = useRecording();
  const { history, loadHistory, optimize, toggleFav, remove, copy, sendLLM } = usePrompts();
  const { isDictating, dictationStatus, dictationLog, toggleDictation } = useDictation();
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [category, setCategory] = useState('general');
  const [view, setView] = useState('home'); // home | styles | history
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [sessionLog, setSessionLog] = useState([]);
  const [lastHint, setLastHint] = useState(null);
  const [showInspector, setShowInspector] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
  const chatInputRef = useRef(null);

  useEffect(() => { onToggleRecording(() => toggleRecording()); }, [toggleRecording]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setShowInspector(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        let msg = err.message || 'Something went wrong.';
        if (msg.includes('Error invoking remote method')) {
          msg = 'API keys not configured. Go to Settings and add your OpenAI and/or Anthropic API keys.';
        }
        setError(msg);
        setStatus('error');
      }
    };
    run();
  }, [audioBlob, category, optimize, loadHistory]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000); };
  const handleCopy = (text) => {
    copy(text);
    showToast('Copied to clipboard');
    if (lastHint) {
      intelligenceRecordCopy({ hint: lastHint });
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.elements.chatInput;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    setError(null);
    setStatus('optimizing');
    setTranscript(text);
    try {
      const settings = await window.verby.getSettings();
      if (settings.useIntelligenceEngine) {
        const result = await intelligenceGenerate({ text, provider: settings.defaultProvider });
        setLastHint(result.hint || null);
        const entry = {
          ...result,
          raw_transcript: text,
          optimized_prompt: result.output,
          category: result.category || 'general',
          created_at: new Date().toISOString(),
        };
        setCurrentPrompt(entry);
        setSessionLog((prev) => [...prev, entry]);
        setStatus('idle');
        await loadHistory();
      } else {
        const result = await chatOptimize(text);
        const entry = {
          ...result,
          raw_transcript: text,
          optimized_prompt: result.optimized,
          category: result.category || 'general',
          created_at: new Date().toISOString(),
        };
        setCurrentPrompt(entry);
        setSessionLog((prev) => [...prev, entry]);
        setStatus('idle');
        await loadHistory();
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const filteredHistory = history.filter((p) => {
    const matchesSearch = historySearch === '' ||
      (p.optimized_prompt || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (p.raw_transcript || '').toLowerCase().includes(historySearch.toLowerCase());
    const matchesFilter = historyFilter === 'all' || p.category === historyFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full max-w-[700px]">
      {toast && <div className="toast" style={{ background: 'var(--success)', color: '#fff' }}>{toast}</div>}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 mb-1">
        <div className="flex items-center gap-3">
          <Logo size={72} />
          <span className="font-logo text-lg" style={{ background: 'linear-gradient(to right, #fff, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Verby</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowHelp(true)}
            className="icon-btn"
            title="Help"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
          <button onClick={onOpenSettings} className="icon-btn" title="Settings">{Icons.settings}</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar mx-5 mb-5">
        {[
          { key: 'home', label: '✦ Prompt' },
          { key: 'styles', label: 'Styles' },
          { key: 'history', label: 'History' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`tab-item font-heading ${view === tab.key ? 'tab-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === HOME — Prompt tab === */}
      {view === 'home' && (
        <div className="px-5 pb-5 smooth-scroll" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>

          {/* Mic hero — only when idle and no result */}
          {(status === 'idle' || status === 'error') && !currentPrompt && (
            <div className="flex flex-col items-center gap-3 mb-6">
              {/* Ambient glow + mic button */}
              <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
                {/* Glow ring */}
                <div style={{
                  position: 'absolute',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                  opacity: 0.6,
                }} />
                <button
                  onClick={toggleDictation}
                  className={`w-24 h-24 rounded-full flex items-center justify-center shine-on-hover ${isDictating ? 'recording' : ''}`}
                  style={{
                    background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
                    boxShadow: '0 4px 24px var(--accent-glow)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {isDictating ? <Waveform /> : <MicIcon size={32} color="#fff" />}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sora, inherit)' }}>
                {isDictating
                  ? (dictationStatus === 'processing' ? 'Processing...' : 'Release Fn or click to stop')
                  : 'Hold Fn to speak'}
              </p>
            </div>
          )}

          {/* Text input bar */}
          <form onSubmit={handleChatSubmit}>
            <div className="flex gap-2 mb-5 p-1 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <input
                ref={chatInputRef}
                name="chatInput"
                type="text"
                placeholder="Type a prompt to optimize..."
                className="flex-1 px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold shine-on-hover"
                style={{ background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))', color: '#fff', boxShadow: '0 2px 10px var(--accent-glow)' }}
              >
                ✦
              </button>
            </div>
          </form>

          {/* Status — transcribing/optimizing */}
          {status === 'transcribing' && (
            <div className="flex flex-col items-center gap-4 py-8 prompt-reveal">
              <LoadingDots />
              <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Transcribing...</p>
            </div>
          )}

          {status === 'optimizing' && (
            <div className="flex flex-col items-center gap-4 py-8 prompt-reveal">
              <p className="text-xs italic px-6 text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                &ldquo;{transcript}&rdquo;
              </p>
              <LoadingDots />
              <p className="text-sm font-medium gradient-text">Optimizing...</p>
            </div>
          )}

          {/* Result card */}
          {currentPrompt && status === 'idle' && (
            <div className="prompt-reveal mb-4">
              <PromptCard prompt={currentPrompt} onCopy={handleCopy} onSendLLM={sendLLM} onToggleFav={toggleFav} onDelete={remove} />
              <button
                onClick={() => { setCurrentPrompt(null); setTranscript(''); setError(null); }}
                className="w-full py-3 text-xs font-medium rounded-xl mt-2 glass-card-sm"
              >
                + New prompt
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-xs text-center prompt-reveal"
              style={{ background: 'rgba(244,63,94,0.06)', color: 'var(--error)', border: '1px solid rgba(244,63,94,0.12)' }}>
              {error}
            </div>
          )}

          {/* Quick Start grid */}
          {(status === 'idle' || status === 'error') && !currentPrompt && (
            <div>
              <p className="section-header mb-3">Quick Start</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_STARTS.map((qs) => (
                  <button
                    key={qs.title}
                    className="glass-card-sm p-3 text-left prompt-reveal"
                    onClick={() => {
                      if (chatInputRef.current) {
                        chatInputRef.current.value = qs.prompt;
                        chatInputRef.current.focus();
                      }
                    }}
                  >
                    <span className="text-xl block mb-1">{qs.icon}</span>
                    <span className="font-heading text-xs block mb-0.5" style={{ color: 'var(--text-primary)' }}>{qs.title}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{qs.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === STYLES TAB === */}
      {view === 'styles' && (
        <div className="px-5 pb-5 smooth-scroll" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>

          {/* Writing Tone */}
          <p className="section-header mb-3">Writing Tone</p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {TONES.map((tone) => (
              <button
                key={tone.label}
                onClick={() => setCategory(tone.label.toLowerCase())}
                className="glass-card-sm p-4 text-center prompt-reveal"
                style={category === tone.label.toLowerCase() ? { borderColor: 'var(--accent)', borderWidth: 1 } : {}}
              >
                <span className="text-2xl block mb-1">{tone.emoji}</span>
                <span className="font-heading text-xs block mb-0.5" style={{ color: 'var(--text-primary)' }}>{tone.label}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{tone.desc}</span>
              </button>
            ))}
          </div>

          {/* Use Case */}
          <p className="section-header mb-3">Use Case</p>
          <div className="flex flex-col gap-2">
            {USE_CASES.map((uc) => {
              const isSelected = category === uc.label.toLowerCase();
              return (
                <button
                  key={uc.label}
                  onClick={() => setCategory(uc.label.toLowerCase())}
                  className="glass-card-sm p-3 flex items-center gap-3 text-left prompt-reveal"
                  style={isSelected ? { borderLeft: '3px solid var(--accent)' } : { borderLeft: '3px solid transparent' }}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl text-xl flex-shrink-0" style={{ background: uc.bg }}>
                    {uc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-heading text-xs block" style={{ color: 'var(--text-primary)' }}>{uc.label}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{uc.desc}</span>
                  </div>
                  {isSelected && (
                    <span className="text-sm flex-shrink-0" style={{ color: 'var(--accent)' }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === HISTORY TAB === */}
      {view === 'history' && (
        <div className="px-5 pb-5 smooth-scroll" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>

          {/* Search bar */}
          <div className="glass-card-sm flex items-center gap-2 px-3 py-2 mb-3">
            <span className="text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search prompts..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap mb-4">
            {['all', ...CATEGORIES].map((cat) => {
              const isActive = historyFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setHistoryFilter(cat)}
                  className="font-heading text-[10px] px-3 py-1 rounded-full"
                  style={isActive
                    ? { background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))', color: '#fff' }
                    : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                  }
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              );
            })}
          </div>

          {/* History items */}
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-4 prompt-reveal">
              <div className="p-4 rounded-2xl" style={{ background: 'var(--accent-subtle)' }}>
                <MicIcon size={28} color="var(--accent)" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No prompts found</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {historySearch || historyFilter !== 'all' ? 'Try adjusting your search or filter' : 'Your prompt history will appear here'}
                </p>
              </div>
            </div>
          ) : (
            filteredHistory.map((p, i) => (
              <div key={p.id} className="prompt-reveal" style={{ animationDelay: `${i * 40}ms` }}>
                <PromptCard prompt={p} onCopy={handleCopy} onSendLLM={sendLLM} onToggleFav={toggleFav} onDelete={remove} />
              </div>
            ))
          )}
        </div>
      )}

      <MemoryInspector
        visible={showInspector}
        onClose={() => setShowInspector(false)}
      />
      {showHelp && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 340,
          height: '100%',
          zIndex: 9999,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
          borderLeft: '1px solid var(--border)'
        }}>
          <HelpPanel onClose={() => setShowHelp(false)} />
        </div>
      )}
    </div>
  );
}
