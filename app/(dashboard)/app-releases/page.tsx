'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AppRelease {
  id: string;
  version: string;
  version_code: number;
  notes: string | null;
  download_url: string;
  file_size: number | null;
  is_active: boolean;
  created_at: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AppReleasesPage() {
  const [releases, setReleases] = useState<AppRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [version, setVersion] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchReleases() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('app_releases')
      .select('*')
      .order('version_code', { ascending: false });
    if (!error && data) setReleases(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchReleases();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file || !version.trim() || !versionCode.trim()) {
      setError('Version name, version code, and APK file are required.');
      return;
    }
    const code = parseInt(versionCode, 10);
    if (isNaN(code) || code < 1) {
      setError('Version code must be a positive integer.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const supabase = createClient();
      const fileName = `StayBuddyPos-${version.trim()}.apk`;

      // Upload to Supabase Storage bucket: apk-releases
      const { error: uploadError } = await supabase.storage
        .from('apk-releases')
        .upload(fileName, file, { upsert: true, contentType: 'application/vnd.android.package-archive' });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      setUploadProgress(60);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('apk-releases')
        .getPublicUrl(fileName);
      const downloadUrl = urlData.publicUrl;

      setUploadProgress(70);

      // Create release record via API
      const res = await fetch('/api/app-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: version.trim(),
          versionCode: code,
          notes: notes.trim() || undefined,
          downloadUrl,
          fileSize: file.size,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to save release.');
      }

      setUploadProgress(100);
      setSuccess(`Version ${version.trim()} uploaded successfully. The Android app will receive a real-time update notification.`);
      setVersion('');
      setVersionCode('');
      setNotes('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await fetchReleases();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">App Releases</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a new APK version. Android devices will receive a real-time update prompt via Supabase Realtime.
        </p>
      </div>

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload New Version
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Version Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 2.1.0"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={uploading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Version Code <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                placeholder="e.g. 2 (build number)"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={uploading}
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Release Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What's new in this version?"
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              APK File <span className="text-red-500">*</span>
            </label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="text-sm text-slate-700">
                  <span className="font-medium">{file.name}</span>
                  <span className="text-slate-400 ml-2">({formatBytes(file.size)})</span>
                </div>
              ) : (
                <div className="text-sm text-slate-400">
                  Click to select an APK file
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              {success}
            </div>
          )}

          {uploading && uploadProgress > 0 && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading…' : 'Upload & Publish'}
          </button>
        </form>
      </div>

      {/* Releases list */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Release History</h2>

        {loading ? (
          <div className="text-sm text-slate-400 py-8 text-center">Loading releases…</div>
        ) : releases.length === 0 ? (
          <div className="text-sm text-slate-400 py-8 text-center bg-white rounded-xl border border-slate-200">
            No releases yet. Upload your first APK above.
          </div>
        ) : (
          <div className="space-y-3">
            {releases.map((r) => (
              <div
                key={r.id}
                className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 ${
                  r.is_active ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">v{r.version}</span>
                    <span className="text-xs text-slate-400">build {r.version_code}</span>
                    {r.is_active && (
                      <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{timeAgo(r.created_at)}</span>
                    <span className="text-xs text-slate-400">{formatBytes(r.file_size)}</span>
                  </div>
                  {r.notes && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.notes}</p>
                  )}
                </div>
                <a
                  href={r.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <strong>Setup required (one-time):</strong> In your Supabase dashboard, create the{' '}
        <code className="bg-amber-100 px-1 rounded">app_releases</code> table and{' '}
        <code className="bg-amber-100 px-1 rounded">apk-releases</code> storage bucket.
        See the SQL comment in <code className="bg-amber-100 px-1 rounded">app/api/app-release/route.ts</code>.
      </div>
    </div>
  );
}
