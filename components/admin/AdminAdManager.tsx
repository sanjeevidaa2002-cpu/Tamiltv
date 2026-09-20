'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Copy,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Layers,
  Globe,
  Smartphone,
  Laptop,
  MousePointer,
  TrendingUp,
  Power,
  X,
  RefreshCw,
  Sliders,
  LayoutGrid,
} from 'lucide-react';
import {
  Advertisement,
  AdSettings,
  AdType,
  AdStatus,
  AdProvider,
  AdPageTarget,
  AdDeviceTarget,
  AdBannerSize,
  AdFrequencyMode,
  AdFrequencyUnit,
} from '@/lib/types';
import {
  getAds,
  getAdSettings,
  createAd,
  updateAd,
  deleteAd,
  toggleAdStatus,
  duplicateAd,
  updateAdSettings,
  DEFAULT_AD_SETTINGS,
  ALL_AD_PAGES,
  STANDARD_AD_SIZES,
  getAdDimensions,
} from '@/lib/adService';
import { AdsterraSlot } from '@/components/ads/AdsterraSlot';

const ALL_PAGE_TARGETS: { value: AdPageTarget; label: string }[] = [
  { value: 'all', label: 'All Pages' },
  { value: 'home', label: 'Homepage' },
  { value: 'video', label: 'Video Watch Page' },
  { value: 'movies', label: 'Movies Section' },
  { value: 'sports', label: 'Sports Section' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'music', label: 'Music Section' },
  { value: 'gaming', label: 'Gaming Section' },
  { value: 'playlist', label: 'Playlist Page' },
  { value: 'search', label: 'Search Results' },
  { value: 'profile', label: 'User Profile' },
  { value: 'login', label: 'Login Page' },
  { value: 'signup', label: 'Signup Page' },
  { value: 'section', label: 'Dynamic Sections' },
];

const PAGE_DISPLAY_CONFIG: { key: AdPageTarget; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'video', label: 'Video' },
  { key: 'movies', label: 'Movies' },
  { key: 'sports', label: 'Sports' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'music', label: 'Music' },
  { key: 'gaming', label: 'Gaming' },
  { key: 'playlist', label: 'Playlist' },
  { key: 'search', label: 'Search' },
  { key: 'profile', label: 'Profile' },
  { key: 'login', label: 'Login' },
  { key: 'signup', label: 'Signup' },
  { key: 'section', label: 'Section' },
];

export const AdminAdManager: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [settings, setSettings] = useState<AdSettings>(DEFAULT_AD_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'all' | 'header' | 'footer' | 'popup' | 'video' | 'placements' | 'settings'
  >('overview');

  // Form / Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewAd, setPreviewAd] = useState<Advertisement | null>(null);
  const [previewDevice, setPreviewDevice] = useState<
    'configured' | 'desktop' | 'mobile' | 'billboard' | '700x150' | '600x150' | '550x150'
  >('configured');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState<AdProvider>('adsterra');
  const [formType, setFormType] = useState<AdType>('header');
  const [formBannerSize, setFormBannerSize] = useState<AdBannerSize>('728x60');
  const [formWidth, setFormWidth] = useState<number>(728);
  const [formHeight, setFormHeight] = useState<number>(60);
  const [formCustomWidth, setFormCustomWidth] = useState<number>(728);
  const [formCustomHeight, setFormCustomHeight] = useState<number>(90);
  const [formCode, setFormCode] = useState('');
  const [formStatus, setFormStatus] = useState<AdStatus>('active');
  const [formPriority, setFormPriority] = useState<number>(1);
  const [formTargetPages, setFormTargetPages] = useState<AdPageTarget[]>(['all']);
  const [formDeviceTarget, setFormDeviceTarget] = useState<AdDeviceTarget>('all');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  // Popup specific form fields
  const [formFrequencyMode, setFormFrequencyMode] = useState<AdFrequencyMode>('every_hours');
  const [formFrequencyValue, setFormFrequencyValue] = useState<number>(2);
  const [formFrequencyUnit, setFormFrequencyUnit] = useState<AdFrequencyUnit>('hours');
  const [formInitialDelay, setFormInitialDelay] = useState<number>(15);
  const [formCountdownSeconds, setFormCountdownSeconds] = useState<number>(5);
  const [formCloseButtonEnabled, setFormCloseButtonEnabled] = useState<boolean>(true);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [fetchedAds, fetchedSettings] = await Promise.all([
        getAds(true),
        getAdSettings(),
      ]);
      setAds(fetchedAds);
      setSettings(fetchedSettings);
    } catch (err) {
      console.error('Failed to load advertisements:', err);
      showNotification('Failed to load advertisements', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getAds(true), getAdSettings()])
      .then(([fetchedAds, fetchedSettings]) => {
        if (isMounted) {
          setAds(fetchedAds);
          setSettings(fetchedSettings);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load advertisements:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSizePresetChange = (sizeKey: string) => {
    setFormBannerSize(sizeKey as AdBannerSize);
    if (sizeKey === 'custom') {
      const w = formCustomWidth || formWidth || 728;
      const h = formCustomHeight || formHeight || 90;
      setFormWidth(w);
      setFormHeight(h);
    } else {
      const preset = STANDARD_AD_SIZES.find((s) => s.id === sizeKey);
      if (preset) {
        setFormWidth(preset.width);
        setFormHeight(preset.height);
      }
    }
  };

  const resetForm = () => {
    setEditingAdId(null);
    setFormName('');
    setFormProvider('adsterra');
    setFormType('header');
    setFormBannerSize('728x60');
    setFormWidth(728);
    setFormHeight(60);
    setFormCustomWidth(728);
    setFormCustomHeight(90);
    setFormCode('');
    setFormStatus('active');
    setFormPriority(1);
    setFormTargetPages(['all']);
    setFormDeviceTarget('all');
    setFormStartDate('');
    setFormEndDate('');
    setFormFrequencyMode('every_hours');
    setFormFrequencyValue(2);
    setFormFrequencyUnit('hours');
    setFormInitialDelay(15);
    setFormCountdownSeconds(5);
    setFormCloseButtonEnabled(true);
  };

  const handleOpenCreateModal = (type: AdType = 'header') => {
    resetForm();
    setFormType(type);
    if (type === 'popup') {
      setFormBannerSize('300x250');
      setFormWidth(300);
      setFormHeight(250);
    } else if (type === 'video_player' || type === 'in_content') {
      setFormBannerSize('300x250');
      setFormWidth(300);
      setFormHeight(250);
    } else {
      setFormBannerSize('728x60');
      setFormWidth(728);
      setFormHeight(60);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ad: Advertisement) => {
    setEditingAdId(ad.id);
    setFormName(ad.name);
    setFormProvider(ad.provider || 'adsterra');
    setFormType(ad.type);
    
    const dims = getAdDimensions(ad);
    const isCustom = ad.banner_size === 'custom' || Boolean(ad.custom_width && ad.custom_height);
    
    setFormBannerSize(isCustom ? 'custom' : (ad.banner_size || `${dims.width}x${dims.height}`));
    setFormWidth(dims.width);
    setFormHeight(dims.height);
    setFormCustomWidth(dims.width);
    setFormCustomHeight(dims.height);

    setFormCode(ad.code || '');
    setFormStatus(ad.status);
    setFormPriority(ad.priority || 1);
    setFormTargetPages(ad.target_pages && ad.target_pages.length > 0 ? ad.target_pages : ['all']);
    setFormDeviceTarget(ad.device_target || 'all');
    setFormStartDate(ad.start_date || '');
    setFormEndDate(ad.end_date || '');
    setFormFrequencyMode(ad.frequency_mode || 'every_hours');
    setFormFrequencyValue(ad.frequency_value || 2);
    setFormFrequencyUnit(ad.frequency_unit || 'hours');
    setFormInitialDelay(typeof ad.initial_delay !== 'undefined' ? ad.initial_delay : 15);
    setFormCountdownSeconds(typeof ad.countdown_seconds !== 'undefined' ? ad.countdown_seconds : 5);
    setFormCloseButtonEnabled(ad.close_button_enabled !== false);
    setIsModalOpen(true);
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showNotification('Please enter an advertisement name', 'error');
      return;
    }

    const widthNum = Math.max(50, Math.min(2400, Number(formWidth) || 728));
    const heightNum = Math.max(20, Math.min(1800, Number(formHeight) || 60));
    const isCustom = formBannerSize === 'custom';

    setSaving(true);
    try {
      const adPayload = {
        name: formName.trim(),
        provider: formProvider,
        type: formType,
        banner_size: formBannerSize,
        width: widthNum,
        height: heightNum,
        ad_width: widthNum,
        ad_height: heightNum,
        custom_width: isCustom ? widthNum : undefined,
        custom_height: isCustom ? heightNum : undefined,
        code: formCode,
        status: formStatus,
        priority: Number(formPriority) || 1,
        target_pages: formTargetPages,
        device_target: formDeviceTarget,
        start_date: formStartDate || undefined,
        end_date: formEndDate || undefined,
        frequency_mode: formType === 'popup' ? formFrequencyMode : undefined,
        frequency_value: formType === 'popup' ? Number(formFrequencyValue) : undefined,
        frequency_unit: formType === 'popup' ? formFrequencyUnit : undefined,
        initial_delay: formType === 'popup' ? Number(formInitialDelay) : undefined,
        countdown_seconds: formType === 'popup' ? Number(formCountdownSeconds) : undefined,
        close_button_enabled: formType === 'popup' ? formCloseButtonEnabled : undefined,
      };

      if (editingAdId) {
        await updateAd(editingAdId, adPayload);
        showNotification('Advertisement updated successfully');
      } else {
        await createAd(adPayload);
        showNotification('Advertisement slot created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      console.error('Failed to save ad:', err);
      showNotification(err.message || 'Failed to save advertisement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (ad: Advertisement) => {
    try {
      const newStatus = await toggleAdStatus(ad.id, ad.status);
      setAds((prev) =>
        prev.map((item) => (item.id === ad.id ? { ...item, status: newStatus } : item))
      );
      showNotification(`Ad is now ${newStatus}`);
    } catch (err) {
      showNotification('Failed to toggle status', 'error');
    }
  };

  const handleDuplicate = async (ad: Advertisement) => {
    try {
      const duplicated = await duplicateAd(ad.id);
      if (duplicated) {
        showNotification(`Duplicated "${ad.name}"`);
        await loadData();
      }
    } catch (err) {
      showNotification('Failed to duplicate advertisement', 'error');
    }
  };

  const handleDelete = async (ad: Advertisement) => {
    if (!confirm(`Are you sure you want to delete "${ad.name}"?`)) return;
    try {
      await deleteAd(ad.id);
      setAds((prev) => prev.filter((item) => item.id !== ad.id));
      showNotification('Advertisement deleted');
    } catch (err) {
      showNotification('Failed to delete advertisement', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAdSettings(settings);
      showNotification('Global advertising settings saved successfully');
    } catch (err) {
      showNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePageTarget = (page: AdPageTarget) => {
    if (page === 'all') {
      setFormTargetPages(['all']);
      return;
    }
    let updated: AdPageTarget[] = formTargetPages.filter((p) => p !== 'all');
    if (updated.includes(page)) {
      updated = updated.filter((p) => p !== page);
    } else {
      updated.push(page);
    }
    if (updated.length === 0) {
      updated = ['all'];
    }
    setFormTargetPages(updated);
  };

  const handleToggleHeaderPage = (pageKey: AdPageTarget) => {
    setSettings((prev) => ({
      ...prev,
      header_ad_pages: {
        ...(prev.header_ad_pages || {}),
        [pageKey]: !(prev.header_ad_pages?.[pageKey] ?? true),
      },
    }));
  };

  const handleToggleFooterPage = (pageKey: AdPageTarget) => {
    setSettings((prev) => ({
      ...prev,
      footer_ad_pages: {
        ...(prev.footer_ad_pages || {}),
        [pageKey]: !(prev.footer_ad_pages?.[pageKey] ?? true),
      },
    }));
  };

  const handleSelectAllHeaderPages = (enable: boolean) => {
    const updated: Record<string, boolean> = {};
    PAGE_DISPLAY_CONFIG.forEach((p) => {
      updated[p.key] = enable;
    });
    setSettings((prev) => ({
      ...prev,
      header_ad_pages: updated,
    }));
  };

  const handleSelectAllFooterPages = (enable: boolean) => {
    const updated: Record<string, boolean> = {};
    PAGE_DISPLAY_CONFIG.forEach((p) => {
      updated[p.key] = enable;
    });
    setSettings((prev) => ({
      ...prev,
      footer_ad_pages: updated,
    }));
  };

  // Metrics computation
  const totalSlots = ads.length;
  const activeAds = ads.filter((a) => a.status === 'active');
  const disabledAds = ads.filter((a) => a.status === 'inactive');
  const headerAds = ads.filter((a) => a.type === 'header');
  const footerAds = ads.filter((a) => a.type === 'footer');
  const popupAds = ads.filter((a) => a.type === 'popup');
  const videoAds = ads.filter((a) => a.type === 'video_player' || a.type === 'in_content');
  const totalImpressions = ads.reduce((acc, a) => acc + (a.impressions || 0), 0);
  const totalClicks = ads.reduce((acc, a) => acc + (a.clicks || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  // Filtered ads list based on active subtab
  const filteredAds = ads.filter((a) => {
    if (activeSubTab === 'header') return a.type === 'header';
    if (activeSubTab === 'footer') return a.type === 'footer';
    if (activeSubTab === 'popup') return a.type === 'popup';
    if (activeSubTab === 'video') return a.type === 'video_player' || a.type === 'in_content';
    return true; // 'all' or 'overview'
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 ${
            notification.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-950/90 text-emerald-200'
              : 'border border-red-500/30 bg-red-950/90 text-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Megaphone className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Monetization & Adsterra Ads
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Centrally manage Adsterra ad codes, banner positions, popup frequency timers, page targeting, and schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData()}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Ad Slot</span>
          </button>
        </div>
      </div>

      {/* Master Switch Alert Banner */}
      {!settings.ads_enabled && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
            <span>
              <strong>Advertising is currently disabled globally.</strong> No ads will appear on the live site until you enable the master switch.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const updated = { ...settings, ads_enabled: true };
              setSettings(updated);
              await updateAdSettings(updated);
              showNotification('Global advertising enabled');
            }}
            className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-black hover:bg-amber-400 transition"
          >
            Enable All Ads
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Slots</span>
          <p className="text-2xl font-bold text-white mt-1">{totalSlots}</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Registered in system</span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Active Ads</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeAds.length}</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Live & serving</span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Disabled</span>
          <p className="text-2xl font-bold text-zinc-400 mt-1">{disabledAds.length}</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Paused</span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Impressions</span>
          <p className="text-2xl font-bold text-white mt-1">{totalImpressions.toLocaleString()}</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Verified views</span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Clicks</span>
          <p className="text-2xl font-bold text-white mt-1">{totalClicks.toLocaleString()}</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Total interactions</span>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">CTR Rate</span>
          <p className="text-2xl font-bold text-purple-300 mt-1">{ctr}%</p>
          <span className="text-[10px] text-zinc-500 mt-1 block">Click-through ratio</span>
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/40 p-1.5 rounded-xl gap-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'overview' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('all')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'all' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Ads ({ads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('header')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'header' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Laptop className="h-3.5 w-3.5" />
          <span>Header Ads ({headerAds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('footer')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'footer' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Footer Ads ({footerAds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('popup')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'popup' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Popup Ads ({popupAds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('video')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'video' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <MousePointer className="h-3.5 w-3.5" />
          <span>Video Page Ads ({videoAds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('placements')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'placements' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Placement Settings & Layout Preview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'settings' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Settings & Defaults</span>
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Ad Status Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Header Ads Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Header Banner</h3>
                    <p className="text-[11px] text-zinc-400">Directly below navigation</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    settings.header_ads_enabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {settings.header_ads_enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Configured Slots: <strong className="text-white">{headerAds.length}</strong> ({headerAds.filter(a => a.status === 'active').length} active)
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('header')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  + Add Header Ad
                </button>
                <span className="text-zinc-600">&bull;</span>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('header')}
                  className="text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Manage Slots
                </button>
              </div>
            </div>

            {/* Footer Ads Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Footer Banner</h3>
                    <p className="text-[11px] text-zinc-400">Above site footer</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    settings.footer_ads_enabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {settings.footer_ads_enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Configured Slots: <strong className="text-white">{footerAds.length}</strong> ({footerAds.filter(a => a.status === 'active').length} active)
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('footer')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  + Add Footer Ad
                </button>
                <span className="text-zinc-600">&bull;</span>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('footer')}
                  className="text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Manage Slots
                </button>
              </div>
            </div>

            {/* Popup Ads Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Popup Overlay</h3>
                    <p className="text-[11px] text-zinc-400">Frequency & delay controlled</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    settings.popup_ads_enabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {settings.popup_ads_enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Frequency: <strong className="text-white">{settings.default_popup_frequency_value} {settings.default_popup_frequency_unit}</strong> (Delay: {settings.default_popup_delay}s)
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('popup')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  + Add Popup Ad
                </button>
                <span className="text-zinc-600">&bull;</span>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('popup')}
                  className="text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Configure Rules
                </button>
              </div>
            </div>
          </div>

          {/* Quick instructions box for Adsterra integration */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              How to Deploy Your Adsterra Ads
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
              <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                <strong className="text-white block mb-1">1. Copy Tag from Adsterra</strong>
                Log in to your Adsterra publisher account, generate your banner or popunder code, and copy the script.
              </div>
              <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                <strong className="text-white block mb-1">2. Paste into Slot Code</strong>
                Click &quot;Create Ad Slot&quot;, select position (Header, Footer, or Popup), and paste the snippet directly into the Ad Code field.
              </div>
              <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                <strong className="text-white block mb-1">3. Set Frequency & Targeting</strong>
                Choose which pages show the ad and how often popup intervals occur. The app takes care of safe rendering and tracking.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AD SLOTS MANAGEMENT TABLE (For All, Header, Footer, Popup, Video tabs) */}
      {activeSubTab !== 'settings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {activeSubTab === 'overview' ? 'All Configured Slots' : `${activeSubTab} Ads`} ({filteredAds.length})
            </h2>
            <button
              type="button"
              onClick={() => handleOpenCreateModal(activeSubTab === 'overview' || activeSubTab === 'all' ? 'header' : (activeSubTab as AdType))}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Ad Slot
            </button>
          </div>

          {filteredAds.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40 text-center">
              <Megaphone className="h-10 w-10 text-zinc-600 mb-3" />
              <h3 className="text-sm font-semibold text-white">No advertisements found in this category</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Create a new advertisement slot and paste your Adsterra tag to start monetizing.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreateModal(activeSubTab === 'overview' || activeSubTab === 'all' ? 'header' : (activeSubTab as AdType))}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
              >
                Create Ad Slot Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-lg">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-3 px-4">Ad Name & Slot</th>
                    <th className="py-3 px-4">Box Size</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Targeting</th>
                    <th className="py-3 px-4">Timing & Priority</th>
                    <th className="py-3 px-4">Impressions / Clicks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredAds.map((ad) => {
                    const dims = getAdDimensions(ad);
                    return (
                      <tr key={ad.id} className="hover:bg-zinc-800/40 transition">
                        {/* Name & Type */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{ad.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="capitalize text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
                              {ad.type.replace('_', ' ')}
                            </span>
                            {ad.type === 'popup' && (
                              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded">
                                {ad.frequency_mode === 'once_per_session'
                                  ? 'Session'
                                  : `${ad.frequency_value || 2} ${ad.frequency_unit || 'h'}`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Box Size */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            {dims.displayText}
                          </span>
                        </td>

                        {/* Provider */}
                        <td className="py-3.5 px-4">
                          <span className="capitalize text-zinc-300 font-medium">
                            {ad.provider || 'Adsterra'}
                          </span>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(ad)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                              ad.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                            }`}
                          >
                            <Power className="h-3 w-3" />
                            <span className="capitalize">{ad.status}</span>
                          </button>
                        </td>

                        {/* Targeting */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="text-[11px] text-zinc-300">
                              Pages:{' '}
                              <span className="text-zinc-400">
                                {ad.target_pages && ad.target_pages.length > 0
                                  ? ad.target_pages.join(', ')
                                  : 'All'}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              Device: {ad.device_target || 'all'}
                            </div>
                          </div>
                        </td>

                        {/* Timing & Priority */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="text-[11px] text-zinc-300">
                              Priority: <span className="font-bold text-amber-400">{ad.priority || 1}</span>
                            </div>
                            {ad.start_date || ad.end_date ? (
                              <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Scheduled</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-500">Always active</div>
                            )}
                          </div>
                        </td>

                        {/* Impressions & Clicks */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="text-zinc-200">{(ad.impressions || 0).toLocaleString()} views</div>
                          <div className="text-[10px] text-zinc-500">
                            {(ad.clicks || 0).toLocaleString()} clicks (
                            {ad.impressions && ad.impressions > 0
                              ? (((ad.clicks || 0) / ad.impressions) * 100).toFixed(1)
                              : 0}
                            %)
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewAd(ad)}
                              title="Preview ad layout"
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(ad)}
                              title="Edit ad configuration"
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicate(ad)}
                              title="Duplicate ad"
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                            >
                              <Copy className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(ad)}
                              title="Delete ad"
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PLACEMENTS & LAYOUT PREVIEW TAB */}
      {activeSubTab === 'placements' && (
        <div className="space-y-8 max-w-5xl">
          {/* Header & Description */}
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Ad Placements & Layout Architecture
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Configure page-level targeting for Header and Footer ad containers. Advertisements are strictly positioned in independent containers outside of the Header and Footer components.
            </p>
          </div>

          {/* 1. VISUAL ARCHITECTURE PREVIEW (Section 19) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Visual Layout Architecture Preview</h3>
                <p className="text-xs text-zinc-400">
                  Standardized flow implemented across all user-facing pages
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Strict Header & Footer Separation
              </span>
            </div>

            {/* Architecture Flow Diagram */}
            <div className="space-y-3 py-2">
              {/* Layer 1: Header */}
              <div className="rounded-xl border border-zinc-700/70 bg-zinc-950 p-3.5 text-center shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <strong className="text-white">HEADER (NAVBAR)</strong>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Logo &bull; Search &bull; Categories &bull; Auth &bull; Admin Link
                  </span>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 font-mono">
                    Zero Ad Code
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <span className="text-zinc-600 text-xs font-mono font-bold">&darr;</span>
              </div>

              {/* Layer 2: Header Ad Box */}
              <div
                className={`rounded-xl border p-4 text-center transition ${
                  settings.ads_enabled && settings.header_ads_enabled
                    ? 'border-indigo-500/40 bg-indigo-950/20 shadow-lg shadow-indigo-950/30'
                    : 'border-zinc-800 bg-zinc-900/30 opacity-60'
                }`}
              >
                <div className="mx-auto max-w-[500px]">
                  {settings.show_ad_label !== false && (
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-indigo-400/80">
                      Advertisement
                    </span>
                  )}
                  <div className="rounded-lg border border-dashed border-indigo-500/40 bg-indigo-950/40 p-4 text-center">
                    <p className="text-xs font-bold text-indigo-300">
                      &lt;HeaderAdBox /&gt;
                    </p>
                    <p className="text-[11px] text-indigo-400/70 mt-0.5">
                      Max-Width: 1200px &bull; Centered &bull; Empty State Auto-Collapses (0px)
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <span className="text-zinc-600 text-xs font-mono font-bold">&darr;</span>
              </div>

              {/* Layer 3: Main Page Content */}
              <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/90 p-5 text-center shadow-inner">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">MAIN PAGE CONTENT</p>
                  <p className="text-[11px] text-zinc-400">
                    Video Catalog Grid / Spotlight Hero / Video Watch Player &amp; Related Videos / Category Playlists
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <span className="text-zinc-600 text-xs font-mono font-bold">&darr;</span>
              </div>

              {/* Layer 4: Footer Ad Box */}
              <div
                className={`rounded-xl border p-4 text-center transition ${
                  settings.ads_enabled && settings.footer_ads_enabled
                    ? 'border-indigo-500/40 bg-indigo-950/20 shadow-lg shadow-indigo-950/30'
                    : 'border-zinc-800 bg-zinc-900/30 opacity-60'
                }`}
              >
                <div className="mx-auto max-w-[500px]">
                  {settings.show_ad_label !== false && (
                    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-indigo-400/80">
                      Advertisement
                    </span>
                  )}
                  <div className="rounded-lg border border-dashed border-indigo-500/40 bg-indigo-950/40 p-4 text-center">
                    <p className="text-xs font-bold text-indigo-300">
                      &lt;FooterAdBox /&gt;
                    </p>
                    <p className="text-[11px] text-indigo-400/70 mt-0.5">
                      Max-Width: 1200px &bull; Centered &bull; Empty State Auto-Collapses (0px)
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <span className="text-zinc-600 text-xs font-mono font-bold">&darr;</span>
              </div>

              {/* Layer 5: Footer */}
              <div className="rounded-xl border border-zinc-700/70 bg-zinc-950 p-3.5 text-center shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-3">
                  <strong className="text-white">FOOTER</strong>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Site Branding &bull; Copyright &bull; Category Navigation Links
                  </span>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 font-mono">
                    Zero Ad Code
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. AD LABEL CONFIGURATION (Section 12) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Advertisement Label</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Display a discreet, compliant &quot;Advertisement&quot; label directly above ad containers
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-zinc-300">
                  {settings.show_ad_label !== false ? 'ON' : 'OFF'}
                </span>
                <input
                  type="checkbox"
                  checked={settings.show_ad_label !== false}
                  onChange={(e) => setSettings({ ...settings, show_ad_label: e.target.checked })}
                  className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 3. HEADER AD BOX - PAGE TARGETING CHECKBOXES (Section 8) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">HEADER AD BOX</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      settings.header_ads_enabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {settings.header_ads_enabled ? 'Master Switch ON' : 'Master Switch OFF'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Check which pages will display the Header Ad Box directly below the navigation
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllHeaderPages(true)}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllHeaderPages(false)}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Checkbox Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {PAGE_DISPLAY_CONFIG.map((page) => {
                const isChecked = settings.header_ad_pages?.[page.key] ?? true;
                return (
                  <label
                    key={`header-${page.key}`}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer select-none transition ${
                      isChecked
                        ? 'border-indigo-500/40 bg-indigo-950/20 text-white'
                        : 'border-zinc-800/80 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleHeaderPage(page.key)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold">{page.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. FOOTER AD BOX - PAGE TARGETING CHECKBOXES (Section 8) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">FOOTER AD BOX</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      settings.footer_ads_enabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {settings.footer_ads_enabled ? 'Master Switch ON' : 'Master Switch OFF'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Check which pages will display the Footer Ad Box directly above the site footer
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllFooterPages(true)}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllFooterPages(false)}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Checkbox Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {PAGE_DISPLAY_CONFIG.map((page) => {
                const isChecked = settings.footer_ad_pages?.[page.key] ?? true;
                return (
                  <label
                    key={`footer-${page.key}`}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer select-none transition ${
                      isChecked
                        ? 'border-indigo-500/40 bg-indigo-950/20 text-white'
                        : 'border-zinc-800/80 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleFooterPage(page.key)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold">{page.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Save Placements Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSettings as any}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {saving ? 'Saving Placement Settings...' : 'Save Placement Settings'}
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS & DEFAULTS TAB */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Global Monetization Controls</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Toggle all advertisements on or off site-wide, or control individual position switches.
              </p>
            </div>

            {/* Master Switches */}
            <div className="space-y-3 divide-y divide-zinc-800">
              <div className="flex items-center justify-between pt-3">
                <div>
                  <label className="text-xs font-bold text-white">Master Advertising Switch</label>
                  <p className="text-[11px] text-zinc-400">Enable or disable all advertisements across the platform</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ads_enabled}
                  onChange={(e) => setSettings({ ...settings, ads_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <label className="text-xs font-semibold text-white">Header Banner Ads</label>
                  <p className="text-[11px] text-zinc-400">Show header advertisements directly below main navigation</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.header_ads_enabled}
                  onChange={(e) => setSettings({ ...settings, header_ads_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <label className="text-xs font-semibold text-white">Footer Banner Ads</label>
                  <p className="text-[11px] text-zinc-400">Show footer advertisements directly above site footer</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.footer_ads_enabled}
                  onChange={(e) => setSettings({ ...settings, footer_ads_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <label className="text-xs font-semibold text-white">Popup Advertisement Modal</label>
                  <p className="text-[11px] text-zinc-400">Allow popup advertisements with frequency limits</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.popup_ads_enabled}
                  onChange={(e) => setSettings({ ...settings, popup_ads_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <label className="text-xs font-semibold text-white">Video Page / In-Content Ads</label>
                  <p className="text-[11px] text-zinc-400">Show advertisements on video watch pages (without interrupting playback)</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.video_ads_enabled}
                  onChange={(e) => setSettings({ ...settings, video_ads_enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <label className="text-xs font-semibold text-white">Show &quot;Advertisement&quot; Label</label>
                  <p className="text-[11px] text-zinc-400">Display a discrete &quot;Advertisement&quot; label directly above ad containers</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.show_ad_label !== false}
                  onChange={(e) => setSettings({ ...settings, show_ad_label: e.target.checked })}
                  className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Default Popup Frequency Controls */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Default Popup Frequency & Timing</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Configure default popup interval and delay when an individual ad doesn&apos;t override it.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Default Display Frequency Mode
                </label>
                <select
                  value={settings.default_popup_frequency_mode}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_popup_frequency_mode: e.target.value as AdFrequencyMode,
                    })
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/90 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="every_hours">Every X Hours</option>
                  <option value="every_minutes">Every X Minutes</option>
                  <option value="once_per_session">Once Per Browser Session</option>
                  <option value="once_per_day">Once Per 24 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Frequency Interval Value
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={settings.default_popup_frequency_value}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_popup_frequency_value: Number(e.target.value) || 1,
                      })
                    }
                    className="w-1/2 rounded-xl border border-zinc-700 bg-zinc-800/90 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <select
                    value={settings.default_popup_frequency_unit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_popup_frequency_unit: e.target.value as AdFrequencyUnit,
                      })
                    }
                    className="w-1/2 rounded-xl border border-zinc-700 bg-zinc-800/90 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="hours">Hours</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Initial Delay (Seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.default_popup_delay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_popup_delay: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="e.g. 15"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/90 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Wait X seconds after user enters page before displaying eligible popup
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Close Countdown (Seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.default_countdown_seconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_countdown_seconds: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="0 for immediate close button"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/90 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Optional countdown before closing (set to 0 for immediate close button)
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {saving ? 'Saving Settings...' : 'Save Monetization Settings'}
            </button>
          </div>
        </form>
      )}

      {/* CREATE / EDIT AD MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white">
                {editingAdId ? 'Edit Advertisement Slot' : 'Create New Advertisement Slot'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAd} className="space-y-4">
              {/* Ad Name & Slot Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Ad Slot Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Adsterra Header Banner 728x90"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Slot Position <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as AdType)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="header">Header Advertisement (Below Navigation)</option>
                    <option value="footer">Footer Advertisement (Above Site Footer)</option>
                    <option value="popup">Popup Advertisement (Responsive Modal)</option>
                    <option value="video_player">Video Page Ad (Below Video Player)</option>
                    <option value="in_content">In-Content / Section Ad</option>
                  </select>
                </div>
              </div>

              {/* Provider, Status & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Provider</label>
                  <select
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value as AdProvider)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="adsterra">Adsterra</option>
                    <option value="custom">Custom Banner / HTML</option>
                    <option value="adsense">Google AdSense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AdStatus)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="active">Active (Live)</option>
                    <option value="inactive">Inactive (Paused)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Priority (1 to 5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value) || 1)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Supported Banner Dimensions & Exact Box Sizing */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-white">
                      Ad Box Size (Pixel Dimensions) <span className="text-red-400">*</span>
                    </label>
                    <p className="text-[11px] text-zinc-400">
                      Configure the exact pixel width and height applied to the user panel ad box.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    {formWidth} × {formHeight} px
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={formBannerSize === 'custom' ? 'sm:col-span-1' : 'sm:col-span-3'}>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Preset Size
                    </label>
                    <select
                      value={formBannerSize}
                      onChange={(e) => handleSizePresetChange(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <optgroup label="Standard Sizes">
                        <option value="320x50">320 × 50 px (Mobile Leaderboard / Standard Mobile)</option>
                        <option value="728x60">728 × 60 px (Desktop Banner Standard)</option>
                        <option value="728x90">728 × 90 px (Leaderboard Banner)</option>
                        <option value="300x250">300 × 250 px (Medium Rectangle / Inline)</option>
                        <option value="336x280">336 × 280 px (Large Rectangle)</option>
                      </optgroup>
                      <optgroup label="Leaderboard & Billboard">
                        <option value="970x90">970 × 90 px (Large Leaderboard)</option>
                        <option value="970x250">970 × 250 px (Billboard Desktop)</option>
                      </optgroup>
                      <optgroup label="Impact Banners">
                        <option value="700x150">700 × 150 px (Desktop Banner)</option>
                        <option value="600x150">600 × 150 px (Medium Banner)</option>
                        <option value="550x150">550 × 150 px (Compact Banner)</option>
                        <option value="468x60">468 × 60 px (Full Banner)</option>
                      </optgroup>
                      <optgroup label="Skyscrapers & Vertical">
                        <option value="300x600">300 × 600 px (Half Page / Skyscraper)</option>
                        <option value="160x600">160 × 600 px (Wide Skyscraper)</option>
                        <option value="250x250">250 × 250 px (Square)</option>
                      </optgroup>
                      <optgroup label="Responsive & Custom">
                        <option value="responsive">Responsive (728×60 Desktop / 320×50 Mobile)</option>
                        <option value="custom">Custom Size (Specify Exact Width × Height)</option>
                      </optgroup>
                    </select>
                  </div>

                  {formBannerSize === 'custom' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                          Width (px)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="50"
                            max="2400"
                            required
                            value={formWidth}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setFormWidth(val);
                              setFormCustomWidth(val);
                            }}
                            placeholder="e.g. 728"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 pl-3 pr-8 text-xs text-white focus:border-emerald-500 focus:outline-none"
                          />
                          <span className="absolute right-2.5 top-2 text-[11px] text-zinc-400 font-mono">px</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                          Height (px)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="20"
                            max="1800"
                            required
                            value={formHeight}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setFormHeight(val);
                              setFormCustomHeight(val);
                            }}
                            placeholder="e.g. 90"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 pl-3 pr-8 text-xs text-white focus:border-emerald-500 focus:outline-none"
                          />
                          <span className="absolute right-2.5 top-2 text-[11px] text-zinc-400 font-mono">px</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Live dimension container visualizer */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                    <span>Dimension Box Preview:</span>
                    <span className="font-mono text-zinc-300">
                      Aspect Ratio: {(formWidth / Math.max(1, formHeight)).toFixed(2)}:1
                    </span>
                  </div>
                  <div className="flex justify-center items-center p-3 rounded-lg bg-zinc-900 border border-zinc-800/80 overflow-hidden min-h-[70px]">
                    <div
                      style={{
                        width: `${Math.min(formWidth, 480)}px`,
                        height: `${Math.min(Math.max(formHeight * (Math.min(formWidth, 480) / Math.max(1, formWidth)), 35), 180)}px`,
                      }}
                      className="border border-dashed border-emerald-500/60 bg-emerald-500/5 rounded flex flex-col items-center justify-center p-2 text-center transition-all duration-200"
                    >
                      <span className="text-[11px] font-bold text-emerald-300">
                        {formWidth} × {formHeight} px
                      </span>
                      <span className="text-[9px] text-zinc-400 uppercase tracking-wider">
                        {formBannerSize === 'custom' ? 'Custom Dimensions' : formBannerSize}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ad Code (The exact Adsterra snippet) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Adsterra Ad Script / Code
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Preserves exact code verbatim
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder={`<!-- Paste your exact Adsterra script tag or iframe code here -->\n<script type="text/javascript">\n\tatOptions = {\n\t\t'key' : '...', ...\n\t};\n</script>\n<script type="text/javascript" src="//www.highperformanceformat.com/.../invoke.js"></script>`}
                  className="w-full font-mono rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  You can paste your Adsterra banner code, social bar, native banner, or iframe snippet directly here without modification.
                </span>
              </div>

              {/* Page & Device Targeting */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-300">Page Targeting</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PAGE_TARGETS.map((target) => {
                    const isSelected = formTargetPages.includes(target.value);
                    return (
                      <button
                        key={target.value}
                        type="button"
                        onClick={() => togglePageTarget(target.value)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {target.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Device Targeting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Device Targeting
                  </label>
                  <select
                    value={formDeviceTarget}
                    onChange={(e) => setFormDeviceTarget(e.target.value as AdDeviceTarget)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="all">All Devices (Desktop + Tablet + Mobile)</option>
                    <option value="desktop">Desktop Only</option>
                    <option value="mobile">Mobile Only</option>
                    <option value="tablet">Tablet Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Scheduling (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      placeholder="Start"
                      className="rounded-xl border border-zinc-700 bg-zinc-800 py-1.5 px-2 text-[11px] text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <input
                      type="datetime-local"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      placeholder="End"
                      className="rounded-xl border border-zinc-700 bg-zinc-800 py-1.5 px-2 text-[11px] text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Popup-specific configuration section */}
              {formType === 'popup' && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" />
                    Popup Timing & Frequency Controls
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                        Frequency Mode
                      </label>
                      <select
                        value={formFrequencyMode}
                        onChange={(e) => setFormFrequencyMode(e.target.value as AdFrequencyMode)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 px-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="every_hours">Every X Hours</option>
                        <option value="every_minutes">Every X Minutes</option>
                        <option value="once_per_session">Once per Browser Session</option>
                        <option value="once_per_day">Once per 24 Hours</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                        Interval Value & Unit
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={formFrequencyValue}
                          onChange={(e) => setFormFrequencyValue(Number(e.target.value) || 1)}
                          className="w-1/2 rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 px-2.5 text-xs text-white"
                        />
                        <select
                          value={formFrequencyUnit}
                          onChange={(e) => setFormFrequencyUnit(e.target.value as AdFrequencyUnit)}
                          className="w-1/2 rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 px-2.5 text-xs text-white"
                        >
                          <option value="hours">Hours</option>
                          <option value="minutes">Minutes</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                        Initial Delay (Seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formInitialDelay}
                        onChange={(e) => setFormInitialDelay(Number(e.target.value) || 0)}
                        placeholder="e.g. 15"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 px-2.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                        Countdown to Close (Seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formCountdownSeconds}
                        onChange={(e) => setFormCountdownSeconds(Number(e.target.value) || 0)}
                        placeholder="e.g. 5"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 px-2.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="closeButtonCheck"
                      checked={formCloseButtonEnabled}
                      onChange={(e) => setFormCloseButtonEnabled(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800 text-emerald-600"
                    />
                    <label htmlFor="closeButtonCheck" className="text-xs text-zinc-300">
                      Show visible close button on popup
                    </label>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingAdId ? 'Update Advertisement' : 'Create Advertisement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewAd && (() => {
        const adDims = getAdDimensions(previewAd);
        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white">Ad Slot Preview: {previewAd.name}</h2>
                  <p className="text-[11px] text-zinc-400">
                    Position: <span className="text-zinc-200 uppercase font-mono">{previewAd.type}</span> &bull; Configured Size:{' '}
                    <span className="text-emerald-400 font-mono font-bold">{adDims.displayText}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewAd(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Device Switcher */}
              <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex-wrap gap-2">
                <span className="text-xs text-zinc-400 font-medium">Preview Dimension:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('configured')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      previewDevice === 'configured'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Configured ({adDims.displayText})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('billboard')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      previewDevice === 'billboard'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    970 × 250
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      previewDevice === 'desktop'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    728 × 60
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('700x150')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      previewDevice === '700x150'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    700 × 150
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('600x150')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      previewDevice === '600x150'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    600 × 150
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('550x150')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      previewDevice === '550x150'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    550 × 150
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      previewDevice === 'mobile'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    320 × 50 (Mobile)
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex justify-center items-center overflow-x-auto min-h-[90px]">
                <AdsterraSlot
                  ad={previewAd}
                  isPreview={true}
                  forcedSize={
                    previewDevice === 'configured'
                      ? undefined
                      : previewDevice === 'billboard'
                      ? '970x250'
                      : previewDevice === '700x150'
                      ? '700x150'
                      : previewDevice === '600x150'
                      ? '600x150'
                      : previewDevice === '550x150'
                      ? '550x150'
                      : previewDevice === 'desktop'
                      ? '728x60'
                      : '320x50'
                  }
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewAd(null)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
