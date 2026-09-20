'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { Advertisement, AdSettings, AdPageTarget } from '@/lib/types';
import {
  getAds,
  getAdSettings,
  isAdScheduledActive,
  isAdTargetMatching,
  canShowPopupAd,
  markPopupAdShown,
  getAdDimensions,
} from '@/lib/adService';
import { AdsterraSlot } from './AdsterraSlot';

export const PopupAd: React.FC = () => {
  const pathname = usePathname();
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending timers on route change
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    let isMounted = true;

    async function evaluatePopupAd() {
      try {
        const [settings, allAds]: [AdSettings, Advertisement[]] = await Promise.all([
          getAdSettings(),
          getAds(false),
        ]);

        if (!isMounted) return;

        // Check global switches
        if (!settings.ads_enabled || !settings.popup_ads_enabled) {
          return;
        }

        // Determine current page target
        let currentPage: AdPageTarget = 'home';
        if (pathname === '/') currentPage = 'home';
        else if (pathname.startsWith('/watch')) currentPage = 'video';
        else if (pathname.startsWith('/playlist')) currentPage = 'playlist';
        else if (pathname.startsWith('/section')) currentPage = 'section';
        else if (pathname.startsWith('/login')) currentPage = 'login';
        else if (pathname.startsWith('/signup')) currentPage = 'signup';

        // Filter eligible popup ads
        const eligibleAds = allAds
          .filter((a) => a.type === 'popup' && a.status === 'active' && a.code && a.code.trim())
          .filter((a) => isAdScheduledActive(a))
          .filter((a) => isAdTargetMatching(a, currentPage));

        if (eligibleAds.length === 0) return;

        // Pick highest priority eligible ad
        const candidate = eligibleAds[0];

        // Verify frequency limits
        if (!canShowPopupAd(candidate, settings)) {
          return;
        }

        // Delay timer before showing popup
        const delaySeconds =
          typeof candidate.initial_delay !== 'undefined'
            ? candidate.initial_delay
            : settings.default_popup_delay || 15;

        timerRef.current = setTimeout(() => {
          if (!isMounted) return;

          // Double check frequency immediately before showing
          if (!canShowPopupAd(candidate, settings)) return;

          setSelectedAd(candidate);
          setIsOpen(true);

          // Configure countdown
          const countdownSec =
            typeof candidate.countdown_seconds !== 'undefined'
              ? candidate.countdown_seconds
              : settings.default_countdown_seconds || 5;

          if (countdownSec > 0) {
            setCountdownRemaining(countdownSec);
            countdownIntervalRef.current = setInterval(() => {
              setCountdownRemaining((prev) => {
                if (prev <= 1) {
                  if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          } else {
            setCountdownRemaining(0);
          }

          // Record impression & set timestamp
          markPopupAdShown(candidate);
        }, Math.max(0, delaySeconds) * 1000);
      } catch (err) {
        console.warn('Popup ad evaluation error:', err);
      }
    }

    evaluatePopupAd();

    return () => {
      isMounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [pathname]);

  const handleClose = () => {
    if (countdownRemaining > 0 && selectedAd?.close_button_enabled === false) {
      return;
    }
    setIsOpen(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  };

  if (!isOpen || !selectedAd) {
    return null;
  }

  const canClose = countdownRemaining === 0 || selectedAd.close_button_enabled !== false;

  const dims = getAdDimensions(selectedAd);
  const modalMaxWidth = Math.min(Math.max(dims.width + 48, 360), 1020);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300"
    >
      {/* Backdrop dismiss when allowed */}
      <div className="absolute inset-0" onClick={canClose ? handleClose : undefined} />

      {/* Modal Dialog Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: `${modalMaxWidth}px`, maxWidth: '95vw' }}
        className="relative z-10 w-full rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl flex flex-col items-center max-h-[90vh] overflow-y-auto"
      >
        {/* Top bar with ad notice and close button */}
        <div className="w-full flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
              Sponsored
            </span>
            <span className="text-xs font-semibold text-zinc-200">Special Advertisement</span>
          </div>

          <div className="flex items-center gap-2">
            {countdownRemaining > 0 && (
              <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Close in {countdownRemaining}s
              </span>
            )}

            <button
              type="button"
              onClick={handleClose}
              disabled={!canClose && countdownRemaining > 0}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                canClose
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  : 'bg-zinc-800/40 text-zinc-600 cursor-not-allowed'
              }`}
              title="Close advertisement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Adsterra ad slot */}
        <div className="w-full flex justify-center items-center my-2 min-h-0">
          <AdsterraSlot ad={selectedAd} className="w-full" />
        </div>

        {/* Dismiss action button */}
        {canClose && (
          <div className="w-full flex justify-end mt-4 pt-2 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition py-1 px-3 rounded-lg hover:bg-zinc-800"
            >
              Continue to Website &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
