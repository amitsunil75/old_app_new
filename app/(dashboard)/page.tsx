import { createClient } from '@/lib/supabase/server';
import { daysRemaining, subscriptionStatus, type Subscription } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

async function getStats() {
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .order('expires_at', { ascending: true });

  const { data: devices } = await supabase.from('devices').select('id');
  const { data: logins } = await supabase
    .from('device_logins')
    .select('id')
    .gte('login_at', new Date(Date.now() - 86400000).toISOString());

  const all = (subs as Subscription[]) ?? [];
  return {
    total: all.length,
    active: all.filter((s) => subscriptionStatus(s) === 'active').length,
    expiring: all.filter((s) => ['expiring', 'critical'].includes(subscriptionStatus(s))).length,
    expired: all.filter((s) => subscriptionStatus(s) === 'expired').length,
    deviceCount: devices?.length ?? 0,
    loginsToday: logins?.length ?? 0,
    expiringSoon: all.filter((s) => {
      const d = daysRemaining(s.expires_at);
      return s.is_active && d > 0 && d <= 30;
    }),
    recentSubs: all.slice(0, 5),
  };
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of all POS subscriptions</p>
        </div>
        <Link
          href="/subscriptions/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors text-center"
        >
          + New Subscription
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Subscriptions" value={stats.total} color="text-slate-900" />
        <StatCard label="Active" value={stats.active} color="text-emerald-600" />
        <StatCard label="Expiring Soon" value={stats.expiring} color="text-amber-600" />
        <StatCard label="Expired" value={stats.expired} color="text-red-600" />
        <StatCard label="Total Devices" value={stats.deviceCount} color="text-indigo-600" />
        <StatCard label="Logins Today" value={stats.loginsToday} color="text-slate-700" />
      </div>

      {stats.expiringSoon.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">⚠️ Expiring Within 30 Days</h2>
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-amber-50">
                <tr>
                  <th className="text-left px-4 py-3 text-amber-800 font-semibold">Hotel</th>
                  <th className="text-left px-4 py-3 text-amber-800 font-semibold">Expires</th>
                  <th className="text-left px-4 py-3 text-amber-800 font-semibold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.expiringSoon.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{sub.hotel_name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(sub.expires_at)}</td>
                    <td className="px-4 py-3"><StatusBadge sub={sub} /></td>
                    <td className="px-4 py-3">
                      <Link href={`/subscriptions/${sub.id}`} className="text-indigo-600 hover:underline font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">Recent Subscriptions</h2>
          <Link href="/subscriptions" className="text-indigo-600 text-sm hover:underline">View all</Link>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Hotel</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">IP : Port</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Started</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Expires</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{sub.hotel_name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{sub.ip_address}:{sub.port}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(sub.started_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(sub.expires_at)}</td>
                  <td className="px-4 py-3"><StatusBadge sub={sub} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/subscriptions/${sub.id}`} className="text-indigo-600 hover:underline font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {stats.recentSubs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No subscriptions yet.{' '}
                    <Link href="/subscriptions/new" className="text-indigo-600 hover:underline">Create one</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
