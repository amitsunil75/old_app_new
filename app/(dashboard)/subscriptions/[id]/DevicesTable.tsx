'use client';

import { useState, useTransition } from 'react';
import { type Device } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { deleteDevice } from '@/app/actions';

export default function DevicesTable({ devices, subscriptionId }: { devices: Device[]; subscriptionId: string }) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localDevices, setLocalDevices] = useState(devices);

  function handleDelete(deviceId: string) {
    startTransition(async () => {
      await deleteDevice(deviceId, subscriptionId);
      setLocalDevices((prev) => prev.filter((d) => d.id !== deviceId));
    });
    setConfirmDelete(null);
  }

  function lastSeenColor(lastSeen: string | null) {
    if (!lastSeen) return 'text-slate-400';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const hours = diff / 3600000;
    if (hours < 24) return 'text-emerald-600';
    if (hours < 72) return 'text-amber-600';
    return 'text-slate-500';
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
      <table className="w-full text-sm min-w-[760px]">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="text-left px-4 py-3 text-slate-600 font-semibold">Device</th>
            <th className="text-left px-4 py-3 text-slate-600 font-semibold">Model</th>
            <th className="text-left px-4 py-3 text-slate-600 font-semibold">Android</th>
            <th className="text-left px-4 py-3 text-slate-600 font-semibold">App Version</th>
            <th className="text-left px-4 py-3 text-slate-600 font-semibold">Activated</th>
            <th className="text-left px-4 py-3 text-slate-600 font-semibold">Last Seen</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {localDevices.map((d) => (
            <tr key={d.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{d.device_name ?? 'Unknown'}</p>
                <p className="text-xs text-slate-400 font-mono">{d.device_id.slice(0, 20)}…</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{d.device_model ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{d.android_version ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{d.app_version ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(d.activated_at)}</td>
              <td className={`px-4 py-3 text-xs font-medium ${lastSeenColor(d.last_seen_at)}`}>
                {d.last_seen_at ? formatDateTime(d.last_seen_at) : 'Never'}
              </td>
              <td className="px-4 py-3">
                {confirmDelete === d.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(d.id)}
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
          {localDevices.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                No devices have activated with this code yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
