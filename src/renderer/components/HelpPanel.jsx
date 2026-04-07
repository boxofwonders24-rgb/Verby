import { useState, useMemo, useEffect } from 'react'
import helpContent from '../../../site/data/help-content.json'
import ReportIssueForm from './ReportIssueForm.jsx'
import { getAppVersion } from '../lib/ipc.js'

export default function HelpPanel({ onClose }) {
  const [search, setSearch] = useState('')
  const [openArticle, setOpenArticle] = useState(null)
  const [view, setView] = useState('help')
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    getAppVersion().then(v => setAppVersion(v))
  }, [])

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return helpContent.categories
    return helpContent.categories
      .map(cat => ({
        ...cat,
        articles: cat.articles.filter(a =>
          a.question.toLowerCase().includes(q) ||
          a.tags.some(t => t.includes(q))
        )
      }))
      .filter(cat => cat.articles.length > 0)
  }, [search])

  if (view === 'report') {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setView('help')}
            className="text-sm flex items-center gap-1"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <button
            onClick={onClose}
            className="text-sm"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ReportIssueForm
            onClose={() => setView('help')}
            onSubmitted={() => setView('submitted')}
          />
        </div>
      </div>
    )
  }

  if (view === 'submitted') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-4xl">✓</div>
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Report Submitted</h3>
        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          Thanks for helping us improve Verby. We'll look into this.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium mt-2"
          style={{
            background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold">Help</h2>
        <button
          onClick={onClose}
          className="text-sm"
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      {/* Report button */}
      <div className="px-4 pt-3">
        <button
          onClick={() => setView('report')}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Report an Issue
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search help..."
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filteredCategories.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            No articles found. Try a different search.
          </p>
        ) : (
          filteredCategories.map(cat => (
            <div key={cat.id} className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                {cat.icon} {cat.title}
              </h3>
              <div className="flex flex-col" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {cat.articles.map((article, i) => (
                  <div key={article.id}>
                    {i > 0 && <div style={{ borderTop: '1px solid var(--border)' }} />}
                    <button
                      onClick={() => setOpenArticle(openArticle === article.id ? null : article.id)}
                      className="w-full text-left px-3 py-2.5 text-sm flex justify-between items-center gap-2"
                      style={{
                        background: openArticle === article.id ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{article.question}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>
                        {openArticle === article.id ? '▲' : '▼'}
                      </span>
                    </button>
                    {openArticle === article.id && (
                      <div
                        className="px-3 py-2.5 text-xs leading-relaxed"
                        style={{
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          borderTop: '1px solid var(--border)'
                        }}
                        dangerouslySetInnerHTML={{ __html: article.answer }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Verby v{appVersion || '–'}
        </span>
      </div>
    </div>
  )
}
