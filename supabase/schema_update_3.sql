-- Fix for Supabase Storage Upload (Creates the post-media bucket securely)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "Public access to post media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post media" ON storage.objects;

-- Grant public read access to uploaded media
CREATE POLICY "Public access to post media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'post-media');

-- Allow authenticated users to upload media
CREATE POLICY "Authenticated users can upload post media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'post-media' AND auth.role() = 'authenticated');

-- Allow users to manage their own media
CREATE POLICY "Users can update own post media" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'post-media' AND auth.uid() = owner);

CREATE POLICY "Users can delete own post media" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'post-media' AND auth.uid() = owner);

-- Allow public viewing of published posts so Facebook Crawler can read OG Tags
DROP POLICY IF EXISTS "Public can view published posts" ON posts;
CREATE POLICY "Public can view published posts" 
ON posts FOR SELECT 
USING (status = 'published');
