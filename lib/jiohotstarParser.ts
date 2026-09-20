/**
 * JioHotstar & Authorized Video Stream Metadata Parser
 * Extracts authorized metadata (Title, Description, Thumbnail, Poster, Duration,
 * Content Type, Season/Episode, Live Status, Provider, Embed URL) from official/provider sources.
 *
 * NOTE: Strictly adheres to compliance rules - does NOT bypass DRM, access controls, or download protected media.
 */

export interface ImportedMetadata {
  title: string;
  description: string;
  thumbnailUrl: string;
  posterUrl?: string;
  durationSeconds: number;
  durationFormatted: string;
  contentType: 'movie' | 'episode' | 'series' | 'live' | 'video' | 'unknown';
  isLive: boolean;
  liveStatus: 'live' | 'upcoming' | 'offline' | 'unknown';
  provider: string;
  sourceUrl: string;
  embedUrl: string;
  sourceType: 'authorized_embed' | 'hls' | 'direct';
  seasonNumber?: number;
  episodeNumber?: number;
  seriesName?: string;
  category?: string;
  language?: string;
  releaseDate?: string;
  autoFetchedFields: {
    title: boolean;
    description: boolean;
    thumbnail: boolean;
    duration: boolean;
    season: boolean;
    episode: boolean;
    contentType: boolean;
    liveStatus: boolean;
    provider: boolean;
  };
}

/**
 * Parses ISO 8601 duration format (e.g. PT1H45M30S, PT45M, PT2H) into total seconds.
 */
export function parseIsoDuration(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/i);
  if (!match) {
    const num = Number(durationStr);
    return isNaN(num) ? 0 : Math.round(num);
  }
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseFloat(match[3] || '0');
  return Math.round(hours * 3600 + minutes * 60 + seconds);
}

/**
 * Formats seconds into HH:MM:SS or MM:SS
 */
export function formatSecondsToTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Cleans extracted string (strips HTML tags, decodes standard HTML entities).
 */
export function sanitizeMetaText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Checks for private / local IP addresses to prevent SSRF vulnerabilities.
 */
export function isSafeExternalUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts OpenGraph and Meta tags from an HTML string
 */
export function extractMetaTagsFromHtml(html: string): Record<string, string> {
  const meta: Record<string, string> = {};

  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    meta['title'] = sanitizeMetaText(titleMatch[1]);
  }

  // Regex for <meta ...> tags
  const metaTagRegex = /<meta\s+([^>]+)>/gi;
  let match;
  while ((match = metaTagRegex.exec(html)) !== null) {
    const attrs = match[1];
    const nameMatch = attrs.match(/(?:name|property|itemprop)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = attrs.match(/content\s*=\s*["']([^"']*)["']/i);

    if (nameMatch && contentMatch) {
      const key = nameMatch[1].toLowerCase();
      const val = sanitizeMetaText(contentMatch[1]);
      if (val && !meta[key]) {
        meta[key] = val;
      }
    }
  }

  return meta;
}

/**
 * Extracts Schema.org JSON-LD objects from an HTML string
 */
export function extractJsonLdFromHtml(html: string): any[] {
  const results: any[] = [];
  const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const raw = match[1].trim();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed['@graph'])) {
          results.push(...parsed['@graph']);
        } else {
          results.push(parsed);
        }
      }
    } catch {
      // Ignore malformed JSON-LD snippets
    }
  }
  return results;
}

/**
 * Inspects a JioHotstar or authorized provider URL and extracts comprehensive metadata.
 */
export async function inspectVideoUrl(url: string): Promise<ImportedMetadata> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('Please provide a valid URL.');
  }

  const cleanUrl = url.trim();
  if (!isSafeExternalUrl(cleanUrl)) {
    throw new Error('The supplied URL is invalid or not an authorized external URL.');
  }

  const parsed = new URL(cleanUrl);
  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // Initialize result object
  const result: ImportedMetadata = {
    title: '',
    description: '',
    thumbnailUrl: '',
    posterUrl: '',
    durationSeconds: 0,
    durationFormatted: '00:00',
    contentType: 'unknown',
    isLive: false,
    liveStatus: 'unknown',
    provider: 'Unknown',
    sourceUrl: cleanUrl,
    embedUrl: cleanUrl,
    sourceType: 'authorized_embed',
    category: 'General',
    language: 'Tamil / Multi',
    autoFetchedFields: {
      title: false,
      description: false,
      thumbnail: false,
      duration: false,
      season: false,
      episode: false,
      contentType: false,
      liveStatus: false,
      provider: false,
    },
  };

  /* -------------------------------------------------------------
   * 1. YOUTUBE (Authorized oEmbed & Embed Support)
   * ------------------------------------------------------------- */
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    result.provider = 'YouTube';
    result.autoFetchedFields.provider = true;
    result.embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`;
    result.sourceType = 'authorized_embed';
    result.thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    result.posterUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    result.autoFetchedFields.thumbnail = true;

    if (cleanUrl.includes('/live/') || cleanUrl.includes('live=1')) {
      result.contentType = 'live';
      result.isLive = true;
      result.liveStatus = 'live';
      result.autoFetchedFields.contentType = true;
      result.autoFetchedFields.liveStatus = true;
    } else {
      result.contentType = 'video';
      result.autoFetchedFields.contentType = true;
    }

    // Call official YouTube oEmbed
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`, {
        signal: AbortSignal.timeout(4000),
      });
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) {
          result.title = data.title;
          result.autoFetchedFields.title = true;
        }
        if (data.author_name) {
          result.category = data.author_name;
        }
        if (data.thumbnail_url) {
          result.thumbnailUrl = data.thumbnail_url;
        }
      }
    } catch {
      // Fallback title from ID
      if (!result.title) {
        result.title = `YouTube Video (${videoId})`;
      }
    }

    return result;
  }

  /* -------------------------------------------------------------
   * 2. VIMEO (Authorized oEmbed Support)
   * ------------------------------------------------------------- */
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    result.provider = 'Vimeo';
    result.autoFetchedFields.provider = true;
    result.embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    result.sourceType = 'authorized_embed';
    result.contentType = 'video';
    result.autoFetchedFields.contentType = true;

    try {
      const oembedRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(cleanUrl)}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) {
          result.title = data.title;
          result.autoFetchedFields.title = true;
        }
        if (data.description) {
          result.description = sanitizeMetaText(data.description);
          result.autoFetchedFields.description = true;
        }
        if (data.thumbnail_url) {
          result.thumbnailUrl = data.thumbnail_url;
          result.autoFetchedFields.thumbnail = true;
        }
        if (data.duration) {
          result.durationSeconds = data.duration;
          result.durationFormatted = formatSecondsToTime(data.duration);
          result.autoFetchedFields.duration = true;
        }
      }
    } catch {
      if (!result.title) result.title = `Vimeo Video (${videoId})`;
    }

    return result;
  }

  /* -------------------------------------------------------------
   * 3. TWITCH (Live Streams & VODs)
   * ------------------------------------------------------------- */
  if (host.includes('twitch.tv')) {
    result.provider = 'Twitch';
    result.autoFetchedFields.provider = true;
    result.sourceType = 'authorized_embed';

    const twitchChannel = pathname.replace(/^\/+/, '').split('/')[0];
    if (cleanUrl.includes('/videos/')) {
      const vidId = cleanUrl.match(/\/videos\/(\d+)/)?.[1];
      result.contentType = 'video';
      result.embedUrl = `https://player.twitch.tv/?video=${vidId}&parent=localhost&autoplay=true`;
      result.title = `Twitch VOD ${vidId}`;
    } else if (twitchChannel) {
      result.contentType = 'live';
      result.isLive = true;
      result.liveStatus = 'live';
      result.embedUrl = `https://player.twitch.tv/?channel=${twitchChannel}&parent=localhost&autoplay=true`;
      result.title = `${twitchChannel} - Live Stream`;
      result.autoFetchedFields.liveStatus = true;
    }
    result.autoFetchedFields.contentType = true;
    return result;
  }

  /* -------------------------------------------------------------
   * 4. DIRECT HLS (.m3u8) or MP4 STREAM
   * ------------------------------------------------------------- */
  if (pathname.endsWith('.m3u8') || cleanUrl.includes('.m3u8?')) {
    result.provider = 'HLS Stream';
    result.sourceType = 'hls';
    result.embedUrl = cleanUrl;
    result.autoFetchedFields.provider = true;
    result.title = pathname.split('/').pop()?.replace('.m3u8', '') || 'Live HLS Stream';
    result.isLive = cleanUrl.toLowerCase().includes('live');
    result.liveStatus = result.isLive ? 'live' : 'unknown';
    result.contentType = result.isLive ? 'live' : 'video';
    result.autoFetchedFields.contentType = true;
    result.autoFetchedFields.liveStatus = true;
    return result;
  }

  if (pathname.endsWith('.mp4') || pathname.endsWith('.webm') || pathname.endsWith('.mov')) {
    result.provider = 'Direct Video';
    result.sourceType = 'direct';
    result.embedUrl = cleanUrl;
    result.autoFetchedFields.provider = true;
    const filename = pathname.split('/').pop() || 'Video';
    result.title = decodeURIComponent(filename.replace(/\.[^/.]+$/, ''));
    result.contentType = 'video';
    result.autoFetchedFields.contentType = true;
    return result;
  }

  /* -------------------------------------------------------------
   * 5. JIOHOTSTAR & HOTSTAR OFFICIAL URLS
   * ------------------------------------------------------------- */
  const isJioHotstar = host.includes('hotstar.com') || host.includes('jiohotstar.com') || host.includes('jiocinema.com');
  if (isJioHotstar) {
    result.provider = 'JioHotstar';
    result.autoFetchedFields.provider = true;
  }

  // Detect content type & season/episode from URL path
  if (pathname.includes('/movies/')) {
    result.contentType = 'movie';
    result.autoFetchedFields.contentType = true;
  } else if (pathname.includes('/shows/') || pathname.includes('/tv/') || pathname.includes('/episode/')) {
    result.contentType = 'episode';
    result.autoFetchedFields.contentType = true;
  } else if (pathname.includes('/sports/') || pathname.includes('/live')) {
    result.contentType = 'live';
    result.isLive = true;
    result.liveStatus = 'live';
    result.autoFetchedFields.contentType = true;
    result.autoFetchedFields.liveStatus = true;
  } else if (pathname.includes('/clips/')) {
    result.contentType = 'video';
    result.autoFetchedFields.contentType = true;
  }

  // Detect season / episode numbers from URL patterns
  const seasonMatch = cleanUrl.match(/season[-_ ]?([0-9]+)/i) || cleanUrl.match(/[?&]season=([0-9]+)/i);
  if (seasonMatch && seasonMatch[1]) {
    result.seasonNumber = parseInt(seasonMatch[1], 10);
    result.autoFetchedFields.season = true;
  }

  const episodeMatch = cleanUrl.match(/episode[-_ ]?([0-9]+)/i) || cleanUrl.match(/[?&]episode=([0-9]+)/i) || cleanUrl.match(/[?&]ep=([0-9]+)/i);
  if (episodeMatch && episodeMatch[1]) {
    result.episodeNumber = parseInt(episodeMatch[1], 10);
    result.autoFetchedFields.episode = true;
  }

  // Hotstar Content ID extraction
  const contentIdMatch = pathname.match(/\/(\d{8,12})(?:\/|$|\?)/);
  if (contentIdMatch && contentIdMatch[1]) {
    const hotstarId = contentIdMatch[1];
    // Official / authorized hotstar embed URL
    result.embedUrl = `https://www.hotstar.com/embed/${hotstarId}`;
  }

  /* -------------------------------------------------------------
   * 6. SERVER-SIDE METADATA EXTRACTION (OpenGraph + JSON-LD)
   * ------------------------------------------------------------- */
  try {
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (compatible; MetadataInspector/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ta;q=0.8',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const html = await response.text();
      const meta = extractMetaTagsFromHtml(html);
      const jsonLdList = extractJsonLdFromHtml(html);

      // 1. Extract Title
      const rawTitle =
        meta['og:title'] ||
        meta['twitter:title'] ||
        meta['title'] ||
        '';
      if (rawTitle) {
        // Strip common site suffixes like " - JioHotstar", " | Watch on Disney+ Hotstar"
        result.title = rawTitle
          .replace(/\s*[-|–]\s*(?:Watch\s+on\s+)?(?:Disney\+\s*)?(?:Jio\s*)?Hotstar.*$/i, '')
          .replace(/\s*[-|–]\s*JioCinema.*$/i, '')
          .trim();
        result.autoFetchedFields.title = true;
      }

      // 2. Extract Description
      const rawDesc =
        meta['og:description'] ||
        meta['twitter:description'] ||
        meta['description'] ||
        '';
      if (rawDesc) {
        result.description = rawDesc;
        result.autoFetchedFields.description = true;
      }

      // 3. Extract Thumbnail & Poster
      const rawThumb =
        meta['og:image'] ||
        meta['twitter:image'] ||
        meta['og:image:secure_url'] ||
        meta['image'] ||
        '';
      if (rawThumb) {
        result.thumbnailUrl = rawThumb;
        result.posterUrl = rawThumb;
        result.autoFetchedFields.thumbnail = true;
      }

      // 4. Extract Category & Language
      if (meta['og:video:tag'] || meta['keywords']) {
        const tags = (meta['og:video:tag'] || meta['keywords']).split(',').map((t) => t.trim());
        if (tags.length > 0) {
          result.category = tags[0];
        }
      }

      // 5. Extract JSON-LD details
      for (const item of jsonLdList) {
        if (!item) continue;
        const type = item['@type'];

        // TVEpisode or Movie
        if (type === 'TVEpisode' || type === 'Episode') {
          result.contentType = 'episode';
          result.autoFetchedFields.contentType = true;
          if (item.episodeNumber) {
            result.episodeNumber = parseInt(item.episodeNumber, 10);
            result.autoFetchedFields.episode = true;
          }
          if (item.partOfSeason?.seasonNumber) {
            result.seasonNumber = parseInt(item.partOfSeason.seasonNumber, 10);
            result.autoFetchedFields.season = true;
          }
          if (item.partOfSeries?.name) {
            result.seriesName = item.partOfSeries.name;
          }
        } else if (type === 'Movie') {
          result.contentType = 'movie';
          result.autoFetchedFields.contentType = true;
        } else if (type === 'BroadcastEvent' || item.isLiveBroadcast) {
          result.contentType = 'live';
          result.isLive = true;
          result.liveStatus = 'live';
          result.autoFetchedFields.contentType = true;
          result.autoFetchedFields.liveStatus = true;
        }

        // Title fallback / enrichment from JSON-LD
        if (!result.title && item.name) {
          result.title = sanitizeMetaText(item.name);
          result.autoFetchedFields.title = true;
        }

        // Description fallback / enrichment
        if (!result.description && item.description) {
          result.description = sanitizeMetaText(item.description);
          result.autoFetchedFields.description = true;
        }

        // Thumbnail from JSON-LD
        if (!result.thumbnailUrl && item.image) {
          const imgUrl = Array.isArray(item.image) ? item.image[0] : typeof item.image === 'object' ? item.image.url : item.image;
          if (imgUrl && typeof imgUrl === 'string') {
            result.thumbnailUrl = imgUrl;
            result.posterUrl = imgUrl;
            result.autoFetchedFields.thumbnail = true;
          }
        }

        // Duration from JSON-LD
        if (item.duration) {
          const secs = parseIsoDuration(item.duration);
          if (secs > 0) {
            result.durationSeconds = secs;
            result.durationFormatted = formatSecondsToTime(secs);
            result.autoFetchedFields.duration = true;
          }
        }

        // Language from JSON-LD
        if (item.inLanguage) {
          result.language = typeof item.inLanguage === 'string' ? item.inLanguage : item.inLanguage.name || 'Tamil';
        }

        // Release Date from JSON-LD
        if (item.datePublished || item.uploadDate) {
          result.releaseDate = item.datePublished || item.uploadDate;
        }
      }

      // Duration from Meta video:duration
      if (!result.durationSeconds && meta['video:duration']) {
        const secs = parseInt(meta['video:duration'], 10);
        if (!isNaN(secs) && secs > 0) {
          result.durationSeconds = secs;
          result.durationFormatted = formatSecondsToTime(secs);
          result.autoFetchedFields.duration = true;
        }
      }

      // Fallback Provider Name if not set
      if (!result.provider || result.provider === 'Unknown') {
        const siteName = meta['og:site_name'];
        if (siteName) {
          result.provider = siteName;
          result.autoFetchedFields.provider = true;
        } else {
          result.provider = host.replace(/^www\./, '');
        }
      }
    }
  } catch (err) {
    console.warn('Metadata inspection fetch warning:', err);
    // If external fetch was blocked or timed out, graceful fallback using URL semantics
  }

  // Final fallback for title if still empty: derive from slug or domain
  if (!result.title) {
    const segments = pathname.split('/').filter(Boolean);
    const lastSeg = segments[segments.length - 1] || '';
    if (lastSeg && isNaN(Number(lastSeg))) {
      result.title = decodeURIComponent(lastSeg.replace(/[-_]+/g, ' ')).replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (segments.length >= 2) {
      const prevSeg = segments[segments.length - 2];
      result.title = decodeURIComponent(prevSeg.replace(/[-_]+/g, ' ')).replace(/\b\w/g, (c) => c.toUpperCase());
    } else {
      result.title = `${result.provider} Video`;
    }
  }

  return result;
}
