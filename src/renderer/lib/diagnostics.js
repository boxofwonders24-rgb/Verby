import { getDiagnostics, getRecentLogs, getSettings, getPlatform, checkPermissions } from './ipc.js'

const SENSITIVE_SETTING_KEYS = ['licenseEmail', 'licenseKey', '_clearHistory']

function sanitizeSettings(settings) {
  const sanitized = {}
  for (const [key, value] of Object.entries(settings)) {
    if (SENSITIVE_SETTING_KEYS.includes(key)) continue
    if (typeof value === 'string' && value.includes('@')) continue
    sanitized[key] = value
  }
  return sanitized
}

export async function collectDiagnostics() {
  const [diagnostics, logs, settings, platform, permissions] = await Promise.all([
    getDiagnostics(),
    getRecentLogs(),
    getSettings(),
    getPlatform(),
    checkPermissions(),
  ])

  return {
    app_version: diagnostics.appVersion,
    os_info: diagnostics.osInfo,
    permissions: {
      isMac: platform.isMac,
      isWindows: platform.isWindows,
      features: platform.features || {},
      microphone: permissions?.microphone || false,
      accessibility: permissions?.accessibility || false,
    },
    settings_snapshot: sanitizeSettings(settings),
    error_logs: logs,
  }
}
