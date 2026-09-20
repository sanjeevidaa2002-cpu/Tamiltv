'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { Video } from '@/lib/types';
import { recordVideoView, saveWatchProgress } from '@/lib/videoService';
import { useAuth } from '@/context/AuthContext';
import { formatDuration, formatPlayerTime } from '@/lib/formatters';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  PictureInPicture2,
  Settings,
  AlertTriangle,
  Loader2,
  FastForward,
  ExternalLink,
} from 'lucide-react';

export function getEmbedInfo(url: string) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube' as const,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1&rel=0`,
    };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo' as const,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
    };
  }
  return null;
}

interface VideoPlayerProps {
  video: Video;
  initialProgress?: number;
  onEnded?: () => void;
  autoPlay?: boolean;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({
  video,
  initialProgress = 0,
  onEnded,
  autoPlay = false,
}: VideoPlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration_seconds || video.duration || 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'rewind' | 'forward' | null>(null);
  const [promptResume, setPromptResume] = useState(initialProgress > 10);

  const embedInfo = useMemo(() => getEmbedInfo(video.videoUrl), [video.videoUrl]);
  const [prevVideoUrl, setPrevVideoUrl] = useState(video.videoUrl);

  if (video.videoUrl !== prevVideoUrl) {
    setPrevVideoUrl(video.videoUrl);
    setIsLoading(!embedInfo);
    setHasError(false);
    setErrorMessage('');
  }

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const hasTrackedViewRef = useRef(false);

  // Reset controls hide timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  // Handle HLS and Native video loading
  useEffect(() => {
    if (embedInfo) return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    const isHls =
      video.sourceType === 'hls' ||
      video.videoUrl.endsWith('.m3u8') ||
      video.videoUrl.includes('.m3u8?');

    // Destroy existing Hls instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(video.videoUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
          videoElement.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setHasError(true);
              setErrorMessage('Failed to load streaming source. Please verify stream availability.');
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl') && isHls) {
      // Safari Native HLS
      videoElement.src = video.videoUrl;
      videoElement.load();
      if (autoPlay) {
        videoElement.play().catch(() => {});
      }
    } else {
      // Direct MP4 / WebM video
      videoElement.src = video.videoUrl;
      videoElement.load();
      if (autoPlay) {
        videoElement.play().catch(() => {});
      }
    }

    hasTrackedViewRef.current = false;

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.videoUrl, video.sourceType, autoPlay, embedInfo]);

  // Video element events
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Track Playback view count once at >= 5s
    if (curr >= 5 && !hasTrackedViewRef.current) {
      hasTrackedViewRef.current = true;
      recordVideoView(video.id);
    }

    // Save progress periodically every 5 seconds for logged-in user
    if (user && curr > 5 && duration > 0 && Math.floor(curr) % 5 === 0) {
      saveWatchProgress(user.uid, video.id, curr, duration);
    }

    // Buffer calculation
    if (videoRef.current.buffered.length > 0) {
      try {
        const bufEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBuffered((bufEnd / (videoRef.current.duration || 1)) * 100);
      } catch {
        // ignore index bounds
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const realDuration = videoRef.current.duration;
    if (realDuration && !isNaN(realDuration) && isFinite(realDuration) && realDuration > 0) {
      setDuration(realDuration);
    } else {
      setDuration(video.duration_seconds || video.duration || 0);
    }
    setIsLoading(false);

    if (initialProgress > 0 && initialProgress < (videoRef.current.duration || 0)) {
      videoRef.current.currentTime = initialProgress;
      setCurrentTime(initialProgress);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (user && currentTime > 5 && duration > 0) {
        saveWatchProgress(user.uid, video.id, currentTime, duration);
      }
    }
    resetControlsTimer();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * (duration || videoRef.current.duration || 1);
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    resetControlsTimer();
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * (duration || 0));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
    resetControlsTimer();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume > 0 ? volume : 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
    resetControlsTimer();
  };

  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettingsMenu(false);
    resetControlsTimer();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        // Fallback for Safari iOS video element fullscreen
        if (videoRef.current && 'webkitEnterFullscreen' in videoRef.current) {
          (videoRef.current as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
        }
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
    resetControlsTimer();
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
    resetControlsTimer();
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    const nextTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    resetControlsTimer();
  };

  // Double tap handler for mobile
  const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = touch.clientX - rect.left;
    const isLeftSide = tapX < rect.width / 2;

    if (now - lastTapRef.current.time < 300) {
      // Double tap triggered
      if (isLeftSide) {
        skipTime(-10);
        setDoubleTapFeedback('rewind');
      } else {
        skipTime(10);
        setDoubleTapFeedback('forward');
      }
      setTimeout(() => setDoubleTapFeedback(null), 700);
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: tapX };
      resetControlsTimer();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())) {
        return;
      }
      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        skipTime(10);
      } else if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        skipTime(-10);
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      id="video-player-container"
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onTouchEnd={handleTouch}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-black select-none shadow-2xl border border-zinc-800"
    >
      {embedInfo ? (
        <div className="relative h-full w-full bg-black flex items-center justify-center">
          <iframe
            src={embedInfo.embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      ) : (
        <>
          {/* HTML5 Video Element */}
          <video
            ref={videoRef}
            id="html5-video-player"
            playsInline
            preload="metadata"
            poster={video.thumbnailUrl}
            onCanPlay={() => setIsLoading(false)}
            onCanPlayThrough={() => setIsLoading(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsLoading(false);
              setIsPlaying(true);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (onEnded) onEnded();
            }}
            onError={() => {
              setIsLoading(false);
              const err = videoRef.current?.error;
              let detailedMsg = 'Playback error: unable to decode or connect to media stream.';
              if (err) {
                switch (err.code) {
                  case 1:
                    detailedMsg = 'Playback aborted.';
                    break;
                  case 2:
                    detailedMsg = 'Network error: could not connect to video server.';
                    break;
                  case 3:
                    detailedMsg = 'Decoding error: media format is corrupted or unsupported.';
                    break;
                  case 4:
                    detailedMsg = 'The video stream could not be loaded. Server may have blocked access or the format is invalid.';
                    break;
                }
              }
              setHasError(true);
              setErrorMessage(detailedMsg);
            }}
            onClick={togglePlay}
            className="h-full w-full object-contain cursor-pointer"
          />

          {/* Double Tap Ripple Indicators */}
          {doubleTapFeedback && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-30 ${
                doubleTapFeedback === 'rewind' ? 'left-8' : 'right-8'
              }`}
            >
              <div className="flex flex-col items-center gap-1 rounded-full bg-black/60 p-4 text-white backdrop-blur-md animate-ping duration-500">
                {doubleTapFeedback === 'rewind' ? (
                  <>
                    <RotateCcw className="h-7 w-7" />
                    <span className="text-[11px] font-bold">-10s</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="h-7 w-7" />
                    <span className="text-[11px] font-bold">+10s</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Resume playback toast prompt */}
          {promptResume && (
            <div className="absolute top-4 left-4 z-30 flex items-center gap-3 rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-3 shadow-xl backdrop-blur-md animate-in fade-in">
              <span className="text-xs text-zinc-200">
                Resume watching from <strong className="text-red-400">{formatDuration(initialProgress)}</strong>?
              </span>
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = initialProgress;
                    setCurrentTime(initialProgress);
                    videoRef.current.play().catch(() => {});
                  }
                  setPromptResume(false);
                }}
                className="rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => setPromptResume(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-20">
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-zinc-950/80 p-4 backdrop-blur-md">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                <span className="text-xs font-medium text-zinc-300">Buffering...</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {hasError && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-3">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h4 className="text-base font-bold text-white">Playback Error</h4>
              <p className="mt-1 max-w-md text-xs text-zinc-400">{errorMessage || 'Unable to play video.'}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                    if (videoRef.current) {
                      videoRef.current.load();
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition"
                >
                  Retry Video
                </button>
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Direct Link
                </a>
              </div>
            </div>
          )}

          {/* Big Center Play Button Overlay when paused */}
          {!isPlaying && !isLoading && !hasError && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer z-10"
            >
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-red-600/90 text-white shadow-2xl transition hover:scale-110 hover:bg-red-600">
                <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-current ml-1" />
              </div>
            </div>
          )}

          {/* Control Bar Overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-8 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seek Bar */}
        <div
          ref={progressBarRef}
          id="video-seek-bar"
          onClick={handleSeek}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          className="group/seek relative mb-3 h-2 w-full cursor-pointer rounded-full bg-zinc-700/60 transition hover:h-3"
        >
          {/* Buffered track */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-zinc-500/50"
            style={{ width: `${buffered}%` }}
          />

          {/* Played track */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-red-600"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Scrubber thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between gap-3 text-white">
          {/* Left Controls: Play, Skip, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              id="player-play-btn"
              onClick={togglePlay}
              className="rounded-lg p-1.5 hover:bg-white/20 transition"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            <button
              type="button"
              onClick={() => skipTime(-10)}
              title="Rewind 10 seconds"
              className="hidden sm:inline-flex rounded-lg p-1.5 hover:bg-white/20 text-zinc-300 hover:text-white transition"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => skipTime(10)}
              title="Forward 10 seconds"
              className="hidden sm:inline-flex rounded-lg p-1.5 hover:bg-white/20 text-zinc-300 hover:text-white transition"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Volume Control */}
            <div className="group/vol flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-lg p-1.5 hover:bg-white/20 transition"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5 text-red-400" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1.5 w-14 sm:w-20 cursor-pointer accent-red-600 rounded-lg opacity-80 transition hover:opacity-100"
              />
            </div>

            {/* Time Stamp */}
            <div id="player-time-display" className="text-xs font-mono font-medium text-zinc-300 select-none">
              <span>{formatPlayerTime(currentTime, duration).current}</span>
              <span className="mx-1 text-zinc-500">/</span>
              <span className="text-zinc-400">{formatPlayerTime(currentTime, duration).total}</span>
            </div>
          </div>

          {/* Right Controls: Playback Rate, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-300 hover:bg-white/20 hover:text-white transition"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              {showSettingsMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-28 rounded-xl border border-zinc-800 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-md">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Speed
                  </div>
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changePlaybackRate(rate)}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs transition ${
                        playbackRate === rate
                          ? 'bg-red-600 text-white font-semibold'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span>{rate}x</span>
                      {rate === 1 && <span className="text-[10px] text-zinc-400">Normal</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture-in-Picture */}
            {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
              <button
                type="button"
                onClick={togglePiP}
                title="Picture in Picture"
                className="rounded-lg p-1.5 hover:bg-white/20 text-zinc-300 hover:text-white transition"
              >
                <PictureInPicture2 className="h-5 w-5" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              type="button"
              id="player-fullscreen-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="rounded-lg p-1.5 hover:bg-white/20 text-zinc-300 hover:text-white transition"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
