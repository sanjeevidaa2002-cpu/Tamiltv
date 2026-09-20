import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Video,
  Playlist,
  WatchProgress,
  SiteSettings,
  Section,
  VideoSection,
} from './types';
import {
  INITIAL_VIDEOS,
  INITIAL_PLAYLISTS,
  INITIAL_SECTIONS,
  INITIAL_VIDEO_SECTIONS,
} from './seedData';
import { formatDuration, generateSlug } from './formatters';

/**
 * Recursively strips undefined fields from an object or array.
 * Firestore setDoc / updateDoc rejects objects containing `undefined` values.
 */
export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    if (typeof (data as any).isEqual === 'function') {
      return data;
    }
    if (Object.prototype.toString.call(data) !== '[object Object]') {
      return data;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export function normalizeVideoUrl(url: string): string {
  if (!url) return url;
  if (url.includes('gtv-videos-bucket/sample/BigBuckBunny.mp4')) {
    return 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4';
  }
  if (url.includes('gtv-videos-bucket/sample/TearsOfSteel.mp4')) {
    return 'https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4';
  }
  if (url.includes('gtv-videos-bucket/sample/Sintel.mp4')) {
    return 'https://archive.org/download/Sintel/sintel-2048-surround.mp4';
  }
  if (url.includes('gtv-videos-bucket/sample/ElephantsDream.mp4')) {
    return 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4';
  }
  if (url.includes('gtv-videos-bucket/sample/ForBiggerBlazes.mp4')) {
    return 'https://vjs.zencdn.net/v/oceans.mp4';
  }
  return url;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'VideoStream',
  siteShortName: 'VS',
  browserTitle: 'VideoStream - Watch High Quality Videos Online',
  siteDescription: 'Next-Generation Full-Stack Video Streaming & Dynamic Content Platform',
  siteLogo: '',
  mobileLogo: '',
  adminLogo: '',
  favicon: '',
  primaryColor: '#3B82F6',
  secondaryColor: '#60A5FA',
  accentColor: '#93C5FD',
  backgroundColor: '#0B1120',
  surfaceColor: '#0F172A',
  cardColor: '#1E293B',
  textColor: '#F8FAFC',
  mutedTextColor: '#94A3B8',
  borderColor: '#1E293B',
  buttonColor: '#2563EB',
  buttonTextColor: '#FFFFFF',
  headerColor: '#0B1120',
  footerColor: '#070C18',
  activeNavColor: '#3B82F6',
  hoverColor: '#1D4ED8',
  activeThemeId: 'midnight-blue',
  theme: {
    mode: 'dark',
    activeThemeId: 'midnight-blue',
    primaryColor: '#3B82F6',
    secondaryColor: '#60A5FA',
    accentColor: '#93C5FD',
    backgroundColor: '#0B1120',
    surfaceColor: '#0F172A',
    cardColor: '#1E293B',
    textColor: '#F8FAFC',
    mutedTextColor: '#94A3B8',
    borderColor: '#1E293B',
    buttonColor: '#2563EB',
    buttonTextColor: '#FFFFFF',
    headerColor: '#0B1120',
    footerColor: '#070C18',
    activeNavColor: '#3B82F6',
    hoverColor: '#1D4ED8',
  },
  customThemes: [],
  headerSettings: {
    enabled: true,
    showLogo: true,
    showNavigation: true,
    showSearch: true,
    showLogin: true,
    showSignup: true,
    showProfile: true,
    showMenu: true,
    showSections: true,
    isSticky: true,
    height: 64,
    paddingX: 16,
    mobileHeaderEnabled: true,
    mobileLogoEnabled: true,
    mobileSearchEnabled: true,
    mobileMenuEnabled: true,
    mobileLoginEnabled: true,
  },
  footerSettings: {
    enabled: true,
    showLogo: true,
    showDescription: true,
    showNavigationLinks: true,
    showSocialLinks: true,
    showCopyright: true,
    showContact: true,
    showCustomLinks: true,
    copyrightText: '© {year} VideoStream. All rights reserved.',
    contactEmail: 'support@videostream.com',
    paddingY: 32,
    socialLinks: {
      facebook: 'https://facebook.com',
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
      telegram: 'https://telegram.org',
      discord: 'https://discord.com',
    },
    customLinks: [
      { title: 'Terms of Service', url: '#' },
      { title: 'Privacy Policy', url: '#' },
      { title: 'DMCA Disclaimer', url: '#' },
      { title: 'API Documentation', url: '#' },
    ],
  },
  loadingSettings: {
    enabled: true,
    logoUrl: '',
    text: 'Loading VideoStream...',
    showText: true,
    animation: 'logo-pulse',
    backgroundType: 'theme',
  },
  defaultThumbnail: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
  registrationEnabled: true,
  googleLoginEnabled: true,
  authSettings: {
    googleLoginEnabled: true,
    emailLoginEnabled: true,
    registrationEnabled: true,
  },
  maintenanceMode: false,
  defaultVisibility: 'public',
  storageConfig: {
    driver: 'local',
    status: 'connected',
    bucketName: 'videos-public',
  },
};

let isSeeded = false;

export async function seedInitialDataToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const batch = writeBatch(db);

    // 1. Seed Sections
    for (const sec of INITIAL_SECTIONS) {
      batch.set(doc(db, 'sections', sec.id), cleanFirestoreData(sec), { merge: true });
    }

    // 2. Seed Videos
    for (const v of INITIAL_VIDEOS) {
      const durSecs = Math.round(v.duration_seconds || v.duration || 0);
      const enriched: Video = {
        ...v,
        duration_seconds: durSecs,
        duration: durSecs,
        duration_formatted: formatDuration(durSecs),
        videoUrl: normalizeVideoUrl(v.videoUrl),
      };
      batch.set(doc(db, 'videos', v.id), cleanFirestoreData(enriched), { merge: true });
    }

    // 3. Seed Video-Sections Junction Table
    for (const vs of INITIAL_VIDEO_SECTIONS) {
      batch.set(doc(db, 'video_sections', vs.id), cleanFirestoreData(vs), { merge: true });
    }

    // 4. Seed Playlists
    for (const p of INITIAL_PLAYLISTS) {
      batch.set(doc(db, 'playlists', p.id), cleanFirestoreData(p), { merge: true });
    }

    // 5. Seed Settings
    batch.set(doc(db, 'settings', 'main'), cleanFirestoreData(DEFAULT_SETTINGS), { merge: true });
    batch.set(
      doc(db, 'settings', 'authentication'),
      cleanFirestoreData({
        googleLoginEnabled: true,
        emailLoginEnabled: true,
        registrationEnabled: true,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );

    await batch.commit();
    isSeeded = true;
    return { success: true, count: INITIAL_VIDEOS.length };
  } catch (e: any) {
    console.warn('Could not seed initial data to Firestore:', e);
    return { success: false, count: 0, error: e?.message || String(e) };
  }
}

export async function ensureDatabaseSeeded(): Promise<void> {
  if (isSeeded) return;
  try {
    const [vidSnap, secSnap] = await Promise.all([
      getDocs(query(collection(db, 'videos'), where('visibility', '==', 'public'), where('status', '==', 'published'))),
      getDocs(collection(db, 'sections')),
    ]);

    if (vidSnap.empty || secSnap.empty) {
      await seedInitialDataToFirestore();
    }
    isSeeded = true;
  } catch (err) {
    console.warn('Could not auto-seed Firestore directly (falling back to memory state):', err);
  }
}

/* ====================================================
 * DYNAMIC SECTIONS API & SERVICE FUNCTIONS
 * ==================================================== */

/**
 * Get all sections. By default returns only enabled sections, ordered by display_order.
 * If includeDisabled is true, returns all sections (used by Admin).
 */
export async function getSections(includeDisabled = false): Promise<Section[]> {
  const path = 'sections';
  try {
    await ensureDatabaseSeeded();
    const snap = await getDocs(query(collection(db, path), orderBy('display_order', 'asc')));
    if (snap.empty) {
      return INITIAL_SECTIONS.filter((s) => includeDisabled || s.status === 'enabled');
    }
    const sections: Section[] = [];
    snap.forEach((d) => {
      const data = d.data() as Section;
      if (includeDisabled || data.status === 'enabled') {
        sections.push({ ...data, id: d.id });
      }
    });
    return sections.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  } catch (error) {
    console.error('getSections error:', error);
    return INITIAL_SECTIONS.filter((s) => includeDisabled || s.status === 'enabled');
  }
}

/**
 * Get a single section by slug or id
 */
export async function getSectionBySlug(slug: string): Promise<Section | null> {
  const clean = slug.toLowerCase().trim();
  try {
    await ensureDatabaseSeeded();
    // 1. Try direct ID get
    const directDoc = await getDoc(doc(db, 'sections', clean));
    if (directDoc.exists()) {
      return { ...(directDoc.data() as Section), id: directDoc.id };
    }
    // 2. Query where slug == clean
    const q = query(collection(db, 'sections'), where('slug', '==', clean));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return { ...(docData.data() as Section), id: docData.id };
    }
    // Fallback seed
    const fallback = INITIAL_SECTIONS.find((s) => s.slug === clean || s.id === clean);
    return fallback || null;
  } catch (error) {
    console.error('getSectionBySlug error:', error);
    const fallback = INITIAL_SECTIONS.find((s) => s.slug === clean || s.id === clean);
    return fallback || null;
  }
}

/**
 * Create a new dynamic section
 */
export async function createSection(
  data: Omit<Section, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Section> {
  const path = 'sections';
  try {
    const rawSlug = data.slug ? generateSlug(data.slug) : generateSlug(data.name);
    const existing = await getSectionBySlug(rawSlug);
    const slug = existing ? `${rawSlug}-${Date.now().toString().slice(-4)}` : rawSlug;
    const id = data.id || slug;

    // Determine highest display_order if not provided
    let display_order = data.display_order;
    if (display_order === undefined || display_order === null) {
      const all = await getSections(true);
      display_order = all.length + 1;
    }

    const now = new Date().toISOString();
    const newSection: Section = {
      id,
      name: data.name.trim(),
      slug,
      description: data.description || '',
      icon: data.icon || 'Film',
      thumbnail: data.thumbnail || '',
      color: data.color || '#E50914',
      status: data.status || 'enabled',
      display_order,
      created_at: now,
      updated_at: now,
    };

    await setDoc(doc(db, 'sections', id), cleanFirestoreData(newSection));
    return newSection;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Update an existing section
 */
export async function updateSection(id: string, updates: Partial<Section>): Promise<void> {
  const path = `sections/${id}`;
  try {
    const now = new Date().toISOString();
    const dataToSave: Partial<Section> = {
      ...updates,
      updated_at: now,
    };
    if (updates.name && !updates.slug) {
      dataToSave.slug = generateSlug(updates.name);
    } else if (updates.slug) {
      dataToSave.slug = generateSlug(updates.slug);
    }
    await updateDoc(doc(db, 'sections', id), cleanFirestoreData(dataToSave));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a section:
 * - Removes section document from Firestore
 * - Removes all rows in video_sections for this section
 * - Removes section ID from all video.sectionIds
 * - DOES NOT delete the videos!
 */
export async function deleteSection(id: string): Promise<void> {
  const path = `sections/${id}`;
  try {
    const batch = writeBatch(db);

    // 1. Delete section document
    batch.delete(doc(db, 'sections', id));

    // 2. Query video_sections where section_id == id
    const vsQuery = query(collection(db, 'video_sections'), where('section_id', '==', id));
    const vsSnap = await getDocs(vsQuery);
    vsSnap.forEach((d) => {
      batch.delete(d.ref);
    });

    // 3. Query videos that have this section in their sectionIds array
    const vidQuery = query(collection(db, 'videos'), where('sectionIds', 'array-contains', id));
    const vidSnap = await getDocs(vidQuery);
    vidSnap.forEach((d) => {
      const vidData = d.data() as Video;
      const updatedSectionIds = (vidData.sectionIds || []).filter((sId) => sId !== id);
      batch.update(d.ref, {
        sectionIds: updatedSectionIds,
        updatedAt: new Date().toISOString(),
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Toggle status of a section ('enabled' | 'disabled')
 */
export async function toggleSectionStatus(id: string, status: 'enabled' | 'disabled'): Promise<void> {
  const path = `sections/${id}`;
  try {
    await updateDoc(doc(db, 'sections', id), {
      status,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Batch update display_order for sections
 */
export async function reorderSections(orderedIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
      batch.update(doc(db, 'sections', id), {
        display_order: index + 1,
        updated_at: new Date().toISOString(),
      });
    });
    await batch.commit();
  } catch (error) {
    console.error('reorderSections error:', error);
  }
}

/* ====================================================
 * MULTI-SECTION VIDEO ASSIGNMENT (MANY-TO-MANY)
 * ==================================================== */

/**
 * Assign a video to multiple sections.
 * Synchronizes both video.sectionIds AND video_sections junction records.
 */
export async function assignVideoSections(videoId: string, sectionIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Update the video doc's sectionIds array
    batch.update(doc(db, 'videos', videoId), {
      sectionIds,
      updatedAt: now,
    });

    // 2. Query existing video_sections for this video
    const vsQuery = query(collection(db, 'video_sections'), where('video_id', '==', videoId));
    const vsSnap = await getDocs(vsQuery);
    vsSnap.forEach((d) => {
      batch.delete(d.ref);
    });

    // 3. Insert fresh video_sections junction records
    for (const secId of sectionIds) {
      const junctionId = `${videoId}_${secId}`;
      const record: VideoSection = {
        id: junctionId,
        video_id: videoId,
        section_id: secId,
        created_at: now,
      };
      batch.set(doc(db, 'video_sections', junctionId), cleanFirestoreData(record));
    }

    await batch.commit();
  } catch (error) {
    console.error('assignVideoSections error:', error);
  }
}

/**
 * Get all videos assigned to a specific section by section ID or slug.
 */
export async function getVideosBySection(slugOrId: string, isAdmin = false): Promise<Video[]> {
  try {
    await ensureDatabaseSeeded();
    const section = await getSectionBySlug(slugOrId);
    if (!section) return [];

    if (!isAdmin && section.status === 'disabled') {
      return [];
    }

    const secId = section.id;
    const secSlug = section.slug;

    // Try query with array-contains on sectionIds
    const vSnap = await getDocs(
      query(
        collection(db, 'videos'),
        where('sectionIds', 'array-contains', secId)
      )
    );

    let list: Video[] = [];
    if (!vSnap.empty) {
      list = vSnap.docs.map((d) => {
        const data = d.data() as Video;
        const durSecs = Math.round(data.duration_seconds || data.duration || 0);
        return {
          ...data,
          id: d.id,
          duration_seconds: durSecs,
          duration: durSecs,
          duration_formatted: formatDuration(durSecs),
          videoUrl: normalizeVideoUrl(data.videoUrl),
        };
      });
    } else {
      // Check junction table if video doc query returned empty
      const vsSnap = await getDocs(
        query(collection(db, 'video_sections'), where('section_id', '==', secId))
      );
      if (!vsSnap.empty) {
        const videoIds = vsSnap.docs.map((d) => d.data().video_id as string);
        const allVideos = await getVideos(isAdmin);
        list = allVideos.filter((v) => videoIds.includes(v.id));
      } else {
        // Check fallback initial videos
        list = INITIAL_VIDEOS.filter((v) =>
          (v.sectionIds || []).includes(secId) || (v.sectionIds || []).includes(secSlug)
        );
      }
    }

    return list.filter((v) => isAdmin || (v.status === 'published' && v.visibility === 'public'));
  } catch (error) {
    console.error('getVideosBySection error:', error);
    return [];
  }
}

/**
 * Calculate dynamic video count and view statistics for each section
 */
export async function getSectionAnalytics(): Promise<
  Array<{
    section: Section;
    videoCount: number;
    totalViews: number;
  }>
> {
  try {
    const [sections, videos] = await Promise.all([getSections(true), getVideos(true)]);
    return sections.map((sec) => {
      const assignedVideos = videos.filter((v) => (v.sectionIds || []).includes(sec.id) || (v.sectionIds || []).includes(sec.slug));
      const totalViews = assignedVideos.reduce((acc, curr) => acc + (curr.views || 0), 0);
      return {
        section: sec,
        videoCount: assignedVideos.length,
        totalViews,
      };
    });
  } catch (error) {
    console.error('getSectionAnalytics error:', error);
    return [];
  }
}

/* ====================================================
 * VIDEOS API
 * ==================================================== */

export async function getVideos(isAdmin = false): Promise<Video[]> {
  const path = 'videos';
  try {
    await ensureDatabaseSeeded();
    let q = query(
      collection(db, path),
      where('status', '==', 'published'),
      where('visibility', '==', 'public')
    );
    if (isAdmin) {
      q = query(collection(db, path), orderBy('createdAt', 'desc'));
    }
    const snap = await getDocs(q);
    if (snap.empty) {
      return INITIAL_VIDEOS
        .filter((v) => isAdmin || (v.status === 'published' && v.visibility === 'public'))
        .map((v) => {
          const durSecs = Math.round(v.duration_seconds || v.duration || 0);
          return {
            ...v,
            duration_seconds: durSecs,
            duration: durSecs,
            duration_formatted: formatDuration(durSecs),
            videoUrl: normalizeVideoUrl(v.videoUrl),
          };
        });
    }
    return snap.docs.map((d) => {
      const data = d.data() as Video;
      const durSecs = Math.round(data.duration_seconds || data.duration || 0);
      return {
        ...data,
        id: d.id,
        duration_seconds: durSecs,
        duration: durSecs,
        duration_formatted: formatDuration(durSecs),
        videoUrl: normalizeVideoUrl(data.videoUrl),
      };
    });
  } catch (error) {
    console.error('getVideos error:', error);
    return INITIAL_VIDEOS
      .filter((v) => isAdmin || (v.status === 'published' && v.visibility === 'public'))
      .map((v) => {
        const durSecs = Math.round(v.duration_seconds || v.duration || 0);
        return {
          ...v,
          duration_seconds: durSecs,
          duration: durSecs,
          duration_formatted: formatDuration(durSecs),
          videoUrl: normalizeVideoUrl(v.videoUrl),
        };
      });
  }
}

export async function getVideo(id: string): Promise<Video | null> {
  const path = `videos/${id}`;
  try {
    const snap = await getDoc(doc(db, 'videos', id));
    if (snap.exists()) {
      const data = snap.data() as Video;
      const durSecs = Math.round(data.duration_seconds || data.duration || 0);
      return {
        ...data,
        id: snap.id,
        duration_seconds: durSecs,
        duration: durSecs,
        duration_formatted: formatDuration(durSecs),
        videoUrl: normalizeVideoUrl(data.videoUrl),
      };
    }
    const fallback = INITIAL_VIDEOS.find((v) => v.id === id);
    if (fallback) {
      const durSecs = Math.round(fallback.duration_seconds || fallback.duration || 0);
      return {
        ...fallback,
        duration_seconds: durSecs,
        duration: durSecs,
        duration_formatted: formatDuration(durSecs),
        videoUrl: normalizeVideoUrl(fallback.videoUrl),
      };
    }
    return null;
  } catch (error) {
    const fallback = INITIAL_VIDEOS.find((v) => v.id === id);
    if (fallback) {
      const durSecs = Math.round(fallback.duration_seconds || fallback.duration || 0);
      return {
        ...fallback,
        duration_seconds: durSecs,
        duration: durSecs,
        duration_formatted: formatDuration(durSecs),
        videoUrl: normalizeVideoUrl(fallback.videoUrl),
      };
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function recordVideoView(videoId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const key = `view_recorded_${videoId}`;
  if (sessionStorage.getItem(key)) {
    return;
  }
  sessionStorage.setItem(key, 'true');

  const path = `videos/${videoId}`;
  try {
    const videoRef = doc(db, 'videos', videoId);
    await updateDoc(videoRef, {
      views: increment(1),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to record view count in Firestore:', error);
  }
}

export async function createVideo(data: Omit<Video, 'id' | 'createdAt' | 'updatedAt' | 'views'>): Promise<Video> {
  const path = 'videos';
  try {
    const id = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const durSecs = Math.max(0, Math.round(data.duration_seconds || data.duration || 0));

    const newVideo: Video = {
      ...data,
      id,
      duration_seconds: durSecs,
      duration: durSecs,
      duration_formatted: formatDuration(durSecs),
      views: 0,
      createdAt: now,
      updatedAt: now,
    };

    const cleaned = cleanFirestoreData(newVideo);
    await setDoc(doc(db, 'videos', id), cleaned);

    // Synchronize section relations
    if (data.sectionIds && data.sectionIds.length > 0) {
      await assignVideoSections(id, data.sectionIds);
    }

    return newVideo;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateVideo(id: string, updates: Partial<Video>): Promise<void> {
  const path = `videos/${id}`;
  try {
    const now = new Date().toISOString();
    const rawUpdates: Record<string, any> = {
      ...updates,
      updatedAt: now,
    };

    if (updates.duration_seconds !== undefined || updates.duration !== undefined) {
      const durSecs = Math.max(0, Math.round(updates.duration_seconds || updates.duration || 0));
      rawUpdates.duration_seconds = durSecs;
      rawUpdates.duration = durSecs;
      rawUpdates.duration_formatted = formatDuration(durSecs);
    }

    if (rawUpdates.playlistId === '') {
      rawUpdates.playlistId = deleteField();
    }

    const cleaned = cleanFirestoreData(rawUpdates);
    await updateDoc(doc(db, 'videos', id), cleaned);

    // Synchronize section relations if sectionIds was provided
    if (updates.sectionIds !== undefined) {
      await assignVideoSections(id, updates.sectionIds);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteVideo(id: string): Promise<void> {
  const path = `videos/${id}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'videos', id));

    // Remove video_sections junction records
    const vsQuery = query(collection(db, 'video_sections'), where('video_id', '==', id));
    const vsSnap = await getDocs(vsQuery);
    vsSnap.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* ====================================================
 * PLAYLISTS API
 * ==================================================== */

export async function getPlaylists(isAdmin = false): Promise<Playlist[]> {
  const path = 'playlists';
  try {
    await ensureDatabaseSeeded();
    let q = query(collection(db, path), where('status', '==', 'published'));
    if (isAdmin) {
      q = query(collection(db, path), orderBy('createdAt', 'desc'));
    }
    const snap = await getDocs(q);
    if (snap.empty) {
      return INITIAL_PLAYLISTS.filter((p) => isAdmin || p.status === 'published');
    }
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Playlist));
  } catch (error) {
    console.warn('Could not load playlists from Firestore, falling back to seeds:', error);
    return INITIAL_PLAYLISTS.filter((p) => isAdmin || p.status === 'published');
  }
}

export async function getPlaylist(id: string): Promise<Playlist | null> {
  const path = `playlists/${id}`;
  try {
    const snap = await getDoc(doc(db, 'playlists', id));
    if (snap.exists()) {
      return { ...(snap.data() as Playlist), id: snap.id };
    }
    const fallback = INITIAL_PLAYLISTS.find((p) => p.id === id);
    return fallback || null;
  } catch (error) {
    const fallback = INITIAL_PLAYLISTS.find((p) => p.id === id);
    if (fallback) return fallback;
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createPlaylist(data: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt'>): Promise<Playlist> {
  const path = 'playlists';
  try {
    const id = `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newPlaylist: Playlist = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const cleaned = cleanFirestoreData(newPlaylist);
    await setDoc(doc(db, 'playlists', id), cleaned);
    return newPlaylist;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePlaylist(id: string, updates: Partial<Playlist>): Promise<void> {
  const path = `playlists/${id}`;
  try {
    const now = new Date().toISOString();
    const cleaned = cleanFirestoreData({
      ...updates,
      updatedAt: now,
    });
    await updateDoc(doc(db, 'playlists', id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePlaylist(id: string): Promise<void> {
  const path = `playlists/${id}`;
  try {
    await deleteDoc(doc(db, 'playlists', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* ====================================================
 * WATCH PROGRESS (CONTINUE WATCHING)
 * ==================================================== */

export async function saveWatchProgress(
  userId: string,
  videoId: string,
  progressSeconds: number,
  durationSeconds: number
): Promise<void> {
  if (!userId || !videoId) return;
  const docId = `${userId}_${videoId}`;
  const path = `watch_progress/${docId}`;
  try {
    const cleaned = cleanFirestoreData({
      userId,
      videoId,
      progressSeconds: Math.floor(progressSeconds),
      durationSeconds: Math.floor(durationSeconds),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'watch_progress', docId), cleaned);
  } catch (error) {
    console.warn('Could not save watch progress:', error);
  }
}

export async function getUserWatchProgress(userId: string): Promise<WatchProgress[]> {
  if (!userId) return [];
  const path = 'watch_progress';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WatchProgress));
  } catch (error) {
    console.warn('Could not load watch progress:', error);
    return [];
  }
}

/* ====================================================
 * SITE SETTINGS & THEME
 * ==================================================== */

export async function getSiteSettings(): Promise<SiteSettings> {
  const path = 'settings/main';
  try {
    const snap = await getDoc(doc(db, 'settings', 'main'));
    if (snap.exists()) {
      const data = snap.data() as SiteSettings;
      return {
        ...DEFAULT_SETTINGS,
        ...data,
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.warn('Could not load site settings, using default:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const path = 'settings/main';
  try {
    const cleaned = cleanFirestoreData({
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'settings', 'main'), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Re-export duration detection utilities for convenience
export { detectDurationFromFile, detectDurationFromUrl } from '@/lib/formatters';

/**
 * Checks if a video has already been imported with a given source or embed URL.
 */
export async function findVideoBySourceUrl(sourceUrl: string): Promise<Video | null> {
  if (!sourceUrl || !sourceUrl.trim()) return null;
  const trimmed = sourceUrl.trim();
  try {
    const videos = await getVideos(true);
    const existing = videos.find((v) => {
      if (v.sourceUrl && v.sourceUrl.trim().toLowerCase() === trimmed.toLowerCase()) return true;
      if (v.videoUrl && v.videoUrl.trim().toLowerCase() === trimmed.toLowerCase()) return true;
      if (v.embedUrl && v.embedUrl.trim().toLowerCase() === trimmed.toLowerCase()) return true;
      return false;
    });
    return existing || null;
  } catch (error) {
    console.warn('Could not check for duplicate video source URL:', error);
    return null;
  }
}

/**
 * Gets all external/imported videos for the import history tab.
 */
export async function getImportedVideos(): Promise<Video[]> {
  try {
    const allVideos = await getVideos(true);
    return allVideos.filter(
      (v) => v.provider || v.sourceType === 'authorized_embed' || v.sourceUrl
    );
  } catch (error) {
    console.warn('Could not get imported videos list:', error);
    return [];
  }
}

