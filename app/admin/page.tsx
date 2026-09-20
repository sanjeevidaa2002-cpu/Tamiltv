'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  getVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  getSiteSettings,
  updateSiteSettings,
  seedInitialDataToFirestore,
  getSections,
  assignVideoSections,
} from '@/lib/videoService';
import { detectDurationFromFile, detectDurationFromUrl } from '@/lib/formatters';
import { Video, Playlist, SiteSettings, VideoVisibility, VideoStatus, VideoSourceType, Section, AuthenticationSettings } from '@/lib/types';
import { getAuthSettings, updateAuthSettings, DEFAULT_AUTH_SETTINGS } from '@/lib/authSettingsService';
import { formatDuration, formatViews, formatTimeAgo } from '@/components/VideoCard';
import { AdminSectionManager } from '@/components/admin/AdminSectionManager';
import { AdminBrandingManager } from '@/components/admin/AdminBrandingManager';
import { AdminAdManager } from '@/components/admin/AdminAdManager';
import { AdminJioHotstarImport } from '@/components/admin/AdminJioHotstarImport';
import { SectionIcon } from '@/components/SectionIcon';
import {
  LayoutDashboard,
  Film,
  Upload,
  Link2,
  Tv,
  Sparkles,
  ListVideo,
  Users,
  Settings as SettingsIcon,
  UserCheck,
  LogOut,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  Play,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Save,
  Radio,
  Clock,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Layers,
  Palette,
  Megaphone,
  Loader2,
  KeyRound,
  Shield,
  Power,
  Globe,
  Lock,
} from 'lucide-react';

type AdminTab =
  | 'dashboard'
  | 'sections'
  | 'branding'
  | 'monetization'
  | 'library'
  | 'upload'
  | 'import'
  | 'jiohotstar'
  | 'playlists'
  | 'users'
  | 'settings'
  | 'profile';

export default function AdminPage() {
  const router = useRouter();
  const {
    admin,
    isAuthenticated: isAdmin,
    isLoading: authLoading,
    login: adminLogin,
    logout: adminLogout,
    updateCredentials: adminUpdateCredentials,
  } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [videos, setVideos] = useState<Video[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [authSettings, setAuthSettingsState] = useState<AuthenticationSettings>(DEFAULT_AUTH_SETTINGS);
  const [savingAuthSettings, setSavingAuthSettings] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<'auth' | 'general' | 'storage'>('auth');
  const [loadingData, setLoadingData] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dedicated Admin Login specific states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);
  const [bypassLoading, setBypassLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBypassLoading(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Admin Credential Management states
  const [credCurrentPassword, setCredCurrentPassword] = useState('');
  const [credNewUsername, setCredNewUsername] = useState('');
  const [credNewPassword, setCredNewPassword] = useState('');
  const [credUpdating, setCredUpdating] = useState(false);

  // Library filters
  const [librarySearch, setLibrarySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VideoStatus>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | VideoVisibility>('all');
  const [playlistFilter, setPlaylistFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [libraryPage, setLibraryPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<Video | null>(null);

  // Duration Detection & Section Assignment States
  const [isDetectingDuration, setIsDetectingDuration] = useState(false);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadThumbnail, setUploadThumbnail] = useState('');
  const [uploadVideoFile, setUploadVideoFile] = useState<File | null>(null);
  const [uploadPlaylistId, setUploadPlaylistId] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<VideoVisibility>('public');
  const [uploadStatus, setUploadStatus] = useState<VideoStatus>('published');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadSectionIds, setUploadSectionIds] = useState<string[]>([]);
  const [uploadDurationSeconds, setUploadDurationSeconds] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCancelled, setUploadCancelled] = useState(false);

  // Import Form State
  const [importUrl, setImportUrl] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importDesc, setImportDesc] = useState('');
  const [importThumbnail, setImportThumbnail] = useState('');
  const [importPlaylistId, setImportPlaylistId] = useState('');
  const [importVisibility, setImportVisibility] = useState<VideoVisibility>('public');
  const [importStatus, setImportStatus] = useState<VideoStatus>('published');
  const [importCategory, setImportCategory] = useState('Technology');
  const [importTags, setImportTags] = useState('Stream, HD');
  const [importSectionIds, setImportSectionIds] = useState<string[]>([]);
  const [importDurationSeconds, setImportDurationSeconds] = useState<number>(0);
  const [isImporting, setIsImporting] = useState(false);

  // Playlist Form State
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [playlistThumbnail, setPlaylistThumbnail] = useState('');
  const [playlistSelectedVideos, setPlaylistSelectedVideos] = useState<string[]>([]);
  const [playlistStatus, setPlaylistStatus] = useState<'published' | 'unpublished' | 'draft'>('published');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reload core data
  const refreshData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [vList, pList, siteSettings, sList, authConfig] = await Promise.all([
        getVideos(true),
        getPlaylists(true),
        getSiteSettings(),
        getSections(true),
        getAuthSettings(),
      ]);
      // If Firestore is still unpopulated, seed it directly
      if (isAdmin && vList.length === 0) {
        await seedInitialDataToFirestore();
        const [seededVids, seededPlaylists, seededSections, seededAuthConfig] = await Promise.all([
          getVideos(true),
          getPlaylists(true),
          getSections(true),
          getAuthSettings(),
        ]);
        setVideos(seededVids);
        setPlaylists(seededPlaylists);
        setSections(seededSections);
        setAuthSettingsState(seededAuthConfig);
      } else {
        setVideos(vList);
        setPlaylists(pList);
        setSections(sList);
        setAuthSettingsState(authConfig);
      }
      setSettings(siteSettings);
    } catch (err) {
      console.error('Error loading admin data:', err);
      showToast('Failed to load admin records from database.', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [isAdmin]);

  const handleManualSeed = async () => {
    try {
      showToast('Syncing sample catalog to Firestore database...', 'success');
      const res = await seedInitialDataToFirestore();
      if (res.success) {
        await refreshData();
        showToast(`Successfully seeded ${res.count} initial videos & playlists to Firestore!`, 'success');
      } else {
        showToast(`Seeding failed: ${res.error || 'Permission error'}`, 'error');
      }
    } catch (e) {
      showToast('Failed to write seed data to database', 'error');
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      refreshData();
    }, 0);
    return () => clearTimeout(timer);
  }, [isAdmin, refreshData]);

  // Admin login handler (Dedicated Username + Password)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    setAdminLoggingIn(true);
    try {
      const res = await adminLogin(adminUsername, adminPassword);
      if (!res.success) {
        setAdminLoginError(res.error || 'Invalid administrator username or password.');
      } else {
        showToast('Administrator authenticated successfully');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminLoginError(msg || 'Authentication failed');
    } finally {
      setAdminLoggingIn(false);
    }
  };

  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credCurrentPassword) {
      showToast('Current password is required', 'error');
      return;
    }
    setCredUpdating(true);
    try {
      const res = await adminUpdateCredentials(
        credCurrentPassword,
        credNewPassword || undefined,
        credNewUsername || undefined
      );
      if (res.success) {
        showToast('Admin credentials updated successfully');
        setCredCurrentPassword('');
        setCredNewUsername('');
        setCredNewPassword('');
      } else {
        showToast(res.error || 'Failed to update credentials', 'error');
      }
    } catch {
      showToast('Error updating credentials', 'error');
    } finally {
      setCredUpdating(false);
    }
  };

  // Calculate Dashboard Metrics
  const metrics = useMemo(() => {
    const totalVideos = videos.length;
    const published = videos.filter((v) => v.status === 'published').length;
    const drafts = videos.filter((v) => v.status === 'draft').length;
    const totalPlaylists = playlists.length;
    const totalViews = videos.reduce((acc, curr) => acc + (curr.views || 0), 0);
    return { totalVideos, published, drafts, totalPlaylists, totalViews };
  }, [videos, playlists]);

  // Filtered library videos
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      const matchSearch =
        !librarySearch.trim() ||
        v.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
        v.description?.toLowerCase().includes(librarySearch.toLowerCase());
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchVisibility = visibilityFilter === 'all' || v.visibility === visibilityFilter;
      const matchPlaylist = playlistFilter === 'all' || v.playlistId === playlistFilter;
      const matchSection =
        sectionFilter === 'all' ||
        (v.sectionIds || []).includes(sectionFilter) ||
        (v.sectionIds || []).some((secId) => {
          const s = sections.find((sec) => sec.id === secId || sec.slug === secId);
          return s?.id === sectionFilter || s?.slug === sectionFilter;
        });
      return matchSearch && matchStatus && matchVisibility && matchPlaylist && matchSection;
    });
  }, [videos, librarySearch, statusFilter, visibilityFilter, playlistFilter, sectionFilter, sections]);

  const paginatedVideos = useMemo(() => {
    const start = (libraryPage - 1) * itemsPerPage;
    return filteredVideos.slice(start, start + itemsPerPage);
  }, [filteredVideos, libraryPage]);

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage) || 1;

  // Handle Video Upload (Simulation with real data URL / local Blob URL and storage metadata)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      showToast('Video title is required.', 'error');
      return;
    }
    if (!uploadVideoFile && !uploadThumbnail) {
      showToast('Please select a video file to upload.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadCancelled(false);

    try {
      // Simulate file upload progress
      for (let p = 20; p <= 90; p += 20) {
        if (uploadCancelled) throw new Error('Upload cancelled');
        await new Promise((res) => setTimeout(res, 250));
        setUploadProgress(p);
      }

      // Generate object URL for playback
      const videoObjectUrl = uploadVideoFile
        ? URL.createObjectURL(uploadVideoFile)
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

      const thumbUrl =
        uploadThumbnail ||
        'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80';

      const tagArray = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Determine real detected duration
      let finalDuration = uploadDurationSeconds;
      if (!finalDuration && uploadVideoFile) {
        try {
          finalDuration = await detectDurationFromFile(uploadVideoFile);
        } catch {
          finalDuration = 300;
        }
      }
      finalDuration = finalDuration || 300;

      const created = await createVideo({
        title: uploadTitle,
        description: uploadDesc,
        thumbnailUrl: thumbUrl,
        videoUrl: videoObjectUrl,
        sourceType: 'upload',
        duration: finalDuration,
        duration_seconds: finalDuration,
        visibility: uploadVisibility,
        status: uploadStatus,
        sectionIds: uploadSectionIds,
        ...(uploadPlaylistId.trim() ? { playlistId: uploadPlaylistId.trim() } : {}),
        tags: tagArray,
        category: uploadCategory,
        uploadedBy: admin?.username || 'Admin',
      });

      // Synchronize video_sections junction table
      if (uploadSectionIds.length > 0) {
        try {
          await assignVideoSections(created.id, uploadSectionIds);
        } catch (secErr) {
          console.error('Error assigning video sections:', secErr);
        }
      }

      setUploadProgress(100);
      showToast(`Video "${created.title}" uploaded successfully! Real duration: ${formatDuration(finalDuration)}`);
      // Reset form
      setUploadTitle('');
      setUploadDesc('');
      setUploadThumbnail('');
      setUploadVideoFile(null);
      setUploadTags('');
      setUploadSectionIds([]);
      setUploadDurationSeconds(0);
      refreshData();
      setActiveTab('library');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== 'Upload cancelled') {
        showToast('Upload failed. Please check file format and connection.', 'error');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle Video URL Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) {
      showToast('Video URL is required.', 'error');
      return;
    }
    if (!importTitle.trim()) {
      showToast('Video title is required.', 'error');
      return;
    }

    // Basic URL validation
    try {
      new URL(importUrl);
    } catch {
      showToast('Please provide a valid HTTP or HTTPS video URL.', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const isHls = importUrl.endsWith('.m3u8') || importUrl.includes('.m3u8?');
      const tagArray = importTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Determine real detected duration
      let finalDuration = importDurationSeconds;
      if (!finalDuration) {
        try {
          finalDuration = await detectDurationFromUrl(importUrl);
        } catch {
          finalDuration = 300;
        }
      }
      finalDuration = finalDuration || 300;

      const created = await createVideo({
        title: importTitle,
        description: importDesc,
        thumbnailUrl:
          importThumbnail ||
          'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop&q=80',
        videoUrl: importUrl,
        sourceType: isHls ? 'hls' : 'direct',
        duration: finalDuration,
        duration_seconds: finalDuration,
        visibility: importVisibility,
        status: importStatus,
        sectionIds: importSectionIds,
        ...(importPlaylistId.trim() ? { playlistId: importPlaylistId.trim() } : {}),
        tags: tagArray,
        category: importCategory,
        uploadedBy: admin?.username || 'Admin',
      });

      // Synchronize video_sections junction table
      if (importSectionIds.length > 0) {
        try {
          await assignVideoSections(created.id, importSectionIds);
        } catch (secErr) {
          console.error('Error assigning video sections:', secErr);
        }
      }

      showToast(`Imported video "${created.title}" successfully! Real duration: ${formatDuration(finalDuration)}`);
      setImportUrl('');
      setImportTitle('');
      setImportDesc('');
      setImportThumbnail('');
      setImportSectionIds([]);
      setImportDurationSeconds(0);
      refreshData();
      setActiveTab('library');
    } catch (err) {
      console.error('Import error:', err);
      showToast('Failed to import video. Please verify permissions and URL.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Video Actions in Library
  const handleTogglePublish = async (video: Video) => {
    const nextStatus: VideoStatus = video.status === 'published' ? 'unpublished' : 'published';
    try {
      await updateVideo(video.id, { status: nextStatus });
      showToast(`Video marked as ${nextStatus}`);
      refreshData();
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDuplicateVideo = async (video: Video) => {
    try {
      await createVideo({
        title: `${video.title} (Copy)`,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        videoUrl: video.videoUrl,
        sourceType: video.sourceType,
        duration: video.duration,
        duration_seconds: video.duration_seconds || video.duration,
        sectionIds: video.sectionIds || [],
        visibility: 'private',
        status: 'draft',
        ...(video.playlistId ? { playlistId: video.playlistId } : {}),
        ...(video.tags ? { tags: video.tags } : {}),
        ...(video.category ? { category: video.category } : {}),
        uploadedBy: admin?.username || 'Admin',
      });
      showToast('Video metadata duplicated as draft');
      refreshData();
    } catch (err) {
      showToast('Failed to duplicate video', 'error');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deletingVideo) return;
    try {
      await deleteVideo(deletingVideo.id);
      showToast(`Deleted "${deletingVideo.title}"`);
      setDeletingVideo(null);
      refreshData();
    } catch (err) {
      showToast('Failed to delete video', 'error');
    }
  };

  const handleSaveVideoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    try {
      const durSec = Number(editingVideo.duration_seconds || editingVideo.duration || 300);
      await updateVideo(editingVideo.id, {
        title: editingVideo.title,
        description: editingVideo.description,
        thumbnailUrl: editingVideo.thumbnailUrl,
        videoUrl: editingVideo.videoUrl,
        playlistId: editingVideo.playlistId?.trim() || '',
        tags: editingVideo.tags || [],
        category: editingVideo.category || '',
        visibility: editingVideo.visibility,
        status: editingVideo.status,
        duration: durSec,
        duration_seconds: durSec,
        sectionIds: editingVideo.sectionIds || [],
      });

      // Synchronize video_sections junction table
      if (editingVideo.sectionIds) {
        await assignVideoSections(editingVideo.id, editingVideo.sectionIds);
      }

      showToast('Video details and section assignments updated successfully');
      setEditingVideo(null);
      refreshData();
    } catch (err) {
      showToast('Failed to update video', 'error');
    }
  };

  // Playlist Management
  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistTitle.trim()) {
      showToast('Playlist title is required', 'error');
      return;
    }

    try {
      if (editingPlaylist) {
        await updatePlaylist(editingPlaylist.id, {
          title: playlistTitle,
          description: playlistDesc,
          thumbnailUrl: playlistThumbnail,
          videoIds: playlistSelectedVideos,
          status: playlistStatus,
        });
        showToast('Playlist updated');
      } else {
        await createPlaylist({
          title: playlistTitle,
          description: playlistDesc,
          thumbnailUrl:
            playlistThumbnail ||
            'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
          videoIds: playlistSelectedVideos,
          status: playlistStatus,
          createdBy: admin?.username || 'Admin',
        });
        showToast('Playlist created');
      }
      setIsCreatingPlaylist(false);
      setEditingPlaylist(null);
      refreshData();
    } catch (err) {
      showToast('Failed to save playlist', 'error');
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await deletePlaylist(id);
      showToast('Playlist deleted');
      refreshData();
    } catch (err) {
      showToast('Failed to delete playlist', 'error');
    }
  };

  const handleMovePlaylistVideo = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= playlistSelectedVideos.length) return;
    const reordered = [...playlistSelectedVideos];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setPlaylistSelectedVideos(reordered);
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await updateSiteSettings(settings);
      showToast('Site settings updated successfully');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    }
  };

  // Authentication Settings Save & Toggle Handlers
  const handleSaveAuthSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingAuthSettings(true);
    try {
      const updated = await updateAuthSettings(
        {
          googleLoginEnabled: authSettings.googleLoginEnabled,
          emailLoginEnabled: authSettings.emailLoginEnabled ?? true,
          registrationEnabled: authSettings.registrationEnabled ?? true,
        },
        admin?.username || 'admin'
      );
      setAuthSettingsState(updated);
      if (settings) {
        setSettings({ ...settings, googleLoginEnabled: updated.googleLoginEnabled, authSettings: updated });
      }
      showToast(
        `Google Login is now ${updated.googleLoginEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'} and updated across all devices!`,
        'success'
      );
    } catch (err) {
      console.error('Failed to save auth settings:', err);
      showToast('Failed to save authentication settings in Firebase.', 'error');
    } finally {
      setSavingAuthSettings(false);
    }
  };

  const handleToggleGoogleLogin = async () => {
    const nextState = !authSettings.googleLoginEnabled;
    const optimistic = { ...authSettings, googleLoginEnabled: nextState };
    setAuthSettingsState(optimistic);
    setSavingAuthSettings(true);
    try {
      const updated = await updateAuthSettings(
        {
          googleLoginEnabled: nextState,
          emailLoginEnabled: authSettings.emailLoginEnabled ?? true,
          registrationEnabled: authSettings.registrationEnabled ?? true,
        },
        admin?.username || 'admin'
      );
      setAuthSettingsState(updated);
      if (settings) {
        setSettings({ ...settings, googleLoginEnabled: updated.googleLoginEnabled, authSettings: updated });
      }
      showToast(
        `Google Login switched ${nextState ? 'ON' : 'OFF'}! Users will ${
          nextState ? 'now see' : 'no longer see'
        } Google sign-in buttons.`,
        'success'
      );
    } catch (err) {
      // Revert on failure
      setAuthSettingsState(authSettings);
      showToast('Failed to update Google Login status.', 'error');
    } finally {
      setSavingAuthSettings(false);
    }
  };

  // If admin session is loading
  if (authLoading && !bypassLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white p-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-xs">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          <span className="text-xs text-zinc-400">Verifying administrator session...</span>
          <button
            type="button"
            onClick={() => setBypassLoading(true)}
            className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-800 transition cursor-pointer"
          >
            Open Admin Login Form
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated as Admin -> Dedicated Username + Password Login Only
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-center text-xl font-bold tracking-tight text-white">ADMIN LOGIN</h1>
          <p className="text-center text-xs text-zinc-400 mt-1 mb-6">
            Authorized administrative credentials required.
          </p>

          {adminLoginError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="flex-1">{adminLoginError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Username</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={adminLoggingIn}
              className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition disabled:opacity-50 cursor-pointer"
            >
              {adminLoggingIn ? 'Verifying Credentials...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition">
              &larr; Return to Platform
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 ${
            toastMessage.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-950/90 text-emerald-200'
              : 'border border-red-500/30 bg-red-950/90 text-red-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-900/60 p-4 flex flex-col shrink-0 hidden md:flex">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white shadow-md shadow-red-600/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white">Admin Portal</h2>
            <p className="text-[10px] text-zinc-400">Content Management</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'dashboard' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'sections' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Layers className="h-4 w-4 text-amber-400" />
            <div className="flex items-center justify-between flex-1">
              <span>Dynamic Sections</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded-full">
                {sections.length}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'branding' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Palette className="h-4 w-4 text-purple-400" />
            <span>Branding & Colors</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('monetization')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'monetization' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Megaphone className="h-4 w-4 text-emerald-400" />
            <div className="flex items-center justify-between flex-1">
              <span>Monetization & Ads</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                Adsterra
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'library' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Film className="h-4 w-4" />
            <span>Video Library</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'upload' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Upload Video</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'import' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Link2 className="h-4 w-4" />
            <span>Import Video</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jiohotstar')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'jiohotstar' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Tv className="h-4 w-4 text-red-400" />
            <div className="flex items-center justify-between flex-1">
              <span>JioHotstar Import</span>
              <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-1.5 py-0.2 rounded-full">
                Auto
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('playlists')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'playlists' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <ListVideo className="h-4 w-4" />
            <span>Playlists</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'users' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'settings' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'profile' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Admin Profile</span>
          </button>
        </nav>

        {/* Footer info & Logout */}
        <div className="border-t border-zinc-800/80 pt-4 space-y-2">
          <Link
            href="/"
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <span>Live Site</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={async () => {
              await adminLogout();
              router.push('/');
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-zinc-800 bg-zinc-900/40 p-4 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-red-500" />
            <span className="text-sm font-bold">Admin Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
              Live Site
            </Link>
            <button
              type="button"
              onClick={async () => {
                await adminLogout();
                router.push('/');
              }}
              className="rounded bg-red-600/20 px-2 py-1 text-xs text-red-400 cursor-pointer"
            >
              Exit
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Tabs */}
        <div className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-900/60 p-2 gap-1 md:hidden scrollbar-none">
          {(['dashboard', 'sections', 'branding', 'monetization', 'library', 'upload', 'import', 'playlists', 'users', 'settings', 'profile'] as AdminTab[]).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap capitalize ${
                  activeTab === tab ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Administrator Dashboard</h1>
                <p className="text-xs text-zinc-400 mt-1">Platform metrics, video health, and streaming statistics.</p>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Total Videos</span>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.totalVideos}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase">Published</span>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.published}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase">Drafts</span>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.drafts}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <span className="text-[11px] font-semibold text-indigo-400 uppercase">Playlists</span>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.totalPlaylists}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 col-span-2 lg:col-span-1">
                  <span className="text-[11px] font-semibold text-red-400 uppercase">Total Views</span>
                  <p className="text-2xl font-bold text-white mt-1">{formatViews(metrics.totalViews)}</p>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 shadow-md shadow-red-600/20"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload New Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('import')}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                >
                  <Link2 className="h-4 w-4" />
                  <span>Import from Video URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingPlaylist(true);
                    setEditingPlaylist(null);
                    setPlaylistTitle('');
                    setPlaylistDesc('');
                    setPlaylistSelectedVideos([]);
                    setActiveTab('playlists');
                  }}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Playlist</span>
                </button>
              </div>

              {/* Recent Uploads Table */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Recent Uploads</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold"
                  >
                    View all in library &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="pb-2 font-medium">Video</th>
                        <th className="pb-2 font-medium">Format</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Visibility</th>
                        <th className="pb-2 font-medium">Views</th>
                        <th className="pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {videos.slice(0, 5).map((v) => (
                        <tr key={v.id} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={v.thumbnailUrl}
                                alt={v.title}
                                className="h-9 w-16 rounded object-cover bg-zinc-950 shrink-0"
                              />
                              <span className="font-semibold text-zinc-200 line-clamp-1 max-w-[200px]">{v.title}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-zinc-400 uppercase font-mono text-[10px]">{v.sourceType}</td>
                          <td className="py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                v.status === 'published'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="py-2.5 capitalize text-zinc-400">{v.visibility}</td>
                          <td className="py-2.5 text-zinc-300">{formatViews(v.views)}</td>
                          <td className="py-2.5 text-zinc-500">{formatTimeAgo(v.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DYNAMIC SECTIONS MANAGER */}
          {activeTab === 'sections' && (
            <AdminSectionManager
              videos={videos}
              onRefreshNeeded={refreshData}
              showToast={showToast}
            />
          )}

          {/* TAB: BRANDING & THEME CUSTOMIZATION */}
          {activeTab === 'branding' && (
            <AdminBrandingManager showToast={showToast} />
          )}

          {/* TAB: MONETIZATION & ADSTERRA ADS */}
          {activeTab === 'monetization' && (
            <AdminAdManager />
          )}

          {/* TAB 2: VIDEO LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">Video Library</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">Manage, edit, publish, preview, and organize all platform videos.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Video</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => {
                      setLibrarySearch(e.target.value);
                      setLibraryPage(1);
                    }}
                    placeholder="Search videos by title..."
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-9 pr-3 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setLibraryPage(1);
                  }}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="unpublished">Unpublished</option>
                </select>

                <select
                  value={visibilityFilter}
                  onChange={(e) => {
                    setVisibilityFilter(e.target.value as any);
                    setLibraryPage(1);
                  }}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                >
                  <option value="all">All Visibility</option>
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>

                <select
                  value={playlistFilter}
                  onChange={(e) => {
                    setPlaylistFilter(e.target.value);
                    setLibraryPage(1);
                  }}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                >
                  <option value="all">All Playlists</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.title}
                    </option>
                  ))}
                </select>

                <select
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value);
                    setLibraryPage(1);
                  }}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                >
                  <option value="all">All Sections ({sections.length})</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400">
                        <th className="p-3 font-medium">Video</th>
                        <th className="p-3 font-medium">Sections</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 font-medium">Visibility</th>
                        <th className="p-3 font-medium">Playlist</th>
                        <th className="p-3 font-medium">Views</th>
                        <th className="p-3 font-medium">Uploaded</th>
                        <th className="p-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {paginatedVideos.map((v) => {
                        const pl = playlists.find((p) => p.id === v.playlistId);
                        const assignedSections = (v.sectionIds || []).map((secId) =>
                          sections.find((s) => s.id === secId || s.slug === secId)
                        ).filter(Boolean) as Section[];

                        return (
                          <tr key={v.id} className="hover:bg-zinc-800/30 transition">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={v.thumbnailUrl}
                                  alt={v.title}
                                  className="h-10 w-16 rounded object-cover bg-zinc-950 shrink-0"
                                />
                                <div>
                                  <h4 className="font-semibold text-zinc-200 line-clamp-1 max-w-[220px]">{v.title}</h4>
                                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                                    <span className="font-mono text-amber-400 font-semibold flex items-center gap-0.5">
                                      <Clock className="h-2.5 w-2.5 inline" />
                                      {formatDuration(v.duration_seconds || v.duration)}
                                    </span>
                                    <span>&bull;</span>
                                    <span className="uppercase text-zinc-500">{v.sourceType}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              {assignedSections.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                  {assignedSections.map((sec) => (
                                    <span
                                      key={sec.id}
                                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                      style={{
                                        backgroundColor: `${sec.color || '#E50914'}22`,
                                        color: sec.color || '#E50914',
                                        border: `1px solid ${sec.color || '#E50914'}40`,
                                      }}
                                    >
                                      <SectionIcon name={sec.icon} className="h-2.5 w-2.5" />
                                      <span className="truncate max-w-[90px]">{sec.name}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-zinc-600 italic">No section</span>
                              )}
                            </td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => handleTogglePublish(v)}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                                  v.status === 'published'
                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                }`}
                              >
                                {v.status}
                              </button>
                            </td>
                            <td className="p-3 capitalize text-zinc-400">{v.visibility}</td>
                            <td className="p-3 text-zinc-400 line-clamp-1">{pl ? pl.title : '—'}</td>
                            <td className="p-3 text-zinc-300">{formatViews(v.views)}</td>
                            <td className="p-3 text-zinc-500">{formatTimeAgo(v.createdAt)}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewVideo(v)}
                                  title="Preview video"
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingVideo(v)}
                                  title="Edit metadata"
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateVideo(v)}
                                  title="Duplicate metadata"
                                  className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingVideo(v)}
                                  title="Delete video"
                                  className="rounded p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-zinc-800 p-3 text-xs text-zinc-400">
                  <span>
                    Showing {paginatedVideos.length} of {filteredVideos.length} videos
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={libraryPage === 1}
                      onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>
                      Page {libraryPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={libraryPage >= totalPages}
                      onClick={() => setLibraryPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD VIDEO */}
          {activeTab === 'upload' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Upload New Video</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Direct administrative upload workflow with progress telemetry and metadata storage.
                </p>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
                {/* File selector & drag-drop */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Video File (MP4, WebM, MOV)</label>
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/60 p-6 text-center hover:border-zinc-700 transition">
                    <Upload className="h-8 w-8 text-zinc-500 mb-2" />
                    {uploadVideoFile ? (
                      <div className="text-xs">
                        <p className="font-semibold text-white">{uploadVideoFile.name}</p>
                        <p className="text-zinc-500 mt-0.5">{(uploadVideoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-zinc-300 font-medium">Drag and drop video file here, or click to browse</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Supports MP4, WebM, MKV up to 500MB</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadVideoFile(file);
                          if (!uploadTitle) {
                            setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
                          }
                          // Automatically detect real video duration
                          setIsDetectingDuration(true);
                          try {
                            const dur = await detectDurationFromFile(file);
                            setUploadDurationSeconds(dur);
                            showToast(`Duration detected: ${formatDuration(dur)} (${Math.round(dur)}s)`);
                          } catch (err) {
                            console.warn('Could not extract duration automatically:', err);
                          } finally {
                            setIsDetectingDuration(false);
                          }
                        }
                      }}
                      className="mt-3 text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Duration Detection Status */}
                {isDetectingDuration && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>Reading video stream metadata to calculate real duration...</span>
                  </div>
                )}

                {uploadDurationSeconds > 0 && !isDetectingDuration && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-400" />
                      <div>
                        <span className="font-bold">Real Duration Detected: </span>
                        <span className="font-mono text-emerald-200">{formatDuration(uploadDurationSeconds)}</span>
                        <span className="text-zinc-400 text-[10px] ml-1.5">({Math.round(uploadDurationSeconds)} seconds total)</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 border border-emerald-500/40 rounded px-1.5 py-0.5">
                      Verified
                    </span>
                  </div>
                )}

                {/* Progress bar */}
                {isUploading && (
                  <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
                    <div className="flex justify-between text-xs mb-1 text-zinc-300">
                      <span>Uploading video...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadCancelled(true)}
                      className="mt-2 text-xs text-red-400 hover:text-red-300"
                    >
                      Cancel Upload
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Video Title *</label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="E.g., High Dynamic Range Nature Showcase"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="Provide detailed description or synopsis..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Thumbnail Image URL</label>
                    <input
                      type="url"
                      value={uploadThumbnail}
                      onChange={(e) => setUploadThumbnail(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Assign to Playlist</label>
                    <select
                      value={uploadPlaylistId}
                      onChange={(e) => setUploadPlaylistId(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                    >
                      <option value="">None (Standalone)</option>
                      {playlists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dynamic Section Assignment */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Assign to Dynamic Sections (Carousels)
                    </label>
                    <span className="text-[10px] text-zinc-500">Video will appear in rows matching these sections</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                    {sections.map((sec) => {
                      const isChecked = uploadSectionIds.includes(sec.id);
                      return (
                        <label
                          key={sec.id}
                          className={`flex items-center gap-2 rounded-lg border p-2 text-xs cursor-pointer transition select-none ${
                            isChecked
                              ? 'border-amber-500/50 bg-amber-500/10 text-white font-semibold'
                              : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUploadSectionIds([...uploadSectionIds, sec.id]);
                              } else {
                                setUploadSectionIds(uploadSectionIds.filter((id) => id !== sec.id));
                              }
                            }}
                            className="rounded border-zinc-700 text-red-600 focus:ring-0"
                          />
                          <SectionIcon name={sec.icon} className="h-3.5 w-3.5" />
                          <span className="truncate">{sec.name}</span>
                        </label>
                      );
                    })}
                    {sections.length === 0 && (
                      <p className="col-span-full text-[11px] text-zinc-500 italic">No sections created yet. Head to Dynamic Sections tab to add sections.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Visibility</label>
                    <select
                      value={uploadVisibility}
                      onChange={(e) => setUploadVisibility(e.target.value as VideoVisibility)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Status</label>
                    <select
                      value={uploadStatus}
                      onChange={(e) => setUploadStatus(e.target.value as VideoStatus)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="unpublished">Unpublished</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      placeholder="Animation, Tech, Sci-Fi..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      placeholder="4K, HDR, Blender"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{isUploading ? 'Uploading Video...' : 'Publish & Save to Library'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: IMPORT VIDEO BY URL */}
          {activeTab === 'import' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Import Video by URL</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Import direct MP4/WebM video sources or adaptive HLS (.m3u8) live streams with complete metadata.
                </p>
              </div>

              <form onSubmit={handleImportSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-300">Direct Video URL or HLS Stream (.m3u8) *</label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!importUrl.trim()) {
                          showToast('Enter a video URL first', 'error');
                          return;
                        }
                        setIsDetectingDuration(true);
                        try {
                          const dur = await detectDurationFromUrl(importUrl.trim());
                          setImportDurationSeconds(dur);
                          showToast(`Detected duration: ${formatDuration(dur)} (${Math.round(dur)}s)`);
                        } catch (e) {
                          showToast('Could not extract duration automatically from this URL', 'error');
                        } finally {
                          setIsDetectingDuration(false);
                        }
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                    >
                      <Clock className="h-3 w-3" />
                      <span>Detect Duration</span>
                    </button>
                  </div>
                  <input
                    type="url"
                    required
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onBlur={async () => {
                      if (importUrl.trim() && importDurationSeconds === 0) {
                        try {
                          setIsDetectingDuration(true);
                          const dur = await detectDurationFromUrl(importUrl.trim());
                          setImportDurationSeconds(dur);
                        } catch {
                          // Silent on blur
                        } finally {
                          setIsDetectingDuration(false);
                        }
                      }
                    }}
                    placeholder="https://example.com/video.mp4 or https://stream.mux.dev/playlist.m3u8"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs font-mono text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Direct compatible video endpoints only (MP4, WebM, or HLS .m3u8).
                  </p>
                </div>

                {/* Duration Status */}
                {isDetectingDuration && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>Analyzing video URL stream headers to measure real duration...</span>
                  </div>
                )}

                {importDurationSeconds > 0 && !isDetectingDuration && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-400" />
                      <div>
                        <span className="font-bold">Real Duration Detected: </span>
                        <span className="font-mono text-emerald-200">{formatDuration(importDurationSeconds)}</span>
                        <span className="text-zinc-400 text-[10px] ml-1.5">({Math.round(importDurationSeconds)} seconds total)</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 border border-emerald-500/40 rounded px-1.5 py-0.5">
                      Verified
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    placeholder="Video Title"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={importDesc}
                    onChange={(e) => setImportDesc(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Thumbnail URL</label>
                    <input
                      type="url"
                      value={importThumbnail}
                      onChange={(e) => setImportThumbnail(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Playlist</label>
                    <select
                      value={importPlaylistId}
                      onChange={(e) => setImportPlaylistId(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                    >
                      <option value="">None (Standalone)</option>
                      {playlists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dynamic Section Assignment */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Assign to Dynamic Sections (Carousels)
                    </label>
                    <span className="text-[10px] text-zinc-500">Video will appear in rows matching these sections</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                    {sections.map((sec) => {
                      const isChecked = importSectionIds.includes(sec.id);
                      return (
                        <label
                          key={sec.id}
                          className={`flex items-center gap-2 rounded-lg border p-2 text-xs cursor-pointer transition select-none ${
                            isChecked
                              ? 'border-amber-500/50 bg-amber-500/10 text-white font-semibold'
                              : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setImportSectionIds([...importSectionIds, sec.id]);
                              } else {
                                setImportSectionIds(importSectionIds.filter((id) => id !== sec.id));
                              }
                            }}
                            className="rounded border-zinc-700 text-red-600 focus:ring-0"
                          />
                          <SectionIcon name={sec.icon} className="h-3.5 w-3.5" />
                          <span className="truncate">{sec.name}</span>
                        </label>
                      );
                    })}
                    {sections.length === 0 && (
                      <p className="col-span-full text-[11px] text-zinc-500 italic">No sections created yet. Head to Dynamic Sections tab to add sections.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Visibility</label>
                    <select
                      value={importVisibility}
                      onChange={(e) => setImportVisibility(e.target.value as VideoVisibility)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Status</label>
                    <select
                      value={importStatus}
                      onChange={(e) => setImportStatus(e.target.value as VideoStatus)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="unpublished">Unpublished</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={importCategory}
                      onChange={(e) => setImportCategory(e.target.value)}
                      placeholder="Tech, Live..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isImporting}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition disabled:opacity-50"
                  >
                    <Link2 className="h-4 w-4" />
                    <span>{isImporting ? 'Validating & Importing...' : 'Import Video'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: JIOHOTSTAR AUTO IMPORT */}
          {activeTab === 'jiohotstar' && (
            <AdminJioHotstarImport
              sections={sections}
              playlists={playlists}
              onVideoCreated={() => {
                refreshData();
              }}
              showToast={showToast}
            />
          )}

          {/* TAB 5: PLAYLIST SYSTEM */}
          {activeTab === 'playlists' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">Playlists</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">Organize videos into sequential collections with custom ordering.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingPlaylist(true);
                    setEditingPlaylist(null);
                    setPlaylistTitle('');
                    setPlaylistDesc('');
                    setPlaylistThumbnail('');
                    setPlaylistSelectedVideos([]);
                    setPlaylistStatus('published');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-500"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Playlist</span>
                </button>
              </div>

              {/* Playlist Form Dialog / Block */}
              {(isCreatingPlaylist || editingPlaylist) && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-sm font-bold text-white">
                      {editingPlaylist ? `Edit Playlist: ${editingPlaylist.title}` : 'Create New Playlist'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingPlaylist(false);
                        setEditingPlaylist(null);
                      }}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSavePlaylist} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Playlist Title *</label>
                      <input
                        type="text"
                        required
                        value={playlistTitle}
                        onChange={(e) => setPlaylistTitle(e.target.value)}
                        placeholder="E.g., Blender Open Animation Collection"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={playlistDesc}
                        onChange={(e) => setPlaylistDesc(e.target.value)}
                        placeholder="Overview of this playlist..."
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">Thumbnail URL</label>
                        <input
                          type="url"
                          value={playlistThumbnail}
                          onChange={(e) => setPlaylistThumbnail(e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">Status</label>
                        <select
                          value={playlistStatus}
                          onChange={(e) => setPlaylistStatus(e.target.value as any)}
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="unpublished">Unpublished</option>
                        </select>
                      </div>
                    </div>

                    {/* Reorder and select videos */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-2">
                        Included Videos & Ordering ({playlistSelectedVideos.length} selected)
                      </label>

                      {/* Selected order list */}
                      {playlistSelectedVideos.length > 0 && (
                        <div className="mb-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {playlistSelectedVideos.map((vidId, idx) => {
                            const v = videos.find((item) => item.id === vidId);
                            return (
                              <div
                                key={vidId}
                                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 text-center font-bold text-zinc-500">{idx + 1}</span>
                                  <span className="font-semibold text-zinc-200 line-clamp-1">
                                    {v ? v.title : vidId}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMovePlaylistVideo(idx, idx - 1)}
                                    className="rounded p-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === playlistSelectedVideos.length - 1}
                                    onClick={() => handleMovePlaylistVideo(idx, idx + 1)}
                                    className="rounded p-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPlaylistSelectedVideos(playlistSelectedVideos.filter((id) => id !== vidId))
                                    }
                                    className="rounded p-1 text-red-400 hover:bg-red-500/10"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add more videos selector */}
                      <div className="flex gap-2">
                        <select
                          id="add-video-to-playlist-select"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !playlistSelectedVideos.includes(val)) {
                              setPlaylistSelectedVideos([...playlistSelectedVideos, val]);
                            }
                            e.target.value = '';
                          }}
                          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                        >
                          <option value="">+ Add video to playlist...</option>
                          {videos
                            .filter((v) => !playlistSelectedVideos.includes(v.id))
                            .map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.title}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingPlaylist(false);
                          setEditingPlaylist(null);
                        }}
                        className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500"
                      >
                        Save Playlist
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Existing Playlists Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            pl.thumbnailUrl ||
                            'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80'
                          }
                          alt={pl.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-2 right-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          {pl.videoIds.length} {pl.videoIds.length === 1 ? 'Video' : 'Videos'}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-white text-sm line-clamp-1">{pl.title}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              pl.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {pl.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2">{pl.description || 'No description'}</p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 border-t border-zinc-800/60 flex items-center justify-between mt-2">
                      <span className="text-[10px] text-zinc-500">{formatTimeAgo(pl.createdAt)}</span>
                      <div className="flex items-center gap-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlaylist(pl);
                            setPlaylistTitle(pl.title);
                            setPlaylistDesc(pl.description);
                            setPlaylistThumbnail(pl.thumbnailUrl || '');
                            setPlaylistSelectedVideos(pl.videoIds || []);
                            setPlaylistStatus(pl.status);
                            setIsCreatingPlaylist(false);
                          }}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlaylist(pl.id)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Registered Users</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Platform accounts, identity verification, and role status.</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="pb-2 font-medium">User</th>
                        <th className="pb-2 font-medium">Email</th>
                        <th className="pb-2 font-medium">Role</th>
                        <th className="pb-2 font-medium">Permissions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      <tr className="hover:bg-zinc-800/20">
                        <td className="py-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white font-bold text-[10px]">
                              A
                            </div>
                            <span>Primary Administrator</span>
                          </div>
                        </td>
                        <td className="py-3 text-zinc-300">titangaming4m@gmail.com</td>
                        <td className="py-3">
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/20">
                            Super Admin
                          </span>
                        </td>
                        <td className="py-3 text-zinc-400">Full Video & Site Control</td>
                      </tr>

                      {admin && (
                        <tr className="hover:bg-zinc-800/20">
                          <td className="py-3 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600/20 text-red-400 font-bold text-[10px]">
                                {admin.username?.[0]?.toUpperCase() || 'A'}
                              </div>
                              <span>{admin.username}</span>
                            </div>
                          </td>
                          <td className="py-3 text-zinc-400 font-mono text-[11px]">admin-session</td>
                          <td className="py-3">
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                              {admin.role || 'Super Admin'}
                            </span>
                          </td>
                          <td className="py-3 text-zinc-400">
                            Active Admin Session
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-red-400 mb-1">
                    <span>Admin Panel</span>
                    <span>/</span>
                    <span>Settings</span>
                    <span>/</span>
                    <span className="text-zinc-200">
                      {settingsSubTab === 'auth'
                        ? 'Authentication Settings'
                        : settingsSubTab === 'general'
                        ? 'General & Brand'
                        : 'Storage Configuration'}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-white">Platform Settings</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Manage Google authentication provider, sign-in methods, brand styling, and media storage.
                  </p>
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  id="tab-auth-settings"
                  onClick={() => setSettingsSubTab('auth')}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                    settingsSubTab === 'auth'
                      ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                      : 'border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Authentication Settings</span>
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                      authSettings.googleLoginEnabled
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {authSettings.googleLoginEnabled ? 'Google ON' : 'Google OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-general-settings"
                  onClick={() => setSettingsSubTab('general')}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                    settingsSubTab === 'general'
                      ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                      : 'border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span>General & Branding</span>
                </button>

                <button
                  type="button"
                  id="tab-storage-settings"
                  onClick={() => setSettingsSubTab('storage')}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                    settingsSubTab === 'storage'
                      ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                      : 'border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Storage & Drivers</span>
                </button>
              </div>

              {/* SUB-SECTION 1: AUTHENTICATION SETTINGS */}
              {settingsSubTab === 'auth' && (
                <div className="space-y-6">
                  {/* Google Login Setting Card */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-zinc-700 shadow-inner">
                          <svg className="h-6 w-6" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-white flex items-center gap-2">
                            Google Login
                            <span className="text-xs font-normal text-zinc-400">OAuth Provider</span>
                          </h2>
                          <p className="text-xs text-zinc-400">
                            Global master switch for Google authentication across all user interfaces.
                          </p>
                        </div>
                      </div>

                      {/* Current Status Indicator */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold border transition ${
                            authSettings.googleLoginEnabled
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/10'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              authSettings.googleLoginEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                            }`}
                          />
                          <span>Status: {authSettings.googleLoginEnabled ? 'ON' : 'OFF'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Toggle Switch Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-zinc-200">Toggle Google Login</span>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {authSettings.googleLoginEnabled
                            ? 'Google Login is currently ENABLED. Users will see Google sign-in/sign-up options across desktop, mobile, and dialogs.'
                            : 'Google Login is currently DISABLED. All Google sign-in buttons are hidden site-wide. Users must authenticate with Email & Password.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          id="google-login-toggle"
                          role="switch"
                          aria-checked={authSettings.googleLoginEnabled}
                          onClick={handleToggleGoogleLogin}
                          disabled={savingAuthSettings}
                          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 ${
                            authSettings.googleLoginEnabled ? 'bg-emerald-600' : 'bg-zinc-700'
                          }`}
                        >
                          <span className="sr-only">Toggle Google Login</span>
                          <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              authSettings.googleLoginEnabled ? 'translate-x-7' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="font-mono text-xs font-bold text-white min-w-[32px]">
                          {authSettings.googleLoginEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div
                        className={`rounded-xl border p-3.5 space-y-1.5 transition ${
                          authSettings.googleLoginEnabled
                            ? 'border-emerald-500/20 bg-emerald-950/10'
                            : 'border-zinc-800/60 bg-zinc-950/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>When Google Login is ON</span>
                        </div>
                        <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
                          <li>Login page displays &quot;Continue with Google&quot;</li>
                          <li>Signup page displays &quot;Sign Up with Google&quot;</li>
                          <li>Watch dialogs show Google 1-click authentication</li>
                          <li>Auto-creates verified user record on first sign-in</li>
                        </ul>
                      </div>

                      <div
                        className={`rounded-xl border p-3.5 space-y-1.5 transition ${
                          !authSettings.googleLoginEnabled
                            ? 'border-amber-500/20 bg-amber-950/10'
                            : 'border-zinc-800/60 bg-zinc-950/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-amber-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>When Google Login is OFF</span>
                        </div>
                        <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
                          <li>All Google login buttons are hidden site-wide</li>
                          <li>Backend enforcement blocks unauthorized attempts</li>
                          <li>Users log in/sign up using Email &amp; Password</li>
                          <li>Admin credentials remain completely unaffected</li>
                        </ul>
                      </div>
                    </div>

                    {/* Save Settings Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-800">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <Globe className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Changes are stored permanently in Firebase Firestore (<code className="text-zinc-300 font-mono">settings/authentication</code>).</span>
                      </div>

                      <button
                        type="button"
                        id="save-auth-settings-btn"
                        onClick={() => handleSaveAuthSettings()}
                        disabled={savingAuthSettings}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition disabled:opacity-50 shadow-lg shadow-red-950/50 cursor-pointer"
                      >
                        {savingAuthSettings ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Saving Settings...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Save Settings</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Fallback Email/Password Info Card */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>Email &amp; Password Authentication</span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                          Active Fallback
                        </span>
                      </div>
                      <p className="text-zinc-400 text-[11px]">
                        Standard Email and Password authentication remains enabled regardless of Google Login status, ensuring continuous platform access for all registered members.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-SECTION 2: GENERAL & BRANDING */}
              {settingsSubTab === 'general' && settings && (
                <form onSubmit={handleSaveSettings} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Platform Name</label>
                    <input
                      type="text"
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.primaryColor || '#dc2626'}
                          onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                          className="h-8 w-12 rounded cursor-pointer border border-zinc-800 bg-transparent"
                        />
                        <input
                          type="text"
                          value={settings.primaryColor || '#dc2626'}
                          onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs font-mono text-zinc-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Default Visibility</label>
                      <select
                        value={settings.defaultVisibility}
                        onChange={(e) => setSettings({ ...settings, defaultVisibility: e.target.value as any })}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                      >
                        <option value="public">Public</option>
                        <option value="unlisted">Unlisted</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Default Fallback Thumbnail</label>
                    <input
                      type="url"
                      value={settings.defaultThumbnail || ''}
                      onChange={(e) => setSettings({ ...settings, defaultThumbnail: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Brand Settings</span>
                    </button>
                  </div>
                </form>
              )}

              {/* SUB-SECTION 3: STORAGE & DRIVERS */}
              {settingsSubTab === 'storage' && settings && (
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs">
                    <span className="font-semibold text-zinc-200">Active Storage Configuration</span>
                    <div className="flex items-center justify-between text-zinc-400 pt-1">
                      <span>Driver:</span>
                      <span className="font-mono text-red-400 uppercase font-bold">{settings.storageConfig?.driver || 'local'}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Database Engine:</span>
                      <span className="font-mono text-zinc-200">Firebase Firestore</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Status:</span>
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Connected &amp; Realtime Synced
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: ADMIN PROFILE & CREDENTIALS */}
          {activeTab === 'profile' && (
            <div className="max-w-xl space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Administrator Profile & Security</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Manage administrative credentials and view active session details.</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white font-bold text-xl shadow-lg shadow-red-600/30">
                    {admin?.username?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{admin?.username || 'Administrator'}</h3>
                    <p className="text-xs text-zinc-400 font-mono">Role: {admin?.role || 'superadmin'}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verified Server Session Active</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Username:</span>
                    <span className="font-mono text-zinc-200">{admin?.username}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Access Level:</span>
                    <span className="font-semibold text-red-400">Full Platform Authority</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await adminLogout();
                      router.push('/');
                    }}
                    className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
                  >
                    Sign Out of Admin Portal
                  </button>
                </div>
              </div>

              {/* Change Credentials Form */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white">Update Admin Credentials</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Change administrative username or password. Requires current password verification.</p>
                </div>

                <form onSubmit={handleUpdateAdminCredentials} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Current Password *</label>
                    <input
                      type="password"
                      required
                      value={credCurrentPassword}
                      onChange={(e) => setCredCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">New Username (Optional)</label>
                      <input
                        type="text"
                        value={credNewUsername}
                        onChange={(e) => setCredNewUsername(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">New Password (Optional)</label>
                      <input
                        type="password"
                        value={credNewPassword}
                        onChange={(e) => setCredNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={credUpdating}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition disabled:opacity-50 cursor-pointer"
                  >
                    {credUpdating ? 'Updating...' : 'Save New Credentials'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm">{previewVideo.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="rounded p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <video
                src={previewVideo.videoUrl}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm">Edit Video Details</h3>
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideoEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingVideo.title}
                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingVideo.description}
                  onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
                  <select
                    value={editingVideo.status}
                    onChange={(e) => setEditingVideo({ ...editingVideo, status: e.target.value as any })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-300"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Visibility</label>
                  <select
                    value={editingVideo.visibility}
                    onChange={(e) => setEditingVideo({ ...editingVideo, visibility: e.target.value as any })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-300"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Playlist</label>
                <select
                  value={editingVideo.playlistId || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, playlistId: e.target.value || undefined })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-300"
                >
                  <option value="">None (Standalone)</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Thumbnail URL</label>
                <input
                  type="url"
                  value={editingVideo.thumbnailUrl}
                  onChange={(e) => setEditingVideo({ ...editingVideo, thumbnailUrl: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Video Stream URL</label>
                <input
                  type="url"
                  value={editingVideo.videoUrl}
                  onChange={(e) => setEditingVideo({ ...editingVideo, videoUrl: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs font-mono text-white"
                />
              </div>

              {/* Video Duration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-400">Duration (seconds)</label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editingVideo.videoUrl) return;
                      showToast('Reading video stream metadata...');
                      try {
                        const dur = await detectDurationFromUrl(editingVideo.videoUrl);
                        setEditingVideo({ ...editingVideo, duration_seconds: dur, duration: dur });
                        showToast(`Detected: ${formatDuration(dur)} (${Math.round(dur)}s)`);
                      } catch {
                        showToast('Could not extract duration automatically', 'error');
                      }
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <Clock className="h-3 w-3" />
                    <span>Auto-detect duration</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={editingVideo.duration_seconds || editingVideo.duration || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditingVideo({ ...editingVideo, duration_seconds: val, duration: val });
                    }}
                    className="w-32 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs font-mono text-white"
                  />
                  <div className="flex items-center gap-1 text-xs font-mono text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Display: {formatDuration(editingVideo.duration_seconds || editingVideo.duration || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Section Assignment */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Assigned Dynamic Sections (Carousels)
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 max-h-36 overflow-y-auto">
                  {sections.map((sec) => {
                    const currentSecIds = editingVideo.sectionIds || [];
                    const isChecked = currentSecIds.includes(sec.id) || currentSecIds.includes(sec.slug);
                    return (
                      <label
                        key={sec.id}
                        className={`flex items-center gap-2 rounded-lg border p-1.5 text-xs cursor-pointer select-none ${
                          isChecked
                            ? 'border-amber-500/50 bg-amber-500/10 text-white font-semibold'
                            : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let updated: string[];
                            if (e.target.checked) {
                              updated = [...currentSecIds, sec.id];
                            } else {
                              updated = currentSecIds.filter((id) => id !== sec.id && id !== sec.slug);
                            }
                            setEditingVideo({ ...editingVideo, sectionIds: updated });
                          }}
                          className="rounded border-zinc-700 text-red-600 focus:ring-0"
                        />
                        <SectionIcon name={sec.icon} className="h-3.5 w-3.5" />
                        <span className="truncate">{sec.name}</span>
                      </label>
                    );
                  })}
                  {sections.length === 0 && (
                    <p className="col-span-full text-[10px] text-zinc-500 italic">No sections created.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-zinc-900 p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Delete Video</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Are you sure you want to permanently delete &ldquo;{deletingVideo.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingVideo(null)}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
