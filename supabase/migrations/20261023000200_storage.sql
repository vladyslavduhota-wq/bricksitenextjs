-- Lot photos. Supabase only: local DB tests skip this file.
-- Public bucket: anyone can view a photo by URL; only admins can upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lots', 'lots', true, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy lots_photos_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'lots' and public.is_admin());
create policy lots_photos_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'lots' and public.is_admin());
create policy lots_photos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'lots' and public.is_admin());
