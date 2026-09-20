import type {Metadata} from 'next';
import './globals.css';
import { ClientProviders } from '@/components/ClientProviders';

export const metadata: Metadata = {
  title: 'Video Streaming Platform',
  description: 'A modern, video-focused streaming platform with professional HTML5 and HLS playback, secure authentication, admin video management, playlist organization, and responsive playback controls.',
  openGraph: {
    title: 'Video Streaming Platform',
    description: 'A modern, video-focused streaming platform with professional HTML5 and HLS playback, secure authentication, admin video management, playlist organization, and responsive playback controls.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Video Streaming Platform',
    description: 'A modern, video-focused streaming platform with professional HTML5 and HLS playback, secure authentication, admin video management, playlist organization, and responsive playback controls.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark bg-zinc-950 text-zinc-100">
      <body suppressHydrationWarning className="min-h-screen bg-zinc-950 font-sans antialiased selection:bg-red-500/30 selection:text-red-200">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
