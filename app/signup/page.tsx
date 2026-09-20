'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeaderAdBox } from '@/components/ads/HeaderAdBox';
import { FooterAdBox } from '@/components/ads/FooterAdBox';
import { Mail, Lock, User as UserIcon, AlertCircle, Copy, Check } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { user, registerWithEmail, loginWithGoogle, googleLoginEnabled } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail(email, password, displayName);
      router.push('/');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      router.push('/');
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (err?.code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain') || msg.includes('AUTH_UNAUTHORIZED_DOMAIN')) {
        setError(
          'Google Sign-In is restricted because this deployment domain is not yet authorized in Firebase Console. Please sign in with Email & Password or authorize this domain in Firebase.'
        );
      } else if (err?.code === 'auth/popup-closed-by-user' || msg.includes('popup-closed')) {
        setError('Google sign-up was cancelled.');
      } else {
        setError(msg || 'Google sign-up could not be completed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* 1. Header */}
      <Navbar />

      {/* 2. Header Ad Box */}
      <HeaderAdBox page="signup" />

      {/* 3. Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">Create an Account</h1>
            <p className="text-xs text-zinc-400 mt-1">Start streaming your favorite content today</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{error}</span>
                  {error.includes('Firebase') && typeof window !== 'undefined' && (
                    <div className="mt-2.5 rounded-lg border border-red-500/20 bg-zinc-950/80 p-2.5 text-[11px] text-zinc-300">
                      <span className="font-semibold text-zinc-200">To authorize this domain for Google OAuth:</span>
                      <ol className="list-decimal ml-4 mt-1 space-y-1 text-zinc-400">
                        <li>Open Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains</li>
                        <li className="flex items-center gap-1.5 flex-wrap">
                          <span>Add domain:</span>
                          <code className="text-red-300 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 select-all font-semibold">
                            {window.location.hostname}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined') {
                                navigator.clipboard.writeText(window.location.hostname);
                                setCopiedDomain(true);
                                setTimeout(() => setCopiedDomain(false), 2000);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-200 hover:bg-zinc-700 transition"
                          >
                            {copiedDomain ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedDomain ? 'Copied' : 'Copy Domain'}</span>
                          </button>
                        </li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (Min. 6 chars)"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-red-600 py-3 text-xs font-semibold text-white hover:bg-red-500 transition disabled:opacity-50 mt-2 shadow-lg shadow-red-950/50"
            >
              {submitting ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          {googleLoginEnabled && (
            <>
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <span className="relative bg-zinc-900 px-3 text-[11px] text-zinc-500 uppercase tracking-wider">
                  Or continue with
                </span>
              </div>

              <button
                type="button"
                id="google-signup-btn"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign Up with Google
              </button>
            </>
          )}

          <p className="mt-6 text-center text-xs text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-red-400 hover:text-red-300 transition">
              Sign In
            </Link>
          </p>
        </div>
      </main>

      {/* 4. Footer Ad Box */}
      <FooterAdBox page="signup" />

      {/* 5. Footer */}
      <Footer />
    </div>
  );
}
