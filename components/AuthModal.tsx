'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { X, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, Copy, Check } from 'lucide-react';

export function AuthModal() {
  const router = useRouter();
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    redirectVideoId,
    clearRedirectVideoId,
    googleLoginEnabled,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    sendResetEmail,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isAuthModalOpen) return null;

  const handlePostAuthSuccess = () => {
    closeAuthModal();
    if (redirectVideoId) {
      const target = redirectVideoId;
      clearRedirectVideoId();
      router.push(`/watch?v=${target}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (authModalMode !== 'forgot' && (!password || password.length < 6)) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (authModalMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      if (authModalMode === 'login') {
        await loginWithEmail(email, password);
        handlePostAuthSuccess();
      } else if (authModalMode === 'signup') {
        await registerWithEmail(email, password, displayName || email.split('@')[0]);
        handlePostAuthSuccess();
      } else if (authModalMode === 'forgot') {
        await sendResetEmail(email);
        setSuccessMessage('Password reset link has been dispatched to your email.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('This email is already registered. Try signing in instead.');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError('Authentication error occurred. Please verify your details.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      handlePostAuthSuccess();
    } catch (err: unknown) {
      const errorObj = err as any;
      const msg = errorObj?.message || String(err);
      if (errorObj?.code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain') || msg.includes('AUTH_UNAUTHORIZED_DOMAIN')) {
        setError(
          'Google Sign-In is restricted because this deployment domain is not yet authorized in Firebase Console. Please sign in with Email & Password or authorize this domain in Firebase.'
        );
      } else if (errorObj?.code === 'auth/popup-closed-by-user' || msg.includes('popup-closed')) {
        setError('Google sign-in window was closed.');
      } else {
        setError(msg || 'Google Sign-In was cancelled or failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          id="auth-modal-close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {authModalMode === 'login' && 'Sign in to VideoStream'}
            {authModalMode === 'signup' && 'Create Your Account'}
            {authModalMode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400">
            {authModalMode === 'login' && 'Sign in to start watching high-definition streams.'}
            {authModalMode === 'signup' && 'Join to access premium video playback.'}
            {authModalMode === 'forgot' && 'Enter your account email to receive a password reset link.'}
          </p>
        </div>

        {/* Feedback Alert */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes('Firebase') && typeof window !== 'undefined' && (
                  <div className="mt-2.5 rounded-lg border border-red-500/20 bg-zinc-950/70 p-2 text-[11px] text-zinc-300">
                    <span className="font-semibold text-zinc-200">To authorize this domain in Firebase:</span>
                    <ol className="list-decimal ml-4 mt-1 space-y-1 text-zinc-400">
                      <li>Go to Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains</li>
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

        {successMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Google OAuth Option */}
        {googleLoginEnabled && authModalMode !== 'forgot' && (
          <>
            <button
              type="button"
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/80 py-2.5 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 hover:border-zinc-600 disabled:opacity-50"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"
                />
              </svg>
              <span>
                {authModalMode === 'login' ? 'Sign in with Google' : authModalMode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
              </span>
            </button>

            <div className="relative my-5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <span className="relative bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-500">
                Or with email
              </span>
            </div>
          </>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalMode === 'signup' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {authModalMode !== 'forgot' && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Password</label>
                {authModalMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => openAuthModal('forgot')}
                    className="text-xs text-zinc-400 hover:text-red-400 transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          {authModalMode === 'signup' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={submitting}
            className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : authModalMode === 'login' ? 'Sign In' : authModalMode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-5 text-center text-xs text-zinc-400">
          {authModalMode === 'login' && (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="font-semibold text-red-400 hover:text-red-300 transition"
              >
                Sign up
              </button>
            </p>
          )}

          {authModalMode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="font-semibold text-red-400 hover:text-red-300 transition"
              >
                Sign in
              </button>
            </p>
          )}

          {authModalMode === 'forgot' && (
            <p>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="font-semibold text-red-400 hover:text-red-300 transition"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
