'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { VideoCard } from '@/components/VideoCard';
import { SectionIcon } from '@/components/SectionIcon';
import { ContinueWatchingSection } from '@/components/ContinueWatchingSection';
import { HeaderAdBox } from '@/components/ads/HeaderAdBox';
import { FooterAdBox } from '@/components/ads/FooterAdBox';
import { Footer } from '@/components/Footer';
import { getVideos, getPlaylists, getSections } from '@/lib/videoService';
import { Video, Playlist, Section } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDuration } from '@/lib/formatters';
import {
  Film,
  Search,
  Sparkles,
  ChevronRight,
  Play,
  Clock,
  Layers,
  Flame,
} from 'lucide-react';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSection = searchParams.get('section') || 'all';

  const { user } = useAuth();
  const { colors, settings } = useTheme();

  const [videos, setVideos] = useState<Video[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedSectionSlug = urlSection;

  useEffect(() => {
    let isMounted = true;
    async function loadContent() {
      try {
        const [vList, sList, pList] = await Promise.all([
          getVideos(false),
          getSections(false),
          getPlaylists(false),
        ]);
        if (isMounted) {
          setVideos(vList);
          setSections(sList);
          setPlaylists(pList);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadContent();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectSection = (slug: string) => {
    if (slug === 'all') {
      router.push('/', { scroll: false });
    } else {
      router.push(`/?section=${slug}`, { scroll: false });
    }
  };

  // Group videos by section ID or slug
  const videosBySection = useMemo(() => {
    const map = new Map<string, Video[]>();
    for (const sec of sections) {
      const matching = videos.filter((v) => {
        const ids = v.sectionIds || [];
        return ids.includes(sec.id) || ids.includes(sec.slug);
      });
      map.set(sec.id, matching);
    }
    return map;
  }, [sections, videos]);

  // Filtered videos when in search mode or specific section mode
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      // Section filter
      if (selectedSectionSlug !== 'all') {
        const targetSec = sections.find((s) => s.slug === selectedSectionSlug || s.id === selectedSectionSlug);
        const secId = targetSec?.id || selectedSectionSlug;
        const secSlug = targetSec?.slug || selectedSectionSlug;
        const assigned = (v.sectionIds || []).includes(secId) || (v.sectionIds || []).includes(secSlug);
        if (!assigned) return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = v.title.toLowerCase().includes(q);
      const matchDesc = v.description?.toLowerCase().includes(q);
      const matchTags = v.tags?.some((t) => t.toLowerCase().includes(q));
      const matchCategory = v.category?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchTags || matchCategory;
    });
  }, [videos, sections, selectedSectionSlug, searchQuery]);

  // Featured Hero Video (first video or highest views)
  const featuredVideo = useMemo(() => {
    if (videos.length === 0) return null;
    return [...videos].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  }, [videos]);

  const activeSectionObj = useMemo(() => {
    if (selectedSectionSlug === 'all') return null;
    return sections.find((s) => s.slug === selectedSectionSlug || s.id === selectedSectionSlug) || null;
  }, [sections, selectedSectionSlug]);

  const primaryColor = activeSectionObj?.color || colors.primary || '#E50914';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-red-500/30">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSectionSlug={selectedSectionSlug}
        onSelectSection={handleSelectSection}
        sections={sections}
      />

      {/* Header Ad Box - Outside Header, Before Main Content */}
      <HeaderAdBox page={selectedSectionSlug === 'all' ? 'home' : (selectedSectionSlug as any)} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HERO FEATURED SPOTLIGHT (Only on 'All' tab when not searching) */}
        {selectedSectionSlug === 'all' && !searchQuery && featuredVideo && !loading && (
          <div
            id="featured-hero-banner"
            className="relative mb-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
          >
            <div className="relative aspect-[21/9] min-h-[280px] sm:min-h-[380px] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredVideo.thumbnailUrl}
                alt={featuredVideo.title}
                className="h-full w-full object-cover object-center brightness-75 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />

              <div className="absolute bottom-0 left-0 p-6 sm:p-10 max-w-2xl">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-0.5 text-[11px] font-bold text-black uppercase tracking-wider">
                    <Flame className="h-3.5 w-3.5" />
                    Featured
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-zinc-300 backdrop-blur-sm">
                    <Clock className="h-3 w-3 text-zinc-400" />
                    {formatDuration(featuredVideo.duration_seconds || featuredVideo.duration)}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white line-clamp-2">
                  {featuredVideo.title}
                </h1>

                {featuredVideo.description && (
                  <p className="mt-2 text-xs sm:text-sm text-zinc-300 line-clamp-2">
                    {featuredVideo.description}
                  </p>
                )}

                <div className="mt-5 flex items-center gap-3">
                  <Link
                    href={`/watch?v=${featuredVideo.id}`}
                    className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:scale-105"
                    style={{ backgroundColor: colors.button || primaryColor }}
                  >
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                    <span>Watch Now</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Continue Watching for Authenticated Users */}
        {user && !searchQuery && <ContinueWatchingSection userId={user.uid} videos={videos} />}

        {/* LOADING STATE */}
        {loading && (
          <div className="space-y-8">
            <div className="h-8 w-48 rounded-lg bg-zinc-900 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40 animate-pulse"
                >
                  <div className="aspect-video w-full bg-zinc-800" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 w-3/4 rounded bg-zinc-800" />
                    <div className="h-3 w-1/2 rounded bg-zinc-800/70" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW MODE 1: 'ALL' TAB WITHOUT SEARCH -> DYNAMIC SECTION ROWS */}
        {!loading && selectedSectionSlug === 'all' && !searchQuery && (
          <div className="space-y-12">
            {/* Dynamic Section Rows for each active section with videos */}
            {sections.map((sec) => {
              const secVideos = videosBySection.get(sec.id) || [];
              if (secVideos.length === 0) return null;

              return (
                <section key={sec.id} id={`homepage-section-row-${sec.slug}`} className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-md"
                        style={{ backgroundColor: sec.color || primaryColor }}
                      >
                        <SectionIcon name={sec.icon} className="h-4 w-4" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
                        {sec.name}
                      </h2>
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-800">
                        {secVideos.length}
                      </span>
                    </div>

                    <Link
                      href={`/section/${sec.slug}`}
                      className="group flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-white transition"
                    >
                      <span>View All</span>
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>

                  {sec.description && (
                    <p className="text-xs text-zinc-500 mb-3 -mt-2">
                      {sec.description}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {secVideos.slice(0, 4).map((v) => (
                      <VideoCard key={v.id} video={v} />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* All Recent Videos Grid Header */}
            <section id="homepage-all-videos" className="pt-4 border-t border-zinc-900">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-red-500" />
                  <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                    All Available Stream Catalog
                  </h2>
                </div>
                <span className="text-xs text-zinc-500 font-medium">
                  {videos.length} {videos.length === 1 ? 'video' : 'videos'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {videos.map((video, idx) => (
                  <VideoCard key={video.id} video={video} priority={idx < 4} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* VIEW MODE 2: FILTERED VIEW (Specific section or active search) */}
        {!loading && (selectedSectionSlug !== 'all' || searchQuery) && (
          <div>
            {/* Section Banner Header */}
            {activeSectionObj ? (
              <div
                className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-6 sm:p-8 backdrop-blur-md"
                style={{
                  background: `linear-gradient(135deg, ${activeSectionObj.color || primaryColor}18 0%, rgba(24, 24, 27, 0.9) 60%, rgba(9, 9, 11, 0.95) 100%)`,
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-black/40"
                      style={{ backgroundColor: activeSectionObj.color || primaryColor }}
                    >
                      <SectionIcon name={activeSectionObj.icon} className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase">
                          {activeSectionObj.name}
                        </h1>
                        <span className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 border border-zinc-700/60">
                          {filteredVideos.length} {filteredVideos.length === 1 ? 'Video' : 'Videos'}
                        </span>
                      </div>
                      {activeSectionObj.description && (
                        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                          {activeSectionObj.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/section/${activeSectionObj.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition"
                  >
                    <span>Open Dedicated Page</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-red-500" />
                  <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                    {searchQuery ? `Search Results for "${searchQuery}"` : 'Videos'}
                  </h1>
                </div>
                <span className="text-xs text-zinc-500 font-medium">
                  {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
                </span>
              </div>
            )}

            {/* Filtered Videos Grid */}
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredVideos.map((video, idx) => (
                  <VideoCard key={video.id} video={video} priority={idx < 4} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-zinc-500 mb-4">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-zinc-200">No videos found</h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                  {searchQuery
                    ? `No videos matched "${searchQuery}". Try different keywords or reset filters.`
                    : 'No videos are assigned to this section yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    handleSelectSection('all');
                  }}
                  className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                >
                  Show All Videos
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Ad Box - Outside Footer, After Main Content */}
      <FooterAdBox page={selectedSectionSlug === 'all' ? 'home' : (selectedSectionSlug as any)} />

      {/* Footer - Completely separate from Ad */}
      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
          Loading catalog...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
