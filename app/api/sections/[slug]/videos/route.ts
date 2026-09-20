import { NextRequest, NextResponse } from 'next/server';
import { getVideosBySection, getSectionBySlug } from '@/lib/videoService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const section = await getSectionBySlug(slug);
    if (!section) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('isAdmin') === 'true';

    const videos = await getVideosBySection(slug, isAdmin);
    return NextResponse.json({
      success: true,
      section,
      videos,
      count: videos.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch section videos' },
      { status: 500 }
    );
  }
}
