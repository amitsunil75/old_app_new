'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { generateActivationCode } from '@/lib/utils';
import Link from 'next/link';

export default function NewSubscriptionPage() {
  const [hotelName, setHotelName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMonths, setDurationMonths] = useState(12);
  const [maxDevices, setMaxDevices] = useState(4);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [savedId, setSavedId] = useState('');
  const [copied, setCopied] = useState(false);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function getExpiryDate() {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + durationMonths);
    return d.toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const code = generateActivationCode();
    const supabase = createClient();

    const { data, error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        hotel_name: hotelName.trim(),
        ip_address: ipAddress.trim(),
        port: port.trim(),
        activation_code: code,
        started_at: new Date(startDate).toISOString(),
        expires_at: getExpiryDate(),
        max_devices: maxDevices,
        notes: notes.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    setGeneratedCode(code);
    setSavedId(data.id);
    setLoading(false);
  }

  if (generatedCode) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Subscription Created!</h2>
          <p className="text-slate-500 text-sm mb-6">Share this activation code with the hotel to configure their POS app.</p>

          <div className="bg-slate-900 rounded-xl p-5 mb-6">
            <p className="text-slate-400 text-xs mb-2 uppercase tracking-wide">Activation Code</p>
            <p className="text-white font-mono text-2xl font-bold tracking-widest">{generatedCode}</p>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            The app will use this code to automatically configure the server IP, port, and subscription period.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => copyCode(generatedCode)}
              className={`flex-1 border font-medium py-2.5 rounded-lg text-sm transition-colors ${
                copied
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
            <Link
              href={`/subscriptions/${savedId}`}
              className="flex-1 bg-indigo-600 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors text-center"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/subscriptions" className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1">
          ← Back to Subscriptions
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-3">New Subscription</h1>
        <p className="text-slate-500 text-sm mt-1">Fill in hotel details to generate an activation code.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hotel / Property Name</label>
          <input
            required
            value={hotelName}
            onChange={(e) => setHotelName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. MAIKAL Beach Resort"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Server IP Address</label>
            <input
              required
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
            <input
              required
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="5000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Duration (months)</label>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1, 3, 6, 12, 24, 36].map((m) => (
                <option key={m} value={m}>{m} {m === 1 ? 'month' : 'months'}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Max Devices Allowed
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxDevices(n)}
                className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  maxDevices === n
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[6, 8, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxDevices(n)}
                className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  maxDevices === n
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Selected: <strong className="text-slate-600">{maxDevices} device{maxDevices !== 1 ? 's' : ''}</strong> — default is 4
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Any additional notes…"
          />
        </div>

        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
          Subscription will expire on:{' '}
          <strong className="text-slate-700">
            {new Date(getExpiryDate()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </strong>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
        >
          {loading ? 'Generating…' : 'Generate Activation Code'}
        </button>
      </form>
    </div>
  );
}
