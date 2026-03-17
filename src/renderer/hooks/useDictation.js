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

export default function useDictation() {
  const [isDictating, setIsDictating] = useState(false);
  const [dictationStatus, setDictationStatus] = useState('idle'); // idle | listening | processing
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [dictationLog, setDictationLog] = useState([]);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        // Clean up mic
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        if (blob.size < 1000) {
          // Too short — probably accidental tap
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

          if (transcript && transcript.trim()) {
            let finalText = transcript;

            // If enhanced mode, run through AI to polish
            if (enhancedMode) {
              try {
                const result = await optimizePrompt(transcript, 'general');
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
                raw: transcript,
                final: injected || finalText,
                enhanced: enhancedMode,
                time: new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 50)); // keep last 50
          }
        } catch (err) {
          console.error('Dictation error:', err);
        }

        hideIndicator();
        setDictationStatus('idle');
        setIsDictating(false);
      };

      mediaRecorder.current.start();
      setIsDictating(true);
      setDictationStatus('listening');
    } catch (err) {
      console.error('Mic error:', err);
      hideIndicator();
      setIsDictating(false);
      setDictationStatus('idle');
    }
  }, [enhancedMode]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
  }, []);

  const toggleDictation = useCallback(() => {
    if (isDictating) stopRecording();
    else startRecording();
  }, [isDictating, startRecording, stopRecording]);

  // Listen for hotkey toggle (Ctrl+Alt+Space)
  useEffect(() => {
    onToggleDictation(() => toggleDictation());
  }, [toggleDictation]);

  // Listen for Fn hold-to-talk
  useEffect(() => {
    onFnDown(() => {
      if (!isDictating) startRecording();
    });
    onFnUp(() => {
      if (isDictating) stopRecording();
    });
  }, [isDictating, startRecording, stopRecording]);

  return {
    isDictating,
    dictationStatus,
    enhancedMode,
    setEnhancedMode,
    dictationLog,
    toggleDictation,
  };
}
