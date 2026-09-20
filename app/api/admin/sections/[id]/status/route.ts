import { NextRequest, NextResponse } from 'next/server';
import { toggleSectionStatus } from '@/lib/videoService';
import { verifyServerAdminSession } from '@/lib/adminAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyServerAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const status = body.status;
    if (status !== 'enabled' && status !== 'disabled') {
      return NextResponse.json(
        { success: false, error: 'Status must be either "enabled" or "disabled"' },
        { status: 400 }
      );
    }
    await toggleSectionStatus(id, status);
    return NextResponse.json({ success: true, message: `Section status changed to ${status}` });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update section status' },
      { status: 500 }
    );
  }
}
