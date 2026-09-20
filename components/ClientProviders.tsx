'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthModal } from '@/components/AuthModal';
import { PopupAd } from '@/components/ads/PopupAd';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminAuthProvider>
          {children}
          <PopupAd />
          <AuthModal />
        </AdminAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
