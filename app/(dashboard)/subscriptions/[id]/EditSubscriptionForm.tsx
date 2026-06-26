'use client';

import { useState, useTransition } from 'react';
import { type Subscription } from '@/lib/types';
import { updateSubscription, toggleSubscriptionActive } from '@/app/actions';

export default function EditSubscriptionForm({ sub }: { sub: Subscription }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [hotelName, setHotelName] = useState(sub.hotel_name);
  const [expiresAt, setExpiresAt] = useState(sub.expires_at.split('T')[0]);
  const [maxDevices, setMaxDevices] = useState(sub.max_devices ?? 4);
  const [notes, setNotes] = useState(sub.notes ?? '');
  const [isActive, setIsActive] = useState(sub.is_active);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    startTransition(async () => {
      const result = await updateSubscription(sub.id, {
        hotel_name: hotelName.trim(),
        ip_address: sub.ip_address, // network config is updated separately
        port: sub.port,
        expires_at: new Date(expiresAt).toISOString(),
        is_active: isActive,
        max_devices: maxDevices,
        notes: notes.trim() || null,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  function handleToggle() {
    const next = !isActive;
    setIsActive(next);
    startTransition(async () => {
      await toggleSubscriptionActive(sub.id, !next);
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Subscription Settings</h3>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
            isActive
              ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700'
              : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {isActive ? 'Active – click to deactivate' : 'Inactive – click to activate'}
        </button>
      </div>

      {success && (
        <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-medium">
          ✓ Settings saved successfully
        </div>
      )}
      {error && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Hotel / Business Name</label>
          <input
            type="text"
            value={hotelName}
            onChange={(e) => setHotelName(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Max Devices</label>
            <select
              value={maxDevices}
              onChange={(e) => setMaxDevices(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n} device{n !== 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Internal notes about this subscription…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
