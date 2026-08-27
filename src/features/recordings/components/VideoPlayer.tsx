import { useRef, useState, useCallback } from 'react';
import { Play, Pause, Maximize, Minimize } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';

interface VideoPlayerProps {
  src: string;
  title?: string;
  onClose?: () => void;
}

export function VideoPlayer({ src, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrent] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
    setCurrent(formatTime(v.currentTime));
  }, []);

  const onSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = (Number(e.target.value) / 100) * v.duration;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (!document.fullscreenElement) {
      c.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden group">
      {title && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-4 py-2">
          <span className="text-sm text-white/90 font-medium">{title}</span>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-[60vh] object-contain"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) setDuration(formatTime(v.duration));
        }}
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
      />

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <IconButton
            icon={playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
            label={playing ? 'Pause' : 'Play'}
            onClick={togglePlay}
            size="sm"
          />

          <span className="text-xs text-white/80 font-mono min-w-[40px]">{currentTime}</span>

          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={onSeek}
            className="flex-1 h-1 accent-brand-500 cursor-pointer"
          />

          <span className="text-xs text-white/80 font-mono min-w-[40px]">{duration}</span>

          <IconButton
            icon={isFullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
            label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            onClick={toggleFullscreen}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
