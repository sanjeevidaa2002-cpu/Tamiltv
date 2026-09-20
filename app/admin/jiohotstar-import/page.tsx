'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { AdminJioHotstarImport } from '@/components/admin/AdminJioHotstarImport';
import { getSections, getPlaylists, getVideos } from '@/lib/videoService';
import { Section, Playlist, Video } from '@/lib/types';
import {
  ShieldAlert,
  Loader2,
  Tv,
  ArrowLeft,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Film,
  Upload,
  Link2,
} from 'lucide-react';

export default function JioHotstarImportPage() {
  const router = useRouter();
  const { admin, isAuthenticated: isAdmin, isLoading: authLoading, login: adminLogin } = useAdminAuth();

  const [sections, setSections] = useState<Section[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Login form fallback state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;
    async function loadData() {
      try {
        const [secs, pls] = await Promise.all([getSections(), getPlaylists()]);
        if (isMounted) {
          setSections(secs);
          setPlaylists(pls);
        }
      } catch (err) {
        console.error('Failed to load sections/playlists:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const res = await adminLogin(username, password);
      if (!res.success) {
        setLoginError(res.error || 'Invalid administrator credentials');
      }
    } catch {
      setLoginError('Failed to connect to administrator authentication service.');
    } finally {
      setLoggingIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          <p className="text-xs text-zinc-400">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-white">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 mb-3">
              <Tv className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">JioHotstar Import Portal</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Please sign in with your Administrator account to access the auto-import engine.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/40 p-3 text-xs text-red-400">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Admin Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition disabled:opacity-50"
            >
              {loggingIn ? 'Authenticating...' : 'Sign In to Admin Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition">
              ← Return to TamilTV Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          <span className="text-zinc-100">{toastMessage.text}</span>
        </div>
      )}

      {/* Admin Subheader Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Admin Panel</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Link href="/admin" className="hover:text-zinc-200">Admin</Link>
              <span>/</span>
              <span className="font-semibold text-white">JioHotstar Import</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden sm:inline">
              Logged in as <strong className="text-zinc-200 font-semibold">{admin?.username}</strong>
            </span>
            <Link
              href="/"
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
            >
              View Site
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loadingData ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-3" />
            <p className="text-xs text-zinc-400">Loading system data & configuration...</p>
          </div>
        ) : (
          <AdminJioHotstarImport
            sections={sections}
            playlists={playlists}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  );
}
