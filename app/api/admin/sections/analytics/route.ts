import { NextResponse } from 'next/server';
import { getSectionAnalytics } from '@/lib/videoService';

export async function GET() {
  try {
    const analytics = await getSectionAnalytics();
    return NextResponse.json({ success: true, analytics });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch section analytics' },
      { status: 500 }
    );
  }
}
