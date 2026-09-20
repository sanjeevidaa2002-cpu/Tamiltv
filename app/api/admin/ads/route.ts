import { NextRequest, NextResponse } from 'next/server';
import { getAds, createAd, getAdSettings } from '@/lib/adService';
import { verifyServerAdminSession } from '@/lib/adminAuth';

export async function GET() {
  try {
    const [ads, settings] = await Promise.all([
      getAds(true),
      getAdSettings(),
    ]);
    return NextResponse.json({ success: true, ads, settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyServerAdminSession();
  if (!session.authenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Advertisement name is required' },
        { status: 400 }
      );
    }
    if (!body.type) {
      return NextResponse.json(
        { success: false, error: 'Advertisement slot type is required' },
        { status: 400 }
      );
    }

    const widthVal = Number(body.width || body.ad_width || body.custom_width) || undefined;
    const heightVal = Number(body.height || body.ad_height || body.custom_height) || undefined;

    const ad = await createAd({
      name: body.name.trim(),
      provider: body.provider || 'adsterra',
      type: body.type,
      banner_size: body.banner_size || '728x60',
      width: widthVal,
      height: heightVal,
      ad_width: widthVal,
      ad_height: heightVal,
      custom_width: body.custom_width ? Number(body.custom_width) : undefined,
      custom_height: body.custom_height ? Number(body.custom_height) : undefined,
      code: body.code || '',
      status: body.status || 'active',
      target_pages: body.target_pages && body.target_pages.length > 0 ? body.target_pages : ['all'],
      device_target: body.device_target || 'all',
      frequency_mode: body.frequency_mode || 'every_hours',
      frequency_value: Number(body.frequency_value) || 2,
      frequency_unit: body.frequency_unit || 'hours',
      initial_delay: Number(body.initial_delay) || 0,
      countdown_seconds: typeof body.countdown_seconds !== 'undefined' ? Number(body.countdown_seconds) : 5,
      close_button_enabled: body.close_button_enabled !== false,
      rotation_enabled: Boolean(body.rotation_enabled),
      rotation_interval: Number(body.rotation_interval) || 60,
      priority: Number(body.priority) || 1,
      start_date: body.start_date || '',
      end_date: body.end_date || '',
    });

    return NextResponse.json({ success: true, ad });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create advertisement' },
      { status: 500 }
    );
  }
}
