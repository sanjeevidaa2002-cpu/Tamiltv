'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  SiteSettings,
  SiteThemeSettings,
  ThemePreset,
  ThemeColors,
  HeaderSettings,
  FooterSettings,
  LoadingScreenSettings,
} from '@/lib/types';
import { getSiteSettings, updateSiteSettings, DEFAULT_SETTINGS } from '@/lib/videoService';
import { PREDEFINED_THEMES, getThemePresetById, applyThemeColorsToCss } from '@/lib/themePresets';

interface ThemeContextType {
  settings: SiteSettings;
  colors: ThemeColors;
  loading: boolean;
  activeThemeId: string;
  allThemes: ThemePreset[];
  headerSettings: HeaderSettings;
  footerSettings: FooterSettings;
  loadingSettings: LoadingScreenSettings;
  refreshSettings: () => Promise<void>;
  saveSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  applyPresetTheme: (theme: ThemePreset) => Promise<void>;
  saveCustomTheme: (customTheme: ThemePreset) => Promise<void>;
  deleteCustomTheme: (themeId: string) => Promise<void>;
  updateHeaderSettings: (header: Partial<HeaderSettings>) => Promise<void>;
  updateFooterSettings: (footer: Partial<FooterSettings>) => Promise<void>;
  updateLoadingSettings: (loading: Partial<LoadingScreenSettings>) => Promise<void>;
  setLivePreviewColors: (colors: Partial<ThemeColors> | null) => void;
  setLivePreviewHeader: (header: Partial<HeaderSettings> | null) => void;
  setLivePreviewFooter: (footer: Partial<FooterSettings> | null) => void;
  resetThemeToDefault: () => Promise<void>;
  resetAllAppearance: () => Promise<void>;
  isCustomizing: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [previewColors, setPreviewColors] = useState<ThemeColors | null>(null);
  const [previewHeader, setPreviewHeader] = useState<HeaderSettings | null>(null);
  const [previewFooter, setPreviewFooter] = useState<FooterSettings | null>(null);

  // All themes list (predefined + custom)
  const allThemes = useMemo(() => {
    const customs = settings.customThemes || [];
    return [...PREDEFINED_THEMES, ...customs];
  }, [settings.customThemes]);

  const activeThemeId = settings.activeThemeId || settings.theme?.activeThemeId || 'midnight-blue';

  const currentThemePreset = useMemo(() => {
    return allThemes.find((t) => t.id === activeThemeId) || PREDEFINED_THEMES[0];
  }, [allThemes, activeThemeId]);

  // Derived effective colors
  const colors: ThemeColors = useMemo(() => {
    if (previewColors) return previewColors;

    const t = currentThemePreset?.colors;
    const st = settings.theme;

    return {
      primary: st?.primaryColor || settings.primaryColor || t?.primary || '#3B82F6',
      secondary: st?.secondaryColor || settings.secondaryColor || t?.secondary || '#60A5FA',
      accent: st?.accentColor || settings.accentColor || t?.accent || '#93C5FD',
      background: st?.backgroundColor || settings.backgroundColor || t?.background || '#0B1120',
      surface: st?.surfaceColor || settings.surfaceColor || t?.surface || '#0F172A',
      card: st?.cardColor || settings.cardColor || t?.card || '#1E293B',
      header: st?.headerColor || settings.headerColor || t?.header || '#0B1120',
      footer: st?.footerColor || settings.footerColor || t?.footer || '#070C18',
      text: st?.textColor || settings.textColor || t?.text || '#F8FAFC',
      mutedText: st?.mutedTextColor || settings.mutedTextColor || t?.mutedText || '#94A3B8',
      border: st?.borderColor || settings.borderColor || t?.border || '#1E293B',
      button: st?.buttonColor || settings.buttonColor || t?.button || '#2563EB',
      buttonText: st?.buttonTextColor || settings.buttonTextColor || t?.buttonText || '#FFFFFF',
      activeNav: st?.activeNavColor || settings.activeNavColor || t?.activeNav || '#3B82F6',
      hover: st?.hoverColor || settings.hoverColor || t?.hover || '#1D4ED8',
    };
  }, [settings, currentThemePreset, previewColors]);

  // Header & Footer effective settings
  const headerSettings: HeaderSettings = useMemo(() => {
    if (previewHeader) return { ...(settings.headerSettings || DEFAULT_SETTINGS.headerSettings!), ...previewHeader };
    return settings.headerSettings || DEFAULT_SETTINGS.headerSettings!;
  }, [settings.headerSettings, previewHeader]);

  const footerSettings: FooterSettings = useMemo(() => {
    if (previewFooter) return { ...(settings.footerSettings || DEFAULT_SETTINGS.footerSettings!), ...previewFooter };
    return settings.footerSettings || DEFAULT_SETTINGS.footerSettings!;
  }, [settings.footerSettings, previewFooter]);

  const loadingSettings: LoadingScreenSettings = useMemo(() => {
    return settings.loadingSettings || DEFAULT_SETTINGS.loadingSettings!;
  }, [settings.loadingSettings]);

  // Apply CSS variables on DOM
  useEffect(() => {
    applyThemeColorsToCss(colors);
  }, [colors]);

  // Sync title and favicon
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const titleText = settings.browserTitle || (settings.siteName ? `${settings.siteName} - Watch Videos Online` : 'VideoStream');
    document.title = titleText;

    if (settings.favicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = `${settings.favicon}${settings.favicon.includes('?') ? '&' : '?'}v=${Date.now()}`;
    }
  }, [settings.siteName, settings.browserTitle, settings.favicon]);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await getSiteSettings();
      setSettings(data);
      setPreviewColors(null);
      setPreviewHeader(null);
      setPreviewFooter(null);
    } catch (err) {
      console.warn('Could not load site settings in ThemeProvider:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getSiteSettings()
      .then((data) => {
        if (isMounted) {
          setSettings(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Could not load site settings in ThemeProvider:', err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveSettings = async (newSettings: Partial<SiteSettings>) => {
    const merged: SiteSettings = {
      ...settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    setSettings(merged);
    setPreviewColors(null);
    setPreviewHeader(null);
    setPreviewFooter(null);
    await updateSiteSettings(merged);
  };

  const applyPresetTheme = async (theme: ThemePreset) => {
    const themeSettings: SiteThemeSettings = {
      mode: theme.category.toLowerCase() === 'light' ? 'light' : 'dark',
      activeThemeId: theme.id,
      primaryColor: theme.colors.primary,
      secondaryColor: theme.colors.secondary,
      accentColor: theme.colors.accent,
      backgroundColor: theme.colors.background,
      surfaceColor: theme.colors.surface,
      cardColor: theme.colors.card,
      headerColor: theme.colors.header,
      footerColor: theme.colors.footer,
      textColor: theme.colors.text,
      mutedTextColor: theme.colors.mutedText,
      borderColor: theme.colors.border,
      buttonColor: theme.colors.button,
      buttonTextColor: theme.colors.buttonText,
      activeNavColor: theme.colors.activeNav,
      hoverColor: theme.colors.hover,
    };

    await saveSettings({
      activeThemeId: theme.id,
      primaryColor: theme.colors.primary,
      secondaryColor: theme.colors.secondary,
      accentColor: theme.colors.accent,
      backgroundColor: theme.colors.background,
      surfaceColor: theme.colors.surface,
      cardColor: theme.colors.card,
      headerColor: theme.colors.header,
      footerColor: theme.colors.footer,
      textColor: theme.colors.text,
      mutedTextColor: theme.colors.mutedText,
      borderColor: theme.colors.border,
      buttonColor: theme.colors.button,
      buttonTextColor: theme.colors.buttonText,
      activeNavColor: theme.colors.activeNav,
      hoverColor: theme.colors.hover,
      theme: themeSettings,
    });
  };

  const saveCustomTheme = async (customTheme: ThemePreset) => {
    const existing = settings.customThemes || [];
    const filtered = existing.filter((t) => t.id !== customTheme.id);
    const updatedCustoms = [...filtered, customTheme];

    await saveSettings({
      customThemes: updatedCustoms,
      activeThemeId: customTheme.id,
      primaryColor: customTheme.colors.primary,
      secondaryColor: customTheme.colors.secondary,
      accentColor: customTheme.colors.accent,
      backgroundColor: customTheme.colors.background,
      surfaceColor: customTheme.colors.surface,
      cardColor: customTheme.colors.card,
      headerColor: customTheme.colors.header,
      footerColor: customTheme.colors.footer,
      textColor: customTheme.colors.text,
      mutedTextColor: customTheme.colors.mutedText,
      borderColor: customTheme.colors.border,
      buttonColor: customTheme.colors.button,
      buttonTextColor: customTheme.colors.buttonText,
      activeNavColor: customTheme.colors.activeNav,
      hoverColor: customTheme.colors.hover,
    });
  };

  const deleteCustomTheme = async (themeId: string) => {
    const existing = settings.customThemes || [];
    const updatedCustoms = existing.filter((t) => t.id !== themeId);
    let newActiveId = activeThemeId;
    if (activeThemeId === themeId) {
      newActiveId = 'midnight-blue';
    }
    await saveSettings({
      customThemes: updatedCustoms,
      activeThemeId: newActiveId,
    });
  };

  const updateHeaderSettings = async (header: Partial<HeaderSettings>) => {
    const merged = { ...(settings.headerSettings || DEFAULT_SETTINGS.headerSettings!), ...header };
    await saveSettings({ headerSettings: merged });
  };

  const updateFooterSettings = async (footer: Partial<FooterSettings>) => {
    const merged = { ...(settings.footerSettings || DEFAULT_SETTINGS.footerSettings!), ...footer };
    await saveSettings({ footerSettings: merged });
  };

  const updateLoadingSettings = async (loadingPart: Partial<LoadingScreenSettings>) => {
    const merged = { ...(settings.loadingSettings || DEFAULT_SETTINGS.loadingSettings!), ...loadingPart };
    await saveSettings({ loadingSettings: merged });
  };

  const setLivePreviewColors = (partial: Partial<ThemeColors> | null) => {
    if (!partial) {
      setPreviewColors(null);
      return;
    }
    setPreviewColors((prev) => {
      const base = prev || colors;
      return {
        ...base,
        ...partial,
      };
    });
  };

  const setLivePreviewHeader = (header: Partial<HeaderSettings> | null) => {
    if (!header) {
      setPreviewHeader(null);
      return;
    }
    setPreviewHeader((prev) => {
      const base = prev || headerSettings;
      return { ...base, ...header };
    });
  };

  const setLivePreviewFooter = (footer: Partial<FooterSettings> | null) => {
    if (!footer) {
      setPreviewFooter(null);
      return;
    }
    setPreviewFooter((prev) => {
      const base = prev || footerSettings;
      return { ...base, ...footer };
    });
  };

  const resetThemeToDefault = async () => {
    const def = PREDEFINED_THEMES[0];
    await applyPresetTheme(def);
  };

  const resetAllAppearance = async () => {
    await saveSettings({
      siteName: DEFAULT_SETTINGS.siteName,
      siteShortName: DEFAULT_SETTINGS.siteShortName,
      browserTitle: DEFAULT_SETTINGS.browserTitle,
      siteDescription: DEFAULT_SETTINGS.siteDescription,
      siteLogo: DEFAULT_SETTINGS.siteLogo,
      mobileLogo: DEFAULT_SETTINGS.mobileLogo,
      adminLogo: DEFAULT_SETTINGS.adminLogo,
      favicon: DEFAULT_SETTINGS.favicon,
      activeThemeId: DEFAULT_SETTINGS.activeThemeId,
      primaryColor: DEFAULT_SETTINGS.primaryColor,
      secondaryColor: DEFAULT_SETTINGS.secondaryColor,
      accentColor: DEFAULT_SETTINGS.accentColor,
      backgroundColor: DEFAULT_SETTINGS.backgroundColor,
      surfaceColor: DEFAULT_SETTINGS.surfaceColor,
      cardColor: DEFAULT_SETTINGS.cardColor,
      headerColor: DEFAULT_SETTINGS.headerColor,
      footerColor: DEFAULT_SETTINGS.footerColor,
      textColor: DEFAULT_SETTINGS.textColor,
      mutedTextColor: DEFAULT_SETTINGS.mutedTextColor,
      borderColor: DEFAULT_SETTINGS.borderColor,
      buttonColor: DEFAULT_SETTINGS.buttonColor,
      buttonTextColor: DEFAULT_SETTINGS.buttonTextColor,
      activeNavColor: DEFAULT_SETTINGS.activeNavColor,
      hoverColor: DEFAULT_SETTINGS.hoverColor,
      headerSettings: DEFAULT_SETTINGS.headerSettings,
      footerSettings: DEFAULT_SETTINGS.footerSettings,
      loadingSettings: DEFAULT_SETTINGS.loadingSettings,
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        settings,
        colors,
        loading,
        activeThemeId,
        allThemes,
        headerSettings,
        footerSettings,
        loadingSettings,
        refreshSettings,
        saveSettings,
        applyPresetTheme,
        saveCustomTheme,
        deleteCustomTheme,
        updateHeaderSettings,
        updateFooterSettings,
        updateLoadingSettings,
        setLivePreviewColors,
        setLivePreviewHeader,
        setLivePreviewFooter,
        resetThemeToDefault,
        resetAllAppearance,
        isCustomizing: previewColors !== null || previewHeader !== null || previewFooter !== null,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
