import React, { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import SettingsPanel from './components/SettingsPanel';
import Onboarding from './components/Onboarding';
import SignIn from './components/SignIn';
import { getSettings, setSetting, onOpenSettings, authGetState, onAuthStateChanged } from './lib/ipc';

export default function App() {
  const [view, setView] = useState('loading'); // loading | signin | onboarding | main | settings
  const [theme, setTheme] = useState('dark');
  const [auth, setAuth] = useState({ isAuthenticated: false, email: null });

  useEffect(() => {
    // Check auth + settings in parallel
    Promise.all([authGetState(), getSettings()])
      .then(([authState, settings]) => {
        setAuth(authState);
        if (settings && settings.theme) setTheme(settings.theme);

        if (!authState.isAuthenticated) {
          setView('signin');
        } else if (settings && settings.onboardingComplete) {
          setView('main');
        } else {
          setView('onboarding');
        }
      })
      .catch((err) => {
        console.error('Startup error:', err);
        // If auth fails, show sign-in so the app isn't stuck on black screen
        setView('signin');
      });

    // Listen for auth state changes (e.g., OAuth callback)
    const cleanupAuth = onAuthStateChanged((state) => {
      setAuth(state);
      if (state.isAuthenticated) {
        getSettings().then((s) => {
          setView(s && s.onboardingComplete ? 'main' : 'onboarding');
        });
      }
    });

    // Handle tray "Settings" click from any view
    const cleanupSettings = onOpenSettings(() => {
      if (auth.isAuthenticated) setView('settings');
    });

    return () => {
      if (cleanupAuth) cleanupAuth();
      if (cleanupSettings) cleanupSettings();
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setSetting('theme', next);
  };

  const handleSignedIn = (authState) => {
    setAuth(authState);
    getSettings().then((s) => {
      setView(s && s.onboardingComplete ? 'main' : 'onboarding');
    });
  };

  if (view === 'loading') return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#050508' }}>
      <p style={{ color: '#6366F1', fontSize: '18px', fontWeight: 700 }}>Verby</p>
    </div>
  );

  return (
    <div
      className={`h-screen w-screen flex flex-col relative ${theme === 'light' ? 'light' : ''}`}
      style={{ background: 'var(--bg-primary)' }}
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
        {view === 'signin' && (
          <SignIn onSignedIn={handleSignedIn} />
        )}
        {view === 'onboarding' && (
          <Onboarding onComplete={() => setView('main')} />
        )}
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
