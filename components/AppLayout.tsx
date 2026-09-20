'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeaderAdBox } from '@/components/ads/HeaderAdBox';
import { FooterAdBox } from '@/components/ads/FooterAdBox';
import { SiteLoadingScreen } from '@/components/SiteLoadingScreen';
import { useTheme } from '@/context/ThemeContext';
import { AdPageTarget, Section } from '@/lib/types';

interface AppLayoutProps {
  children: React.ReactNode;
  page?: AdPageTarget;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedSectionSlug?: string;
  onSelectSection?: (slug: string) => void;
  sections?: Section[];
  showHeaderAd?: boolean;
  showFooterAd?: boolean;
  className?: string;
}

/**
 * Standard Application Layout
 *
 * Enforces the strict structural separation required by the advertising system:
 *
 * ┌────────────────────────────────────────┐
 * │              HEADER                    │
 * │        (Logo / Navigation)             │
 * └────────────────────────────────────────┘
 *                    ↓
 * ┌────────────────────────────────────────┐
 * │            HEADER AD BOX               │
 * │          (Adsterra Slot)               │
 * └────────────────────────────────────────┘
 *                    ↓
 * ┌────────────────────────────────────────┐
 * │             PAGE CONTENT               │
 * │          (Children / Main)             │
 * └────────────────────────────────────────┘
 *                    ↓
 * ┌────────────────────────────────────────┐
 * │            FOOTER AD BOX               │
 * │          (Adsterra Slot)               │
 * └────────────────────────────────────────┘
 *                    ↓
 * ┌────────────────────────────────────────┐
 * │              FOOTER                    │
 * │       (Footer Information)             │
 * └────────────────────────────────────────┘
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  page,
  searchQuery,
  onSearchChange,
  selectedSectionSlug,
  onSelectSection,
  sections,
  showHeaderAd = true,
  showFooterAd = true,
  className = '',
}) => {
  const { colors, headerSettings, footerSettings } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${className}`}
      style={{
        backgroundColor: colors.background || '#0B1120',
        color: colors.text || '#F8FAFC',
      }}
    >
      {/* 0. Site Loading Screen overlay if enabled */}
      <SiteLoadingScreen />

      {/* 1. Header (Navbar) - 100% separate from Ad */}
      {headerSettings?.enabled && (
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedSectionSlug={selectedSectionSlug}
          onSelectSection={onSelectSection}
          sections={sections}
        />
      )}

      {/* 2. Header Ad Box - Dedicated standalone container outside Header */}
      {showHeaderAd && <HeaderAdBox page={page} />}

      {/* 3. Main Content - Videos, Grid, Watch, etc. */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* 4. Footer Ad Box - Dedicated standalone container outside Footer */}
      {showFooterAd && <FooterAdBox page={page} />}

      {/* 5. Footer - 100% separate from Ad */}
      {footerSettings?.enabled && <Footer />}
    </div>
  );
};
