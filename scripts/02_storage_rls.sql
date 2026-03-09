-- Storage RLS (DROP IF EXISTS + CREATE)
DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "community_upload" ON storage.objects;
DROP POLICY IF EXISTS "community_update" ON storage.objects;
DROP POLICY IF EXISTS "community_read" ON storage.objects;
DROP POLICY IF EXISTS "community_delete" ON storage.objects;
CREATE POLICY "community_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community');
CREATE POLICY "community_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'community' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "community_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'community');
CREATE POLICY "community_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'community' AND (storage.foldername(name))[1] = auth.uid()::text);
