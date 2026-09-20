'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Video } from '@/lib/types';
import { formatDuration, formatViews, formatTimeAgo } from '@/lib/formatters';
import { Play, Eye, Clock, Radio } from 'lucide-react';

export { formatDuration, formatViews, formatTimeAgo };

interface VideoCardProps {
  video: Video;
  priority?: boolean;
}

export function VideoCard({ video, priority = false }: VideoCardProps) {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();
  const [imgError, setImgError] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login', video.id);
    } else {
      router.push(`/watch?v=${video.id}`);
    }
  };

  const defaultThumb = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80';
  const effectiveDuration = video.duration_seconds || video.duration || 0;

  return (
    <div
      id={`video-card-${video.id}`}
      onClick={handleClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-900/60 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-xl hover:shadow-black/50"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgError ? defaultThumb : video.thumbnailUrl || defaultThumb}
          alt={video.title}
          onError={() => setImgError(true)}
          loading={priority ? 'eager' : 'lazy'}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Dark overlay with Play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/50 transition-transform group-hover:scale-110">
            <Play className="h-6 w-6 fill-current ml-0.5" />
          </div>
        </div>

        {/* Stream Type / Live / Provider Badge */}
        {video.isLive || video.liveStatus === 'live' ? (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/50 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            <span>LIVE</span>
          </div>
        ) : video.sourceType === 'hls' ? (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black backdrop-blur-sm">
            <Radio className="h-3 w-3 animate-pulse" />
            <span>HLS</span>
          </div>
        ) : video.provider ? (
          <div className="absolute left-2.5 top-2.5 rounded bg-zinc-900/85 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-zinc-300 backdrop-blur-sm border border-white/10">
            {video.provider}
          </div>
        ) : (
          <div className="absolute left-2.5 top-2.5 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300 backdrop-blur-sm">
            HD
          </div>
        )}

        {/* Season & Episode or Category tag if present */}
        {video.seasonNumber && video.episodeNumber ? (
          <div className="absolute right-2.5 top-2.5 rounded bg-red-950/80 border border-red-800/50 px-2 py-0.5 text-[11px] font-semibold text-red-200 backdrop-blur-sm">
            S{video.seasonNumber}:E{video.episodeNumber}
          </div>
        ) : video.category ? (
          <div className="absolute right-2.5 top-2.5 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-zinc-300 backdrop-blur-sm">
            {video.category}
          </div>
        ) : null}

        {/* Real Video Duration Badge */}
        {video.isLive || video.liveStatus === 'live' ? null : (
          <div
            id={`video-duration-${video.id}`}
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-white shadow-md backdrop-blur-sm"
          >
            <Clock className="h-3 w-3 text-zinc-300" />
            <span>{formatDuration(effectiveDuration)}</span>
          </div>
        )}
      </div>

      {/* Video Info Details */}
      <div className="p-3.5 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold tracking-tight text-zinc-100 transition group-hover:text-red-400 sm:text-base">
          {video.title}
        </h3>

        <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-zinc-500" />
            <span>{formatViews(video.views)}</span>
          </div>
          <span>{formatTimeAgo(video.createdAt)}</span>
        </div>

        {video.description && (
          <p className="mt-2 line-clamp-1 text-xs text-zinc-500">
            {video.description}
          </p>
        )}
      </div>
    </div>
  );
}
