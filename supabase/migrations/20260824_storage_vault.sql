-- ============================================================================
-- AUTOCARE AI — MIGRATION DU COFFRE-FORT DOCUMENTAIRE (SUPABASE STORAGE & RLS)
-- ============================================================================

-- 1. Création du bucket privé pour les documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-vault',
  'vehicle-vault',
  false,
  15728640, -- 15 Mo
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  file_size_limit = 15728640,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- 2. Politiques RLS sur storage.objects

-- A. L'utilisateur peut téléverser dans son propre dossier ({user_id}/*)
drop policy if exists "User can upload to own vault folder" on storage.objects;
create policy "User can upload to own vault folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vehicle-vault' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- B. L'utilisateur peut lire et télécharger ses propres documents
drop policy if exists "User can view own vault documents" on storage.objects;
create policy "User can view own vault documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'vehicle-vault' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- C. L'utilisateur peut supprimer ses propres documents
drop policy if exists "User can delete own vault documents" on storage.objects;
create policy "User can delete own vault documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'vehicle-vault' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- D. Accès public en lecture pour le Passeport Revente si le véhicule est public
drop policy if exists "Public can read documents if vehicle passport is public" on storage.objects;
create policy "Public can read documents if vehicle passport is public"
on storage.objects for select to public
using (
  bucket_id = 'vehicle-vault' and
  exists (
    select 1 from public.vehicules v
    where v.id::text = (storage.foldername(name))[2]
  )
);
