'use client';

import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import {
  ThemePreset,
  ThemeColors,
  HeaderSettings,
  FooterSettings,
  LoadingScreenSettings,
} from '@/lib/types';
import { PREDEFINED_THEMES } from '@/lib/themePresets';
import { DEFAULT_SETTINGS } from '@/lib/videoService';
import { SiteLoadingScreen } from '@/components/SiteLoadingScreen';
import {
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  CheckCircle2,
  Play,
  Eye,
  Sliders,
  Image as ImageIcon,
  Loader2,
  Layout,
  Layers,
  Smartphone,
  Monitor,
  Tablet,
  Plus,
  Trash2,
  Search,
  Check,
  Globe,
  UploadCloud,
  FileCode,
  ShieldCheck,
  Mail,
  Share2,
} from 'lucide-react';

interface AdminBrandingManagerProps {
  showToast: (text: string, type?: 'success' | 'error') => void;
}

type SubTab = 'themes' | 'custom' | 'logos' | 'loading' | 'header' | 'footer' | 'preview';

export function AdminBrandingManager({ showToast }: AdminBrandingManagerProps) {
  const {
    settings,
    colors,
    activeThemeId,
    allThemes,
    headerSettings,
    footerSettings,
    loadingSettings,
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
    isCustomizing,
  } = useTheme();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('themes');
  const [isSaving, setIsSaving] = useState(false);

  // Themes Search & Filter state
  const [themeSearch, setThemeSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Custom Theme Builder State
  const [customThemeName, setCustomThemeName] = useState('My Custom Theme');
  const [customThemeCategory, setCustomThemeCategory] = useState<ThemePreset['category']>('Dark');
  const [customColors, setCustomColors] = useState<ThemeColors>({
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    card: colors.card,
    header: colors.header,
    footer: colors.footer,
    text: colors.text,
    mutedText: colors.mutedText,
    border: colors.border,
    button: colors.button,
    buttonText: colors.buttonText,
    activeNav: colors.activeNav,
    hover: colors.hover,
  });

  // Logos & Branding State
  const [siteName, setSiteName] = useState(settings.siteName || 'VideoStream');
  const [siteShortName, setSiteShortName] = useState(settings.siteShortName || 'VS');
  const [browserTitle, setBrowserTitle] = useState(settings.browserTitle || 'VideoStream - Premium Video Streaming');
  const [siteDescription, setSiteDescription] = useState(settings.siteDescription || 'Next-Generation Full-Stack Video Streaming & Dynamic Content Platform');
  const [siteLogo, setSiteLogo] = useState(settings.siteLogo || '');
  const [mobileLogo, setMobileLogo] = useState(settings.mobileLogo || '');
  const [adminLogo, setAdminLogo] = useState(settings.adminLogo || '');
  const [favicon, setFavicon] = useState(settings.favicon || '');

  // Loading Screen State
  const [localLoading, setLocalLoading] = useState<LoadingScreenSettings>(loadingSettings);
  const [isTestingLoading, setIsTestingLoading] = useState(false);

  // Header State
  const [localHeader, setLocalHeader] = useState<HeaderSettings>(headerSettings);

  // Footer State
  const [localFooter, setLocalFooter] = useState<FooterSettings>(footerSettings);
  const [newCustomLinkTitle, setNewCustomLinkTitle] = useState('');
  const [newCustomLinkUrl, setNewCustomLinkUrl] = useState('');

  // Live Preview viewport
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Filter themes
  const themeCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('all');
    allThemes.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [allThemes]);

  const filteredThemes = useMemo(() => {
    return allThemes.filter((theme) => {
      const desc = theme.description || theme.name;
      const matchesSearch =
        theme.name.toLowerCase().includes(themeSearch.toLowerCase()) ||
        desc.toLowerCase().includes(themeSearch.toLowerCase()) ||
        theme.category.toLowerCase().includes(themeSearch.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || theme.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [allThemes, themeSearch, selectedCategory]);

  // Handle color change in Custom Theme Builder
  const handleCustomColorChange = (key: keyof ThemeColors, val: string) => {
    const updated = { ...customColors, [key]: val };
    setCustomColors(updated);
    setLivePreviewColors({ [key]: val });
  };

  const handleApplyPreset = async (theme: ThemePreset) => {
    try {
      await applyPresetTheme(theme);
      setCustomColors(theme.colors);
      showToast(`Applied "${theme.name}" theme successfully`);
    } catch (err) {
      showToast('Failed to apply theme', 'error');
    }
  };

  const handleSaveCustomTheme = async () => {
    if (!customThemeName.trim()) {
      showToast('Please enter a name for your custom theme', 'error');
      return;
    }
    const themeId = `custom-${customThemeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const newTheme: ThemePreset = {
      id: themeId,
      name: customThemeName.trim(),
      slug: themeId,
      description: 'User created custom color palette',
      category: customThemeCategory,
      isCustom: true,
      colors: customColors,
    };

    try {
      await saveCustomTheme(newTheme);
      showToast(`Saved and applied "${newTheme.name}"`);
    } catch (err) {
      showToast('Failed to save custom theme', 'error');
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm('Are you sure you want to delete this custom theme?')) return;
    try {
      await deleteCustomTheme(themeId);
      showToast('Custom theme deleted');
    } catch (err) {
      showToast('Failed to delete theme', 'error');
    }
  };

  // Logos Save
  const handleSaveLogos = async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        siteName: siteName.trim() || 'VideoStream',
        siteShortName: siteShortName.trim() || 'VS',
        browserTitle: browserTitle.trim() || 'VideoStream',
        siteDescription: siteDescription.trim(),
        siteLogo: siteLogo.trim(),
        mobileLogo: mobileLogo.trim(),
        adminLogo: adminLogo.trim(),
        favicon: favicon.trim(),
      });
      showToast('Branding and logos updated successfully');
    } catch (err) {
      showToast('Failed to save branding', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading Screen Save
  const handleSaveLoading = async () => {
    setIsSaving(true);
    try {
      await updateLoadingSettings(localLoading);
      showToast('Loading screen settings updated');
    } catch (err) {
      showToast('Failed to save loading settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Header Save
  const handleSaveHeader = async () => {
    setIsSaving(true);
    try {
      await updateHeaderSettings(localHeader);
      setLivePreviewHeader(null);
      showToast('Header layout settings updated');
    } catch (err) {
      showToast('Failed to save header settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Footer Save
  const handleSaveFooter = async () => {
    setIsSaving(true);
    try {
      await updateFooterSettings(localFooter);
      setLivePreviewFooter(null);
      showToast('Footer layout settings updated');
    } catch (err) {
      showToast('Failed to save footer settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Custom Links in Footer
  const handleAddCustomLink = () => {
    if (!newCustomLinkTitle.trim() || !newCustomLinkUrl.trim()) {
      showToast('Please enter both title and URL for the link', 'error');
      return;
    }
    const current = localFooter.customLinks || [];
    const updated = [...current, { title: newCustomLinkTitle.trim(), url: newCustomLinkUrl.trim() }];
    setLocalFooter({ ...localFooter, customLinks: updated });
    setNewCustomLinkTitle('');
    setNewCustomLinkUrl('');
  };

  const handleRemoveCustomLink = (index: number) => {
    const current = localFooter.customLinks || [];
    const updated = current.filter((_, idx) => idx !== index);
    setLocalFooter({ ...localFooter, customLinks: updated });
  };

  const handleResetAppearance = async () => {
    if (!confirm('Are you sure you want to reset all themes, branding, header, and footer to default values?')) return;
    try {
      await resetAllAppearance();
      setCustomColors({
        primary: DEFAULT_SETTINGS.primaryColor!,
        secondary: DEFAULT_SETTINGS.secondaryColor!,
        accent: DEFAULT_SETTINGS.accentColor!,
        background: DEFAULT_SETTINGS.backgroundColor!,
        surface: DEFAULT_SETTINGS.surfaceColor!,
        card: DEFAULT_SETTINGS.cardColor!,
        header: DEFAULT_SETTINGS.headerColor!,
        footer: DEFAULT_SETTINGS.footerColor!,
        text: DEFAULT_SETTINGS.textColor!,
        mutedText: DEFAULT_SETTINGS.mutedTextColor!,
        border: DEFAULT_SETTINGS.borderColor!,
        button: DEFAULT_SETTINGS.buttonColor!,
        buttonText: DEFAULT_SETTINGS.buttonTextColor!,
        activeNav: DEFAULT_SETTINGS.activeNavColor!,
        hover: DEFAULT_SETTINGS.hoverColor!,
      });
      setSiteName(DEFAULT_SETTINGS.siteName);
      setSiteShortName(DEFAULT_SETTINGS.siteShortName || 'VS');
      setBrowserTitle(DEFAULT_SETTINGS.browserTitle || 'VideoStream');
      setSiteDescription(DEFAULT_SETTINGS.siteDescription || '');
      setSiteLogo('');
      setMobileLogo('');
      setAdminLogo('');
      setFavicon('');
      setLocalLoading(DEFAULT_SETTINGS.loadingSettings!);
      setLocalHeader(DEFAULT_SETTINGS.headerSettings!);
      setLocalFooter(DEFAULT_SETTINGS.footerSettings!);
      showToast('Reset all appearance & layout settings to default');
    } catch (err) {
      showToast('Failed to reset appearance', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Loading Screen Overlay if active */}
      {isTestingLoading && <SiteLoadingScreen forceShow={true} minDurationMs={3000} />}

      {/* Main Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-lg">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Appearance & Branding Studio
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Complete customization suite: 100+ color themes, custom theme builder, dynamic logos, loading screen, and header/footer controls.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetAppearance}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All to Default</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-900/40 p-1.5 gap-1.5 rounded-xl scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('themes')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeSubTab === 'themes'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Themes ({allThemes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('custom')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeSubTab === 'custom'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Custom Theme Builder</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('logos')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeSubTab === 'logos'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>Logos & Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('loading')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeSubTab === 'loading'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <Loader2 className="h-4 w-4" />
          <span>Loading Screen</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('header')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeSubTab === 'header'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <Layout className="h-4 w-4" />
          <span>Header Layout</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('footer')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeSubTab === 'footer'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Footer Layout</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('preview')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeSubTab === 'preview'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <Eye className="h-4 w-4" />
          <span>Live Site Preview</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* SUB-TAB 1: 100 PREDEFINED THEMES CATALOG */}
      {/* ============================================================ */}
      {activeSubTab === 'themes' && (
        <div className="space-y-6">
          {/* Controls Bar: Search & Category Filter */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={themeSearch}
                onChange={(e) => setThemeSearch(e.target.value)}
                placeholder="Search 100+ themes by name, color, or vibe (e.g. Netflix, Cyberpunk, Gold, Neon)..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
              {themeSearch && (
                <button
                  type="button"
                  onClick={() => setThemeSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-xs font-semibold text-zinc-400 whitespace-nowrap">Category:</span>
              <div className="flex gap-1.5">
                {themeCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-zinc-200 text-zinc-900 font-bold'
                        : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Theme Summary Banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl shadow"
                style={{ backgroundColor: colors.primary, color: colors.buttonText }}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Currently Active Theme:</span>
                  <span className="text-sm font-bold text-white">
                    {allThemes.find((t) => t.id === activeThemeId)?.name || 'Default Theme'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Applied across all user-facing pages, navbar, footers, video cards, buttons, and badges.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const current = allThemes.find((t) => t.id === activeThemeId);
                  if (current) {
                    setCustomColors(current.colors);
                    setCustomThemeName(`${current.name} (Copy)`);
                    setActiveSubTab('custom');
                  }
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
              >
                Customize Active Theme
              </button>
            </div>
          </div>

          {/* Themes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredThemes.map((theme) => {
              const isActive = activeThemeId === theme.id;
              const tc = theme.colors;

              return (
                <div
                  key={theme.id}
                  className={`group relative rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                    isActive
                      ? 'border-emerald-500 bg-zinc-900/90 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80'
                  }`}
                >
                  {/* Theme Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-white text-sm line-clamp-1">{theme.name}</h3>
                          {theme.isCustom && (
                            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400">
                              Custom
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                          {theme.category}
                        </span>
                      </div>

                      {isActive ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3 h-8">
                      {theme.description}
                    </p>

                    {/* Color Swatches Strip */}
                    <div
                      className="p-3 rounded-xl mb-3 border shadow-inner transition-transform group-hover:scale-[1.02]"
                      style={{
                        backgroundColor: tc.background,
                        borderColor: tc.border || '#333',
                      }}
                    >
                      {/* Mini Mockup UI preview */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: tc.border || '#444' }}>
                        <div className="flex items-center gap-1">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tc.primary }} />
                          <div className="h-1.5 w-12 rounded" style={{ backgroundColor: tc.text }} />
                        </div>
                        <div className="h-3.5 px-1.5 rounded text-[8px] font-bold flex items-center" style={{ backgroundColor: tc.button, color: tc.buttonText }}>
                          Play
                        </div>
                      </div>

                      {/* Swatch dots */}
                      <div className="grid grid-cols-6 gap-1">
                        <div className="h-5 rounded" style={{ backgroundColor: tc.primary }} title={`Primary: ${tc.primary}`} />
                        <div className="h-5 rounded" style={{ backgroundColor: tc.secondary }} title={`Secondary: ${tc.secondary}`} />
                        <div className="h-5 rounded" style={{ backgroundColor: tc.accent }} title={`Accent: ${tc.accent}`} />
                        <div className="h-5 rounded" style={{ backgroundColor: tc.card }} title={`Card: ${tc.card}`} />
                        <div className="h-5 rounded" style={{ backgroundColor: tc.header }} title={`Header: ${tc.header}`} />
                        <div className="h-5 rounded" style={{ backgroundColor: tc.footer }} title={`Footer: ${tc.footer}`} />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(theme)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isActive
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-zinc-800 text-zinc-200 hover:bg-red-600 hover:text-white'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Apply Theme</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomColors(theme.colors);
                        setCustomThemeName(`${theme.name} (Custom)`);
                        setCustomThemeCategory(theme.category);
                        setActiveSubTab('custom');
                      }}
                      title="Edit or clone in Custom Builder"
                      className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                    </button>

                    {theme.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTheme(theme.id)}
                        title="Delete custom preset"
                        className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 2: CUSTOM THEME BUILDER */}
      {/* ============================================================ */}
      {activeSubTab === 'custom' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Color Pickers (Left 2 cols) */}
            <div className="lg:col-span-2 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <h3 className="font-bold text-white text-base">Fine-Tuned Color Tokens</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Customize every UI element color token. All changes are reflected live across the preview and site.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customThemeName}
                    onChange={(e) => setCustomThemeName(e.target.value)}
                    placeholder="Theme Name..."
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                  <select
                    value={customThemeCategory}
                    onChange={(e) => setCustomThemeCategory(e.target.value as ThemePreset['category'])}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
                  >
                    <option value="Dark">Dark</option>
                    <option value="Light">Light</option>
                    <option value="Neon">Neon</option>
                    <option value="Cinema">Cinema</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Premium">Premium</option>
                    <option value="Minimal">Minimal</option>
                    <option value="Colorful">Colorful</option>
                    <option value="Retro">Retro</option>
                    <option value="Futuristic">Futuristic</option>
                  </select>
                </div>
              </div>

              {/* Color Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'primary', label: 'Primary Brand Color', desc: 'Main accent, buttons, badges' },
                  { key: 'secondary', label: 'Secondary Color', desc: 'Secondary highlights & chips' },
                  { key: 'accent', label: 'Accent Color', desc: 'Badges, ratings & highlights' },
                  { key: 'background', label: 'Background Color', desc: 'Main page body canvas' },
                  { key: 'surface', label: 'Surface Color', desc: 'Containers, dropdowns, panels' },
                  { key: 'card', label: 'Card Color', desc: 'Video cards, grid boxes' },
                  { key: 'header', label: 'Header Color', desc: 'Top navigation bar background' },
                  { key: 'footer', label: 'Footer Color', desc: 'Bottom footer background' },
                  { key: 'text', label: 'Text Color', desc: 'Primary typography' },
                  { key: 'mutedText', label: 'Muted Text Color', desc: 'Subtitles, dates, icons' },
                  { key: 'border', label: 'Border Color', desc: 'Dividers & container borders' },
                  { key: 'button', label: 'Button Color', desc: 'Primary interactive button bg' },
                  { key: 'buttonText', label: 'Button Text Color', desc: 'Text inside primary button' },
                  { key: 'activeNav', label: 'Active Nav Tab Color', desc: 'Selected section tab bg' },
                  { key: 'hover', label: 'Hover Color', desc: 'Hover states for cards & links' },
                ].map((item) => {
                  const colorKey = item.key as keyof ThemeColors;
                  const val = customColors[colorKey] || '#FFFFFF';

                  return (
                    <div
                      key={item.key}
                      className="rounded-xl border border-zinc-800/90 bg-zinc-950/60 p-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-zinc-200">{item.label}</label>
                          <div
                            className="h-4 w-4 rounded-full border border-zinc-700"
                            style={{ backgroundColor: val }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 mb-2">{item.desc}</p>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={val}
                          onChange={(e) => handleCustomColorChange(colorKey, e.target.value)}
                          className="h-8 w-10 rounded cursor-pointer border border-zinc-800 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleCustomColorChange(colorKey, e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-mono text-zinc-300 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setLivePreviewColors(null);
                    setCustomColors(colors);
                    showToast('Reset custom preview changes');
                  }}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Discard Changes
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCustomTheme}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 shadow-md shadow-red-600/20"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save & Apply Custom Theme</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Mini Preview Card (Right col) */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h3 className="font-bold text-white text-sm mb-1">Live Component Preview</h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Simulated preview of how your theme colors interact with components.
                </p>

                {/* Simulated Canvas */}
                <div
                  className="rounded-2xl p-4 border space-y-4 shadow-xl overflow-hidden transition-colors"
                  style={{
                    backgroundColor: customColors.background,
                    borderColor: customColors.border,
                    color: customColors.text,
                  }}
                >
                  {/* Simulated Navbar */}
                  <div
                    className="flex items-center justify-between p-3 rounded-xl border"
                    style={{
                      backgroundColor: customColors.header,
                      borderColor: customColors.border,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ backgroundColor: customColors.primary, color: customColors.buttonText }}
                      >
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      </div>
                      <span className="font-bold text-xs" style={{ color: customColors.text }}>
                        {siteName}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg px-2.5 py-1 text-[10px] font-bold shadow"
                      style={{ backgroundColor: customColors.button, color: customColors.buttonText }}
                    >
                      Sign In
                    </button>
                  </div>

                  {/* Simulated Section Tabs */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: customColors.activeNav, color: customColors.buttonText }}
                    >
                      ALL
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-medium border"
                      style={{
                        backgroundColor: customColors.surface,
                        borderColor: customColors.border,
                        color: customColors.mutedText,
                      }}
                    >
                      MOVIES
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-medium border"
                      style={{
                        backgroundColor: customColors.surface,
                        borderColor: customColors.border,
                        color: customColors.mutedText,
                      }}
                    >
                      SPORTS
                    </span>
                  </div>

                  {/* Simulated Video Card */}
                  <div
                    className="rounded-xl border p-3 space-y-2"
                    style={{
                      backgroundColor: customColors.card,
                      borderColor: customColors.border,
                    }}
                  >
                    <div
                      className="relative aspect-video w-full rounded-lg flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: customColors.surface }}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
                        style={{ backgroundColor: customColors.primary, color: customColors.buttonText }}
                      >
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </div>
                      <span
                        className="absolute top-2 right-2 rounded px-1.5 py-0.5 text-[9px] font-bold"
                        style={{ backgroundColor: customColors.accent, color: '#000000' }}
                      >
                        HD 4K
                      </span>
                    </div>

                    <h4 className="font-bold text-xs line-clamp-1" style={{ color: customColors.text }}>
                      Sample Action Trailer 2026
                    </h4>
                    <p className="text-[10px] line-clamp-1" style={{ color: customColors.mutedText }}>
                      1.2M views • 2 hours ago
                    </p>
                  </div>

                  {/* Simulated Footer */}
                  <div
                    className="p-3 rounded-xl border text-center text-[10px]"
                    style={{
                      backgroundColor: customColors.footer,
                      borderColor: customColors.border,
                      color: customColors.mutedText,
                    }}
                  >
                    &copy; 2026 {siteName}. All rights reserved.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 3: LOGOS & BRANDING */}
      {/* ============================================================ */}
      {activeSubTab === 'logos' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveLogos();
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity Text Info */}
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <h3 className="font-bold text-white text-sm">Site Identity & Meta</h3>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Site Full Name</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="e.g. VideoStream, StreamVerse"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Displayed on navbar, footer, and metadata.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Site Short Name / Mobile Title</label>
                <input
                  type="text"
                  value={siteShortName}
                  onChange={(e) => setSiteShortName(e.target.value)}
                  placeholder="e.g. VS, Stream"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Used on small mobile screens to prevent overflow.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Browser Tab Title</label>
                <input
                  type="text"
                  value={browserTitle}
                  onChange={(e) => setBrowserTitle(e.target.value)}
                  placeholder="e.g. VideoStream - Watch Unlimited Movies & Videos"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Shown in browser tab title and search engine cards.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Site Tagline / Description</label>
                <textarea
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your streaming platform..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Logo Assets & Favicons */}
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <h3 className="font-bold text-white text-sm">Logo Assets & Icons</h3>

              {/* Main Site Logo */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Main Site Logo URL (Desktop)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={siteLogo}
                    onChange={(e) => setSiteLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                  {siteLogo && (
                    <button
                      type="button"
                      onClick={() => setSiteLogo('')}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {/* Preview Box */}
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950 p-2.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Preview:</span>
                  {siteLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={siteLogo} alt="Logo preview" className="h-8 max-w-[140px] object-contain" />
                  ) : (
                    <span className="text-[10px] text-zinc-600">Default SVG Brand Icon active</span>
                  )}
                </div>
              </div>

              {/* Mobile Logo */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Mobile Logo URL (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={mobileLogo}
                    onChange={(e) => setMobileLogo(e.target.value)}
                    placeholder="https://example.com/mobile-logo.png"
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                  {mobileLogo && (
                    <button
                      type="button"
                      onClick={() => setMobileLogo('')}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {mobileLogo && (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950 p-2.5">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Preview:</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mobileLogo} alt="Mobile logo" className="h-7 max-w-[100px] object-contain" />
                  </div>
                )}
              </div>

              {/* Favicon */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Browser Favicon URL (.ico / .png)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={favicon}
                    onChange={(e) => setFavicon(e.target.value)}
                    placeholder="https://example.com/favicon.png"
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                  {favicon && (
                    <button
                      type="button"
                      onClick={() => setFavicon('')}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {favicon && (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950 p-2.5">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Preview:</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={favicon} alt="Favicon" className="h-5 w-5 object-contain rounded" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Branding & Logos'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 4: LOADING SCREEN CUSTOMIZATION */}
      {/* ============================================================ */}
      {activeSubTab === 'loading' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveLoading();
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Toggles & Options */}
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="font-bold text-white text-sm">Loading Screen Activation</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Show animated branding overlay while loading videos.</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localLoading.enabled}
                    onChange={(e) => setLocalLoading({ ...localLoading, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Animation Style</label>
                <select
                  value={localLoading.animation}
                  onChange={(e) => setLocalLoading({ ...localLoading, animation: e.target.value as any })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                >
                  <option value="logo-pulse">Logo Pulse (Recommended)</option>
                  <option value="spinner">Circular Spinner</option>
                  <option value="fade">Gentle Fade Bounce</option>
                  <option value="pulse">Full Screen Pulse</option>
                  <option value="none">Static (No Animation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Loading Screen Logo URL</label>
                <input
                  type="url"
                  value={localLoading.logoUrl || ''}
                  onChange={(e) => setLocalLoading({ ...localLoading, logoUrl: e.target.value })}
                  placeholder="Leave empty to use main site logo"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">Loading Text</label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localLoading.showText}
                      onChange={(e) => setLocalLoading({ ...localLoading, showText: e.target.checked })}
                      className="rounded border-zinc-800 bg-zinc-950 text-red-600 focus:ring-red-500"
                    />
                    <span>Show Text</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={localLoading.text || ''}
                  onChange={(e) => setLocalLoading({ ...localLoading, text: e.target.value })}
                  placeholder="e.g. Loading StreamVerse..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Background Style & Test */}
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <h3 className="font-bold text-white text-sm">Background Styling</h3>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Background Mode</label>
                <select
                  value={localLoading.backgroundType}
                  onChange={(e) => setLocalLoading({ ...localLoading, backgroundType: e.target.value as any })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                >
                  <option value="theme">Follow Active Theme Background</option>
                  <option value="custom-color">Custom Solid Color</option>
                  <option value="custom-image">Custom Background Image URL</option>
                </select>
              </div>

              {localLoading.backgroundType === 'custom-color' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Custom Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localLoading.customColor || '#000000'}
                      onChange={(e) => setLocalLoading({ ...localLoading, customColor: e.target.value })}
                      className="h-8 w-12 rounded cursor-pointer border border-zinc-800 bg-transparent"
                    />
                    <input
                      type="text"
                      value={localLoading.customColor || '#000000'}
                      onChange={(e) => setLocalLoading({ ...localLoading, customColor: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs font-mono text-zinc-300"
                    />
                  </div>
                </div>
              )}

              {localLoading.backgroundType === 'custom-image' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Custom Background Image URL</label>
                  <input
                    type="url"
                    value={localLoading.customImageUrl || ''}
                    onChange={(e) => setLocalLoading({ ...localLoading, customImageUrl: e.target.value })}
                    placeholder="https://example.com/loading-bg.jpg"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Test Loading Screen Simulator */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 pt-3 space-y-2">
                <span className="text-xs font-bold text-zinc-300">Live Screen Tester</span>
                <p className="text-[11px] text-zinc-500">
                  Trigger a 3-second simulation of the loading screen overlay.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsTestingLoading(true);
                    setTimeout(() => setIsTestingLoading(false), 3000);
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition flex items-center justify-center gap-2"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Test Loading Animation Now</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Loading Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 5: HEADER LAYOUT & VISIBILITY */}
      {/* ============================================================ */}
      {activeSubTab === 'header' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveHeader();
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Master Header Visibility & Desktop Elements */}
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="font-bold text-white text-sm">Header Master Toggle</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Enable or hide the entire top navigation bar.</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localHeader.enabled}
                    onChange={(e) => {
                      const updated = { ...localHeader, enabled: e.target.checked };
                      setLocalHeader(updated);
                      setLivePreviewHeader(updated);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="space-y-3 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">Desktop Elements</span>

                {[
                  { key: 'showLogo', label: 'Show Website Logo & Title' },
                  { key: 'showSearch', label: 'Show Search Input Bar' },
                  { key: 'showSections', label: 'Show Dynamic Section Navigation Tabs (ALL, Movies...)' },
                  { key: 'showLogin', label: 'Show "Sign In" Button (When Logged Out)' },
                  { key: 'showSignup', label: 'Show "Get Started / Sign Up" Button (When Logged Out)' },
                  { key: 'showProfile', label: 'Show User Avatar & Logout (When Logged In)' },
                  { key: 'isSticky', label: 'Sticky Header (Stays Fixed at Top on Scroll)' },
                ].map((item) => {
                  const propKey = item.key as keyof HeaderSettings;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 cursor-pointer hover:bg-zinc-950"
                    >
                      <span className="text-xs text-zinc-300 font-medium">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(localHeader[propKey])}
                        onChange={(e) => {
                          const updated = { ...localHeader, [propKey]: e.target.checked };
                          setLocalHeader(updated);
                          setLivePreviewHeader(updated);
                        }}
                        className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Mobile-Specific Visibility & Dimensions */}
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <h3 className="font-bold text-white text-sm">Mobile Header Controls & Sizing</h3>

              <div className="space-y-3">
                {[
                  { key: 'mobileHeaderEnabled', label: 'Enable Header on Mobile Screens' },
                  { key: 'mobileLogoEnabled', label: 'Show Logo on Mobile' },
                  { key: 'mobileSearchEnabled', label: 'Show Search Bar on Mobile' },
                  { key: 'mobileMenuEnabled', label: 'Show Hamburger Dropdown Menu' },
                  { key: 'mobileLoginEnabled', label: 'Show Sign In in Mobile Drawer' },
                ].map((item) => {
                  const propKey = item.key as keyof HeaderSettings;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 cursor-pointer hover:bg-zinc-950"
                    >
                      <span className="text-xs text-zinc-300 font-medium">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(localHeader[propKey])}
                        onChange={(e) => {
                          const updated = { ...localHeader, [propKey]: e.target.checked };
                          setLocalHeader(updated);
                          setLivePreviewHeader(updated);
                        }}
                        className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-zinc-800 space-y-3">
                <span className="text-xs font-bold text-zinc-300 block">Header Height (Pixels)</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={48}
                    max={96}
                    value={localHeader.height || 64}
                    onChange={(e) => {
                      const updated = { ...localHeader, height: Number(e.target.value) };
                      setLocalHeader(updated);
                      setLivePreviewHeader(updated);
                    }}
                    className="flex-1 accent-red-600"
                  />
                  <span className="text-xs font-mono font-bold text-zinc-300 w-12 text-right">
                    {localHeader.height || 64}px
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Header Layout'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 6: FOOTER LAYOUT & VISIBILITY */}
      {/* ============================================================ */}
      {activeSubTab === 'footer' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveFooter();
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Master Toggle & Elements */}
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="font-bold text-white text-sm">Footer Master Toggle</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Enable or completely disable the bottom footer.</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFooter.enabled}
                    onChange={(e) => {
                      const updated = { ...localFooter, enabled: e.target.checked };
                      setLocalFooter(updated);
                      setLivePreviewFooter(updated);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="space-y-2.5 pt-1">
                {[
                  { key: 'showLogo', label: 'Show Logo in Footer' },
                  { key: 'showDescription', label: 'Show Site Description in Footer' },
                  { key: 'showNavigationLinks', label: 'Show Quick Navigation Links (Home, Movies, Sports...)' },
                  { key: 'showSocialLinks', label: 'Show Social Media Links' },
                  { key: 'showContact', label: 'Show Contact Email Address' },
                  { key: 'showCustomLinks', label: 'Show Custom External / Legal Links' },
                  { key: 'showCopyright', label: 'Show Copyright Bar' },
                ].map((item) => {
                  const propKey = item.key as keyof FooterSettings;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 cursor-pointer hover:bg-zinc-950"
                    >
                      <span className="text-xs text-zinc-300 font-medium">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(localFooter[propKey])}
                        onChange={(e) => {
                          const updated = { ...localFooter, [propKey]: e.target.checked };
                          setLocalFooter(updated);
                          setLivePreviewFooter(updated);
                        }}
                        className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Copyright Template</label>
                <input
                  type="text"
                  value={localFooter.copyrightText || ''}
                  onChange={(e) => setLocalFooter({ ...localFooter, copyrightText: e.target.value })}
                  placeholder="© {year} {siteName}. All rights reserved."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Use {'{year}'} and {'{siteName}'} as auto-replaced dynamic placeholders.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Contact Email Address</label>
                <input
                  type="email"
                  value={localFooter.contactEmail || ''}
                  onChange={(e) => setLocalFooter({ ...localFooter, contactEmail: e.target.value })}
                  placeholder="support@videostream.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Social Links & Custom Footer Links */}
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <h3 className="font-bold text-white text-sm">Social Media & Custom Links</h3>

              {/* Social URLs */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Social Profiles</span>

                {[
                  { key: 'twitter', label: 'Twitter / X URL', placeholder: 'https://x.com/streamverse' },
                  { key: 'youtube', label: 'YouTube Channel URL', placeholder: 'https://youtube.com/@streamverse' },
                  { key: 'telegram', label: 'Telegram Channel URL', placeholder: 'https://t.me/streamverse' },
                  { key: 'discord', label: 'Discord Server Invite', placeholder: 'https://discord.gg/streamverse' },
                  { key: 'facebook', label: 'Facebook Page URL', placeholder: 'https://facebook.com/streamverse' },
                ].map((s) => {
                  const sKey = s.key as keyof typeof localFooter.socialLinks;
                  return (
                    <div key={s.key}>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">{s.label}</label>
                      <input
                        type="url"
                        value={localFooter.socialLinks?.[sKey] || ''}
                        onChange={(e) =>
                          setLocalFooter({
                            ...localFooter,
                            socialLinks: {
                              ...localFooter.socialLinks,
                              [sKey]: e.target.value,
                            },
                          })
                        }
                        placeholder={s.placeholder}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Custom Legal / External Links */}
              <div className="pt-3 border-t border-zinc-800 space-y-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Custom Legal / Extra Links</span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustomLinkTitle}
                    onChange={(e) => setNewCustomLinkTitle(e.target.value)}
                    placeholder="Link Title (e.g. Terms)"
                    className="w-1/3 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                  <input
                    type="url"
                    value={newCustomLinkUrl}
                    onChange={(e) => setNewCustomLinkUrl(e.target.value)}
                    placeholder="URL (e.g. https://...)"
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomLink}
                    className="rounded-xl bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                  >
                    Add
                  </button>
                </div>

                {localFooter.customLinks && localFooter.customLinks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {localFooter.customLinks.map((lnk, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-zinc-200">{lnk.title}</span>
                          <span className="text-zinc-500 ml-2 font-mono text-[10px]">{lnk.url}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomLink(idx)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Footer Layout'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 7: FULL INTERACTIVE LIVE PREVIEW */}
      {/* ============================================================ */}
      {activeSubTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div>
              <h3 className="font-bold text-white text-sm">Interactive Live Site Simulation</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Simulate how user-facing visitors experience the site with your active theme, header, and footer configurations.
              </p>
            </div>

            {/* Viewport switchers */}
            <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setPreviewViewport('desktop')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  previewViewport === 'desktop' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewViewport('tablet')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  previewViewport === 'tablet' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Tablet className="h-3.5 w-3.5" />
                <span>Tablet (768px)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewViewport('mobile')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  previewViewport === 'mobile' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile (375px)</span>
              </button>
            </div>
          </div>

          {/* Interactive Simulation Frame */}
          <div className="flex justify-center bg-zinc-950/80 p-4 sm:p-8 rounded-2xl border border-zinc-800 overflow-x-auto">
            <div
              className={`transition-all duration-300 rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
                previewViewport === 'desktop'
                  ? 'w-full max-w-5xl min-h-[550px]'
                  : previewViewport === 'tablet'
                  ? 'w-[768px] min-h-[600px]'
                  : 'w-[375px] min-h-[650px]'
              }`}
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
            >
              {/* Simulated Header */}
              {localHeader.enabled && (
                <div
                  className="p-4 border-b flex items-center justify-between"
                  style={{
                    backgroundColor: colors.header,
                    borderColor: colors.border,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {siteLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={siteLogo} alt={siteName} className="h-7 max-w-[120px] object-contain" />
                    ) : (
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg shadow"
                        style={{ backgroundColor: colors.primary, color: colors.buttonText }}
                      >
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      </div>
                    )}
                    <span className="font-bold text-sm" style={{ color: colors.text }}>
                      {siteName}
                    </span>
                  </div>

                  {previewViewport === 'desktop' && localHeader.showSearch && (
                    <div
                      className="px-4 py-1.5 rounded-full border text-xs w-64 text-zinc-500"
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      }}
                    >
                      Search videos, genres, tags...
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-xs font-bold shadow"
                      style={{ backgroundColor: colors.button, color: colors.buttonText }}
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              )}

              {/* Simulated Section Navigation */}
              {localHeader.enabled && localHeader.showSections && (
                <div
                  className="px-4 py-2 border-b flex items-center gap-2 overflow-x-auto"
                  style={{
                    backgroundColor: `${colors.header}bb`,
                    borderColor: colors.border,
                  }}
                >
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold shadow"
                    style={{ backgroundColor: colors.activeNav, color: colors.buttonText }}
                  >
                    ALL
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.mutedText,
                    }}
                  >
                    MOVIES
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.mutedText,
                    }}
                  >
                    SPORTS
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.mutedText,
                    }}
                  >
                    ENTERTAINMENT
                  </span>
                </div>
              )}

              {/* Simulated Body Content */}
              <div className="flex-1 p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold tracking-tight mb-1" style={{ color: colors.text }}>
                    Featured Streaming Videos
                  </h2>
                  <p className="text-xs" style={{ color: colors.mutedText }}>
                    Experience ultimate 4K streaming powered by dynamic cloud architecture.
                  </p>
                </div>

                <div className={`grid gap-4 ${previewViewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  {[
                    { title: 'Cyberpunk 2077: Phantom Liberty 4K', views: '2.4M views', dur: '14:20' },
                    { title: 'UEFA Champions League Highlights', views: '890K views', dur: '08:45' },
                    { title: 'Interstellar Universe & Quantum Physics', views: '1.8M views', dur: '45:10' },
                  ].map((vid, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border p-3 space-y-2.5 transition"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      }}
                    >
                      <div
                        className="relative aspect-video w-full rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: colors.surface }}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
                          style={{ backgroundColor: colors.primary, color: colors.buttonText }}
                        >
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </div>
                        <span
                          className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[9px] font-bold text-white bg-black/80"
                        >
                          {vid.dur}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs line-clamp-1" style={{ color: colors.text }}>
                          {vid.title}
                        </h4>
                        <p className="text-[11px] mt-0.5" style={{ color: colors.mutedText }}>
                          {vid.views}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulated Footer */}
              {localFooter.enabled && (
                <div
                  className="p-6 border-t mt-auto text-center space-y-2"
                  style={{
                    backgroundColor: colors.footer,
                    borderColor: colors.border,
                    color: colors.mutedText,
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: colors.text }}>
                    {siteName}
                  </p>
                  <p className="text-[11px]">
                    &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
