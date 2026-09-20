import { NextRequest, NextResponse } from 'next/server';
import { getAd, updateAd, deleteAd, toggleAdStatus, duplicateAd } from '@/lib/adService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ad = await getAd(id);
    if (!ad) {
      return NextResponse.json({ success: false, error: 'Advertisement not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ad });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch ad' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await updateAd(id, body);
    return NextResponse.json({ success: true, message: 'Advertisement updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update ad' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteAd(id);
    return NextResponse.json({ success: true, message: 'Advertisement deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete ad' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (body.action === 'duplicate') {
      const duplicated = await duplicateAd(id);
      return NextResponse.json({ success: true, ad: duplicated });
    }

    if (body.action === 'toggle_status') {
      const currentStatus = body.currentStatus || 'inactive';
      const newStatus = await toggleAdStatus(id, currentStatus);
      return NextResponse.json({ success: true, status: newStatus });
    }

    if (body.status) {
      await updateAd(id, { status: body.status });
      return NextResponse.json({ success: true, status: body.status });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to modify ad' }, { status: 500 });
  }
}
