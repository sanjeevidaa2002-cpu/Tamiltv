import { NextRequest, NextResponse } from 'next/server';
import { getVideos, getVideosBySection } from '@/lib/videoService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionSlug = searchParams.get('section');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    let videos = [];
    if (sectionSlug && sectionSlug.toLowerCase() !== 'all') {
      videos = await getVideosBySection(sectionSlug, isAdmin);
    } else {
      videos = await getVideos(isAdmin);
    }

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
