import { NextRequest, NextResponse } from 'next/server';
import { getAdSettings, updateAdSettings } from '@/lib/adService';
import { verifyServerAdminSession } from '@/lib/adminAuth';

export async function GET() {
  try {
    const session = await verifyServerAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }
    const settings = await getAdSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ad settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await verifyServerAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }
    const body = await request.json();
    await updateAdSettings(body);
    return NextResponse.json({ success: true, message: 'Ad settings updated successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ad settings' },
      { status: 500 }
    );
  }
}
