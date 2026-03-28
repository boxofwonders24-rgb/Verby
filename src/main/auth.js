// Supabase auth management for the Electron main process
const { createClient } = require('@supabase/supabase-js');
const { app, ipcMain } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Supabase credentials — env var takes priority, embedded fallback for packaged builds.
// The anon key is a public client key (safe to embed, same as putting it in frontend JS).
const SUPABASE_URL = process.env.SUPABASE_URL
  || 'https://xixefdlmnfpyxopzotne.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpeGVmZGxtbmZweXhvcHpvdG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODc1MjMsImV4cCI6MjA4OTQ2MzUyM30.QIPct51hKESfJa0X8yylXFJj_F-5fV_1zwsvz6DPxOk';

const AUTH_CALLBACK_PORT = 8914;
const AUTH_CALLBACK_URL = `http://localhost:${AUTH_CALLBACK_PORT}/auth/callback`;

let supabase = null;
let currentSession = null;
let mainWindow = null;
let callbackServer = null;

// Persistent session storage
function getSessionPath() {
  return path.join(app.getPath('userData'), 'auth-session.json');
}

function saveSession(session) {
  try {
    fs.writeFileSync(getSessionPath(), JSON.stringify(session, null, 2));
  } catch (err) {
    console.error('Failed to save session:', err.message);
  }
}

function loadSession() {
  try {
    const data = fs.readFileSync(getSessionPath(), 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function clearSession() {
  try { fs.unlinkSync(getSessionPath()); } catch {}
}

function initAuth(window) {
  mainWindow = window;

  // Always register IPC handlers so the renderer doesn't crash
  registerHandlers();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase not configured — auth disabled');
    return;
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // We handle persistence ourselves
    },
  });

  // Restore saved session
  const saved = loadSession();
  if (saved) {
    supabase.auth.setSession(saved).then(({ data, error }) => {
      if (error) {
        console.log('Saved session expired, clearing');
        clearSession();
        currentSession = null;
        notifyRenderer();
      } else {
        currentSession = data.session;
        console.log('Session restored for:', currentSession?.user?.email);
        notifyRenderer();
      }
    });
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    currentSession = session;
    if (session) {
      saveSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    } else {
      clearSession();
    }
    notifyRenderer();
  });
}

function notifyRenderer() {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('auth-state-changed', {
        isAuthenticated: !!currentSession,
        email: currentSession?.user?.email || null,
        userId: currentSession?.user?.id || null,
      });
    }
  } catch (err) {
    // Renderer may be disposed during app shutdown — ignore
  }
}

function getAccessToken() {
  return currentSession?.access_token || null;
}

function getAuthState() {
  return {
    isAuthenticated: !!currentSession,
    email: currentSession?.user?.email || null,
    userId: currentSession?.user?.id || null,
  };
}

// Start a temporary local HTTP server to catch OAuth callback
function startCallbackServer() {
  return new Promise((resolve, reject) => {
    if (callbackServer) {
      callbackServer.close();
      callbackServer = null;
    }

    callbackServer = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${AUTH_CALLBACK_PORT}`);

      if (url.pathname === '/auth/callback') {
        // Serve a page that extracts the hash fragment and sends it back
        // (hash fragments aren't sent to the server, so we need client-side JS)
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html><head><title>Verby — Signing in...</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #0a0a0f; color: #e5e5e5;
         display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { text-align: center; padding: 40px; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  p { font-size: 14px; color: #888; }
  .spinner { width: 24px; height: 24px; border: 3px solid #333; border-top-color: #6366f1;
             border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .done { color: #10b981; }
</style></head>
<body><div class="card">
  <h1>Verby</h1>
  <div class="spinner" id="spinner"></div>
  <p id="status">Signing you in...</p>
</div>
<script>
  const hash = window.location.hash.substring(1);
  if (hash) {
    fetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new URLSearchParams(hash)))
    }).then(() => {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('status').innerHTML = '<span class="done">Signed in! You can close this tab.</span>';
    });
  } else {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('status').textContent = 'No auth data received. Try again from the app.';
  }
</script></body></html>`);
      } else if (url.pathname === '/auth/token' && req.method === 'POST') {
        // Receive the tokens from the client-side JS
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');

          try {
            const tokens = JSON.parse(body);
            if (tokens.access_token && tokens.refresh_token) {
              const { data, error } = await supabase.auth.setSession({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
              });
              if (error) {
                console.error('OAuth token error:', error.message);
              } else {
                currentSession = data.session;
                console.log('OAuth signed in as:', currentSession?.user?.email);
                notifyRenderer();
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.show();
                  mainWindow.focus();
                }
              }
            }
          } catch (err) {
            console.error('Token parse error:', err.message);
          }

          // Shut down server after a short delay
          setTimeout(() => {
            if (callbackServer) {
              callbackServer.close();
              callbackServer = null;
              console.log('Auth callback server closed');
            }
          }, 2000);
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    callbackServer.listen(AUTH_CALLBACK_PORT, () => {
      console.log(`Auth callback server listening on port ${AUTH_CALLBACK_PORT}`);
      resolve();
    });

    callbackServer.on('error', (err) => {
      console.error('Callback server error:', err.message);
      callbackServer = null;
      reject(err);
    });
  });
}

function registerHandlers() {
  // Send magic link
  ipcMain.handle('auth-send-magic-link', async (_event, email) => {
    if (!supabase) throw new Error('Auth not configured');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${SUPABASE_URL}/auth/v1/callback`,
      },
    });
    if (error) throw new Error(error.message);
    return { sent: true };
  });

  // Verify OTP code (from magic link email)
  ipcMain.handle('auth-verify-otp', async (_event, email, token) => {
    if (!supabase) throw new Error('Auth not configured');
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw new Error(error.message);
    currentSession = data.session;
    return getAuthState();
  });

  // Get current auth state
  ipcMain.handle('auth-get-state', async () => {
    return getAuthState();
  });

  // Sign out
  ipcMain.handle('auth-sign-out', async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    currentSession = null;
    clearSession();
    return { signedOut: true };
  });

  // OAuth sign-in (Google, Apple, GitHub)
  // Starts a local HTTP server to catch the callback, then opens the browser
  ipcMain.handle('auth-sign-in-oauth', async (_event, provider) => {
    if (!supabase) throw new Error('Auth not configured');

    // Start local callback server
    await startCallbackServer();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: AUTH_CALLBACK_URL,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw new Error(error.message);

    // Open the OAuth URL in the system browser
    const { shell } = require('electron');
    shell.openExternal(data.url);
    return { opened: true };
  });

  // Refresh session
  ipcMain.handle('auth-refresh', async () => {
    if (!supabase || !currentSession) return null;
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Session refresh failed:', error.message);
      currentSession = null;
      clearSession();
      return null;
    }
    currentSession = data.session;
    return getAuthState();
  });
}

// Handle deep link callback (verbyprompt://auth-callback#access_token=...)
// Kept as fallback for packaged app
async function handleAuthCallback(url) {
  if (!supabase) return;

  try {
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return;

    const hash = url.substring(hashIndex + 1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error('Auth callback error:', error.message);
        return;
      }
      currentSession = data.session;
      console.log('Auth callback: signed in as', currentSession?.user?.email);
      notifyRenderer();

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  } catch (err) {
    console.error('Auth callback failed:', err.message);
  }
}

module.exports = { initAuth, getAccessToken, getAuthState, handleAuthCallback };
