import { Advertisement, AdBannerSize } from './types';

export interface AdSizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  category: 'Standard' | 'Leaderboard' | 'Rectangle' | 'Skyscraper' | 'Banner' | 'Custom';
  description: string;
}

export const STANDARD_AD_SIZES: AdSizePreset[] = [
  {
    id: '320x50',
    label: '320 × 50 px',
    width: 320,
    height: 50,
    category: 'Standard',
    description: 'Mobile Standard / Mobile Leaderboard',
  },
  {
    id: '728x60',
    label: '728 × 60 px',
    width: 728,
    height: 60,
    category: 'Standard',
    description: 'Desktop Standard Banner',
  },
  {
    id: '728x90',
    label: '728 × 90 px',
    width: 728,
    height: 90,
    category: 'Leaderboard',
    description: 'Leaderboard Banner',
  },
  {
    id: '300x250',
    label: '300 × 250 px',
    width: 300,
    height: 250,
    category: 'Rectangle',
    description: 'Medium Rectangle / Inline Video Ad',
  },
  {
    id: '336x280',
    label: '336 × 280 px',
    width: 336,
    height: 280,
    category: 'Rectangle',
    description: 'Large Rectangle',
  },
  {
    id: '970x90',
    label: '970 × 90 px',
    width: 970,
    height: 90,
    category: 'Leaderboard',
    description: 'Large Leaderboard / Super Banner',
  },
  {
    id: '970x250',
    label: '970 × 250 px',
    width: 970,
    height: 250,
    category: 'Leaderboard',
    description: 'Billboard / Masthead Desktop',
  },
  {
    id: '700x150',
    label: '700 × 150 px',
    width: 700,
    height: 150,
    category: 'Banner',
    description: 'Desktop High-Impact Banner',
  },
  {
    id: '600x150',
    label: '600 × 150 px',
    width: 600,
    height: 150,
    category: 'Banner',
    description: 'Medium Horizontal Banner',
  },
  {
    id: '550x150',
    label: '550 × 150 px',
    width: 550,
    height: 150,
    category: 'Banner',
    description: 'Compact Horizontal Banner',
  },
  {
    id: '300x600',
    label: '300 × 600 px',
    width: 300,
    height: 600,
    category: 'Skyscraper',
    description: 'Half Page / Large Skyscraper',
  },
  {
    id: '160x600',
    label: '160 × 600 px',
    width: 160,
    height: 600,
    category: 'Skyscraper',
    description: 'Wide Skyscraper',
  },
  {
    id: '468x60',
    label: '468 × 60 px',
    width: 468,
    height: 60,
    category: 'Banner',
    description: 'Classic Full Banner',
  },
  {
    id: '250x250',
    label: '250 × 250 px',
    width: 250,
    height: 250,
    category: 'Rectangle',
    description: 'Square Ad Unit',
  },
  {
    id: 'responsive',
    label: 'Responsive (728×60 / 320×50)',
    width: 728,
    height: 60,
    category: 'Standard',
    description: 'Auto-adapts to 728x60 on Desktop, 320x50 on Mobile',
  },
  {
    id: 'custom',
    label: 'Custom Size (Width × Height)',
    width: 728,
    height: 90,
    category: 'Custom',
    description: 'Specify any exact Width and Height in pixels',
  },
];

export interface ResolvedAdDimensions {
  width: number;
  height: number;
  isCustom: boolean;
  sizeKey: string;
  displayText: string;
  aspectRatio: number;
}

/**
 * Resolves the precise pixel dimensions configured for an advertisement.
 * Respects custom pixel sizes and all standard preset options.
 */
export function getAdDimensions(
  ad: Partial<Advertisement> | null | undefined,
  forcedSize?: AdBannerSize,
  fallback: { width: number; height: number } = { width: 728, height: 60 }
): ResolvedAdDimensions {
  if (!ad && !forcedSize) {
    return {
      width: fallback.width,
      height: fallback.height,
      isCustom: false,
      sizeKey: 'default',
      displayText: `${fallback.width} × ${fallback.height} px`,
      aspectRatio: fallback.width / Math.max(1, fallback.height),
    };
  }

  const effectiveBannerSize = forcedSize || ad?.banner_size || '728x60';

  // 1. Explicit Custom Size
  if (effectiveBannerSize === 'custom' || (ad?.custom_width && ad?.custom_height)) {
    const width = Number(ad?.custom_width || ad?.width || ad?.ad_width) || fallback.width;
    const height = Number(ad?.custom_height || ad?.height || ad?.ad_height) || fallback.height;
    return {
      width,
      height,
      isCustom: true,
      sizeKey: 'custom',
      displayText: `Custom: ${width} × ${height} px`,
      aspectRatio: width / Math.max(1, height),
    };
  }

  // 2. Explicit direct width and height properties on the ad object
  const directWidth = Number(ad?.width ?? ad?.ad_width);
  const directHeight = Number(ad?.height ?? ad?.ad_height);
  if (!forcedSize && directWidth > 0 && directHeight > 0) {
    return {
      width: directWidth,
      height: directHeight,
      isCustom: false,
      sizeKey: `${directWidth}x${directHeight}`,
      displayText: `${directWidth} × ${directHeight} px`,
      aspectRatio: directWidth / Math.max(1, directHeight),
    };
  }

  // 3. Preset lookup from STANDARD_AD_SIZES
  const preset = STANDARD_AD_SIZES.find((s) => s.id === effectiveBannerSize);
  if (preset && preset.id !== 'custom') {
    return {
      width: preset.width,
      height: preset.height,
      isCustom: false,
      sizeKey: preset.id,
      displayText: preset.label,
      aspectRatio: preset.width / Math.max(1, preset.height),
    };
  }

  // 4. Fallback parsing for string format "WIDTHxHEIGHT" (e.g., "800x120")
  if (typeof effectiveBannerSize === 'string' && effectiveBannerSize.includes('x')) {
    const [wStr, hStr] = effectiveBannerSize.toLowerCase().split('x');
    const parsedW = parseInt(wStr, 10);
    const parsedH = parseInt(hStr, 10);
    if (!isNaN(parsedW) && !isNaN(parsedH) && parsedW > 0 && parsedH > 0) {
      return {
        width: parsedW,
        height: parsedH,
        isCustom: false,
        sizeKey: `${parsedW}x${parsedH}`,
        displayText: `${parsedW} × ${parsedH} px`,
        aspectRatio: parsedW / Math.max(1, parsedH),
      };
    }
  }

  return {
    width: fallback.width,
    height: fallback.height,
    isCustom: false,
    sizeKey: 'default',
    displayText: `${fallback.width} × ${fallback.height} px`,
    aspectRatio: fallback.width / Math.max(1, fallback.height),
  };
}
