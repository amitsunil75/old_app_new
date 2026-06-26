import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { daysRemaining } from '@/lib/types';

/**
 * POST /api/heartbeat
 *
 * Called by the Flutter app periodically (on startup) and after each login.
 * - Validates the subscription is still active and not expired.
 * - Updates device last_seen_at.
 * - Optionally logs a login event (when userName is provided).
 *
 * Body: {
 *   activationCode: string,
 *   deviceId: string,
 *   deviceName?: string,
 *   userName?: string,       // include to log a login event
 *   appVersion?: string,
 *   action?: 'check' | 'login' | 'logout',
 * }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, message: 'Invalid request body.' }, { status: 400 });
  }

  const { activationCode, deviceId, deviceName, userName, appVersion, action = 'check' } = body;

  if (!activationCode?.trim() || !deviceId?.trim()) {
    return NextResponse.json({ valid: false, message: 'activationCode and deviceId are required.' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // 1. Look up subscription
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('id, is_active, expires_at, hotel_name, ip_address, port')
    .eq('activation_code', activationCode.trim().toUpperCase())
    .single();

  if (subError || !sub) {
    return NextResponse.json({ valid: false, message: 'Activation code not found.' });
  }

  if (!sub.is_active) {
    return NextResponse.json({
      valid: false,
      message: 'Subscription has been deactivated. Contact your administrator.',
    });
  }

  const days = daysRemaining(sub.expires_at);
  if (days <= 0) {
    return NextResponse.json({
      valid: false,
      message: 'Subscription has expired. Please contact your administrator to renew.',
      expiresAt: sub.expires_at,
      daysRemaining: days,
    });
  }

  // 2. Update device last_seen_at
  await supabase
    .from('devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('device_id', deviceId.trim());

  // 3. Log login event if this is a login action
  if (action === 'login' && userName) {
    await supabase.from('device_logins').insert({
      subscription_id: sub.id,
      device_id: deviceId.trim(),
      device_name: deviceName?.trim() ?? null,
      user_name: userName.trim(),
      app_version: appVersion?.trim() ?? null,
      login_at: new Date().toISOString(),
    });
  }

  // 4. Update logout time for latest login if this is a logout
  if (action === 'logout') {
    const { data: lastLogin } = await supabase
      .from('device_logins')
      .select('id')
      .eq('device_id', deviceId.trim())
      .is('logout_at', null)
      .order('login_at', { ascending: false })
      .limit(1)
      .single();

    if (lastLogin) {
      await supabase
        .from('device_logins')
        .update({ logout_at: new Date().toISOString() })
        .eq('id', lastLogin.id);
    }
  }

  const warningMessage =
    days <= 7
      ? `Subscription expires in ${days} day${days === 1 ? '' : 's'} — contact admin to renew.`
      : days <= 30
      ? `Subscription expires in ${days} days.`
      : null;

  return NextResponse.json({
    valid: true,
    expiresAt: sub.expires_at,
    daysRemaining: days,
    hotelName: sub.hotel_name,
    ipAddress: sub.ip_address,
    port: sub.port,
    warningMessage,
  });
}
