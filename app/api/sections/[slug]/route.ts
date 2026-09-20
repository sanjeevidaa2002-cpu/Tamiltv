import { NextRequest, NextResponse } from 'next/server';
import { getSectionBySlug } from '@/lib/videoService';

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
    return NextResponse.json({ success: true, section });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch section' },
      { status: 500 }
    );
  }
}
