'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserWatchProgress } from '@/lib/videoService';
import { WatchProgress, Video } from '@/lib/types';
import { Play, Clock } from 'lucide-react';
import { formatDuration } from './VideoCard';

interface ContinueWatchingSectionProps {
  userId: string;
  videos: Video[];
}

export function ContinueWatchingSection({ userId, videos }: ContinueWatchingSectionProps) {
  const [progressItems, setProgressItems] = useState<(WatchProgress & { video?: Video })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadProgress() {
      try {
        const items = await getUserWatchProgress(userId);
        if (isMounted) {
          const valid = items
            .map((item) => {
              const video = videos.find((v) => v.id === item.videoId);
              return { ...item, video };
            })
            .filter((item) => item.video && item.progressSeconds > 10 && item.progressSeconds < item.durationSeconds - 10)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 4);

          setProgressItems(valid);
        }
      } catch (e) {
        console.warn('Continue watching error:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadProgress();
    return () => {
      isMounted = false;
    };
  }, [userId, videos]);

  if (loading || progressItems.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
          Continue Watching
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {progressItems.map((item) => {
          const video = item.video!;
          const pct = Math.min(100, Math.round((item.progressSeconds / (item.durationSeconds || 1)) * 100));

          return (
            <Link
              key={item.videoId}
              href={`/watch?v=${item.videoId}`}
              className="group relative block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Progress bar at bottom of thumbnail */}
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-zinc-800">
                  <div
                    className="h-full bg-red-600 rounded-r-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="p-3">
                <h4 className="line-clamp-1 text-xs font-semibold text-zinc-200 group-hover:text-red-400">
                  {video.title}
                </h4>
                <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{pct}% completed</span>
                  <span>{formatDuration(item.progressSeconds)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
