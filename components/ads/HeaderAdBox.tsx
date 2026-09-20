'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Advertisement, AdSettings, AdPageTarget } from '@/lib/types';
import {
  getAds,
  getAdSettings,
  isAdScheduledActive,
  isAdTargetMatching,
  isHeaderAdEnabledForPage,
} from '@/lib/adService';
import { AdBox } from './AdBox';

interface HeaderAdBoxProps {
  page?: AdPageTarget;
  className?: string;
}

export function detectCurrentAdPage(pathname: string): AdPageTarget {
  if (!pathname || pathname === '/') return 'home';
  if (pathname.startsWith('/watch')) return 'video';
  if (pathname.startsWith('/section/movies')) return 'movies';
  if (pathname.startsWith('/section/sports')) return 'sports';
  if (pathname.startsWith('/section/entertainment')) return 'entertainment';
  if (pathname.startsWith('/section/music')) return 'music';
  if (pathname.startsWith('/section/gaming')) return 'gaming';
  if (pathname.startsWith('/section')) return 'section';
  if (pathname.startsWith('/playlist')) return 'playlist';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/signup')) return 'signup';
  return 'home';
}

/**
 * Standard Header Ad Box
 *
 * Placed outside the Header component, before main content.
 * Enforces standard 728x60 (Desktop) and 320x50 (Mobile) formats.
 */
export const HeaderAdBox: React.FC<HeaderAdBoxProps> = ({ page, className = '' }) => {
  const pathname = usePathname();
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [settings, setSettings] = useState<AdSettings | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHeaderAd() {
      try {
        const [loadedSettings, allAds]: [AdSettings, Advertisement[]] = await Promise.all([
          getAdSettings(),
          getAds(false),
        ]);

        if (!isMounted) return;
        setSettings(loadedSettings);

        // Verify global master switch & header ads switch
        if (!loadedSettings.ads_enabled || !loadedSettings.header_ads_enabled) {
          setAd(null);
          return;
        }

        // Determine effective page
        const effectivePage: AdPageTarget = page || detectCurrentAdPage(pathname);

        // Check if Header Ad is enabled specifically for this page
        if (!isHeaderAdEnabledForPage(effectivePage, loadedSettings)) {
          setAd(null);
          return;
        }

        // Filter active, scheduled header ads targeting this page
        const validAds = allAds
          .filter(
            (a) =>
              a.type === 'header' &&
              a.status === 'active' &&
              a.code &&
              a.code.trim().length > 0
          )
          .filter((a) => isAdScheduledActive(a))
          .filter((a) => isAdTargetMatching(a, effectivePage));

        if (validAds.length === 0) {
          setAd(null);
        } else {
          // Choose highest priority ad (sorted by priority desc)
          setAd(validAds[0]);
        }
      } catch (err) {
        console.warn('Failed to load header ad box:', err);
        if (isMounted) setAd(null);
      }
    }

    loadHeaderAd();

    return () => {
      isMounted = false;
    };
  }, [pathname, page]);

  // If no active ad, or ad code is empty, collapse completely (0px space taken)
  if (!ad || !ad.code || !ad.code.trim()) {
    return null;
  }

  const showLabel = settings?.show_ad_label !== false;

  return (
    <aside
      id="header-ad-box"
      aria-label="Advertisement"
      className={`w-full my-1 sm:my-1.5 flex justify-center items-center ${className}`}
    >
      <AdBox ad={ad} showLabel={showLabel} />
    </aside>
  );
};
