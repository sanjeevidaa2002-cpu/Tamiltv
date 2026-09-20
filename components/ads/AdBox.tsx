'use client';

import React from 'react';
import { Advertisement, AdBannerSize } from '@/lib/types';
import { AdsterraSlot } from './AdsterraSlot';
import { getAdDimensions } from '@/lib/adService';

interface AdBoxProps {
  ad: Advertisement;
  showLabel?: boolean;
  className?: string;
  forcedSize?: AdBannerSize;
  customWidth?: number;
  customHeight?: number;
  isPreview?: boolean;
}

/**
 * Standardized Unified AdBox Component
 *
 * Dynamically sizes container to the exact pixel dimensions configured by Admin:
 * Width × Height with responsive max-width containment.
 */
export const AdBox: React.FC<AdBoxProps> = ({
  ad,
  showLabel = false,
  className = '',
  forcedSize,
  customWidth,
  customHeight,
  isPreview = false,
}) => {
  if (!ad || !ad.code || !ad.code.trim()) {
    if (isPreview) {
      const dims = getAdDimensions(ad, forcedSize);
      const w = customWidth || dims.width;
      const h = customHeight || dims.height;
      return (
        <div className="w-full flex justify-center items-center my-1">
          <div
            style={{ width: `${w}px`, height: `${h}px`, maxWidth: '100%' }}
            className="flex flex-col items-center justify-center border border-dashed border-zinc-700/80 rounded bg-zinc-900/40 text-xs text-zinc-400 p-2"
          >
            <span className="font-semibold text-zinc-300">Ad Box Placeholder</span>
            <span className="text-[10px] font-mono text-emerald-400">{w} × {h} px</span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className={`ad-box-container w-full my-1 sm:my-1.5 flex justify-center items-center transition-opacity duration-200 ${className}`}
    >
      <AdsterraSlot
        ad={ad}
        showLabel={showLabel}
        forcedSize={forcedSize}
        customWidth={customWidth}
        customHeight={customHeight}
        isPreview={isPreview}
      />
    </div>
  );
};
