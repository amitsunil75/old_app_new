import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

interface LoginWithSub {
  id: string;
  device_id: string;
  device_name: string | null;
  user_name: string | null;
  app_version: string | null;
  login_at: string;
  logout_at: string | null;
  subscription_id: string | null;
  subscriptions: { hotel_name: string } | null;
}

export default async function LoginsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('device_logins')
    .select('*, subscriptions(hotel_name)')
    .order('login_at', { ascending: false })
    .limit(500);

  const logins = (data as LoginWithSub[]) ?? [];

  // Today count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = logins.filter((l) => new Date(l.login_at) >= today).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Login History</h1>
          <p className="text-slate-500 text-sm mt-1">
            {todayCount} login{todayCount !== 1 ? 's' : ''} today · {logins.length} total records shown
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">User</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Device</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Hotel</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Login At</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Logout At</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">App Version</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logins.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{l.user_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{l.device_name ?? l.device_id.slice(0, 14)}</td>
                <td className="px-4 py-3">
                  {l.subscription_id ? (
                    <Link
                      href={`/subscriptions/${l.subscription_id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {l.subscriptions?.hotel_name ?? '—'}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDateTime(l.login_at)}</td>
                <td className="px-4 py-3 text-slate-500">
                  {l.logout_at ? formatDateTime(l.logout_at) : (
                    <span className="text-emerald-500 text-xs font-medium">● Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{l.app_version ?? '—'}</td>
              </tr>
            ))}
            {logins.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  No login events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
