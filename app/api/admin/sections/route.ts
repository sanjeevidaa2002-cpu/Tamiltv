import { NextRequest, NextResponse } from 'next/server';
import { createSection, getSections, reorderSections } from '@/lib/videoService';

export async function GET() {
  try {
    const sections = await getSections(true);
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
    if (!body.name || !body.name.trim()) {
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

export async function PUT(request: NextRequest) {
  // Reorder endpoint
  try {
    const body = await request.json();
    if (Array.isArray(body.orderedIds)) {
      await reorderSections(body.orderedIds);
      return NextResponse.json({ success: true, message: 'Sections reordered successfully' });
    }
    return NextResponse.json({ success: false, error: 'orderedIds array is required' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reorder sections' },
      { status: 500 }
    );
  }
}
