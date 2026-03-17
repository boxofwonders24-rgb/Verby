import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio, injectText, onToggleDictation } from '../lib/ipc';

export default function useDictation() {
  const [isDictating, setIsDictating] = useState(false);
  const [dictationStatus, setDictationStatus] = useState('idle'); // idle | listening | processing
  const [lastInjected, setLastInjected] = useState(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startDictation = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());

        setDictationStatus('processing');
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const transcript = await transcribeAudio(arrayBuffer);
          if (transcript) {
            const injected = await injectText(transcript);
            setLastInjected({
              raw: transcript,
              processed: injected,
              time: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('Dictation error:', err);
        }
        setDictationStatus('idle');
        setIsDictating(false);
      };

      mediaRecorder.current.start();
      setIsDictating(true);
      setDictationStatus('listening');
    } catch (err) {
      console.error('Mic access error:', err);
      setIsDictating(false);
      setDictationStatus('idle');
    }
  }, []);

  const stopDictation = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
  }, []);

  const toggleDictation = useCallback(() => {
    if (isDictating) {
      stopDictation();
    } else {
      startDictation();
    }
  }, [isDictating, startDictation, stopDictation]);

  // Listen for hotkey
  useEffect(() => {
    onToggleDictation(() => toggleDictation());
  }, [toggleDictation]);

  return { isDictating, dictationStatus, lastInjected, toggleDictation };
}
