import { useState, useRef, useCallback, useEffect } from 'react';
import {
  transcribeAudio,
  injectText,
  optimizePrompt,
  onToggleDictation,
  onFnDown,
  onFnUp,
  showProcessing,
  hideIndicator,
} from '../lib/ipc';

// Whisper hallucinates these on short/silent audio
const HALLUCINATIONS = new Set([
  'you', 'thank you', 'thanks', 'thanks for watching',
  'bye', 'goodbye', 'subscribe', 'like and subscribe',
  'thank you for watching', 'see you next time',
  'you.', 'thank you.', 'thanks.', 'bye.',
  'this is a voice dictation recording of someone speaking naturally.',
  'this is a voice dictation recording of someone speaking naturally',
]);

export default function useDictation() {
  const [isDictating, setIsDictating] = useState(false);
  const [dictationStatus, setDictationStatus] = useState('idle'); // idle | listening | processing
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [dictationLog, setDictationLog] = useState([]);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const streamRef = useRef(null);
  // Ref to avoid stale closures in event listeners
  const isRecordingRef = useRef(false);
  // Track recording start time to enforce minimum duration
  const recordingStartTime = useRef(0);
  // Track if fn_up arrived while mic was still initializing
  const pendingStop = useRef(false);

  const log = (msg) => {
    console.log('[dictation]', msg);
    if (window.verby && window.verby.log) window.verby.log(msg);
  };

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return log('already recording, skip');
    pendingStop.current = false;
    log('startRecording called');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('got mic stream');

      if (pendingStop.current) {
        log('pendingStop was set during mic init — aborting');
        stream.getTracks().forEach((t) => t.stop());
        hideIndicator();
        setIsDictating(false);
        setDictationStatus('idle');
        return;
      }

      streamRef.current = stream;
      // Use higher bitrate — default can produce tiny files in Electron
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        isRecordingRef.current = false;
        // Clean up mic
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const recordingDuration = Date.now() - recordingStartTime.current;
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        log(`recording stopped: ${recordingDuration}ms, ${blob.size} bytes`);

        // Reject recordings that are too short
        if (blob.size < 100 || recordingDuration < 500) {
          log(`too short — skipping`);
          setDictationStatus('idle');
          setIsDictating(false);
          hideIndicator();
          return;
        }

        setDictationStatus('processing');
        showProcessing();

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const transcript = await transcribeAudio(arrayBuffer);

          // Filter out Whisper hallucinations
          const cleaned = (transcript || '').trim();
          if (!cleaned || HALLUCINATIONS.has(cleaned.toLowerCase())) {
            console.log(`Filtered hallucination or empty: "${cleaned}"`);
            hideIndicator();
            setDictationStatus('idle');
            setIsDictating(false);
            return;
          }

          let finalText = cleaned;

          // If enhanced mode, run through AI to polish
          if (enhancedMode) {
            try {
              const result = await optimizePrompt(cleaned, 'general');
              if (result && result.optimized) {
                finalText = result.optimized;
              }
            } catch {
              // Fall back to raw transcript
            }
          }

          // Inject into active field
          const injected = await injectText(finalText);

          // Log it
          setDictationLog((prev) => [
            {
              raw: cleaned,
              final: injected || finalText,
              enhanced: enhancedMode,
              time: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 50)); // keep last 50
        } catch (err) {
          console.error('Dictation error:', err);
        }

        hideIndicator();
        setDictationStatus('idle');
        setIsDictating(false);
      };

      mediaRecorder.current.start(250); // request data every 250ms
      recordingStartTime.current = Date.now();
      isRecordingRef.current = true;
      setIsDictating(true);
      setDictationStatus('listening');

      // If fn_up arrived during mic init, stop immediately
      if (pendingStop.current) {
        mediaRecorder.current.stop();
      }
    } catch (err) {
      console.error('Mic error:', err);
      isRecordingRef.current = false;
      hideIndicator();
      setIsDictating(false);
      setDictationStatus('idle');
    }
  }, [enhancedMode]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    } else {
      // MediaRecorder not ready yet — mark for pending stop
      pendingStop.current = true;
    }
  }, []);

  const toggleDictation = useCallback(() => {
    if (isRecordingRef.current) stopRecording();
    else startRecording();
  }, [startRecording, stopRecording]);

  // Listen for hotkey toggle (Ctrl+Alt+Space)
  useEffect(() => {
    const cleanup = onToggleDictation(() => toggleDictation());
    return cleanup;
  }, [toggleDictation]);

  // Listen for Fn hold-to-talk — use ref to avoid stale closure
  useEffect(() => {
    const cleanupDown = onFnDown(() => {
      if (!isRecordingRef.current) startRecording();
    });
    const cleanupUp = onFnUp(() => {
      stopRecording();
    });
    return () => {
      if (cleanupDown) cleanupDown();
      if (cleanupUp) cleanupUp();
    };
  }, [startRecording, stopRecording]);

  return {
    isDictating,
    dictationStatus,
    enhancedMode,
    setEnhancedMode,
    dictationLog,
    toggleDictation,
  };
}
