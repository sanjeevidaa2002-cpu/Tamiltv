'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Section } from '@/lib/types';
import { getSections } from '@/lib/videoService';
import { SectionIcon } from '@/components/SectionIcon';
import {
  Play,
  Search,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedSectionSlug?: string;
  onSelectSection?: (slug: string) => void;
  sections?: Section[];
}

export function Navbar({
  searchQuery = '',
  onSearchChange,
  selectedSectionSlug = 'all',
  onSelectSection,
  sections: propSections,
}: NavbarProps) {
  const router = useRouter();
  const { user, isAdmin, openAuthModal, logout } = useAuth();
  const { settings, colors, headerSettings } = useTheme();

  const [fetchedSections, setFetchedSections] = useState<Section[]>([]);
  const sections = propSections && propSections.length > 0 ? propSections : fetchedSections;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (propSections && propSections.length > 0) return;
    let isMounted = true;
    getSections(false)
      .then((data) => {
        if (isMounted) setFetchedSections(data);
      })
      .catch((err) => console.warn('Navbar getSections err:', err));

    return () => {
      isMounted = false;
    };
  }, [propSections]);

  const handleSectionClick = (slug: string) => {
    if (onSelectSection) {
      onSelectSection(slug);
    } else {
      if (slug === 'all') {
        router.push('/');
      } else {
        router.push(`/section/${slug}`);
      }
    }
    setMobileMenuOpen(false);
  };

  // If header is globally disabled by admin, render nothing
  if (headerSettings && !headerSettings.enabled) {
    return null;
  }

  const primaryColor = colors.primary || '#3B82F6';
  const headerBg = colors.header || '#0B1120';
  const textColor = colors.text || '#F8FAFC';
  const mutedText = colors.mutedText || '#94A3B8';
  const borderColor = colors.border || '#1E293B';
  const buttonColor = colors.button || primaryColor;
  const buttonTextColor = colors.buttonText || '#FFFFFF';

  const isSticky = headerSettings?.isSticky ?? true;
  const showLogo = headerSettings?.showLogo ?? true;
  const showSearch = headerSettings?.showSearch ?? true;
  const showLogin = headerSettings?.showLogin ?? true;
  const showSignup = headerSettings?.showSignup ?? true;
  const showProfile = headerSettings?.showProfile ?? true;
  const showMenu = headerSettings?.showMenu ?? true;
  const showSections = headerSettings?.showSections ?? true;
  const mobileHeaderEnabled = headerSettings?.mobileHeaderEnabled ?? true;
  const mobileLogoEnabled = headerSettings?.mobileLogoEnabled ?? true;
  const mobileSearchEnabled = headerSettings?.mobileSearchEnabled ?? true;
  const mobileMenuEnabled = headerSettings?.mobileMenuEnabled ?? true;
  const mobileLoginEnabled = headerSettings?.mobileLoginEnabled ?? true;

  const headerHeight = headerSettings?.height ? `${headerSettings.height}px` : '64px';
  const headerPaddingX = headerSettings?.paddingX ? `${headerSettings.paddingX}px` : undefined;

  const mainLogo = settings.siteLogo;
  const mobileLogo = settings.mobileLogo || mainLogo;

  return (
    <header
      id="main-navbar"
      className={`${isSticky ? 'sticky top-0' : 'relative'} z-40 w-full border-b backdrop-blur-md transition-colors`}
      style={{
        backgroundColor: `${headerBg}f2`,
        borderColor: borderColor,
        minHeight: headerHeight,
      }}
    >
      <div
        className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
        style={{
          minHeight: headerHeight,
          paddingLeft: headerPaddingX,
          paddingRight: headerPaddingX,
        }}
      >
        {/* Brand / Logo */}
        {showLogo && (
          <div className="flex items-center gap-3">
            <Link
              href="/"
              id="nav-brand-link"
              className="flex items-center gap-2.5 font-bold tracking-tight transition hover:opacity-90"
              style={{ color: textColor }}
            >
              {/* Desktop Logo */}
              <div className="hidden sm:flex items-center gap-2">
                {mainLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${mainLogo}${mainLogo.includes('?') ? '&' : '?'}v=${settings.updatedAt || '1'}`}
                    alt={settings.siteName || 'VideoStream'}
                    className="h-9 max-w-[150px] object-contain"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg shadow-lg transition-transform hover:scale-105"
                    style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                  >
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                )}
                <span className="text-lg font-bold tracking-tight" style={{ color: textColor }}>
                  {settings.siteName || 'VideoStream'}
                </span>
              </div>

              {/* Mobile Logo */}
              {mobileLogoEnabled && (
                <div className="flex sm:hidden items-center gap-1.5">
                  {mobileLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${mobileLogo}${mobileLogo.includes('?') ? '&' : '?'}v=${settings.updatedAt || '1'}`}
                      alt={settings.siteName || 'VideoStream'}
                      className="h-8 max-w-[120px] object-contain"
                    />
                  ) : (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </div>
                  )}
                  <span className="text-sm font-bold tracking-tight truncate max-w-[100px]" style={{ color: textColor }}>
                    {settings.siteShortName || settings.siteName || 'VideoStream'}
                  </span>
                </div>
              )}
            </Link>
          </div>
        )}

        {/* Search Bar (Desktop & Mobile) */}
        {showSearch && onSearchChange && (
          <div className={`flex-1 max-w-md mx-2 ${mobileSearchEnabled ? 'block' : 'hidden sm:block'}`}>
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: mutedText }}
              />
              <input
                id="navbar-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search videos, genres, tags..."
                className="w-full rounded-full border py-1.5 pl-10 pr-8 text-sm transition focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: `${colors.surface || colors.card || '#1E293B'}cc`,
                  borderColor: borderColor,
                  color: textColor,
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs hover:opacity-80"
                  style={{ color: mutedText }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Desktop User / Auth Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {isAdmin && (
                <Link
                  id="nav-admin-link"
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                  style={{
                    borderColor: `${primaryColor}50`,
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              )}

              {showProfile && (
                <div
                  className="flex items-center gap-2 pl-2 border-l"
                  style={{ borderColor: borderColor }}
                >
                  <div className="flex items-center gap-2 text-sm" style={{ color: textColor }}>
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full font-medium text-xs"
                      style={{ backgroundColor: colors.card || '#1E293B', color: textColor }}
                    >
                      {user.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <span className="max-w-[120px] truncate text-xs font-medium">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </div>

                  <button
                    type="button"
                    id="nav-logout-btn"
                    onClick={() => logout()}
                    title="Sign Out"
                    className="rounded-lg p-1.5 transition hover:opacity-80"
                    style={{ color: mutedText }}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              {showLogin && (
                <button
                  type="button"
                  id="nav-signin-btn"
                  onClick={() => openAuthModal('login')}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
                  style={{ color: textColor }}
                >
                  Sign In
                </button>
              )}
              {showSignup && (
                <button
                  type="button"
                  id="nav-signup-btn"
                  onClick={() => openAuthModal('signup')}
                  className="rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-sm transition hover:opacity-90"
                  style={{
                    backgroundColor: buttonColor,
                    color: buttonTextColor,
                  }}
                >
                  Get Started
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        {showMenu && mobileMenuEnabled && (
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 transition hover:opacity-80"
              style={{ color: textColor }}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && showMenu && mobileMenuEnabled && (
        <div
          className="border-b px-4 py-4 md:hidden shadow-xl"
          style={{
            backgroundColor: colors.surface || colors.card || '#0F172A',
            borderColor: borderColor,
          }}
        >
          {user ? (
            <div className="space-y-3">
              <div
                className="flex items-center gap-3 pb-2 border-b"
                style={{ borderColor: borderColor }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full font-medium text-sm"
                  style={{ backgroundColor: colors.card, color: textColor }}
                >
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    user.displayName?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: textColor }}>
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-xs truncate" style={{ color: mutedText }}>
                    {user.email}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    color: primaryColor,
                  }}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:opacity-80"
                style={{ color: mutedText }}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            mobileLoginEnabled && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openAuthModal('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-lg border py-2 text-sm font-medium transition hover:opacity-80"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openAuthModal('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-lg py-2 text-sm font-semibold shadow"
                  style={{
                    backgroundColor: buttonColor,
                    color: buttonTextColor,
                  }}
                >
                  Sign Up
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* DYNAMIC SECTION NAVIGATION TABS */}
      {showSections && (
        <nav
          id="dynamic-sections-nav"
          aria-label="Video Sections Navigation"
          className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-t scrollbar-none sm:px-6 lg:px-8"
          style={{
            borderColor: `${borderColor}80`,
            backgroundColor: `${headerBg}99`,
          }}
        >
          {/* System Generated ALL Tab - Always First */}
          <button
            type="button"
            id="nav-section-tab-all"
            onClick={() => handleSectionClick('all')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              selectedSectionSlug === 'all'
                ? 'shadow-md scale-105'
                : 'hover:opacity-90'
            }`}
            style={
              selectedSectionSlug === 'all'
                ? {
                    backgroundColor: colors.activeNav || primaryColor,
                    color: buttonTextColor,
                    boxShadow: `0 2px 10px ${colors.activeNav || primaryColor}40`,
                  }
                : {
                    backgroundColor: `${colors.surface || colors.card || '#1E293B'}cc`,
                    color: mutedText,
                  }
            }
          >
            <Layers className="h-3.5 w-3.5" />
            <span>ALL</span>
          </button>

          {/* Dynamically Loaded Admin Created Sections */}
          {sections.map((sec) => {
            const isActive = selectedSectionSlug === sec.slug || selectedSectionSlug === sec.id;
            const secColor = sec.color || primaryColor;
            return (
              <button
                key={sec.id}
                id={`nav-section-tab-${sec.slug}`}
                type="button"
                onClick={() => handleSectionClick(sec.slug)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'shadow-md scale-105'
                    : 'hover:opacity-90'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: secColor,
                        color: buttonTextColor,
                        boxShadow: `0 2px 10px ${secColor}40`,
                      }
                    : {
                        backgroundColor: `${colors.surface || colors.card || '#1E293B'}cc`,
                        color: mutedText,
                      }
                }
              >
                <SectionIcon name={sec.icon} className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wide">{sec.name}</span>
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
