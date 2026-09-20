'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Advertisement, AdBannerSize } from '@/lib/types';
import { recordAdImpression, recordAdClick, getAdDimensions, STANDARD_AD_SIZES } from '@/lib/adService';

export { AD_DIMENSIONS } from './legacyDimensions';

interface AdsterraSlotProps {
  ad: Advertisement;
  className?: string;
  isPreview?: boolean;
  showLabel?: boolean;
  forcedSize?: AdBannerSize;
  customWidth?: number;
  customHeight?: number;
}

export const AdsterraSlot: React.FC<AdsterraSlotProps> = ({
  ad,
  className = '',
  isPreview = false,
  showLabel = false,
  forcedSize,
  customWidth,
  customHeight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [impressionRecorded, setImpressionRecorded] = useState(false);

  // Dynamically resolve exact dimensions from ad object and props
  const dimensions = useMemo(() => {
    if (customWidth && customHeight) {
      return {
        width: customWidth,
        height: customHeight,
        isCustom: true,
        sizeKey: 'custom',
        displayText: `${customWidth} × ${customHeight} px`,
        aspectRatio: customWidth / Math.max(1, customHeight),
      };
    }
    return getAdDimensions(ad, forcedSize);
  }, [ad, forcedSize, customWidth, customHeight]);

  const { width, height, displayText } = dimensions;

  const code = ad?.code;

  // Build sandboxed HTML content for isolated ad execution
  const iframeContent = useMemo(() => {
    if (!code || !code.trim()) return '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; margin: 0 auto; }
    iframe { border: none !important; margin: 0 auto !important; max-width: 100%; max-height: 100%; }
    a { display: inline-block; max-width: 100%; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
  }, [code]);

  // Execute ad script inside clean iframe on code or dimensions change
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeContent) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(iframeContent);
        doc.close();
      }
    } catch (err) {
      console.warn('Isolated advertisement execution warning:', err);
    }
  }, [iframeContent, width, height]);

  // Record impression using IntersectionObserver
  useEffect(() => {
    if (isPreview || impressionRecorded || !ad?.id) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          recordAdImpression(ad.id);
          setImpressionRecorded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ad?.id, impressionRecorded, isPreview]);

  if (!ad || !ad.code || !ad.code.trim()) {
    if (isPreview) {
      return (
        <div
          style={{ width: `${width}px`, height: `${height}px`, maxWidth: '100%' }}
          className="flex flex-col items-center justify-center border border-dashed border-zinc-700/80 rounded-lg bg-zinc-900/60 text-zinc-400 p-3 mx-auto select-none"
        >
          <span className="text-xs font-semibold text-zinc-300">Ad Box Preview</span>
          <span className="text-[11px] font-mono text-emerald-400 mt-0.5">{displayText}</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      ref={containerRef}
      onClick={() => {
        if (!isPreview && ad?.id) {
          recordAdClick(ad.id);
        }
      }}
      className={`adsterra-slot-wrapper relative flex flex-col items-center justify-center mx-auto ${className}`}
      style={{
        width: `${width}px`,
        maxWidth: '100%',
      }}
    >
      {showLabel && (
        <span className="text-[9px] leading-none uppercase tracking-wider text-zinc-500 mb-1 select-none text-center">
          Advertisement ({displayText})
        </span>
      )}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-md border border-zinc-800/80 bg-zinc-950/40 shadow-sm transition-all"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
        }}
      >
        <iframe
          ref={iframeRef}
          title={`ad-${ad.id || 'slot'}`}
          width={width}
          height={height}
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            border: 'none',
            overflow: 'hidden',
            display: 'block',
          }}
          scrolling="no"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
};
