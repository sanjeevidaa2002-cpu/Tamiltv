'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { VideoPlayer } from '@/components/VideoPlayer';
import { formatViews, formatDuration, formatTimeAgo } from '@/components/VideoCard';
import { getVideo, getVideos, getUserWatchProgress, getPlaylist } from '@/lib/videoService';
import { Video, Playlist, WatchProgress } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Eye, ArrowLeft, Share2, Check, ListVideo, Film, AlertCircle } from 'lucide-react';
import { VideoPageAd } from '@/components/ads/VideoPageAd';
import { HeaderAdBox } from '@/components/ads/HeaderAdBox';
import { FooterAdBox } from '@/components/ads/FooterAdBox';
import { Footer } from '@/components/Footer';

function WatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get('v');
  const playlistId = searchParams.get('list');

  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [upNextVideos, setUpNextVideos] = useState<Video[]>([]);
  const [initialProgress, setInitialProgress] = useState(0);
  const [loading, setLoading] = useState(Boolean(videoId));
  const [copied, setCopied] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Authenticate check: If not logged in, prompt sign in
  useEffect(() => {
    if (!authLoading && !user && videoId) {
      openAuthModal('login', videoId);
    }
  }, [authLoading, user, videoId, openAuthModal]);

  // Load video and recommendation list
  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;
    async function loadVideoDetails() {
      try {
        const [currentVid, allVids] = await Promise.all([
          getVideo(videoId!),
          getVideos(false),
        ]);

        if (!isMounted) return;

        if (currentVid) {
          setVideo(currentVid);

          // If playlist requested, load it
          const plId = playlistId || currentVid.playlistId;
          if (plId) {
            const pl = await getPlaylist(plId);
            if (isMounted && pl) {
              setPlaylist(pl);
            }
          }

          // Fetch saved progress for current user
          if (user) {
            const progressList = await getUserWatchProgress(user.uid);
            const saved = progressList.find((p) => p.videoId === videoId);
            if (saved && saved.progressSeconds > 10) {
              setInitialProgress(saved.progressSeconds);
            }
          }

          // Up next recommendations: other videos excluding current
          const others = allVids.filter((v) => v.id !== videoId);
          setUpNextVideos(others);
        }
      } catch (err) {
        console.error('Failed to load video:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVideoDetails();
    return () => {
      isMounted = false;
    };
  }, [videoId, playlistId, user]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVideoEnded = () => {
    // If playlist active, navigate to next video
    if (playlist && playlist.videoIds.length > 0) {
      const currIdx = playlist.videoIds.indexOf(video?.id || '');
      if (currIdx !== -1 && currIdx < playlist.videoIds.length - 1) {
        const nextId = playlist.videoIds[currIdx + 1];
        router.push(`/watch?v=${nextId}&list=${playlist.id}`);
        return;
      }
    }
    // Else play first recommended video if available
    if (upNextVideos.length > 0) {
      router.push(`/watch?v=${upNextVideos[0].id}`);
    }
  };

  if (!videoId) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center p-4">
        <AlertCircle className="h-12 w-12 text-zinc-500 mb-3" />
        <h2 className="text-lg font-bold text-white">No Video Specified</h2>
        <p className="mt-1 text-xs text-zinc-400">Please choose a video from the library to start watching.</p>
        <Link href="/" className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500">
          Browse Videos
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video w-full rounded-2xl bg-zinc-900 animate-pulse" />
            <div className="h-6 w-3/4 rounded bg-zinc-900 animate-pulse" />
            <div className="h-4 w-1/3 rounded bg-zinc-900/60 animate-pulse" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-20 w-32 rounded-lg bg-zinc-900 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-full rounded bg-zinc-900" />
                  <div className="h-3 w-1/2 rounded bg-zinc-900/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-white">Video Not Found</h2>
        <p className="mt-1 text-xs text-zinc-400">The video may be private, unpublished, or has been removed.</p>
        <Link href="/" className="mt-4 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700">
          Return to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to catalog</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Video & Details Column */}
        <div className="lg:col-span-2">
          {/* Player */}
          <VideoPlayer
            video={video}
            initialProgress={initialProgress}
            onEnded={handleVideoEnded}
            autoPlay={true}
          />

          {/* Video Metadata Header */}
          <div className="mt-4">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {video.title}
            </h1>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4 text-xs text-zinc-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Eye className="h-4 w-4 text-zinc-500" />
                  <span className="font-semibold">{formatViews(video.views)}</span>
                </div>
                <span>Published {formatTimeAgo(video.createdAt)}</span>
                {video.category && (
                  <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                    {video.category}
                  </span>
                )}
              </div>

              {/* Share Button */}
              <button
                type="button"
                id="share-video-btn"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>{copied ? 'Link Copied' : 'Share'}</span>
              </button>
            </div>

            {/* Description Box */}
            {video.description && (
              <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
                <p
                  className={`text-xs text-zinc-300 leading-relaxed ${
                    descExpanded ? '' : 'line-clamp-3'
                  }`}
                >
                  {video.description}
                </p>
                {video.description.length > 180 && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-2 text-xs font-semibold text-red-400 hover:text-red-300"
                  >
                    {descExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}

                {/* Tags */}
                {video.tags && video.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-zinc-800/50">
                    {video.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Optional Ad Below Video Details */}
            <VideoPageAd className="mt-4" />
          </div>
        </div>

        {/* Up Next & Playlist Queue Column */}
        <div className="space-y-6">
          {/* Active Playlist Box */}
          {playlist && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
                <ListVideo className="h-4 w-4 text-red-500" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Playlist</h3>
                  <h4 className="text-sm font-semibold text-white">{playlist.title}</h4>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                {playlist.videoIds.map((pVidId, idx) => {
                  const isCurrent = pVidId === video.id;
                  return (
                    <Link
                      key={pVidId}
                      href={`/watch?v=${pVidId}&list=${playlist.id}`}
                      className={`flex items-center gap-2.5 rounded-lg p-2 text-xs transition ${
                        isCurrent
                          ? 'bg-red-600/15 border border-red-500/30 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                      }`}
                    >
                      <span className="w-4 text-center text-[10px] font-semibold text-zinc-500">
                        {idx + 1}
                      </span>
                      <span className="truncate flex-1 font-medium">
                        {pVidId === video.id ? video.title : `Video #${idx + 1}`}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                          Playing
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Up Next Recommendations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Film className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-bold tracking-tight text-white">Up Next</h3>
            </div>

            <div className="space-y-3">
              {upNextVideos.slice(0, 8).map((upVid) => (
                <Link
                  key={upVid.id}
                  href={`/watch?v=${upVid.id}${playlistId ? `&list=${playlistId}` : ''}`}
                  className="group flex gap-3 rounded-xl border border-transparent p-1.5 transition hover:border-zinc-800 hover:bg-zinc-900/60"
                >
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={upVid.thumbnailUrl}
                      alt={upVid.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-semibold text-white">
                      {formatDuration(upVid.duration)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 py-0.5">
                    <h4 className="line-clamp-2 text-xs font-semibold text-zinc-200 group-hover:text-red-400">
                      {upVid.title}
                    </h4>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {formatViews(upVid.views)} &bull; {formatTimeAgo(upVid.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      {/* Header Ad Box - Outside Header, Before Main Content */}
      <HeaderAdBox page="video" />

      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
          }
        >
          <WatchContent />
        </Suspense>
      </main>

      {/* Footer Ad Box - Outside Footer, After Main Content */}
      <FooterAdBox page="video" />

      {/* Footer - Completely separate from Ad */}
      <Footer />
    </div>
  );
}
