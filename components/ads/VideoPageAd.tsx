'use client';

import React, { useEffect, useState } from 'react';
import { Advertisement, AdSettings } from '@/lib/types';
import { getAds, getAdSettings, isAdScheduledActive, isAdTargetMatching } from '@/lib/adService';
import { AdBox } from './AdBox';

interface VideoPageAdProps {
  position?: 'above_details' | 'below_details';
  className?: string;
}

export const VideoPageAd: React.FC<VideoPageAdProps> = ({
  className = '',
}) => {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadVideoAd() {
      try {
        const [settings, allAds]: [AdSettings, Advertisement[]] = await Promise.all([
          getAdSettings(),
          getAds(false),
        ]);

        if (!isMounted) return;

        if (!settings.ads_enabled || !settings.video_ads_enabled) {
          setAd(null);
          setLoading(false);
          return;
        }

        const validAds = allAds
          .filter(
            (a) =>
              (a.type === 'video_player' || a.type === 'in_content') &&
              a.status === 'active' &&
              a.code &&
              a.code.trim()
          )
          .filter((a) => isAdScheduledActive(a))
          .filter((a) => isAdTargetMatching(a, 'video'));

        if (validAds.length === 0) {
          setAd(null);
        } else {
          setAd(validAds[0]);
        }
      } catch (err) {
        console.warn('Failed to load video page ad:', err);
        setAd(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVideoAd();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !ad || !ad.code.trim()) {
    return null;
  }

  return (
    <div className={`w-full my-1 sm:my-1.5 flex justify-center items-center ${className}`}>
      <AdBox ad={ad} />
    </div>
  );
};
