'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import { deleteDevice } from '@/app/actions';
import { type Subscription } from '@/lib/types';

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

export default function DevicesClient({ initialDevices }: { initialDevices: DeviceWithSub[] }) {
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [devices, setDevices] = useState(initialDevices);
  const [isPending, startTransition] = useTransition();

  const filtered = devices.filter((d) => {
    if (!search) return true;
    return (
      d.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.device_model?.toLowerCase().includes(search.toLowerCase()) ||
      d.subscriptions?.hotel_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.device_id.includes(search)
    );
  });

  function handleDelete(d: DeviceWithSub) {
    startTransition(async () => {
      await deleteDevice(d.id, d.subscription_id);
      setDevices((prev) => prev.filter((x) => x.id !== d.id));
    });
    setConfirmDelete(null);
  }

  function lastSeenColor(lastSeen: string | null) {
    if (!lastSeen) return 'text-slate-400';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const hours = diff / 3600000;
    if (hours < 24) return 'text-emerald-600 font-medium';
    if (hours < 72) return 'text-amber-600';
    return 'text-slate-500';
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, hotel, model, device ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-400">{filtered.length} devices</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Device</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Hotel</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Subscription</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Android</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">App</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Activated</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Last Seen</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{d.device_name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-400 font-mono">{d.device_model ?? d.device_id.slice(0, 16)}</p>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/subscriptions/${d.subscription_id}`}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    {d.subscriptions?.hotel_name ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {d.subscriptions ? <StatusBadge sub={d.subscriptions} /> : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{d.android_version ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{d.app_version ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(d.activated_at)}</td>
                <td className={`px-4 py-3 text-xs ${lastSeenColor(d.last_seen_at)}`}>
                  {d.last_seen_at ? formatDateTime(d.last_seen_at) : 'Never'}
                </td>
                <td className="px-4 py-3">
                  {confirmDelete === d.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(d)}
                        disabled={isPending}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700"
                      >
                        {isPending ? '…' : 'Remove'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(d.id)}
                      title="Remove device"
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  {devices.length === 0 ? 'No devices have activated yet.' : 'No devices match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
