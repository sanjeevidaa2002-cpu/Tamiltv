'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Section, Video } from '@/lib/types';
import { getSectionBySlug, getVideosBySection, getSections } from '@/lib/videoService';
import { Navbar } from '@/components/Navbar';
import { VideoCard } from '@/components/VideoCard';
import { HeaderAdBox } from '@/components/ads/HeaderAdBox';
import { FooterAdBox } from '@/components/ads/FooterAdBox';
import { Footer } from '@/components/Footer';
import { SectionIcon } from '@/components/SectionIcon';
import { useTheme } from '@/context/ThemeContext';
import { ArrowLeft, Film, Loader2, Sparkles, Filter, RefreshCw } from 'lucide-react';

export default function SectionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';

  const { colors } = useTheme();
  const [section, setSection] = useState<Section | null>(null);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'views' | 'duration'>('latest');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!slug) return;
      setLoading(true);
      try {
        const [secData, secList, vidList] = await Promise.all([
          getSectionBySlug(slug),
          getSections(false),
          getVideosBySection(slug, false),
        ]);

        if (!isMounted) return;

        if (!secData) {
          setSection(null);
        } else {
          setSection(secData);
        }
        setAllSections(secList);
        setVideos(vidList);
      } catch (err) {
        console.error('Error loading section page:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Filter and sort videos
  const filteredVideos = React.useMemo(() => {
    let result = [...videos];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q) ||
          (v.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'views') {
      result.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === 'duration') {
      result.sort((a, b) => (b.duration_seconds || b.duration || 0) - (a.duration_seconds || a.duration || 0));
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [videos, searchQuery, sortBy]);

  const primaryColor = section?.color || colors.primary || '#E50914';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-red-500/30">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSectionSlug={slug}
        sections={allSections}
        onSelectSection={(newSlug) => {
          if (newSlug === 'all') {
            router.push('/');
          } else {
            router.push(`/section/${newSlug}`);
          }
        }}
      />

      {/* Header Ad Box - Outside Header, Before Main Content */}
      <HeaderAdBox page={slug as any} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back button */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Sections</span>
          </Link>

          {section && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300 focus:border-zinc-700 focus:outline-none"
              >
                <option value="latest">Latest Releases</option>
                <option value="views">Most Viewed</option>
                <option value="duration">Longest Duration</option>
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
            <p className="text-sm text-zinc-400">Loading section content...</p>
          </div>
        ) : !section ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
              <Film className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Section Not Found</h2>
            <p className="max-w-md text-sm text-zinc-400 mb-6">
              The requested video section &quot;{slug}&quot; does not exist or has been disabled by the administrator.
            </p>
            <Link
              href="/"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90"
              style={{ backgroundColor: colors.button || '#E50914' }}
            >
              Explore All Videos
            </Link>
          </div>
        ) : (
          <div>
            {/* Section Header Banner */}
            <div
              id="section-banner"
              className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-6 sm:p-8 backdrop-blur-md"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}18 0%, rgba(24, 24, 27, 0.9) 60%, rgba(9, 9, 11, 0.95) 100%)`,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-black/40"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <SectionIcon name={section.icon} className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase">
                        {section.name}
                      </h1>
                      <span className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 border border-zinc-700/60">
                        {videos.length} {videos.length === 1 ? 'Video' : 'Videos'}
                      </span>
                    </div>
                    {section.description && (
                      <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-mono text-zinc-500">
                    Slug: <span className="text-zinc-300 font-semibold">/{section.slug}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Videos Grid */}
            {filteredVideos.length === 0 ? (
              <div
                id="section-empty-state"
                className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-8 text-center"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">
                  <Film className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-zinc-200">No Videos in this Section Yet</h3>
                <p className="mt-1 max-w-md text-xs text-zinc-500">
                  {searchQuery
                    ? `No videos matched "${searchQuery}". Try clearing your search query.`
                    : 'Videos assigned to this section by the administrator will automatically appear here.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-4 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                    Showing {filteredVideos.length} {filteredVideos.length === 1 ? 'Video' : 'Videos'}
                  </h2>
                </div>
                <div
                  id="section-videos-grid"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {filteredVideos.map((video, idx) => (
                    <VideoCard key={video.id} video={video} priority={idx < 4} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Ad Box - Outside Footer, After Main Content */}
      <FooterAdBox page={slug as any} />

      {/* Footer - Completely separate from Ad */}
      <Footer />
    </div>
  );
}
