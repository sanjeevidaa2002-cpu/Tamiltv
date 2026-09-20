export type VideoSourceType = 'direct' | 'hls' | 'upload' | 'authorized_embed';
export type VideoVisibility = 'public' | 'unlisted' | 'private';
export type VideoStatus = 'draft' | 'published' | 'unpublished';
export type VideoContentType = 'movie' | 'episode' | 'series' | 'live' | 'video' | 'unknown';
export type VideoLiveStatus = 'live' | 'upcoming' | 'offline' | 'unknown';

export interface Section {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  thumbnail?: string;
  color?: string;
  status: 'enabled' | 'disabled';
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface VideoSection {
  id: string; // `${video_id}_${section_id}`
  video_id: string;
  section_id: string;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  sourceType: VideoSourceType;
  duration_seconds: number; // Source of truth in seconds
  duration: number; // in seconds (for backward compatibility)
  duration_formatted?: string;
  visibility: VideoVisibility;
  status: VideoStatus;
  playlistId?: string;
  sectionIds?: string[]; // IDs of sections assigned to this video
  views: number;
  tags?: string[];
  category?: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: string;
  // External Provider & JioHotstar Import metadata fields
  provider?: string;
  sourceUrl?: string;
  embedUrl?: string;
  contentType?: VideoContentType;
  isLive?: boolean;
  liveStatus?: VideoLiveStatus;
  seasonNumber?: number;
  episodeNumber?: number;
  seriesName?: string;
  language?: string;
  releaseDate?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  videoIds: string[];
  status: 'published' | 'unpublished' | 'draft';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface WatchProgress {
  id?: string;
  userId: string;
  videoId: string;
  progressSeconds: number;
  durationSeconds: number;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  isAdmin?: boolean;
}

export type ThemeCategory =
  | 'Dark'
  | 'Light'
  | 'Neon'
  | 'Gaming'
  | 'Cinema'
  | 'Premium'
  | 'Minimal'
  | 'Colorful'
  | 'Retro'
  | 'Futuristic';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  header: string;
  footer: string;
  text: string;
  mutedText: string;
  border: string;
  button: string;
  buttonText: string;
  activeNav: string;
  hover: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  slug: string;
  category: ThemeCategory;
  description?: string;
  colors: ThemeColors;
  isCustom?: boolean;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HeaderSettings {
  enabled: boolean;
  showLogo: boolean;
  showNavigation: boolean;
  showSearch: boolean;
  showLogin: boolean;
  showSignup: boolean;
  showProfile: boolean;
  showMenu: boolean;
  showSections: boolean;
  isSticky: boolean;
  height?: number; // in px
  paddingX?: number; // in px
  mobileHeaderEnabled: boolean;
  mobileLogoEnabled: boolean;
  mobileSearchEnabled: boolean;
  mobileMenuEnabled: boolean;
  mobileLoginEnabled: boolean;
}

export interface FooterSettings {
  enabled: boolean;
  showLogo: boolean;
  showDescription: boolean;
  showNavigationLinks: boolean;
  showSocialLinks: boolean;
  showCopyright: boolean;
  showContact: boolean;
  showCustomLinks: boolean;
  copyrightText?: string;
  contactEmail?: string;
  paddingY?: number;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    telegram?: string;
    discord?: string;
  };
  customLinks?: Array<{ title: string; url: string }>;
}

export interface LoadingScreenSettings {
  enabled: boolean;
  logoUrl?: string;
  text?: string;
  showText: boolean;
  animation: 'spinner' | 'pulse' | 'logo-pulse' | 'fade' | 'none';
  backgroundType: 'theme' | 'custom-color' | 'custom-image';
  customColor?: string;
  customImageUrl?: string;
}

export interface SiteThemeSettings {
  mode: 'dark' | 'light' | 'custom';
  activeThemeId?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor?: string;
  cardColor: string;
  textColor: string;
  mutedTextColor?: string;
  borderColor?: string;
  buttonColor: string;
  buttonTextColor?: string;
  headerColor: string;
  footerColor?: string;
  activeNavColor?: string;
  hoverColor?: string;
}

export interface SiteSettings {
  siteName: string;
  siteShortName?: string;
  browserTitle?: string;
  siteDescription?: string;
  siteLogo?: string;
  mobileLogo?: string;
  adminLogo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  cardColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  borderColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  headerColor?: string;
  footerColor?: string;
  activeNavColor?: string;
  hoverColor?: string;
  activeThemeId?: string;
  theme?: SiteThemeSettings;
  customThemes?: ThemePreset[];
  headerSettings?: HeaderSettings;
  footerSettings?: FooterSettings;
  loadingSettings?: LoadingScreenSettings;
  defaultThumbnail?: string;
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  defaultVisibility: VideoVisibility;
  storageConfig?: {
    driver: 'firebase' | 'local' | 's3';
    status: 'connected' | 'simulated';
    bucketName?: string;
  };
  updatedAt?: string;
}

export type AdProvider = 'adsterra' | 'custom' | 'adsense';
export type AdType = 'header' | 'footer' | 'popup' | 'in_content' | 'video_player';
export type AdStatus = 'active' | 'inactive';
export type AdFrequencyMode = 'every_minutes' | 'every_hours' | 'once_per_session' | 'once_per_day' | 'custom';
export type AdFrequencyUnit = 'minutes' | 'hours';
export type AdPageTarget =
  | 'all'
  | 'home'
  | 'video'
  | 'movies'
  | 'sports'
  | 'entertainment'
  | 'music'
  | 'gaming'
  | 'playlist'
  | 'search'
  | 'profile'
  | 'login'
  | 'signup'
  | 'section';
export type AdDeviceTarget = 'all' | 'desktop' | 'mobile' | 'tablet';
export type AdBannerSize =
  | 'responsive'
  | '320x50'
  | '728x60'
  | '728x90'
  | '300x250'
  | '336x280'
  | '970x90'
  | '970x250'
  | '700x150'
  | '600x150'
  | '550x150'
  | '300x600'
  | '160x600'
  | '468x60'
  | '250x250'
  | 'custom'
  | string;

export interface Advertisement {
  id: string;
  name: string;
  provider: AdProvider;
  type: AdType;
  banner_size?: AdBannerSize;
  width?: number; // Exact ad box width in pixels
  height?: number; // Exact ad box height in pixels
  ad_width?: number; // Database alias for width
  ad_height?: number; // Database alias for height
  custom_width?: number; // Stored custom width
  custom_height?: number; // Stored custom height
  code: string; // The exact Adsterra HTML / script / banner code entered by admin
  status: AdStatus;
  target_pages: AdPageTarget[];
  device_target?: AdDeviceTarget;
  frequency_mode?: AdFrequencyMode;
  frequency_value?: number; // e.g., 2
  frequency_unit?: AdFrequencyUnit; // 'hours' or 'minutes'
  initial_delay?: number; // in seconds
  countdown_seconds?: number; // e.g., 5, 10, or 0 (disabled)
  close_button_enabled?: boolean; // default true
  rotation_enabled?: boolean;
  rotation_interval?: number; // in seconds
  priority: number; // 1-5, higher = priority
  start_date?: string; // ISO string or date
  end_date?: string; // ISO string or date
  impressions?: number;
  clicks?: number;
  created_at: string;
  updated_at: string;
}

export interface AdSettings {
  ads_enabled: boolean;
  header_ads_enabled: boolean;
  footer_ads_enabled: boolean;
  popup_ads_enabled: boolean;
  video_ads_enabled: boolean;
  show_ad_label: boolean; // Show "Advertisement" Label: ON/OFF
  header_ad_pages?: { [key in AdPageTarget]?: boolean };
  footer_ad_pages?: { [key in AdPageTarget]?: boolean };
  default_popup_frequency_mode: AdFrequencyMode;
  default_popup_frequency_value: number;
  default_popup_frequency_unit: AdFrequencyUnit;
  default_popup_delay: number;
  default_countdown_seconds: number;
  updated_at?: string;
}

export interface ExternalStreamInspectionResult {
  title: string;
  description: string;
  thumbnail: string;
  duration?: number;
  contentType: VideoContentType | string;
  isLive: boolean;
  liveStatus?: string;
  provider: string;
  providerUrl?: string;
  sourceUrl: string;
  embedUrl: string;
  sourceType: VideoSourceType;
  authorized: boolean;
  publishedDate?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  seriesName?: string;
  language?: string;
}

export interface JioHotstarMetadata {
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  durationFormatted?: string;
  contentType: VideoContentType;
  provider: string;
  sourceUrl: string;
  embedUrl?: string;
  isLive: boolean;
  liveStatus: VideoLiveStatus;
  seasonNumber?: number;
  episodeNumber?: number;
  seriesName?: string;
  language?: string;
  category?: string;
  tags?: string[];
  releaseDate?: string;
  raw?: Record<string, any>;
}

