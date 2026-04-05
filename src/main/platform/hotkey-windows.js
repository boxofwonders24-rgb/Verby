/**
 * Windows hold-to-talk hotkey using uiohook-napi.
 *
 * Provides the same event interface as the macOS fn-capture binary:
 * emits 'fn_down', 'fn_up', 'ctrl_down', 'ctrl_up' via a callback.
 *
 * Default AI dictation: Ctrl + Win (hold) — matches Wispr Flow convention.
 * Default verbatim:     Right Alt (hold) — raw text, no AI rewrite.
 */

const platform = require('./index');

let uIOhook = null;
let started = false;
let eventCallback = null;

// Key states for combo detection
let ctrlHeld = false;
let winHeld = false;
let comboActive = false;  // Ctrl+Win combo is active
let rawKeyDown = false;

// uiohook keycodes (hardware scan codes)
const KEYCODES = {
  LeftCtrl: 29,
  RightCtrl: 3613,
  LeftWin: 3675,
  RightWin: 3676,
  RightAlt: 3640,
  LeftAlt: 56,
  CapsLock: 58,
  F9: 67,
  F10: 68,
  F13: 64,
  ScrollLock: 70,
};

// Default keys — configurable via settings
let rawKeyCode = KEYCODES.RightAlt;  // Hold for verbatim dictation

/**
 * Configure which key triggers verbatim dictation.
 * AI dictation is always Ctrl+Win (non-configurable, matches Wispr convention).
 * @param {object} opts
 * @param {string} opts.rawDictateKey - Key name from KEYCODES (default: 'RightAlt')
 */
function configure(opts = {}) {
  if (opts.rawDictateKey && KEYCODES[opts.rawDictateKey]) {
    rawKeyCode = KEYCODES[opts.rawDictateKey];
  }
}

/**
 * Start listening for keyboard events.
 * @param {function} callback - Called with event name: 'fn_down', 'fn_up', 'ctrl_down', 'ctrl_up'
 */
function start(callback) {
  if (!platform.isWindows) return;
  if (started) return;

  eventCallback = callback;

  try {
    const { uIOhook: hook } = require('uiohook-napi');
    uIOhook = hook;

    uIOhook.on('keydown', (e) => {
      // Track Ctrl state
      if (e.keycode === KEYCODES.LeftCtrl || e.keycode === KEYCODES.RightCtrl) {
        ctrlHeld = true;
      }

      // Track Win state
      if (e.keycode === KEYCODES.LeftWin || e.keycode === KEYCODES.RightWin) {
        winHeld = true;
      }

      // Ctrl+Win combo → AI dictation (fn_down)
      if (ctrlHeld && winHeld && !comboActive) {
        comboActive = true;
        eventCallback('fn_down');
      }

      // Right Alt → verbatim dictation (ctrl_down)
      if (e.keycode === rawKeyCode && !rawKeyDown) {
        rawKeyDown = true;
        eventCallback('ctrl_down');
      }
    });

    uIOhook.on('keyup', (e) => {
      // Ctrl+Win combo ends when EITHER key is released
      if (e.keycode === KEYCODES.LeftCtrl || e.keycode === KEYCODES.RightCtrl) {
        ctrlHeld = false;
        if (comboActive) {
          comboActive = false;
          eventCallback('fn_up');
        }
      }

      if (e.keycode === KEYCODES.LeftWin || e.keycode === KEYCODES.RightWin) {
        winHeld = false;
        if (comboActive) {
          comboActive = false;
          eventCallback('fn_up');
        }
      }

      // Right Alt release → end verbatim
      if (e.keycode === rawKeyCode && rawKeyDown) {
        rawKeyDown = false;
        eventCallback('ctrl_up');
      }
    });

    uIOhook.start();
    started = true;
    console.log('Windows hotkey listener started (AI: Ctrl+Win, Verbatim: Right Alt)');
    eventCallback('fn_ready');
  } catch (err) {
    console.error('uiohook-napi failed to start:', err.message);
  }
}

/**
 * Stop listening and clean up.
 */
function stop() {
  if (!started || !uIOhook) return;
  try {
    uIOhook.stop();
  } catch {}
  started = false;
  ctrlHeld = false;
  winHeld = false;
  comboActive = false;
  rawKeyDown = false;
  console.log('Windows hotkey listener stopped');
}

/** Available key names for settings UI */
const availableKeys = Object.keys(KEYCODES);

module.exports = { start, stop, configure, availableKeys };
