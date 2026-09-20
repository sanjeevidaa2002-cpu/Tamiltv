/**
 * Reusable video formatting, metadata extraction, and slug helpers.
 */

/**
 * Single source of truth for duration formatting.
 * 
 * Rules:
 * Under 1 hour:
 *   30 seconds -> "0:30"
 *   1 minute 25 seconds -> "1:25"
 *   30 minutes -> "30:00"
 *   45 minutes -> "45:00"
 * 
 * 1 hour or more:
 *   1 hour 5 minutes 20 seconds -> "1:05:20"
 *   1 hour 20 minutes -> "1:20:00"
 *   2 hours 5 minutes 30 seconds -> "2:05:30"
 *   2 hours 30 minutes -> "2:30:00"
 */
export function formatDuration(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats player time display (Current Time / Total Duration)
 * e.g. "00:12 / 45:00" or "12:35 / 1:20:45"
 */
export function formatPlayerTime(currentSeconds: number, totalSeconds: number): {
  current: string;
  total: string;
  combined: string;
} {
  const safeCurrent = Math.max(0, Math.floor(currentSeconds || 0));
  const safeTotal = Math.max(0, Math.floor(totalSeconds || 0));

  const totalFormatted = formatDuration(safeTotal);

  const currentHrs = Math.floor(safeCurrent / 3600);
  const currentMins = Math.floor((safeCurrent % 3600) / 60);
  const currentSecs = safeCurrent % 60;

  let currentFormatted = '';
  if (safeTotal >= 3600 || currentHrs > 0) {
    currentFormatted = `${currentHrs}:${currentMins.toString().padStart(2, '0')}:${currentSecs.toString().padStart(2, '0')}`;
  } else {
    currentFormatted = `${currentMins.toString().padStart(2, '0')}:${currentSecs.toString().padStart(2, '0')}`;
  }

  return {
    current: currentFormatted,
    total: totalFormatted,
    combined: `${currentFormatted} / ${totalFormatted}`,
  };
}

/**
 * Format video view count (e.g. 1.2M views, 4.5K views, 120 views)
 */
export function formatViews(views: number): string {
  if (!views) return '0 views';
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} view${views === 1 ? '' : 's'}`;
}

/**
 * Relative time formatter
 */
export function formatTimeAgo(dateString: string): string {
  try {
    const past = new Date(dateString).getTime();
    const diff = Date.now() - past;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 30) return `${Math.floor(days / 30)}mo ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  } catch {
    return 'Recently';
  }
}

/**
 * Automatic URL slug generator
 * "Tamil Movies" -> "tamil-movies"
 * "Action & Sci-Fi" -> "action-sci-fi"
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Automatically detects real duration from an uploaded video file using HTML5 Video metadata
 */
export function detectDurationFromFile(file: File): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !file) {
      return resolve(0);
    }
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      const cleanup = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      };

      video.onloadedmetadata = () => {
        const dur = Math.round(video.duration);
        cleanup();
        resolve(isNaN(dur) || dur < 0 ? 0 : dur);
      };

      video.onerror = () => {
        cleanup();
        resolve(0);
      };

      // Fallback timeout in case metadata event doesn't fire
      setTimeout(() => {
        cleanup();
        resolve(0);
      }, 7000);
    } catch {
      resolve(0);
    }
  });
}

/**
 * Automatically detects real duration from a video URL using HTML5 Video metadata
 */
export function detectDurationFromUrl(url: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !url || !url.startsWith('http')) {
      return resolve(0);
    }
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
      video.src = url;

      video.onloadedmetadata = () => {
        const dur = Math.round(video.duration);
        resolve(isNaN(dur) || dur < 0 ? 0 : dur);
      };

      video.onerror = () => {
        resolve(0);
      };

      // Safety timeout for CORS or non-direct stream responses
      setTimeout(() => {
        resolve(0);
      }, 6000);
    } catch {
      resolve(0);
    }
  });
}
