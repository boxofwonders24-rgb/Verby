import React from 'react';

export default function RecordingIndicator({ isRecording }) {
  if (!isRecording) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
      </span>
      <span className="text-sm text-red-400 font-medium">Listening...</span>
    </div>
  );
}
