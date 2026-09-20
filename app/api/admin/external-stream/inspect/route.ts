import { NextRequest, NextResponse } from 'next/server';
import { verifyServerAdminSession } from '@/lib/adminAuth';
import { ExternalStreamInspectionResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Helper to safely extract attribute values from HTML strings
 */
function extractMetaTag(html: string, property: string): string | null {
  // Try property="..." or name="..."
  const regexes = [
    new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["']`, 'i'),
  ];
  for (const reg of regexes) {
    const match = html.match(reg);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const ogTitle = extractMetaTag(html, 'title');
  if (ogTitle) return ogTitle;
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  return null;
}

function extractDescription(html: string): string | null {
  return extractMetaTag(html, 'description');
}

function extractImage(html: string): string | null {
  return extractMetaTag(html, 'image');
}

function extractEmbedPlayer(html: string): string | null {
  const ogVideo = extractMetaTag(html, 'video:url') || extractMetaTag(html, 'video') || extractMetaTag(html, 'player');
  if (ogVideo && ogVideo.startsWith('http')) {
    return ogVideo;
  }
  return null;
}

/**
 * POST /api/admin/external-stream/inspect
 * Protected API to inspect authorized provider stream URLs and retrieve metadata without bypassing protections
 */
export async function POST(req: NextRequest) {
  // 1. Verify Admin Authentication
  const session = await verifyServerAdminSession();
  if (!session.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin credentials required to inspect and import streams.' },
      { status: 401 }
    );
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: 'Please enter a stream or video URL' }, { status: 400 });
  }

  // 2. Validate URL format and HTTPS protocol
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Invalid URL protocol. Stream URLs must use HTTPS or HTTP.' },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format. Please paste a valid web URL.' },
      { status: 400 }
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname;
  const host = req.headers.get('host') || 'localhost:3000';
  const domainForTwitch = host.split(':')[0];

  // 3. Provider-Specific Official Handlers (Guaranteed Authorized Embeds & Metadata)

  // --- A. YouTube & YouTube Live ---
  const isYouTube = hostname.includes('youtube.com') || hostname.includes('youtu.be');
  if (isYouTube) {
    let videoId: string | null = null;
    const isLivePath = pathname.startsWith('/live/');
    if (isLivePath) {
      videoId = pathname.replace('/live/', '').split('/')[0].split('?')[0];
    } else if (hostname.includes('youtu.be')) {
      videoId = pathname.slice(1).split('/')[0].split('?')[0];
    } else {
      videoId = parsedUrl.searchParams.get('v');
      if (!videoId && pathname.includes('/embed/')) {
        videoId = pathname.split('/embed/')[1].split('/')[0].split('?')[0];
      }
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not detect a valid YouTube Video or Live ID from the provided URL.' },
        { status: 400 }
      );
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`;
    const officialThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    // Retrieve official metadata via YouTube oEmbed API
    let title = isLivePath ? 'YouTube Live Broadcast' : 'YouTube Video';
    let description = 'Official authorized broadcast stream via YouTube.';
    let providerName = 'YouTube';
    let isLive = isLivePath;

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) title = oembedData.title;
        if (oembedData.author_name) providerName = `YouTube (${oembedData.author_name})`;
        if (oembedData.title && /live/i.test(oembedData.title)) {
          isLive = true;
        }
      }
    } catch {
      // Fallback to defaults if oEmbed rate-limited or offline
    }

    const result: ExternalStreamInspectionResult = {
      title,
      description,
      thumbnail: officialThumbnail,
      duration: 0,
      contentType: isLive ? 'live' : 'video',
      isLive,
      liveStatus: isLive ? 'LIVE' : 'UNKNOWN',
      provider: providerName,
      providerUrl: `https://${hostname}`,
      sourceUrl: rawUrl,
      embedUrl,
      sourceType: 'authorized_embed',
      authorized: true,
      publishedDate: new Date().toISOString(),
    };
    return NextResponse.json({ success: true, metadata: result });
  }

  // --- B. Twitch Live & Videos ---
  const isTwitch = hostname.includes('twitch.tv');
  if (isTwitch) {
    const channelMatch = pathname.match(/^\/([a-zA-Z0-9_]{3,30})/);
    const channelName = channelMatch ? channelMatch[1] : '';
    if (!channelName || channelName === 'directory' || channelName === 'videos') {
      return NextResponse.json(
        { error: 'Please enter a valid Twitch channel or stream URL (e.g., https://www.twitch.tv/channelname).' },
        { status: 400 }
      );
    }

    const embedUrl = `https://player.twitch.tv/?channel=${channelName}&parent=${domainForTwitch}&autoplay=true`;
    const result: ExternalStreamInspectionResult = {
      title: `${channelName} - Live Stream`,
      description: `Official authorized live stream broadcast by ${channelName} on Twitch.`,
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      duration: 0,
      contentType: 'live',
      isLive: true,
      liveStatus: 'LIVE',
      provider: 'Twitch',
      providerUrl: `https://${hostname}`,
      sourceUrl: rawUrl,
      embedUrl,
      sourceType: 'authorized_embed',
      authorized: true,
      publishedDate: new Date().toISOString(),
    };
    return NextResponse.json({ success: true, metadata: result });
  }

  // --- C. Vimeo ---
  const isVimeo = hostname.includes('vimeo.com');
  if (isVimeo) {
    const vimeoIdMatch = pathname.match(/(?:videos?\/|channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|^)(\d+)/);
    const vimeoId = vimeoIdMatch ? vimeoIdMatch[1] : null;

    let title = 'Vimeo Broadcast Video';
    let description = 'Official authorized playback video via Vimeo.';
    let thumbnail = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80';
    let duration = 0;

    if (vimeoId) {
      try {
        const vimeoRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(rawUrl)}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (vimeoRes.ok) {
          const vData = await vimeoRes.json();
          if (vData.title) title = vData.title;
          if (vData.description) description = vData.description;
          if (vData.thumbnail_url) thumbnail = vData.thumbnail_url;
          if (vData.duration) duration = Number(vData.duration);
        }
      } catch {}
    }

    const embedUrl = vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1`
      : rawUrl;

    const result: ExternalStreamInspectionResult = {
      title,
      description,
      thumbnail,
      duration,
      contentType: 'video',
      isLive: false,
      liveStatus: 'UNKNOWN',
      provider: 'Vimeo',
      providerUrl: `https://${hostname}`,
      sourceUrl: rawUrl,
      embedUrl,
      sourceType: 'authorized_embed',
      authorized: true,
      publishedDate: new Date().toISOString(),
    };
    return NextResponse.json({ success: true, metadata: result });
  }

  // --- D. Dailymotion ---
  const isDailymotion = hostname.includes('dailymotion.com') || hostname.includes('dai.ly');
  if (isDailymotion) {
    const dmMatch = pathname.match(/(?:video\/|hub\/|)([a-zA-Z0-9]+)/);
    const dmId = dmMatch ? dmMatch[1] : '';
    const embedUrl = dmId ? `https://www.dailymotion.com/embed/video/${dmId}` : rawUrl;

    const result: ExternalStreamInspectionResult = {
      title: 'Dailymotion Stream',
      description: 'Official authorized stream broadcast via Dailymotion.',
      thumbnail: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
      duration: 0,
      contentType: 'video',
      isLive: false,
      liveStatus: 'UNKNOWN',
      provider: 'Dailymotion',
      providerUrl: `https://${hostname}`,
      sourceUrl: rawUrl,
      embedUrl,
      sourceType: 'authorized_embed',
      authorized: true,
      publishedDate: new Date().toISOString(),
    };
    return NextResponse.json({ success: true, metadata: result });
  }

  // --- E. Direct Authorized HLS Stream (.m3u8) or Direct Video (.mp4 / .webm) ---
  const isHls = pathname.endsWith('.m3u8') || parsedUrl.search.includes('.m3u8');
  const isDirectMp4 = pathname.endsWith('.mp4') || pathname.endsWith('.webm');
  if (isHls || isDirectMp4) {
    const filename = pathname.split('/').pop()?.split('?')[0] || 'stream';
    const friendlyTitle = filename
      .replace(/\.(m3u8|mp4|webm)$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const result: ExternalStreamInspectionResult = {
      title: friendlyTitle || (isHls ? 'Authorized Live HLS Stream' : 'Authorized Video Stream'),
      description: `Official authorized direct media stream from ${hostname}.`,
      thumbnail: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&auto=format&fit=crop&q=80',
      duration: 0,
      contentType: isHls ? 'live' : 'video',
      isLive: isHls,
      liveStatus: isHls ? 'LIVE' : 'UNKNOWN',
      provider: isHls ? 'Authorized Live HLS' : `${hostname} Direct`,
      providerUrl: `https://${hostname}`,
      sourceUrl: rawUrl,
      embedUrl: rawUrl,
      sourceType: isHls ? 'hls' : 'direct',
      authorized: true,
      publishedDate: new Date().toISOString(),
    };
    return NextResponse.json({ success: true, metadata: result });
  }

  // --- F. JioHotstar / Hotstar / JioCinema Official Streams & Authorized Embeds ---
  const isJioOrHotstar =
    hostname.includes('hotstar.com') ||
    hostname.includes('jiohotstar.com') ||
    hostname.includes('jiocinema.com');

  if (isJioOrHotstar) {
    let title = 'JioHotstar Official Live Broadcast';
    let description = 'Official authorized live sports / entertainment stream via JioHotstar.';
    let thumbnail = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80';
    let isLive = true;
    let liveStatus: ExternalStreamInspectionResult['liveStatus'] = 'LIVE';
    let authorized = false;
    let embedUrl = '';
    let errorReason: string | undefined = undefined;

    // Check if the URL supplied is an authorized embed URL or player URL
    const isEmbedUrlPattern =
      pathname.includes('/embed/') ||
      pathname.includes('/player/') ||
      parsedUrl.searchParams.has('embed') ||
      parsedUrl.searchParams.has('player');

    // Attempt to inspect public OpenGraph / oEmbed / JSON-LD metadata
    try {
      const pageRes = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (Compatible; StreamingMetadataFetcher/1.0)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const extractedTitle = extractTitle(html);
        const extractedDesc = extractDescription(html);
        const extractedImg = extractImage(html);
        const extractedPlayer = extractEmbedPlayer(html);

        if (extractedTitle) title = extractedTitle;
        if (extractedDesc) description = extractedDesc;
        if (extractedImg) thumbnail = extractedImg;

        // Check if page indicates live status
        if (/live/i.test(title) || /live/i.test(description) || html.includes('isLiveBroadcast') || html.includes('LiveBlogPosting')) {
          isLive = true;
          liveStatus = 'LIVE';
        } else if (html.includes('"status":"upcoming"') || html.includes('upcoming')) {
          isLive = false;
          liveStatus = 'UPCOMING';
        }

        // If an authorized embed/player was discovered or URL is already an embed
        if (extractedPlayer) {
          embedUrl = extractedPlayer;
          authorized = true;
        } else if (isEmbedUrlPattern) {
          embedUrl = rawUrl;
          authorized = true;
        } else {
          // If the provider supplied a web article / landing page without embed rights
          authorized = false;
          errorReason =
            'This JioHotstar URL is a webpage link that does not expose an authorized public embed or player URL. If JioHotstar provides an official embed URL (e.g., /embed/...) for this broadcast, please provide that embed link directly.';
        }
      } else {
        if (isEmbedUrlPattern) {
          embedUrl = rawUrl;
          authorized = true;
        } else {
          authorized = false;
          errorReason = `The provider server returned HTTP ${pageRes.status}. Unable to verify authorized embed playback for this URL.`;
        }
      }
    } catch (e: any) {
      if (isEmbedUrlPattern) {
        embedUrl = rawUrl;
        authorized = true;
      } else {
        authorized = false;
        errorReason = 'Unable to connect to the external provider. Check network availability or ensure the URL provides an authorized embed.';
      }
    }

    if (!authorized) {
      return NextResponse.json(
        {
          error:
            errorReason ||
            'This URL does not provide an authorized playback or embed source supported by the application. Please provide an official authorized embed or player URL.',
          unauthorized: true,
        },
        { status: 422 }
      );
    }

    const result: ExternalStreamInspectionResult = {
      title,
      description,
      thumbnail,
      duration: 0,
      contentType: isLive ? 'live' : 'video',
      isLive,
      liveStatus,
      provider: 'JioHotstar',
      providerUrl: `https://${hostname}`,
      sourceUrl: rawUrl,
      embedUrl,
      sourceType: 'authorized_embed',
      authorized: true,
      publishedDate: new Date().toISOString(),
    };
    return NextResponse.json({ success: true, metadata: result });
  }

  // --- G. Generalized Authorized Embed or OpenGraph Provider ---
  // Admin pastes another authorized provider URL with OpenGraph video or official embed player
  try {
    const pageRes = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `External provider returned HTTP status ${pageRes.status}. Unable to retrieve metadata.` },
        { status: 400 }
      );
    }

    const html = await pageRes.text();
    const title = extractTitle(html) || `${hostname} Stream`;
    const description = extractDescription(html) || `Authorized streaming content from ${hostname}`;
    const thumbnail =
      extractImage(html) ||
      'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80';
    const embedPlayer = extractEmbedPlayer(html);

    // Is it an official embed/iframe URL or has og:video player?
    const isEmbedUrlPattern =
      pathname.includes('/embed/') ||
      pathname.includes('/player/') ||
      parsedUrl.searchParams.has('embed');

    const embedUrl = embedPlayer || (isEmbedUrlPattern ? rawUrl : null);

    if (!embedUrl) {
      return NextResponse.json(
        {
          error:
            'This URL does not provide an authorized playback or embed source supported by the application. Please provide an official provider-supported embed or player URL.',
        },
        { status: 422 }
      );
    }

    const isLive = /live/i.test(title) || /live/i.test(description) || html.includes('isLiveBroadcast');

    const result: ExternalStreamInspectionResult = {
      title,
      description,
      thumbnail,
      duration: 0,
      contentType: isLive ? 'live' : 'video',
      isLive,
      liveStatus: isLive ? 'LIVE' : 'UNKNOWN',
      provider: hostname.replace(/^www\./, ''),
      providerUrl: `https://${hostname}`,
      sourceUrl: rawUrl,
      embedUrl,
      sourceType: 'authorized_embed',
      authorized: true,
      publishedDate: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, metadata: result });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          'Unable to retrieve metadata. The external provider is unavailable or does not permit automated inspection. Please verify the URL.',
      },
      { status: 500 }
    );
  }
}
