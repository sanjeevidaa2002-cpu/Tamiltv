import { NextRequest, NextResponse } from 'next/server';
import { verifyServerAdminSession } from '@/lib/adminAuth';
import { inspectVideoUrl } from '@/lib/jiohotstarParser';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerAdminSession(req);
    if (!session.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized administrator session.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid content URL.' },
        { status: 400 }
      );
    }

    const metadata = await inspectVideoUrl(url.trim());
    return NextResponse.json({ success: true, metadata });
  } catch (error: any) {
    console.error('Error inspecting content URL:', error);
    const message = error.message || 'Unable to retrieve metadata from the supplied URL.';
    return NextResponse.json(
      {
        error: message.includes('SSRF') || message.includes('invalid')
          ? 'This URL does not provide a supported authorized playback/metadata source.'
          : message,
      },
      { status: 400 }
    );
  }
}
