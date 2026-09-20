import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  increment,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { cleanFirestoreData } from './videoService';
import {
  Advertisement,
  AdSettings,
  AdStatus,
  AdType,
  AdPageTarget,
  AdDeviceTarget,
  AdBannerSize,
} from './types';

export {
  STANDARD_AD_SIZES,
  getAdDimensions,
  type AdSizePreset,
  type ResolvedAdDimensions,
} from './adDimensions';

export const ALL_AD_PAGES: AdPageTarget[] = [
  'home',
  'video',
  'movies',
  'sports',
  'entertainment',
  'music',
  'gaming',
  'playlist',
  'search',
  'profile',
  'login',
  'signup',
  'section',
];

export const DEFAULT_AD_SETTINGS: AdSettings = {
  ads_enabled: true,
  header_ads_enabled: true,
  footer_ads_enabled: true,
  popup_ads_enabled: true,
  video_ads_enabled: true,
  show_ad_label: true,
  header_ad_pages: {
    home: true,
    video: true,
    movies: true,
    sports: true,
    entertainment: true,
    music: true,
    gaming: true,
    playlist: true,
    search: true,
    profile: true,
    login: true,
    signup: true,
    section: true,
  },
  footer_ad_pages: {
    home: true,
    video: true,
    movies: true,
    sports: true,
    entertainment: true,
    music: true,
    gaming: true,
    playlist: true,
    search: true,
    profile: true,
    login: true,
    signup: true,
    section: true,
  },
  default_popup_frequency_mode: 'every_hours',
  default_popup_frequency_value: 2,
  default_popup_frequency_unit: 'hours',
  default_popup_delay: 15,
  default_countdown_seconds: 5,
  updated_at: new Date().toISOString(),
};

/* ====================================================
 * GLOBAL AD SETTINGS API
 * ==================================================== */

export async function getAdSettings(): Promise<AdSettings> {
  const path = 'ad_settings/global';
  try {
    const snap = await getDoc(doc(db, 'ad_settings', 'global'));
    if (snap.exists()) {
      return {
        ...DEFAULT_AD_SETTINGS,
        ...(snap.data() as AdSettings),
      };
    }
    return DEFAULT_AD_SETTINGS;
  } catch (error) {
    console.warn('Could not load ad settings, using defaults:', error);
    return DEFAULT_AD_SETTINGS;
  }
}

export async function updateAdSettings(settings: Partial<AdSettings>): Promise<void> {
  const path = 'ad_settings/global';
  try {
    const cleaned = cleanFirestoreData({
      ...settings,
      updated_at: new Date().toISOString(),
    });
    await setDoc(doc(db, 'ad_settings', 'global'), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/* ====================================================
 * ADVERTISEMENT CRUD API
 * ==================================================== */

export async function getAds(includeInactive = false): Promise<Advertisement[]> {
  const path = 'ads';
  try {
    let q = query(collection(db, path), orderBy('priority', 'desc'));
    if (!includeInactive) {
      q = query(collection(db, path), where('status', '==', 'active'), orderBy('priority', 'desc'));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Advertisement[];
  } catch (error) {
    console.warn('Could not load advertisements from Firestore:', error);
    return [];
  }
}

export async function getAd(id: string): Promise<Advertisement | null> {
  const path = `ads/${id}`;
  try {
    const snap = await getDoc(doc(db, 'ads', id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Advertisement;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createAd(
  data: Omit<Advertisement, 'id' | 'created_at' | 'updated_at' | 'impressions' | 'clicks'>
): Promise<Advertisement> {
  const path = 'ads';
  try {
    const id = `ad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newAd: Advertisement = {
      ...data,
      id,
      impressions: 0,
      clicks: 0,
      created_at: now,
      updated_at: now,
    };
    const cleaned = cleanFirestoreData(newAd);
    await setDoc(doc(db, 'ads', id), cleaned);
    return newAd;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAd(id: string, data: Partial<Advertisement>): Promise<void> {
  const path = `ads/${id}`;
  try {
    const cleaned = cleanFirestoreData({
      ...data,
      updated_at: new Date().toISOString(),
    });
    await setDoc(doc(db, 'ads', id), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAd(id: string): Promise<void> {
  const path = `ads/${id}`;
  try {
    await deleteDoc(doc(db, 'ads', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleAdStatus(id: string, currentStatus: AdStatus): Promise<AdStatus> {
  const nextStatus: AdStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await updateAd(id, { status: nextStatus });
  return nextStatus;
}

export async function duplicateAd(id: string): Promise<Advertisement | null> {
  const existing = await getAd(id);
  if (!existing) return null;
  const copyName = `${existing.name} (Copy)`;
  const { id: _, created_at: __, updated_at: ___, impressions: ____, clicks: _____, ...rest } = existing;
  return createAd({
    ...rest,
    name: copyName,
    status: 'inactive', // Default newly duplicated ad to inactive for review
  });
}

/* ====================================================
 * ANALYTICS / TRACKING API
 * ==================================================== */

export async function recordAdImpression(id: string): Promise<void> {
  if (!id) return;
  const path = `ads/${id}`;
  try {
    await setDoc(
      doc(db, 'ads', id),
      {
        impressions: increment(1),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(`Failed to increment impression for ad ${id}:`, error);
  }
}

export async function recordAdClick(id: string): Promise<void> {
  if (!id) return;
  const path = `ads/${id}`;
  try {
    await setDoc(
      doc(db, 'ads', id),
      {
        clicks: increment(1),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(`Failed to increment click for ad ${id}:`, error);
  }
}

/* ====================================================
 * SCHEDULING, TARGETING & FREQUENCY LOGIC
 * ==================================================== */

/**
 * Validates whether the ad is within its configured schedule window.
 */
export function isAdScheduledActive(ad: Advertisement): boolean {
  const now = new Date().getTime();
  if (ad.start_date) {
    const startTime = new Date(ad.start_date).getTime();
    if (!isNaN(startTime) && now < startTime) {
      return false;
    }
  }
  if (ad.end_date) {
    const endTime = new Date(ad.end_date).getTime();
    if (!isNaN(endTime) && now > endTime) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if the ad targets the current page and device.
 */
export function isAdTargetMatching(
  ad: Advertisement,
  currentPage: AdPageTarget,
  deviceType: AdDeviceTarget = 'all'
): boolean {
  // Page check
  const pageMatch =
    !ad.target_pages ||
    ad.target_pages.length === 0 ||
    ad.target_pages.includes('all') ||
    ad.target_pages.includes(currentPage);

  if (!pageMatch) return false;

  // Device check
  if (ad.device_target && ad.device_target !== 'all' && deviceType !== 'all') {
    if (ad.device_target !== deviceType) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether Header Ads are enabled globally and for a specific page.
 */
export function isHeaderAdEnabledForPage(page: AdPageTarget, settings?: AdSettings): boolean {
  if (!settings) return true;
  if (!settings.ads_enabled || !settings.header_ads_enabled) return false;
  if (settings.header_ad_pages && typeof settings.header_ad_pages[page] === 'boolean') {
    return settings.header_ad_pages[page]!;
  }
  return true;
}

/**
 * Checks whether Footer Ads are enabled globally and for a specific page.
 */
export function isFooterAdEnabledForPage(page: AdPageTarget, settings?: AdSettings): boolean {
  if (!settings) return true;
  if (!settings.ads_enabled || !settings.footer_ads_enabled) return false;
  if (settings.footer_ad_pages && typeof settings.footer_ad_pages[page] === 'boolean') {
    return settings.footer_ad_pages[page]!;
  }
  return true;
}

/**
 * Calculates configured interval in milliseconds for a popup ad.
 */
export function getPopupIntervalMs(ad: Advertisement, globalSettings?: AdSettings): number {
  const mode = ad.frequency_mode || globalSettings?.default_popup_frequency_mode || 'every_hours';

  if (mode === 'once_per_day') {
    return 24 * 60 * 60 * 1000;
  }
  if (mode === 'every_minutes') {
    const val = ad.frequency_value || globalSettings?.default_popup_frequency_value || 30;
    return Math.max(1, val) * 60 * 1000;
  }
  if (mode === 'every_hours') {
    const val = ad.frequency_value || globalSettings?.default_popup_frequency_value || 2;
    return Math.max(1, val) * 60 * 60 * 1000;
  }
  if (mode === 'custom') {
    const unit = ad.frequency_unit || globalSettings?.default_popup_frequency_unit || 'hours';
    const val = ad.frequency_value || 1;
    return unit === 'minutes' ? Math.max(1, val) * 60 * 1000 : Math.max(1, val) * 60 * 60 * 1000;
  }
  // once_per_session is handled separately via sessionStorage
  return 0;
}

/**
 * Checks browser-side frequency rules to determine if a popup ad may be shown.
 */
export function canShowPopupAd(ad: Advertisement, globalSettings?: AdSettings): boolean {
  if (typeof window === 'undefined') return false;

  const mode = ad.frequency_mode || globalSettings?.default_popup_frequency_mode || 'every_hours';

  // Check session storage for "once_per_session"
  if (mode === 'once_per_session') {
    const sessionKey = `adsterra_popup_session_${ad.id}`;
    if (sessionStorage.getItem(sessionKey)) {
      return false;
    }
    return true;
  }

  // Check localStorage for time-based intervals
  const intervalMs = getPopupIntervalMs(ad, globalSettings);
  if (intervalMs <= 0) return true;

  try {
    const key = `adsterra_popup_last_${ad.id}`;
    const lastTimestampStr = localStorage.getItem(key);
    if (!lastTimestampStr) return true;

    const lastTimestamp = parseInt(lastTimestampStr, 10);
    if (isNaN(lastTimestamp)) return true;

    const elapsed = Date.now() - lastTimestamp;
    return elapsed >= intervalMs;
  } catch {
    return true;
  }
}

/**
 * Marks that a popup ad was shown, recording timestamp in localStorage & sessionStorage.
 */
export function markPopupAdShown(ad: Advertisement): void {
  if (typeof window === 'undefined') return;

  const now = Date.now().toString();
  try {
    localStorage.setItem(`adsterra_popup_last_${ad.id}`, now);
    localStorage.setItem('adsterra_popup_last_shown', now);
    sessionStorage.setItem(`adsterra_popup_session_${ad.id}`, '1');
  } catch (err) {
    console.warn('Failed to save popup ad display timestamp to storage:', err);
  }

  // Increment impression counter
  recordAdImpression(ad.id);
}
