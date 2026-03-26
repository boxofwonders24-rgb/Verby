import React, { useState, useEffect, useCallback } from 'react';
import { checkPermissions, requestMicrophone, openSystemPrefs, setSetting, onFnPermissionNeeded, getPlatform } from '../lib/ipc';

const welcomeIcon = (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="12" fill="url(#grad)" />
    <path d="M24 14v10m0 0v10m0-10h10m-10 0H14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    <defs><linearGradient id="grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#6366F1" /><stop offset="1" stopColor="#8B5CF6" /></linearGradient></defs>
  </svg>
);

const readyIcon = (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="12" fill="#10B981" />
    <path d="M15 24l7 7 11-14" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function buildSteps(platformInfo) {
  const isMac = platformInfo?.isMac ?? true;
  const isWindows = platformInfo?.isWindows ?? false;

  const welcomeSubtitle = isMac
    ? 'Voice to text, everywhere on your Mac.'
    : isWindows
      ? 'Voice to text, everywhere on your PC.'
      : 'Voice to text, everywhere.';

  const welcomeDescription = isWindows
    ? 'Verby lives in your system tray. Hold a hotkey and speak — your words appear wherever your cursor is, enhanced by AI.'
    : 'Verby lives in your menu bar. Hold Fn and speak — your words appear wherever your cursor is, enhanced by AI.';

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Verby',
      subtitle: welcomeSubtitle,
      description: welcomeDescription,
      icon: welcomeIcon,
    },
    {
      id: 'microphone',
      title: 'Microphone Access',
      subtitle: 'So Verby can hear you speak.',
      description: 'Verby records your voice when you hold Fn or Ctrl, transcribes it, and types the result. Nothing is stored on any server.',
      permissionKey: 'microphone',
      section: 'Privacy_Microphone',
    },
  ];

  if (isMac) {
    steps.push({
      id: 'input-monitoring',
      title: 'Input Monitoring',
      subtitle: 'So Verby can detect the Fn and Ctrl keys.',
      description: 'macOS requires this permission for any app that listens for global keyboard shortcuts. Verby only watches for Fn and Ctrl — nothing else.',
      permissionKey: 'inputMonitoring',
      section: 'Privacy_ListenEvent',
    });

    steps.push({
      id: 'accessibility',
      title: 'Accessibility',
      subtitle: 'So Verby can type text into any app.',
      description: 'After transcription, Verby pastes the result at your cursor position. This requires Accessibility access to simulate a Cmd+V keystroke.',
      permissionKey: 'accessibility',
      section: 'Privacy_Accessibility',
    });
  }

  steps.push({
    id: 'ready',
    title: "You're all set!",
    subtitle: 'Verby is ready to use.',
    description: null,
    icon: readyIcon,
  });

  return steps;
}

function PermissionIcon({ granted }) {
  if (granted) {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 10l4 4 6-8" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#6366F1" strokeWidth="2" />
        <path d="M10 7v3m0 3h.01" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [permissions, setPermissions] = useState({ microphone: false, accessibility: false });
  const [checking, setChecking] = useState(false);
  const [platformInfo, setPlatformInfo] = useState(null);

  useEffect(() => {
    getPlatform().then(setPlatformInfo).catch((err) => {
      console.error('Failed to get platform info:', err);
    });
  }, []);

  const refreshPermissions = useCallback(async () => {
    setChecking(true);
    try {
      const result = await checkPermissions();
      setPermissions(result);
    } catch (err) {
      console.error('Permission check failed:', err);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // Re-check permissions when window regains focus (user returns from System Settings)
  useEffect(() => {
    const handler = () => refreshPermissions();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [refreshPermissions]);

  const steps = buildSteps(platformInfo);
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const handleGrant = async () => {
    if (current.id === 'microphone') {
      await requestMicrophone();
      await refreshPermissions();
    } else if (current.section) {
      openSystemPrefs(current.section);
    }
  };

  const handleNext = () => {
    if (isLast) {
      setSetting('onboardingComplete', true);
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    setSetting('onboardingComplete', true);
    onComplete();
  };

  const isPermissionStep = !!current.permissionKey;
  const isGranted = isPermissionStep && (
    current.permissionKey === 'inputMonitoring'
      ? true // Can't check programmatically — let user proceed
      : permissions[current.permissionKey]
  );

  if (!platformInfo) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-[400px] text-center">
          <div className="flex justify-center mb-6">{welcomeIcon}</div>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Welcome to Verby
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const isMac = platformInfo.isMac;
  const isWindows = platformInfo.isWindows;

  const shortcuts = isMac
    ? [
        { key: 'Fn', label: 'Hold to dictate', desc: 'AI-enhanced writing' },
        { key: 'Ctrl', label: 'Hold to dictate', desc: 'Clean speech-to-text' },
        { key: 'Cmd+Shift+Space', label: 'Toggle dictation', desc: 'No permissions needed' },
      ]
    : [
        { key: 'CapsLock', label: 'Hold to dictate', desc: 'AI-enhanced writing' },
        { key: 'Right Ctrl', label: 'Hold to dictate', desc: 'Clean speech-to-text' },
        { key: 'Ctrl+Shift+Space', label: 'Toggle dictation', desc: 'Keyboard shortcut' },
      ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-[400px] text-center">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i === step ? 'var(--accent)' : i < step ? '#10B981' : 'var(--bg-elevated)',
                transform: i === step ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          {current.icon || <PermissionIcon granted={isGranted} />}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {current.title}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--accent)' }}>
          {current.subtitle}
        </p>

        {/* Description */}
        {current.description && (
          <p className="text-xs leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
            {current.description}
          </p>
        )}

        {/* Ready step — show shortcuts */}
        {current.id === 'ready' && (
          <div className="space-y-3 mb-8 text-left">
            {shortcuts.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>
                  {key}
                </span>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {isPermissionStep && !isGranted && (
            <button
              onClick={handleGrant}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
                color: '#fff',
                boxShadow: '0 2px 10px var(--accent-glow)',
              }}
            >
              {current.id === 'microphone' ? 'Grant Microphone Access' : 'Open System Settings'}
            </button>
          )}

          {isPermissionStep && isGranted && current.permissionKey !== 'inputMonitoring' && (
            <div className="flex items-center justify-center gap-2 py-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 8l3 3 5-6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-medium" style={{ color: '#10B981' }}>Permission granted</span>
            </div>
          )}

          {isPermissionStep && current.permissionKey === 'inputMonitoring' && (
            <button
              onClick={handleGrant}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
                color: '#fff',
                boxShadow: '0 2px 10px var(--accent-glow)',
              }}
            >
              Open System Settings
            </button>
          )}

          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={
              isLast
                ? { background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))', color: '#fff', boxShadow: '0 2px 10px var(--accent-glow)' }
                : { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
            }
          >
            {isLast ? 'Start Using Verby' : isPermissionStep ? 'Continue' : 'Next'}
          </button>

          {!isLast && !isFirst && (
            <button
              onClick={handleSkip}
              className="text-[11px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Skip setup — I'll configure later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
