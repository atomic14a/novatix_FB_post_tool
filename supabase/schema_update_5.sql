-- Add fake video parameters to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_fake_video BOOLEAN DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS fake_video_duration TEXT DEFAULT '0';
