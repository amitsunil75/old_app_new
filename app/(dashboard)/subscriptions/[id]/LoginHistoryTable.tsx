'use client';

import { useState } from 'react';
import { type DeviceLogin } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 20;

export default function LoginHistoryTable({ logins }: { logins: DeviceLogin[] }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = logins.filter((l) => {
    if (!search) return true;
    return (
      l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.device_id.includes(search)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function sessionDuration(login_at: string, logout_at: string | null) {
    if (!logout_at) return null;
    const ms = new Date(logout_at).getTime() - new Date(login_at).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by user or device…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-400">{filtered.length} records</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">User</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Device</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Login At</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Logout At</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Duration</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">App Version</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((l) => {
              const dur = sessionDuration(l.login_at, l.logout_at);
              return (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{l.user_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{l.device_name ?? l.device_id.slice(0, 12)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(l.login_at)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {l.logout_at ? formatDateTime(l.logout_at) : (
                      <span className="text-emerald-500 text-xs font-medium">● Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{dur ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{l.app_version ?? '—'}</td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {logins.length === 0 ? 'No login events recorded yet.' : 'No matching records.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
