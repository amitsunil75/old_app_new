import { createClient } from '@/lib/supabase/server';
import { type Subscription } from '@/lib/types';
import Link from 'next/link';
import SubscriptionsList from './SubscriptionsList';

export interface SubscriptionWithCount extends Subscription {
  device_count: number;
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();

  // Fetch subscriptions with device counts via embedded count
  const { data } = await supabase
    .from('subscriptions')
    .select('*, devices(count)')
    .order('created_at', { ascending: false });

  const subs: SubscriptionWithCount[] = (data ?? []).map((row: Subscription & { devices: { count: number }[] }) => ({
    ...row,
    device_count: row.devices?.[0]?.count ?? 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-slate-500 text-sm mt-1">{subs.length} total subscription{subs.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/subscriptions/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + New Subscription
        </Link>
      </div>
      <SubscriptionsList initialSubs={subs} />
    </div>
  );
}
