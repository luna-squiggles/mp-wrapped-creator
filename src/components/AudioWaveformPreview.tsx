import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformPreviewProps {
  src: string;               // Audio file source
  isActive: boolean;         // Whether this waveform is the currently active one
  onPlay: () => void;        // Callback when playback starts (to allow parent to pause others)
}

/**
 * AudioWaveformPreview – renders a clickable waveform using WaveSurfer.js.
 * Clicking toggles play / pause. When another waveform becomes active, this
 * component pauses itself via the `isActive` prop.
 */
export default function AudioWaveformPreview({ src, isActive, onPlay }: AudioWaveformPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveSurfer | null>(null);

  // Initialise WaveSurfer instance
  useEffect(() => {
    if (!containerRef.current) return;

    waveRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4B5563',      // Tailwind gray-600
      progressColor: '#DA2650',  // Brand colour
      cursorColor: '#DA2650',
      barWidth: 2,
      height: 64,
      // WaveSurfer is responsive by default in v7; explicit option may not exist in typings
    });

    waveRef.current.load(src);

    // Clean-up on unmount
    return () => {
      waveRef.current?.destroy();
    };
  }, [src]);

  // Pause audio when it is no longer the active waveform
  useEffect(() => {
    if (!waveRef.current) return;
    if (!isActive && waveRef.current.isPlaying()) {
      waveRef.current.pause();
      waveRef.current.seekTo(0);
    }
  }, [isActive]);

  const handleTogglePlay = () => {
    if (!waveRef.current) return;

    if (waveRef.current.isPlaying()) {
      waveRef.current.pause();
    } else {
      onPlay(); // Notify parent to deactivate others
      waveRef.current.play();
    }
  };

  return (
    <div
      ref={containerRef}
      className="cursor-pointer select-none"
      onClick={handleTogglePlay}
    />
  );
} 