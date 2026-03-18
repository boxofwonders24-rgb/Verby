import React, { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import SettingsPanel from './components/SettingsPanel';
import { getSettings, setSetting } from './lib/ipc';

export default function App() {
  const [view, setView] = useState('main');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    getSettings().then((s) => {
      if (s && s.theme) setTheme(s.theme);
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setSetting('theme', next);
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col relative overflow-hidden ${theme === 'light' ? 'light' : ''}`}
      style={{ background: 'var(--bg-primary)', borderRadius: '12px' }}
    >
      {/* Ambient aurora background */}
      <div className="aurora-bg">
        <div className="aurora-orb" />
        <div className="aurora-orb" />
        <div className="aurora-orb" />
      </div>

      {/* Draggable title bar — taller for hiddenInset traffic lights */}
      <div className="h-10 w-full flex-shrink-0 relative z-10" style={{ WebkitAppRegion: 'drag' }} />

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-5 pb-5 overflow-hidden relative z-10">
        {view === 'main' && (
          <Overlay
            onOpenSettings={() => setView('settings')}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
        {view === 'settings' && (
          <div className="w-full max-w-[640px] glass-card overflow-hidden prompt-reveal">
            <SettingsPanel onBack={() => setView('main')} />
          </div>
        )}
      </div>
    </div>
  );
}
