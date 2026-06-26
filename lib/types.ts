export interface Subscription {
  id: string;
  hotel_name: string;
  ip_address: string;
  port: string;
  activation_code: string;
  started_at: string;
  expires_at: string;
  is_active: boolean;
  max_devices: number;   // max Android devices allowed (default 4)
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  subscription_id: string;
  device_id: string;
  device_name: string | null;
  device_model: string | null;
  android_version: string | null;
  app_version: string | null;
  activated_at: string;
  last_seen_at: string | null;
}

export interface DeviceLogin {
  id: string;
  subscription_id: string | null;
  device_id: string;
  device_name: string | null;
  user_name: string | null;
  app_version: string | null;
  login_at: string;
  logout_at: string | null;
}

export interface SubscriptionWithDevices extends Subscription {
  devices: Device[];
}

export function daysRemaining(expiresAt: string): number {
  const now = new Date();
  const exp = new Date(expiresAt);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function subscriptionStatus(sub: Subscription): 'active' | 'expiring' | 'critical' | 'expired' | 'inactive' {
  if (!sub.is_active) return 'inactive';
  const days = daysRemaining(sub.expires_at);
  if (days <= 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'expiring';
  return 'active';
}
