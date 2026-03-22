-- Run this in your Supabase SQL Editor to FIX the invisible images/titles issue!

-- 1. Ensure the 'anon' role can READ published posts (needed for Facebook Crawler)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for published posts" ON public.posts;
CREATE POLICY "Allow public read for published posts" ON public.posts
FOR SELECT TO anon
USING (status = 'published');

-- 2. Ensure the storage bucket is PUBLIC
UPDATE storage.buckets SET public = true WHERE id = 'post-media';

-- 3. Grant public access to storage objects
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'post-media');
