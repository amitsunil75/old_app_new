'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import { deleteSubscription, toggleSubscriptionActive } from '@/app/actions';
import { type SubscriptionWithCount } from './page';

export default function SubscriptionsList({ initialSubs }: { initialSubs: SubscriptionWithCount[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'inactive'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = initialSubs.filter((s) => {
    const matchSearch =
      !search ||
      s.hotel_name.toLowerCase().includes(search.toLowerCase()) ||
      s.activation_code.toLowerCase().includes(search.toLowerCase()) ||
      s.ip_address.includes(search);

    const now = new Date();
    const exp = new Date(s.expires_at);
    const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
    const status = !s.is_active
      ? 'inactive'
      : days <= 0
      ? 'expired'
      : days <= 30
      ? 'expiring'
      : 'active';

    const matchStatus = statusFilter === 'all' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSubscription(id);
    });
    setConfirmDelete(null);
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleSubscriptionActive(id, current);
    });
  }

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by hotel name, code, IP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring (≤30d)</option>
          <option value="expired">Expired</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        Showing {filtered.length} of {initialSubs.length} subscription{initialSubs.length !== 1 ? 's' : ''}
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Hotel Name</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">IP : Port</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Activation Code</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Started</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Expires</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Devices</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
              <th className="px-4 py-3 text-slate-600 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-50 group">
                <td className="px-4 py-3 font-medium text-slate-900">{sub.hotel_name}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{sub.ip_address}:{sub.port}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <code className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono">
                      {sub.activation_code}
                    </code>
                    <button
                      onClick={() => copyCode(sub.activation_code)}
                      title="Copy code"
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {copied === sub.activation_code ? (
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(sub.started_at)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(sub.expires_at)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold ${
                    sub.device_count >= (sub.max_devices ?? 4)
                      ? 'text-red-600'
                      : sub.device_count >= Math.ceil((sub.max_devices ?? 4) * 0.75)
                      ? 'text-amber-600'
                      : 'text-slate-600'
                  }`}>
                    {sub.device_count} / {sub.max_devices ?? 4}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge sub={sub} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggle(sub.id, sub.is_active)}
                      disabled={isPending}
                      title={sub.is_active ? 'Deactivate' : 'Activate'}
                      className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                        sub.is_active
                          ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {sub.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <Link
                      href={`/subscriptions/${sub.id}`}
                      className="text-indigo-600 hover:underline font-medium text-xs px-2 py-1"
                    >
                      Edit
                    </Link>

                    {/* Delete with confirm */}
                    {confirmDelete === sub.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(sub.id)}
                          disabled={isPending}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700"
                        >
                          {isPending ? '…' : 'Yes, delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded font-medium hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(sub.id)}
                        title="Delete subscription"
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  {initialSubs.length === 0 ? (
                    <>No subscriptions yet. <Link href="/subscriptions/new" className="text-indigo-600 hover:underline">Create one</Link></>
                  ) : (
                    'No subscriptions match your filter.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
