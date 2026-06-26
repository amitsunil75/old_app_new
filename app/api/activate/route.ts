import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { daysRemaining } from '@/lib/types';

/**
 * POST /api/activate
 *
 * Called by the Flutter POS app when a user enters an activation code.
 * Returns the server IP, port, hotel name, and subscription expiry.
 *
 * Body: {
 *   activationCode: string,
 *   deviceId: string,
 *   deviceName?: string,
 *   deviceModel?: string,
 *   androidVersion?: string,
 *   appVersion?: string,
 * }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
  }

  const { activationCode, deviceId, deviceName, deviceModel, androidVersion, appVersion } = body;

  if (!activationCode?.trim() || !deviceId?.trim()) {
    return NextResponse.json(
      { success: false, message: 'activationCode and deviceId are required.' },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  // 1. Look up the subscription by activation code
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('activation_code', activationCode.trim().toUpperCase())
    .single();

  if (subError || !sub) {
    return NextResponse.json({ success: false, message: 'Invalid activation code.' }, { status: 404 });
  }

  if (!sub.is_active) {
    return NextResponse.json(
      { success: false, message: 'This subscription has been deactivated. Contact your administrator.' },
      { status: 403 }
    );
  }

  const days = daysRemaining(sub.expires_at);
  if (days <= 0) {
    return NextResponse.json(
      { success: false, message: 'Subscription has expired. Please renew to continue.' },
      { status: 403 }
    );
  }

  const maxDevices: number = sub.max_devices ?? 4;
  const trimmedDeviceId = deviceId.trim();

  // 2. Check if this device is already registered under this subscription
  const { data: existingDevice } = await supabase
    .from('devices')
    .select('id')
    .eq('device_id', trimmedDeviceId)
    .eq('subscription_id', sub.id)
    .maybeSingle();

  // 3. If it's a NEW device, enforce the limit
  if (!existingDevice) {
    const { count, error: countError } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_id', sub.id);

    if (countError) {
      console.error('Device count error:', countError);
      return NextResponse.json(
        { success: false, message: 'Server error checking device limit. Try again.' },
        { status: 500 }
      );
    }

    const currentCount = count ?? 0;
    if (currentCount >= maxDevices) {
      return NextResponse.json(
        {
          success: false,
          message: `Device limit reached. This subscription allows a maximum of ${maxDevices} device${maxDevices !== 1 ? 's' : ''}. Contact your administrator to increase the limit or remove an existing device.`,
        },
        { status: 403 }
      );
    }
  }

  // 4. Upsert device record (insert new or update existing)
  const { error: deviceError } = await supabase.from('devices').upsert(
    {
      subscription_id: sub.id,
      device_id: trimmedDeviceId,
      device_name: deviceName?.trim() ?? null,
      device_model: deviceModel?.trim() ?? null,
      android_version: androidVersion?.trim() ?? null,
      app_version: appVersion?.trim() ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'device_id' }
  );

  if (deviceError) {
    console.error('Device upsert error:', deviceError);
  }

  // 5. Return configuration
  const { count: finalCount } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_id', sub.id);

  return NextResponse.json({
    success: true,
    hotelName: sub.hotel_name,
    ipAddress: sub.ip_address,
    port: sub.port,
    expiresAt: sub.expires_at,
    daysRemaining: days,
    devicesUsed: finalCount ?? 0,
    maxDevices,
    message: days <= 7
      ? `Subscription expires in ${days} day${days === 1 ? '' : 's'}. Contact admin to renew.`
      : days <= 30
      ? `Subscription expires in ${days} days.`
      : 'Activated successfully.',
  });
}
