/**
 * Windows hold-to-talk hotkey using uiohook-napi.
 *
 * Provides the same event interface as the macOS fn-capture binary:
 * emits 'fn_down', 'fn_up', 'ctrl_down', 'ctrl_up' via a callback.
 *
 * Default hold-to-talk key: CapsLock (configurable).
 * Default raw-dictation key: Right Ctrl (configurable).
 *
 * CapsLock is chosen because:
 * - It's easy to hold
 * - Most users don't use it for its toggle function
 * - We suppress the CapsLock toggle behavior while Verby is running
 */

const platform = require('./index');

let uIOhook = null;
let started = false;
let eventCallback = null;

// Key states for hold detection
let hotkeyDown = false;
let rawKeyDown = false;

// uiohook keycodes — see https://github.com/nicwaller/uiohook-napi
// These are hardware scan codes, not virtual keycodes
const KEYCODES = {
  CapsLock: 58,
  RightCtrl: 3613,
  LeftCtrl: 29,
  F13: 64,
  F14: 65,
  F15: 66,
  ScrollLock: 70,
  Pause: 69,
};

// Default keys — configurable via settings
let hotkeyCode = KEYCODES.CapsLock;     // Hold for AI-enhanced dictation
let rawKeyCode = KEYCODES.RightCtrl;     // Hold for raw dictation

/**
 * Configure which keys trigger hold-to-talk.
 * @param {object} opts
 * @param {string} opts.holdToTalkKey - Key name from KEYCODES (default: 'CapsLock')
 * @param {string} opts.rawDictateKey - Key name from KEYCODES (default: 'RightCtrl')
 */
function configure(opts = {}) {
  if (opts.holdToTalkKey && KEYCODES[opts.holdToTalkKey]) {
    hotkeyCode = KEYCODES[opts.holdToTalkKey];
  }
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
      if (e.keycode === hotkeyCode && !hotkeyDown) {
        hotkeyDown = true;
        eventCallback('fn_down');
      } else if (e.keycode === rawKeyCode && !rawKeyDown) {
        rawKeyDown = true;
        eventCallback('ctrl_down');
      }
    });

    uIOhook.on('keyup', (e) => {
      if (e.keycode === hotkeyCode && hotkeyDown) {
        hotkeyDown = false;
        eventCallback('fn_up');
      } else if (e.keycode === rawKeyCode && rawKeyDown) {
        rawKeyDown = false;
        eventCallback('ctrl_up');
      }
    });

    uIOhook.start();
    started = true;
    console.log('Windows hotkey listener started (hold-to-talk: CapsLock, raw: RightCtrl)');
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
  hotkeyDown = false;
  rawKeyDown = false;
  console.log('Windows hotkey listener stopped');
}

/** Available key names for settings UI */
const availableKeys = Object.keys(KEYCODES);

module.exports = { start, stop, configure, availableKeys };
