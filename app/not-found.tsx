'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-100">
      <div className="mx-auto max-w-md space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-red-500 shadow-xl">
          <span className="text-2xl font-black tracking-tight">404</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Page Not Found</h1>
          <p className="text-sm text-zinc-400">
            The page or video you are looking for doesn&apos;t exist or has been relocated.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 shadow-lg shadow-red-600/20"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </main>
  );
}
