import React, { useState, useEffect } from 'react';
import { intelligenceInspector } from '../lib/ipc';

const TABS = [
  { key: 'entities', label: 'Entities' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'signals', label: 'Learned Signals' },
];

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5, 5, 8, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  panel: {
    width: '90vw',
    maxWidth: 900,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 16,
    background: 'rgba(5, 5, 8, 0.95)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.08)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.02em',
    color: '#e2e8f0',
    margin: 0,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    fontWeight: 500,
  },
  closeBtn: {
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  tabBar: {
    display: 'flex',
    gap: 2,
    padding: '8px 20px',
    borderBottom: '1px solid rgba(99, 102, 241, 0.08)',
  },
  tab: {
    padding: '8px 16px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    background: 'transparent',
    color: '#64748b',
  },
  tabActive: {
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#6366F1',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 4px',
  },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#64748b',
    borderBottom: '1px solid rgba(99, 102, 241, 0.08)',
  },
  td: {
    padding: '10px 12px',
    fontSize: 12,
    color: '#cbd5e1',
    background: 'rgba(15, 15, 25, 0.5)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 20px',
    color: '#475569',
    fontSize: 13,
    fontWeight: 500,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
  },
};

function EntitiesTab({ entities }) {
  if (!entities || entities.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No entities learned yet.</p>
        <p style={{ fontSize: 11, marginTop: 8, color: '#334155' }}>
          Entities are extracted from your prompts as you use Verby.
        </p>
      </div>
    );
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Name</th>
          <th style={styles.th}>Type</th>
          <th style={styles.th}>Mentions</th>
          <th style={styles.th}>Last Referenced</th>
          <th style={styles.th}>Metadata</th>
        </tr>
      </thead>
      <tbody>
        {entities.map((entity, i) => (
          <tr key={entity.name || i}>
            <td style={{ ...styles.td, color: '#6366F1', fontWeight: 600 }}>
              {entity.name}
            </td>
            <td style={styles.td}>
              <span style={{ ...styles.badge, background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
                {entity.type || 'unknown'}
              </span>
            </td>
            <td style={styles.td}>{entity.mentions ?? 0}</td>
            <td style={{ ...styles.td, fontSize: 11, color: '#64748b' }}>
              {entity.lastReferenced
                ? new Date(entity.lastReferenced).toLocaleDateString()
                : '--'}
            </td>
            <td style={{ ...styles.td, fontSize: 11, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entity.metadata
                ? (typeof entity.metadata === 'string' ? entity.metadata : JSON.stringify(entity.metadata))
                : '--'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PreferencesTab({ preferences }) {
  if (!preferences || preferences.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No output preferences detected yet.</p>
        <p style={{ fontSize: 11, marginTop: 8, color: '#334155' }}>
          Preferences are learned from your copy and regeneration patterns.
        </p>
      </div>
    );
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Pattern</th>
          <th style={styles.th}>Format</th>
          <th style={styles.th}>Tone</th>
          <th style={styles.th}>Detail</th>
          <th style={styles.th}>Success</th>
          <th style={styles.th}>Reject</th>
        </tr>
      </thead>
      <tbody>
        {preferences.map((pref, i) => (
          <tr key={pref.pattern || i}>
            <td style={{ ...styles.td, color: '#14B8A6', fontWeight: 600 }}>
              {pref.pattern}
            </td>
            <td style={styles.td}>{pref.format || '--'}</td>
            <td style={styles.td}>{pref.tone || '--'}</td>
            <td style={styles.td}>{pref.detail || '--'}</td>
            <td style={styles.td}>
              <span style={{ ...styles.badge, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                {pref.successCount ?? 0}
              </span>
            </td>
            <td style={styles.td}>
              <span style={{ ...styles.badge, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                {pref.rejectCount ?? 0}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SignalsTab({ signals }) {
  if (!signals || signals.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No learned signals yet.</p>
        <p style={{ fontSize: 11, marginTop: 8, color: '#334155' }}>
          Signals form as Verby observes patterns in your usage over time.
        </p>
      </div>
    );
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Trigger</th>
          <th style={styles.th}>Format</th>
          <th style={styles.th}>Tone</th>
          <th style={styles.th}>Confidence</th>
        </tr>
      </thead>
      <tbody>
        {signals.map((signal, i) => (
          <tr key={signal.trigger || i}>
            <td style={{ ...styles.td, color: '#f59e0b', fontWeight: 600 }}>
              {signal.trigger}
            </td>
            <td style={styles.td}>{signal.format || '--'}</td>
            <td style={styles.td}>{signal.tone || '--'}</td>
            <td style={styles.td}>
              <ConfidenceBar value={signal.confidence ?? 0} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color, minWidth: 30, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
}

export default function MemoryInspector({ visible, onClose }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('entities');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      intelligenceInspector()
        .then((result) => {
          setData(result);
          setLoading(false);
        })
        .catch(() => {
          setData(null);
          setLoading(false);
        });
    }
  }, [visible]);

  // Close on Esc
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  if (!visible) return null;

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.panel, alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <p style={{ color: '#6366F1', fontSize: 13, fontWeight: 600 }}>Loading intelligence data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.panel, alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>No intelligence data available.</p>
          <button onClick={onClose} style={{ ...styles.closeBtn, marginTop: 16 }}>Close</button>
        </div>
      </div>
    );
  }

  const tabContent = {
    entities: <EntitiesTab entities={data.entities} />,
    preferences: <PreferencesTab preferences={data.preferences} />,
    signals: <SignalsTab signals={data.signals} />,
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Memory Inspector</h2>
            <p style={styles.subtitle}>Intelligence Engine -- Dev Panel</p>
          </div>
          <button
            onClick={onClose}
            style={styles.closeBtn}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(99, 102, 241, 0.2)'; e.target.style.color = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.target.style.background = 'rgba(99, 102, 241, 0.1)'; e.target.style.color = '#94a3b8'; }}
          >
            ESC to close
          </button>
        </div>

        {/* Tab Bar */}
        <div style={styles.tabBar}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...styles.tab,
                ...(tab === t.key ? styles.tabActive : {}),
              }}
              onMouseEnter={(e) => {
                if (tab !== t.key) e.target.style.color = '#94a3b8';
              }}
              onMouseLeave={(e) => {
                if (tab !== t.key) e.target.style.color = '#64748b';
              }}
            >
              {t.label}
              {t.key === 'entities' && data.entities?.length > 0 && (
                <span style={{ marginLeft: 6, ...styles.badge, background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8' }}>
                  {data.entities.length}
                </span>
              )}
              {t.key === 'preferences' && data.preferences?.length > 0 && (
                <span style={{ marginLeft: 6, ...styles.badge, background: 'rgba(20, 184, 166, 0.12)', color: '#14B8A6' }}>
                  {data.preferences.length}
                </span>
              )}
              {t.key === 'signals' && data.signals?.length > 0 && (
                <span style={{ marginLeft: 6, ...styles.badge, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  {data.signals.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {tabContent[tab]}
        </div>
      </div>
    </div>
  );
}
