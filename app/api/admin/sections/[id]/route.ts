import { NextRequest, NextResponse } from 'next/server';
import { updateSection, deleteSection, getSectionBySlug } from '@/lib/videoService';
import { verifyServerAdminSession } from '@/lib/adminAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const section = await getSectionBySlug(id);
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyServerAdminSession();
  if (!session.authenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    await updateSection(id, body);
    return NextResponse.json({ success: true, message: 'Section updated successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update section' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyServerAdminSession();
  if (!session.authenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteSection(id);
    return NextResponse.json({ success: true, message: 'Section deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete section' },
      { status: 500 }
    );
  }
}
