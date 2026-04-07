import { createClient } from '@supabase/supabase-js'
import { collectDiagnostics } from './diagnostics.js'
import { authGetSessionTokens } from './ipc.js'

const SUPABASE_URL = 'https://xixefdlmnfpyxopzotne.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpeGVmZGxtbmZweXhvcHpvdG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODc1MjMsImV4cCI6MjA4OTQ2MzUyM30.QIPct51hKESfJa0X8yylXFJj_F-5fV_1zwsvz6DPxOk'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const reportTimestamps = []

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ')
}

function isRateLimited() {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  while (reportTimestamps.length > 0 && reportTimestamps[0] < cutoff) {
    reportTimestamps.shift()
  }
  return reportTimestamps.length >= RATE_LIMIT_MAX
}

export async function submitReport({ category, severity, description, screenshotFile }) {
  if (isRateLimited()) {
    return { success: false, error: 'Rate limit reached. Please try again later.' }
  }

  const cleanDescription = stripHtml(description).trim()
  if (cleanDescription.length < 10) {
    return { success: false, error: 'Please provide at least 10 characters of detail.' }
  }
  if (cleanDescription.length > 2000) {
    return { success: false, error: 'Description must be under 2000 characters.' }
  }

  const validCategories = ['Setup', 'Transcription', 'App Behavior', 'Account', 'Other']
  if (!validCategories.includes(category)) {
    return { success: false, error: 'Invalid category.' }
  }

  const validSeverities = ['annoying', 'blocking', 'crashed']
  if (!validSeverities.includes(severity)) {
    return { success: false, error: 'Invalid severity.' }
  }

  const tokens = await authGetSessionTokens()
  if (!tokens) {
    return { success: false, error: 'You must be signed in to submit a report.' }
  }

  const { data: { session }, error: sessionError } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  })
  if (sessionError || !session) {
    return { success: false, error: 'Authentication failed. Please sign in again.' }
  }

  const diagnostics = await collectDiagnostics()

  let screenshotUrl = null
  if (screenshotFile) {
    const validTypes = ['image/png', 'image/jpeg']
    if (!validTypes.includes(screenshotFile.type)) {
      return { success: false, error: 'Screenshot must be PNG or JPG.' }
    }
    if (screenshotFile.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Screenshot must be under 5MB.' }
    }

    const fileName = `${session.user.id}/${Date.now()}-${screenshotFile.name}`
    const { error: uploadError } = await supabase.storage
      .from('issue-screenshots')
      .upload(fileName, screenshotFile)

    if (uploadError) {
      return { success: false, error: 'Failed to upload screenshot. Please try again.' }
    }
    screenshotUrl = fileName
  }

  const { error: insertError } = await supabase
    .from('issue_reports')
    .insert({
      user_id: session.user.id,
      category,
      severity,
      description: cleanDescription,
      screenshot_url: screenshotUrl,
      app_version: diagnostics.app_version,
      os_info: diagnostics.os_info,
      permissions: diagnostics.permissions,
      settings_snapshot: diagnostics.settings_snapshot,
      error_logs: diagnostics.error_logs,
      status: 'new'
    })

  if (insertError) {
    return { success: false, error: 'Failed to submit report. Please try again.' }
  }

  reportTimestamps.push(Date.now())
  return { success: true }
}
