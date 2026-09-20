'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Link2,
  Play,
  Check,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Clock,
  Radio,
  Tv,
  Film,
  Layers,
  Copy,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Video, Section, Playlist, VideoVisibility, VideoStatus, VideoContentType, VideoLiveStatus } from '@/lib/types';
import { createVideo, updateVideo, deleteVideo, getVideos, findVideoBySourceUrl } from '@/lib/videoService';
import { formatDuration, formatTimeAgo } from '@/lib/formatters';
import { ImportedMetadata } from '@/lib/jiohotstarParser';
import { auth } from '@/lib/firebase';

interface AdminJioHotstarImportProps {
  sections: Section[];
  playlists: Playlist[];
  onVideoCreated?: (video: Video) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export function AdminJioHotstarImport({
  sections,
  playlists,
  onVideoCreated,
  showToast,
}: AdminJioHotstarImportProps) {
  // Navigation tabs within import page
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'history'>('import');

  // URL Input & Loading State
  const [inputUrl, setInputUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Extracted Metadata & Form State
  const [metadata, setMetadata] = useState<ImportedMetadata | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [formPoster, setFormPoster] = useState('');
  const [formContentType, setFormContentType] = useState<VideoContentType>('video');
  const [formSeasonNumber, setFormSeasonNumber] = useState<number | ''>('');
  const [formEpisodeNumber, setFormEpisodeNumber] = useState<number | ''>('');
  const [formSeriesName, setFormSeriesName] = useState('');
  const [formDurationSeconds, setFormDurationSeconds] = useState<number>(0);
  const [formIsLive, setFormIsLive] = useState(false);
  const [formLiveStatus, setFormLiveStatus] = useState<VideoLiveStatus>('unknown');
  const [formProvider, setFormProvider] = useState('JioHotstar');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formEmbedUrl, setFormEmbedUrl] = useState('');
  const [formCategory, setFormCategory] = useState('Entertainment');
  const [formLanguage, setFormLanguage] = useState('Tamil');
  const [formSectionIds, setFormSectionIds] = useState<string[]>([]);
  const [formPlaylistId, setFormPlaylistId] = useState('');
  const [formVisibility, setFormVisibility] = useState<VideoVisibility>('public');
  const [formStatus, setFormStatus] = useState<VideoStatus>('published');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [publishedVideo, setPublishedVideo] = useState<Video | null>(null);

  // Duplicate Detection
  const [duplicateVideo, setDuplicateVideo] = useState<Video | null>(null);
  const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);

  // Import History
  const [historyVideos, setHistoryVideos] = useState<Video[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<string>('all');

  // Load history videos
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const allVideos = await getVideos(true);
      const imported = allVideos.filter(
        (v) => v.provider || v.sourceType === 'authorized_embed' || v.sourceUrl
      );
      setHistoryVideos(imported);
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (activeSubTab === 'history') {
      getVideos(true)
        .then((allVideos) => {
          if (!active) return;
          const imported = allVideos.filter(
            (v) => v.provider || v.sourceType === 'authorized_embed' || v.sourceUrl
          );
          setHistoryVideos(imported);
        })
        .catch((err) => console.error('Failed to load import history:', err));
    }
    return () => {
      active = false;
    };
  }, [activeSubTab]);

  // Handle Fetch Details
  const handleFetchDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) {
      setFetchError('Please paste a JioHotstar or authorized provider URL.');
      return;
    }

    setFetchError(null);
    setIsFetching(true);
    setPublishedVideo(null);
    setDuplicateVideo(null);
    setIsUpdatingExisting(false);

    try {
      // 1. Check for duplicates in database
      const existing = await findVideoBySourceUrl(inputUrl.trim());
      if (existing) {
        setDuplicateVideo(existing);
      }

      // 2. Call server-side inspection API with auth headers
      const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
        headers['x-admin-token'] = adminToken;
      }
      if (auth.currentUser?.email) {
        headers['x-user-email'] = auth.currentUser.email;
      }

      const res = await fetch('/api/admin/jiohotstar-import/inspect', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: inputUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to retrieve metadata from the supplied URL.');
      }

      const meta: ImportedMetadata = data.metadata;
      setMetadata(meta);

      // Populate editable form fields from retrieved metadata
      setFormTitle(meta.title || '');
      setFormDesc(meta.description || '');
      setFormThumbnail(meta.thumbnailUrl || '');
      setFormPoster(meta.posterUrl || meta.thumbnailUrl || '');
      setFormContentType(meta.contentType || 'video');
      setFormSeasonNumber(meta.seasonNumber !== undefined ? meta.seasonNumber : '');
      setFormEpisodeNumber(meta.episodeNumber !== undefined ? meta.episodeNumber : '');
      setFormSeriesName(meta.seriesName || '');
      setFormDurationSeconds(meta.durationSeconds || 0);
      setFormIsLive(meta.isLive || meta.liveStatus === 'live');
      setFormLiveStatus(meta.liveStatus || (meta.isLive ? 'live' : 'unknown'));
      setFormProvider(meta.provider || 'JioHotstar');
      setFormSourceUrl(meta.sourceUrl || inputUrl.trim());
      setFormEmbedUrl(meta.embedUrl || inputUrl.trim());
      setFormCategory(meta.category || 'Entertainment');
      setFormLanguage(meta.language || 'Tamil');

      // Auto-match sections if available
      if (sections.length > 0) {
        const matched = sections.find(
          (s) =>
            s.name.toLowerCase().includes(meta.contentType.toLowerCase()) ||
            (meta.isLive && s.name.toLowerCase().includes('live')) ||
            s.name.toLowerCase().includes('hotstar')
        );
        if (matched) {
          setFormSectionIds([matched.id]);
        }
      }

      showToast('Metadata successfully fetched from provider!', 'success');
    } catch (err: any) {
      console.error('Fetch metadata error:', err);
      setFetchError(err.message || 'Unable to retrieve metadata from the supplied URL.');
      showToast(err.message || 'Unable to retrieve metadata.', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  // Handle Save / Publish
  const handleSaveContent = async (targetStatus: VideoStatus) => {
    if (!formTitle.trim()) {
      showToast('Please provide a title for the video.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const durSecs = Math.max(0, Math.round(formDurationSeconds || 0));

      const videoPayload: Omit<Video, 'id' | 'createdAt' | 'updatedAt' | 'views'> = {
        title: formTitle.trim(),
        description: formDesc.trim(),
        thumbnailUrl:
          formThumbnail.trim() ||
          'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
        videoUrl: formEmbedUrl.trim() || formSourceUrl.trim(),
        sourceType: metadata?.sourceType || 'authorized_embed',
        duration_seconds: durSecs,
        duration: durSecs,
        duration_formatted: formatDuration(durSecs),
        visibility: formVisibility,
        status: targetStatus,
        playlistId: formPlaylistId || undefined,
        sectionIds: formSectionIds.length > 0 ? formSectionIds : undefined,
        category: formCategory.trim() || 'General',
        tags: [formProvider, formContentType, formLanguage].filter(Boolean),
        // Provider specific fields
        provider: formProvider,
        sourceUrl: formSourceUrl.trim() || inputUrl.trim(),
        embedUrl: formEmbedUrl.trim() || formSourceUrl.trim(),
        contentType: formContentType,
        isLive: formIsLive || formLiveStatus === 'live',
        liveStatus: formLiveStatus,
        seasonNumber: formSeasonNumber !== '' ? Number(formSeasonNumber) : undefined,
        episodeNumber: formEpisodeNumber !== '' ? Number(formEpisodeNumber) : undefined,
        seriesName: formSeriesName.trim() || undefined,
        language: formLanguage.trim() || 'Tamil',
        releaseDate: metadata?.releaseDate || new Date().toISOString().split('T')[0],
      };

      let saved: Video;

      if (isUpdatingExisting && duplicateVideo) {
        // Update existing video record
        await updateVideo(duplicateVideo.id, videoPayload);
        saved = {
          ...duplicateVideo,
          ...videoPayload,
          updatedAt: new Date().toISOString(),
        };
        showToast(`Video "${formTitle}" updated successfully!`, 'success');
      } else {
        // Create new video entry
        saved = await createVideo(videoPayload);
        showToast(
          targetStatus === 'published'
            ? `Video "${formTitle}" successfully published!`
            : `Video "${formTitle}" saved as draft.`,
          'success'
        );
        if (onVideoCreated) {
          onVideoCreated(saved);
        }
      }

      setPublishedVideo(saved);
      loadHistory();
    } catch (err: any) {
      console.error('Failed to save imported video:', err);
      showToast(err.message || 'Failed to save video to database.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick preset loader for fast testing
  const handleQuickLoadSample = (url: string) => {
    setInputUrl(url);
    setFetchError(null);
  };

  // Reset Form
  const handleResetForm = () => {
    setInputUrl('');
    setMetadata(null);
    setFetchError(null);
    setDuplicateVideo(null);
    setIsUpdatingExisting(false);
    setPublishedVideo(null);
    setFormTitle('');
    setFormDesc('');
    setFormThumbnail('');
    setFormPoster('');
    setFormSectionIds([]);
  };

  // History filtering
  const filteredHistory = historyVideos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      (v.provider && v.provider.toLowerCase().includes(historySearch.toLowerCase())) ||
      (v.sourceUrl && v.sourceUrl.toLowerCase().includes(historySearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (historyFilterType === 'all') return true;
    if (historyFilterType === 'live') return v.isLive || v.liveStatus === 'live';
    if (historyFilterType === 'episode') return v.contentType === 'episode';
    if (historyFilterType === 'movie') return v.contentType === 'movie';
    if (historyFilterType === 'published') return v.status === 'published';
    if (historyFilterType === 'draft') return v.status === 'draft';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 text-red-500 border border-red-500/20">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                JioHotstar Auto Import
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400 border border-blue-500/20">
                  Official Authorized Mode
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Import authorized movies, episodes, series, and live streams with automatic metadata & playback.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center rounded-xl bg-zinc-900/80 p-1 border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('import')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'import'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>URL Import</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('history');
              loadHistory();
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'history'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Import History</span>
            {historyVideos.length > 0 && (
              <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300">
                {historyVideos.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4 text-xs text-blue-200">
        <ShieldCheck className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-300">Compliance & Authorized Integration</p>
          <p className="text-blue-300/80 leading-relaxed">
            This auto-import engine strictly fetches officially published metadata (Title, Description, Poster/Thumbnail, Duration, Episode details, Live Status) and configures official authorized player/embed sources. It respects provider DRM, paywalls, and access protections.
          </p>
        </div>
      </div>

      {activeSubTab === 'import' ? (
        <div className="space-y-8">
          {/* Section 1 & 2: URL Input Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-red-500" />
              <span>Step 1: Paste JioHotstar / Provider URL</span>
            </h3>

            <form onSubmit={handleFetchDetails} className="space-y-4">
              <div>
                <label htmlFor="jiohotstar-url-input" className="block text-xs font-semibold text-zinc-300 mb-2">
                  JioHotstar Movie / Episode / Live URL <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="jiohotstar-url-input"
                    type="url"
                    value={inputUrl}
                    onChange={(e) => {
                      setInputUrl(e.target.value);
                      if (fetchError) setFetchError(null);
                    }}
                    placeholder="https://www.hotstar.com/in/movies/... or https://www.hotstar.com/in/shows/... or live stream URL"
                    disabled={isFetching}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition disabled:opacity-50"
                  />
                  {inputUrl && (
                    <button
                      type="button"
                      onClick={() => setInputUrl('')}
                      className="absolute right-36 text-xs text-zinc-400 hover:text-white px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    id="fetch-details-btn"
                    disabled={isFetching || !inputUrl.trim()}
                    className="absolute right-1.5 flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Fetch Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sample test presets */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-1">
                <span className="font-semibold text-zinc-500">Quick test examples:</span>
                <button
                  type="button"
                  onClick={() => handleQuickLoadSample('https://www.hotstar.com/in/movies/vikram/1260105436')}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-zinc-700 hover:text-white transition"
                >
                  Hotstar Movie (Vikram)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLoadSample('https://www.hotstar.com/in/shows/kadavul-setha-padhivu/1260001234/season-2/episode-5/1260014023')}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-zinc-700 hover:text-white transition"
                >
                  Hotstar Episode (S2:E5)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLoadSample('https://www.hotstar.com/in/sports/cricket/live/1260019999')}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-zinc-700 hover:text-white transition"
                >
                  Live Stream (Sports)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLoadSample('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-zinc-700 hover:text-white transition"
                >
                  YouTube oEmbed
                </button>
              </div>

              {/* Error message */}
              {fetchError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{fetchError}</span>
                </div>
              )}
            </form>
          </div>

          {/* Duplicate Detection Notice */}
          {duplicateVideo && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">
                      This content has already been imported!
                    </h4>
                    <p className="text-xs text-amber-200/80 mt-0.5">
                      An entry matching this source URL exists in your video database:{' '}
                      <strong className="text-white font-medium">&quot;{duplicateVideo.title}&quot;</strong> (ID: {duplicateVideo.id}).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/watch?v=${duplicateVideo.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Existing</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUpdatingExisting(true);
                      showToast('Now editing existing video metadata record.', 'success');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      isUpdatingExisting
                        ? 'bg-amber-500 text-black font-bold'
                        : 'border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                    }`}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{isUpdatingExisting ? 'Updating Existing Mode' : 'Update Metadata'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Publication Notice */}
          {publishedVideo && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">
                      Content Successfully Saved to Video System!
                    </h4>
                    <p className="text-xs text-emerald-200/80">
                      &quot;{publishedVideo.title}&quot; is now available in your Firebase video library and ready for instant playback.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/watch?v=${publishedVideo.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Watch Now</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                  >
                    Import Another
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 3 - 15: Admin Preview & Editable Metadata Form */}
          {metadata && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Step 2: Review & Edit Imported Metadata
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Auto-fetched from {formProvider}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Visual Preview Card */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="font-semibold uppercase tracking-wider">Preview Thumbnail</span>
                        {metadata.autoFetchedFields.thumbnail ? (
                          <span className="text-emerald-400 font-medium">✓ Auto-Imported</span>
                        ) : (
                          <span className="text-amber-400 font-medium">Manual Entry</span>
                        )}
                      </div>

                      {/* Thumbnail Container */}
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-inner">
                        {formThumbnail ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={formThumbnail}
                            alt="Imported preview"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-zinc-500">
                            <Tv className="h-10 w-10 mb-2 opacity-50" />
                            <span className="text-xs font-medium">Thumbnail unavailable</span>
                            <span className="text-[11px] text-zinc-600 mt-1">
                              Enter a custom thumbnail URL below
                            </span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          {formIsLive || formLiveStatus === 'live' ? (
                            <div className="flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                              <span>LIVE NOW</span>
                            </div>
                          ) : (
                            <div className="rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-200 backdrop-blur-sm border border-white/10">
                              {formProvider}
                            </div>
                          )}

                          <div className="rounded bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300 backdrop-blur-sm">
                            {formContentType}
                          </div>
                        </div>

                        {/* Season / Episode badge */}
                        {formContentType === 'episode' && formSeasonNumber !== '' && formEpisodeNumber !== '' && (
                          <div className="absolute top-2.5 right-2.5 rounded bg-red-950/90 border border-red-700/50 px-2 py-0.5 text-[11px] font-bold text-red-200 backdrop-blur-sm">
                            S{formSeasonNumber} : E{formEpisodeNumber}
                          </div>
                        )}

                        {/* Duration Badge */}
                        {!(formIsLive || formLiveStatus === 'live') && (
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                            <Clock className="h-3 w-3 text-zinc-400" />
                            <span>{formatDuration(formDurationSeconds)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata Summary Info Chips */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Provider:</span>
                        <span className="font-semibold text-white">{formProvider}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Content Type:</span>
                        <span className="font-semibold text-white capitalize">{formContentType}</span>
                      </div>
                      {formSeriesName && (
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Series:</span>
                          <span className="font-semibold text-white">{formSeriesName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Live Status:</span>
                        <span className={`font-semibold uppercase ${formLiveStatus === 'live' ? 'text-red-400' : 'text-zinc-300'}`}>
                          {formLiveStatus === 'live' ? '● LIVE NOW' : formLiveStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Playback Method:</span>
                        <span className="font-mono text-zinc-300">{metadata.sourceType}</span>
                      </div>
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-zinc-500">
                        <span>Source URL:</span>
                        <a
                          href={formSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 truncate max-w-[180px]"
                        >
                          <span className="truncate">{formSourceUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Editable Form Fields */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Title */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="edit-import-title" className="text-xs font-semibold text-zinc-300">
                          Video Title <span className="text-red-500">*</span>
                        </label>
                        {metadata.autoFetchedFields.title && (
                          <span className="text-[11px] text-emerald-400 font-medium">✓ Auto-imported</span>
                        )}
                      </div>
                      <input
                        id="edit-import-title"
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Video Title"
                        required
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="edit-import-desc" className="text-xs font-semibold text-zinc-300">
                          Description
                        </label>
                        {metadata.autoFetchedFields.description && (
                          <span className="text-[11px] text-emerald-400 font-medium">✓ Auto-imported</span>
                        )}
                      </div>
                      <textarea
                        id="edit-import-desc"
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        rows={3}
                        placeholder="Video synopsis / details..."
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
                      />
                    </div>

                    {/* Content Type & Series / Episode / Season */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="edit-content-type" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Content Type
                        </label>
                        <select
                          id="edit-content-type"
                          value={formContentType}
                          onChange={(e) => setFormContentType(e.target.value as VideoContentType)}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        >
                          <option value="movie">Movie</option>
                          <option value="episode">Episode</option>
                          <option value="series">Series</option>
                          <option value="live">Live Stream</option>
                          <option value="video">Standard Video</option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </div>

                      {formContentType === 'episode' ? (
                        <>
                          <div>
                            <label htmlFor="edit-season-num" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                              Season Number
                            </label>
                            <input
                              id="edit-season-num"
                              type="number"
                              min={1}
                              value={formSeasonNumber}
                              onChange={(e) => setFormSeasonNumber(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="e.g. 1"
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label htmlFor="edit-episode-num" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                              Episode Number
                            </label>
                            <input
                              id="edit-episode-num"
                              type="number"
                              min={1}
                              value={formEpisodeNumber}
                              onChange={(e) => setFormEpisodeNumber(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="e.g. 5"
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label htmlFor="edit-duration-secs" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                              Duration (Seconds)
                            </label>
                            <input
                              id="edit-duration-secs"
                              type="number"
                              min={0}
                              value={formDurationSeconds}
                              onChange={(e) => setFormDurationSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label htmlFor="edit-live-status" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                              Live Status
                            </label>
                            <select
                              id="edit-live-status"
                              value={formLiveStatus}
                              onChange={(e) => {
                                const val = e.target.value as VideoLiveStatus;
                                setFormLiveStatus(val);
                                setFormIsLive(val === 'live');
                              }}
                              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                            >
                              <option value="unknown">Unknown</option>
                              <option value="live">● LIVE</option>
                              <option value="upcoming">Upcoming</option>
                              <option value="offline">Offline</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Series Name (if episode) */}
                    {formContentType === 'episode' && (
                      <div>
                        <label htmlFor="edit-series-name" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Series Name
                        </label>
                        <input
                          id="edit-series-name"
                          type="text"
                          value={formSeriesName}
                          onChange={(e) => setFormSeriesName(e.target.value)}
                          placeholder="e.g. MasterChef Tamil"
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Thumbnail URL Input */}
                    <div>
                      <label htmlFor="edit-thumb-url" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Thumbnail URL
                      </label>
                      <input
                        id="edit-thumb-url"
                        type="url"
                        value={formThumbnail}
                        onChange={(e) => setFormThumbnail(e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    {/* Category & Language */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="edit-category" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Category
                        </label>
                        <input
                          id="edit-category"
                          type="text"
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          placeholder="e.g. Entertainment, Action, Drama"
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-language" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Language
                        </label>
                        <input
                          id="edit-language"
                          type="text"
                          value={formLanguage}
                          onChange={(e) => setFormLanguage(e.target.value)}
                          placeholder="e.g. Tamil"
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Section Assignment */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Assign to Homepage Sections
                      </label>
                      {sections.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No sections created yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                          {sections.map((sec) => {
                            const isSelected = formSectionIds.includes(sec.id);
                            return (
                              <button
                                key={sec.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setFormSectionIds(formSectionIds.filter((id) => id !== sec.id));
                                  } else {
                                    setFormSectionIds([...formSectionIds, sec.id]);
                                  }
                                }}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-red-600 text-white font-semibold shadow-sm'
                                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white'
                                }`}
                              >
                                {isSelected ? <Check className="h-3 w-3" /> : null}
                                <span>{sec.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Playlist & Visibility & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="edit-playlist" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Playlist (Optional)
                        </label>
                        <select
                          id="edit-playlist"
                          value={formPlaylistId}
                          onChange={(e) => setFormPlaylistId(e.target.value)}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        >
                          <option value="">None</option>
                          {playlists.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="edit-visibility" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Visibility
                        </label>
                        <select
                          id="edit-visibility"
                          value={formVisibility}
                          onChange={(e) => setFormVisibility(e.target.value as VideoVisibility)}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        >
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="private">Private</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="edit-status" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Status
                        </label>
                        <select
                          id="edit-status"
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as VideoStatus)}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="unpublished">Unpublished</option>
                        </select>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleResetForm}
                        disabled={isSaving}
                        className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white transition disabled:opacity-50"
                      >
                        Discard
                      </button>

                      <button
                        type="button"
                        id="save-draft-btn"
                        onClick={() => handleSaveContent('draft')}
                        disabled={isSaving || !formTitle.trim()}
                        className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-700 transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        <span>Save Draft</span>
                      </button>

                      <button
                        type="button"
                        id="publish-video-btn"
                        onClick={() => handleSaveContent('published')}
                        disabled={isSaving || !formTitle.trim()}
                        className="rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Publishing to Database...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{isUpdatingExisting ? 'Update & Publish' : 'Publish to Video System'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Section 18: JioHotstar Import History */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search imported titles, providers, URLs..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400" />
              <select
                value={historyFilterType}
                onChange={(e) => setHistoryFilterType(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
              >
                <option value="all">All Content</option>
                <option value="live">Live Streams</option>
                <option value="movie">Movies</option>
                <option value="episode">Episodes</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>

              <button
                type="button"
                onClick={loadHistory}
                disabled={loadingHistory}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-red-500 mb-3" />
              <span className="text-xs text-zinc-400">Loading import history...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
              <Tv className="h-10 w-10 text-zinc-600 mb-3" />
              <h4 className="text-sm font-bold text-zinc-300">No Imported Content Found</h4>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                Paste any authorized JioHotstar or provider URL in the Import tab to automatically fetch and publish content.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('import')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Import First Video</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Thumbnail</th>
                    <th className="px-4 py-3">Title / Info</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Type / Live</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Imported Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredHistory.map((video) => (
                    <tr key={video.id} className="hover:bg-zinc-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="relative aspect-video w-20 overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200'}
                            alt={video.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-white line-clamp-1">{video.title}</div>
                        {video.sourceUrl && (
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5" title={video.sourceUrl}>
                            {video.sourceUrl}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                          {video.provider || 'External'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="capitalize text-[11px] text-zinc-300 font-medium">
                            {video.contentType || 'Video'}
                          </span>
                          {video.isLive || video.liveStatus === 'live' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                              LIVE
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500">
                              {formatDuration(video.duration_seconds || video.duration || 0)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            video.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {video.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-[11px]">
                        {formatTimeAgo(video.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/watch?v=${video.id}`}
                            target="_blank"
                            title="Watch"
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                          </Link>
                          {video.sourceUrl && (
                            <a
                              href={video.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open original source"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
