import { createClient } from '@/lib/supabase/server';
import { type Subscription } from '@/lib/types';
import DevicesClient from './DevicesClient';

interface DeviceWithSub {
  id: string;
  device_id: string;
  device_name: string | null;
  device_model: string | null;
  android_version: string | null;
  app_version: string | null;
  activated_at: string;
  last_seen_at: string | null;
  subscription_id: string;
  subscriptions: Subscription;
}

export default async function DevicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('devices')
    .select('*, subscriptions(*)')
    .order('last_seen_at', { ascending: false, nullsFirst: false });

  const devices = (data as DeviceWithSub[]) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">All Devices</h1>
        <p className="text-slate-500 text-sm mt-1">
          {devices.length} device{devices.length !== 1 ? 's' : ''} activated across all subscriptions
        </p>
      </div>
      <DevicesClient initialDevices={devices} />
    </div>
  );
}
