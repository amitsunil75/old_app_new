'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { generateActivationCode } from '@/lib/utils';

// ─── Delete subscription (cascades to devices + logins) ──────────────────────
export async function deleteSubscription(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('subscriptions').delete().eq('id', id);
  if (error) return { error: error.message };
  redirect('/subscriptions');
}

// ─── Toggle active/inactive ──────────────────────────────────────────────────
export async function toggleSubscriptionActive(id: string, current: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({ is_active: !current })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/subscriptions');
  revalidatePath(`/subscriptions/${id}`);
}

// ─── Regenerate activation code ───────────────────────────────────────────────
export async function regenerateActivationCode(id: string) {
  const newCode = generateActivationCode();
  const supabase = await createClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({ activation_code: newCode })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/subscriptions/${id}`);
  return { code: newCode };
}

// ─── Extend subscription by N months ─────────────────────────────────────────
export async function extendSubscription(id: string, months: number) {
  const supabase = await createClient();
  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('expires_at')
    .eq('id', id)
    .single();
  if (fetchErr || !sub) return { error: fetchErr?.message ?? 'Not found' };

  // Extend from current expiry (or from today if already expired)
  const base = new Date(sub.expires_at);
  const now = new Date();
  const from = base > now ? base : now;
  from.setMonth(from.getMonth() + months);

  const { error } = await supabase
    .from('subscriptions')
    .update({ expires_at: from.toISOString(), is_active: true })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/subscriptions/${id}`);
  revalidatePath('/subscriptions');
  revalidatePath('/');
  return { newExpiry: from.toISOString() };
}

// ─── Update general subscription details (non-network fields) ─────────────────
export async function updateSubscription(
  id: string,
  data: {
    hotel_name: string;
    ip_address: string;
    port: string;
    expires_at: string;
    is_active: boolean;
    max_devices: number;
    notes: string | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase.from('subscriptions').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/subscriptions/${id}`);
  revalidatePath('/subscriptions');
  return { success: true };
}

// ─── Update ONLY network config (IP + port) ───────────────────────────────────
// This is the action that triggers Supabase Realtime → Flutter gets updated instantly.
export async function updateNetworkConfig(
  id: string,
  ipAddress: string,
  port: string
) {
  const supabase = await createClient();

  // Fetch current values to detect actual change
  const { data: current } = await supabase
    .from('subscriptions')
    .select('ip_address, port')
    .eq('id', id)
    .single();

  const changed =
    current?.ip_address !== ipAddress.trim() ||
    current?.port !== port.trim();

  const { error } = await supabase
    .from('subscriptions')
    .update({ ip_address: ipAddress.trim(), port: port.trim() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath(`/subscriptions/${id}`);
  revalidatePath('/subscriptions');
  return { success: true, changed };
}

// ─── Delete device ────────────────────────────────────────────────────────────
export async function deleteDevice(deviceId: string, subscriptionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('devices').delete().eq('id', deviceId);
  if (error) return { error: error.message };
  revalidatePath(`/subscriptions/${subscriptionId}`);
  revalidatePath('/devices');
}
