import { NextRequest, NextResponse } from 'next/server';
import { getSections, createSection } from '@/lib/videoService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDisabled = searchParams.get('all') === 'true' || searchParams.get('includeDisabled') === 'true';
    const sections = await getSections(includeDisabled);
    return NextResponse.json({ success: true, sections });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: 'Section name is required' }, { status: 400 });
    }
    const section = await createSection(body);
    return NextResponse.json({ success: true, section });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create section' },
      { status: 500 }
    );
  }
}
