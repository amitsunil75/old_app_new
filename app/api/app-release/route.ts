import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/*
  Run this SQL once in your Supabase SQL editor to create the table:

  create table public.app_releases (
    id uuid primary key default gen_random_uuid(),
    version text not null,
    version_code integer not null,
    notes text,
    download_url text not null,
    file_size bigint,
    is_active boolean default true,
    created_at timestamptz default now()
  );
  alter table public.app_releases enable row level security;
  create policy "Public read" on public.app_releases for select using (true);

  Also create the Supabase Storage bucket:
    - Name: apk-releases
    - Public bucket: yes
*/

export async function GET() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('app_releases')
    .select('*')
    .eq('is_active', true)
    .order('version_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? null });
}

export async function POST(req: NextRequest) {
  let body: {
    version: string;
    versionCode: number;
    notes?: string;
    downloadUrl: string;
    fileSize?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { version, versionCode, notes, downloadUrl, fileSize } = body;
  if (!version?.trim() || !versionCode || !downloadUrl?.trim()) {
    return NextResponse.json(
      { error: 'version, versionCode, and downloadUrl are required.' },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  // Deactivate all previous releases
  await supabase.from('app_releases').update({ is_active: false }).gt('version_code', 0);

  const { data, error } = await supabase
    .from('app_releases')
    .insert({
      version: version.trim(),
      version_code: versionCode,
      notes: notes?.trim() ?? null,
      download_url: downloadUrl.trim(),
      file_size: fileSize ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
