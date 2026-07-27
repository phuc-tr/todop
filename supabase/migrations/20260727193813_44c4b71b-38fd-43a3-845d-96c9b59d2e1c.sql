CREATE POLICY "Users can upload their own weekly banners"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'weekly-banners' AND owner = auth.uid());

CREATE POLICY "Users can read their own weekly banners"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'weekly-banners' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own weekly banners"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'weekly-banners' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'weekly-banners' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own weekly banners"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'weekly-banners' AND (storage.foldername(name))[1] = auth.uid()::text);