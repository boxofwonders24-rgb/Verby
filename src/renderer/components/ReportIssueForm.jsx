import { useState, useRef } from 'react'
import { submitReport } from '../lib/report.js'

const CATEGORIES = [
  { value: 'Setup', label: 'Setup & Permissions' },
  { value: 'Transcription', label: 'Transcription' },
  { value: 'App Behavior', label: 'App Behavior' },
  { value: 'Account', label: 'Account & Billing' },
  { value: 'Other', label: 'Other' }
]

const SEVERITIES = [
  { value: 'annoying', label: 'Annoying but works' },
  { value: 'blocking', label: 'Blocks me from working' },
  { value: 'crashed', label: 'App crashed' }
]

export default function ReportIssueForm({ onClose, onSubmitted }) {
  const [category, setCategory] = useState('Other')
  const [severity, setSeverity] = useState('annoying')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const charCount = description.replace(/<[^>]*>/g, '').trim().length

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await submitReport({
      category,
      severity,
      description,
      screenshotFile: screenshot
    })

    setSubmitting(false)

    if (result.success) {
      onSubmitted()
    } else {
      setError(result.error)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Only PNG or JPG files are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB.')
      return
    }
    setError(null)
    setScreenshot(file)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        Report an Issue
      </h3>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Your report includes diagnostic info to help us fix the issue faster.
      </p>

      {/* Category */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Category</span>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </label>

      {/* Severity */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Severity</legend>
        {SEVERITIES.map(s => (
          <label key={s.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="severity"
              value={s.value}
              checked={severity === s.value}
              onChange={() => setSeverity(s.value)}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
          </label>
        ))}
      </fieldset>

      {/* Description */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          What happened? <span style={{ color: 'var(--text-muted)' }}>({charCount}/2000)</span>
        </span>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the issue in detail..."
          rows={4}
          maxLength={2000}
          className="px-3 py-2 rounded-lg text-sm resize-none"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
      </label>

      {/* Screenshot */}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Screenshot <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
        </span>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm"
          style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border)',
            color: 'var(--text-secondary)'
          }}
          onClick={() => fileRef.current?.click()}
        >
          {screenshot ? screenshot.name : 'Click to attach PNG or JPG (max 5MB)'}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {/* Error */}
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--error)' }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-3 py-2 rounded-xl text-sm"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || charCount < 10}
          className="flex-1 px-3 py-2 rounded-xl text-sm font-medium"
          style={{
            background: submitting || charCount < 10
              ? 'var(--bg-elevated)'
              : 'linear-gradient(135deg, var(--gradient-1), var(--gradient-2))',
            color: submitting || charCount < 10 ? 'var(--text-muted)' : '#fff',
            border: 'none',
            cursor: submitting || charCount < 10 ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting ? 'Sending...' : 'Submit Report'}
        </button>
      </div>
    </form>
  )
}
