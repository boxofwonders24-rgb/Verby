import { useState, useRef, useCallback } from 'react';
import { notifyRecordingStarted, notifyRecordingStopped } from '../lib/ipc';

export default function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunks.current = [];
    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      stream.getTracks().forEach((t) => t.stop());
    };
    mediaRecorder.current.start();
    setIsRecording(true);
    notifyRecordingStarted();
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      notifyRecordingStopped();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, audioBlob, toggleRecording, startRecording, stopRecording };
}
