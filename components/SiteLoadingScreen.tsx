'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, Play } from 'lucide-react';

interface SiteLoadingScreenProps {
  forceShow?: boolean;
  minDurationMs?: number;
}

export const SiteLoadingScreen: React.FC<SiteLoadingScreenProps> = ({
  forceShow = false,
  minDurationMs = 800,
}) => {
  const { settings, colors, loadingSettings, loading: contextLoading } = useTheme();
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  const enabled = loadingSettings?.enabled ?? true;

  useEffect(() => {
    if (forceShow) return;

    if (!contextLoading) {
      const timer = setTimeout(() => {
        setFadingOut(true);
        const hideTimer = setTimeout(() => {
          setVisible(false);
        }, 400);
        return () => clearTimeout(hideTimer);
      }, minDurationMs);

      return () => clearTimeout(timer);
    }
  }, [contextLoading, forceShow, minDurationMs]);

  if (!enabled && !forceShow) return null;
  if (!visible && !forceShow) return null;

  // Background determination
  let bgStyle: React.CSSProperties = {
    backgroundColor: colors.background || '#0B1120',
  };

  if (loadingSettings?.backgroundType === 'custom-color' && loadingSettings.customColor) {
    bgStyle = { backgroundColor: loadingSettings.customColor };
  } else if (loadingSettings?.backgroundType === 'custom-image' && loadingSettings.customImageUrl) {
    bgStyle = {
      backgroundImage: `url(${loadingSettings.customImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  const anim = loadingSettings?.animation || 'logo-pulse';
  const logoSrc = loadingSettings?.logoUrl || settings.siteLogo;
  const siteName = settings.siteName || 'VideoStream';
  const text = loadingSettings?.text || `Loading ${siteName}...`;
  const showText = loadingSettings?.showText ?? true;

  return (
    <div
      id="site-loading-screen"
      style={bgStyle}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-400 ${
        fadingOut && !forceShow ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
        {/* Logo / Icon */}
        <div className="relative mb-6">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={siteName}
              className={`h-16 max-w-[200px] object-contain ${
                anim === 'logo-pulse' ? 'animate-pulse' : anim === 'fade' ? 'animate-bounce' : ''
              }`}
            />
          ) : (
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-2xl ${
                anim === 'logo-pulse' ? 'animate-pulse' : anim === 'fade' ? 'animate-bounce' : ''
              }`}
              style={{ backgroundColor: colors.primary }}
            >
              <Play className="h-8 w-8 fill-current ml-1" />
            </div>
          )}

          {/* Spinner indicator if animation is spinner */}
          {anim === 'spinner' && (
            <div className="absolute -bottom-3 -right-3">
              <Loader2
                className="h-6 w-6 animate-spin"
                style={{ color: colors.primary }}
              />
            </div>
          )}
        </div>

        {/* Text */}
        {showText && (
          <div className="space-y-1">
            <h3
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.text || '#FFFFFF' }}
            >
              {text}
            </h3>
            <p
              className="text-xs"
              style={{ color: colors.mutedText || '#94A3B8' }}
            >
              Preparing your streaming experience...
            </p>
          </div>
        )}

        {/* Bottom loading bar */}
        <div className="mt-6 h-1 w-36 overflow-hidden rounded-full bg-zinc-800/80">
          <div
            className="h-full w-full animate-pulse rounded-full"
            style={{ backgroundColor: colors.primary }}
          />
        </div>
      </div>
    </div>
  );
};
