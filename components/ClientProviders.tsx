'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthModal } from '@/components/AuthModal';
import { PopupAd } from '@/components/ads/PopupAd';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <PopupAd />
        <AuthModal />
      </AuthProvider>
    </ThemeProvider>
  );
}
