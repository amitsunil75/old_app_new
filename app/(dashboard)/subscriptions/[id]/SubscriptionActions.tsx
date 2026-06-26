'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSubscription, regenerateActivationCode, extendSubscription } from '@/app/actions';
import { formatDate } from '@/lib/utils';

interface Props {
  id: string;
  currentCode: string;
  expiresAt: string;
}

export default function SubscriptionActions({ id, currentCode, expiresAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [extendMonths, setExtendMonths] = useState(6);
  const [newCode, setNewCode] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const displayCode = newCode || currentCode;

  function handleCopy() {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSubscription(id);
    });
  }

  function handleRegenerate() {
    setError('');
    startTransition(async () => {
      const result = await regenerateActivationCode(id);
      if (result?.error) {
        setError(result.error);
      } else if (result?.code) {
        setNewCode(result.code);
        setShowRegenConfirm(false);
      }
    });
  }

  function handleExtend() {
    setError('');
    startTransition(async () => {
      const result = await extendSubscription(id, extendMonths);
      if (result?.error) {
        setError(result.error);
      } else if (result?.newExpiry) {
        setNewExpiry(result.newExpiry);
        setShowExtend(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Activation code display */}
      <div className="bg-slate-900 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Activation Code</p>
          {newCode && (
            <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium">
              New code generated
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <code className="text-white font-mono text-xl font-bold tracking-widest flex-1 break-all">
            {displayCode}
          </code>
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-slate-500 text-xs mt-2">
          Share this code with the hotel to activate their POS app.
        </p>
      </div>

      {/* Expiry info */}
      {newExpiry && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700">
          ✓ Subscription extended. New expiry: <strong>{formatDate(newExpiry)}</strong>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-3">
        {/* Regenerate code */}
        {!showRegenConfirm ? (
          <button
            onClick={() => setShowRegenConfirm(true)}
            disabled={isPending}
            className="flex items-center justify-between w-full px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">Regenerate Activation Code</p>
                <p className="text-xs text-slate-500">Old code will stop working immediately</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
            <p className="text-sm font-semibold text-amber-800 mb-1">Regenerate activation code?</p>
            <p className="text-xs text-amber-700 mb-3">
              The existing code <code className="font-mono">{currentCode}</code> will be invalidated.
              Any device that hasn't activated yet will need the new code.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
                disabled={isPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Generating…' : 'Yes, regenerate'}
              </button>
              <button
                onClick={() => setShowRegenConfirm(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Extend subscription */}
        {!showExtend ? (
          <button
            onClick={() => setShowExtend(true)}
            className="flex items-center justify-between w-full px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">Extend Subscription</p>
                <p className="text-xs text-slate-500">
                  Currently expires {formatDate(newExpiry || expiresAt)}
                </p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50">
            <p className="text-sm font-semibold text-indigo-800 mb-3">Extend by how many months?</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[1, 3, 6, 12, 24, 36].map((m) => (
                <button
                  key={m}
                  onClick={() => setExtendMonths(m)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    extendMonths === m
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {m} {m === 1 ? 'month' : 'months'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExtend}
                disabled={isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Extending…' : `Extend by ${extendMonths} month${extendMonths !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => setShowExtend(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Delete subscription */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center justify-between w-full px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">Delete Subscription</p>
                <p className="text-xs text-slate-500">Permanently removes all devices and login history</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="border border-red-200 rounded-xl p-4 bg-red-50">
            <p className="text-sm font-semibold text-red-800 mb-1">Delete this subscription?</p>
            <p className="text-xs text-red-700 mb-3">
              This will permanently delete all devices, login history, and the activation code. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {isPending ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
