import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { type Subscription, type Device, type DeviceLogin } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import EditSubscriptionForm from './EditSubscriptionForm';
import NetworkConfigForm from './NetworkConfigForm';
import SubscriptionActions from './SubscriptionActions';
import DevicesTable from './DevicesTable';
import LoginHistoryTable from './LoginHistoryTable';

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [subRes, devicesRes, loginsRes] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('id', id).single(),
    supabase.from('devices').select('*').eq('subscription_id', id).order('last_seen_at', { ascending: false }),
    supabase
      .from('device_logins')
      .select('*')
      .eq('subscription_id', id)
      .order('login_at', { ascending: false })
      .limit(200),
  ]);

  if (subRes.error || !subRes.data) notFound();

  const sub = subRes.data as Subscription;
  const devices = (devicesRes.data as Device[]) ?? [];
  const logins = (loginsRes.data as DeviceLogin[]) ?? [];

  // Days remaining
  const now = new Date();
  const exp = new Date(sub.expires_at);
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/subscriptions" className="text-slate-500 hover:text-slate-700">
          ← Subscriptions
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium">{sub.hotel_name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{sub.hotel_name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge sub={sub} />
            {daysLeft > 0 && (
              <span className={`text-xs font-medium ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
              </span>
            )}
            <span className="text-xs text-slate-400">
              {devices.length} device{devices.length !== 1 ? 's' : ''} activated
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-6 sm:gap-4">
          <div className="sm:text-right">
            <p className="text-xs text-slate-400">Started</p>
            <p className="text-sm font-medium text-slate-700">{formatDate(sub.started_at)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-slate-400">Expires</p>
            <p className={`text-sm font-medium ${daysLeft <= 7 ? 'text-red-600' : 'text-slate-700'}`}>
              {formatDate(sub.expires_at)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-slate-400">Logins</p>
            <p className="text-sm font-medium text-slate-700">{logins.length}</p>
          </div>
        </div>
      </div>

      {/* Main grid: Edit form + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <EditSubscriptionForm sub={sub} />

        <SubscriptionActions
          id={sub.id}
          currentCode={sub.activation_code}
          expiresAt={sub.expires_at}
        />
      </div>

      {/* Network Config (realtime push) + Device Limit row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <NetworkConfigForm
          id={sub.id}
          currentIp={sub.ip_address}
          currentPort={sub.port}
        />

        {/* Device limit card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Device Usage</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              devices.length >= (sub.max_devices ?? 4)
                ? 'bg-red-100 text-red-700'
                : devices.length >= Math.ceil((sub.max_devices ?? 4) * 0.75)
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {devices.length} / {sub.max_devices ?? 4}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${
                devices.length >= (sub.max_devices ?? 4)
                  ? 'bg-red-500'
                  : devices.length >= Math.ceil((sub.max_devices ?? 4) * 0.75)
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (devices.length / (sub.max_devices ?? 4)) * 100)}%` }}
            />
          </div>

          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Activated devices</span>
              <span className="font-medium text-slate-700">{devices.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Slots remaining</span>
              <span className={`font-medium ${devices.length >= (sub.max_devices ?? 4) ? 'text-red-600' : 'text-slate-700'}`}>
                {Math.max(0, (sub.max_devices ?? 4) - devices.length)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Max allowed</span>
              <span className="font-medium text-slate-700">{sub.max_devices ?? 4}</span>
            </div>
          </div>

          {devices.length >= (sub.max_devices ?? 4) && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              Device limit reached. New activations will be blocked. Remove a device or increase the limit to allow more.
            </div>
          )}
        </div>
      </div>

      {/* Devices */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          Devices ({devices.length})
        </h2>
        <DevicesTable devices={devices} subscriptionId={sub.id} />
      </div>

      {/* Login History */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          Login History ({logins.length} records)
        </h2>
        <LoginHistoryTable logins={logins} />
      </div>
    </div>
  );
}
