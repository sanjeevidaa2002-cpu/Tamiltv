'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { Play, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  const { settings, colors, footerSettings } = useTheme();
  const currentYear = new Date().getFullYear();

  // If footer is disabled by admin, return null completely
  if (footerSettings && !footerSettings.enabled) {
    return null;
  }

  const primaryColor = colors.primary || '#3B82F6';
  const footerBg = colors.footer || '#070C18';
  const textColor = colors.text || '#F8FAFC';
  const mutedText = colors.mutedText || '#94A3B8';
  const borderColor = colors.border || '#1E293B';

  const showLogo = footerSettings?.showLogo ?? true;
  const showDescription = footerSettings?.showDescription ?? true;
  const showNavLinks = footerSettings?.showNavigationLinks ?? true;
  const showSocialLinks = footerSettings?.showSocialLinks ?? true;
  const showCopyright = footerSettings?.showCopyright ?? true;
  const showContact = footerSettings?.showContact ?? true;
  const showCustomLinks = footerSettings?.showCustomLinks ?? true;

  const copyrightText = (footerSettings?.copyrightText || '© {year} {siteName}. All rights reserved.')
    .replace('{year}', currentYear.toString())
    .replace('{siteName}', settings.siteName || 'VideoStream');

  const paddingY = footerSettings?.paddingY ? `${footerSettings.paddingY}px` : '32px';

  return (
    <footer
      id="site-footer"
      className="mt-auto border-t transition-colors w-full"
      style={{
        backgroundColor: footerBg,
        borderColor: borderColor,
        paddingTop: paddingY,
        paddingBottom: paddingY,
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Brand & Description */}
          <div className="flex flex-col items-center md:items-start gap-2">
            {showLogo && (
              <div className="flex items-center gap-2.5">
                {settings.siteLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${settings.siteLogo}${settings.siteLogo.includes('?') ? '&' : '?'}v=${settings.updatedAt || '1'}`}
                    alt={settings.siteName || 'VideoStream'}
                    className="h-8 max-w-[140px] object-contain"
                  />
                ) : (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Play className="h-3.5 w-3.5 fill-current text-white ml-0.5" />
                  </div>
                )}
                <span className="font-bold tracking-tight text-sm" style={{ color: textColor }}>
                  {settings.siteName || 'VideoStream'}
                </span>
              </div>
            )}

            {showDescription && (
              <p className="text-xs max-w-md leading-relaxed" style={{ color: mutedText }}>
                {settings.siteDescription || 'Next-Generation Full-Stack Video Streaming & Dynamic Content Platform'}
              </p>
            )}
          </div>

          {/* Navigation Links */}
          {showNavLinks && (
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
              <Link href="/" className="transition-opacity hover:opacity-80" style={{ color: mutedText }}>
                Home
              </Link>
              <Link href="/section/movies" className="transition-opacity hover:opacity-80" style={{ color: mutedText }}>
                Movies
              </Link>
              <Link href="/section/sports" className="transition-opacity hover:opacity-80" style={{ color: mutedText }}>
                Sports
              </Link>
              <Link href="/section/entertainment" className="transition-opacity hover:opacity-80" style={{ color: mutedText }}>
                Entertainment
              </Link>
              <Link href="/section/music" className="transition-opacity hover:opacity-80" style={{ color: mutedText }}>
                Music
              </Link>
              <Link href="/section/gaming" className="transition-opacity hover:opacity-80" style={{ color: mutedText }}>
                Gaming
              </Link>
            </div>
          )}

          {/* Social Links */}
          {showSocialLinks && footerSettings?.socialLinks && (
            <div className="flex items-center gap-3">
              {footerSettings.socialLinks.facebook && (
                <a
                  href={footerSettings.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition hover:opacity-80"
                  style={{ color: mutedText }}
                >
                  Facebook
                </a>
              )}
              {footerSettings.socialLinks.twitter && (
                <a
                  href={footerSettings.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition hover:opacity-80"
                  style={{ color: mutedText }}
                >
                  Twitter / X
                </a>
              )}
              {footerSettings.socialLinks.youtube && (
                <a
                  href={footerSettings.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition hover:opacity-80"
                  style={{ color: mutedText }}
                >
                  YouTube
                </a>
              )}
              {footerSettings.socialLinks.telegram && (
                <a
                  href={footerSettings.socialLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition hover:opacity-80"
                  style={{ color: mutedText }}
                >
                  Telegram
                </a>
              )}
              {footerSettings.socialLinks.discord && (
                <a
                  href={footerSettings.socialLinks.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition hover:opacity-80"
                  style={{ color: mutedText }}
                >
                  Discord
                </a>
              )}
            </div>
          )}
        </div>

        {/* Custom Links & Contact */}
        {(showCustomLinks || showContact) && (
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t text-xs"
            style={{ borderColor: `${borderColor}60` }}
          >
            {showCustomLinks && footerSettings?.customLinks && footerSettings.customLinks.length > 0 ? (
              <div className="flex flex-wrap gap-4 items-center justify-center">
                {footerSettings.customLinks.map((lnk, idx) => (
                  <a
                    key={idx}
                    href={lnk.url}
                    className="transition hover:opacity-80"
                    style={{ color: mutedText }}
                  >
                    {lnk.title}
                  </a>
                ))}
              </div>
            ) : <div />}

            {showContact && footerSettings?.contactEmail && (
              <div className="flex items-center gap-1.5" style={{ color: mutedText }}>
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${footerSettings.contactEmail}`} className="hover:underline">
                  {footerSettings.contactEmail}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Copyright */}
        {showCopyright && (
          <div
            className="text-center pt-2 text-xs"
            style={{ color: mutedText }}
          >
            <p>{copyrightText}</p>
          </div>
        )}
      </div>
    </footer>
  );
};
