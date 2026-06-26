import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { daysRemaining } from '@/lib/types';

/**
 * POST /api/device-check
 *
 * Called by the Flutter app on EVERY launch (instead of reading local activation code).
 * The device ID is the primary key — if the device is registered, returns full config.
 *
 * Body: { deviceId: string, appVersion?: string }
 *
 * Response (device found + valid):
 *   { found: true, valid: true, hotelName, ipAddress, port, expiresAt,
 *     daysRemaining, activationCode, warningMessage? }
 *
 * Response (device found + expired/deactivated):
 *   { found: true, valid: false, message: "..." }
 *
 * Response (device not registered):
 *   { found: false }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ found: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const { deviceId, appVersion } = body;

  if (!deviceId?.trim()) {
    return NextResponse.json({ found: false, error: 'deviceId is required.' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // 1. Look up the device and join the subscription
  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('*, subscriptions(*)')
    .eq('device_id', deviceId.trim())
    .maybeSingle();

  if (deviceError) {
    console.error('device-check error:', deviceError);
    return NextResponse.json({ found: false, error: 'Server error.' }, { status: 500 });
  }

  // Device not registered at all → prompt activation
  if (!device) {
    return NextResponse.json({ found: false });
  }

  const sub = device.subscriptions;

  // Update last_seen_at and app version on every check
  await supabase
    .from('devices')
    .update({
      last_seen_at: new Date().toISOString(),
      ...(appVersion ? { app_version: appVersion } : {}),
    })
    .eq('device_id', deviceId.trim());

  // Subscription missing (orphan device)
  if (!sub) {
    return NextResponse.json({
      found: true,
      valid: false,
      message: 'Subscription not found for this device. Contact your administrator.',
    });
  }

  // Subscription deactivated by admin
  if (!sub.is_active) {
    return NextResponse.json({
      found: true,
      valid: false,
      message: 'Your subscription has been deactivated. Please contact your administrator.',
    });
  }

  // Subscription expired
  const days = daysRemaining(sub.expires_at);
  if (days <= 0) {
    return NextResponse.json({
      found: true,
      valid: false,
      message: 'Your subscription has expired. Please contact your administrator to renew.',
    });
  }

  // Build warning only at ≤ 15 days
  let warningMessage: string | undefined;
  if (days <= 7) {
    warningMessage = `Subscription expires in ${days} day${days === 1 ? '' : 's'} — contact admin urgently.`;
  } else if (days <= 15) {
    warningMessage = `Subscription expires in ${days} days. Please contact your administrator.`;
  }

  // Mask the activation code: STAY-****-****-ABCD → show last segment only
  const parts = sub.activation_code.split('-');
  const maskedCode = parts.length === 4
    ? `${parts[0]}-****-****-${parts[3]}`
    : '****-****-****';

  return NextResponse.json({
    found: true,
    valid: true,
    subscriptionId: sub.id,                  // stored locally to subscribe Realtime
    hotelName: sub.hotel_name,
    ipAddress: sub.ip_address,
    port: sub.port,
    expiresAt: sub.expires_at,
    daysRemaining: days,
    activationCode: sub.activation_code,     // full code for local cache
    maskedCode,                              // for display in settings
    warningMessage: warningMessage ?? null,
  });
}
