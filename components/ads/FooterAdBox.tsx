'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Advertisement, AdSettings, AdPageTarget } from '@/lib/types';
import {
  getAds,
  getAdSettings,
  isAdScheduledActive,
  isAdTargetMatching,
  isFooterAdEnabledForPage,
} from '@/lib/adService';
import { detectCurrentAdPage } from './HeaderAdBox';
import { AdBox } from './AdBox';

interface FooterAdBoxProps {
  page?: AdPageTarget;
  className?: string;
}

/**
 * Standard Footer Ad Box
 *
 * Placed after main content, outside and before the Footer component.
 * Enforces standard 728x60 (Desktop) and 320x50 (Mobile) formats.
 */
export const FooterAdBox: React.FC<FooterAdBoxProps> = ({ page, className = '' }) => {
  const pathname = usePathname();
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [settings, setSettings] = useState<AdSettings | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFooterAd() {
      try {
        const [loadedSettings, allAds]: [AdSettings, Advertisement[]] = await Promise.all([
          getAdSettings(),
          getAds(false),
        ]);

        if (!isMounted) return;
        setSettings(loadedSettings);

        // Verify global master switch & footer ads switch
        if (!loadedSettings.ads_enabled || !loadedSettings.footer_ads_enabled) {
          setAd(null);
          return;
        }

        // Determine effective page
        const effectivePage: AdPageTarget = page || detectCurrentAdPage(pathname);

        // Check if Footer Ad is enabled specifically for this page
        if (!isFooterAdEnabledForPage(effectivePage, loadedSettings)) {
          setAd(null);
          return;
        }

        // Filter active, scheduled footer ads targeting this page
        const validAds = allAds
          .filter(
            (a) =>
              a.type === 'footer' &&
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
        console.warn('Failed to load footer ad box:', err);
        if (isMounted) setAd(null);
      }
    }

    loadFooterAd();

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
      id="footer-ad-box"
      aria-label="Advertisement"
      className={`w-full my-1 sm:my-1.5 flex justify-center items-center ${className}`}
    >
      <AdBox ad={ad} showLabel={showLabel} />
    </aside>
  );
};
