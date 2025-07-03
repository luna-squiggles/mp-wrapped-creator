import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-react';

interface AudioWaveformPreviewProps {
  src: string;               // Audio file source
  isActive: boolean;         // Whether this waveform is the currently active one
  onPlay: (wave: WaveSurfer) => void; // Callback when playback starts (gives instance to parent)
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

    // Notify parent once ready so they can store ref if needed
    waveRef.current.on('ready', () => {
      // no-op, just ensures load finished
    });

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
      onPlay(waveRef.current); // Notify parent and provide instance
      waveRef.current.play();
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleTogglePlay}
        className="mx-auto flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-white hover:bg-gray-600"
      >
        {waveRef.current && waveRef.current.isPlaying() ? <Pause size={16}/> : <Play size={16}/>}
      </button>
      <div
        ref={containerRef}
        className="cursor-pointer select-none"
        onClick={handleTogglePlay}
      />
    </div>
  );
} 