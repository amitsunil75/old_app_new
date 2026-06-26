'use client';

import { useState, useTransition } from 'react';
import { updateNetworkConfig } from '@/app/actions';

interface Props {
  id: string;
  currentIp: string;
  currentPort: string;
}

export default function NetworkConfigForm({ id, currentIp, currentPort }: Props) {
  const [ip, setIp] = useState(currentIp);
  const [port, setPort] = useState(currentPort);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<'idle' | 'pushed' | 'unchanged' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isDirty = ip.trim() !== currentIp || port.trim() !== currentPort;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setState('idle');

    startTransition(async () => {
      const result = await updateNetworkConfig(id, ip.trim(), port.trim());
      if (result?.error) {
        setErrorMsg(result.error);
        setState('error');
      } else if (result?.changed === false) {
        setState('unchanged');
        setTimeout(() => setState('idle'), 3000);
      } else {
        setState('pushed');
        setTimeout(() => setState('idle'), 5000);
      }
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Network Configuration</p>
          <p className="text-slate-300 text-xs mt-0.5">
            Changes are pushed instantly to all connected devices
          </p>
        </div>
        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300 text-xs font-medium">Realtime</span>
        </div>
      </div>

      <div className="p-5">
        {/* Feedback banners */}
        {state === 'pushed' && (
          <div className="mb-4 flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <p className="text-emerald-800 text-xs font-bold">Network config pushed!</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                All connected Flutter devices received the new address{' '}
                <span className="font-mono font-semibold">{ip.trim()}:{port.trim()}</span>{' '}
                instantly via Supabase Realtime.
              </p>
            </div>
          </div>
        )}
        {state === 'unchanged' && (
          <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs">
            No change — IP and port are the same as current values.
          </div>
        )}
        {state === 'error' && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                IP Address
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                required
                placeholder="192.168.1.100"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Port
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                required
                placeholder="5000"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">Full address preview</span>
            <code className="text-sm font-mono font-semibold text-slate-800">
              {ip.trim() || '—'}:{port.trim() || '—'}
            </code>
          </div>

          <button
            type="submit"
            disabled={isPending || !ip.trim() || !port.trim()}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
              isDirty
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-500 cursor-default'
            }`}
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Pushing to devices…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {isDirty ? 'Save & Push to All Devices' : 'Save & Push to All Devices'}
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-400">
            Connected devices will update their server address immediately —
            no restart required.
          </p>
        </form>
      </div>
    </div>
  );
}
