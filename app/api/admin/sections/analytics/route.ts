import { NextResponse } from 'next/server';
import { getSectionAnalytics } from '@/lib/videoService';
import { verifyServerAdminSession } from '@/lib/adminAuth';

export async function GET() {
  try {
    const session = await verifyServerAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }
    const analytics = await getSectionAnalytics();
    return NextResponse.json({ success: true, analytics });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch section analytics' },
      { status: 500 }
    );
  }
}
