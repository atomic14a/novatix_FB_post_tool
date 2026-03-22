-- Adds new fields to support real Facebook publishing results
ALTER TABLE posts ADD COLUMN IF NOT EXISTS facebook_post_id TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS facebook_object_id TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS publish_error TEXT;

-- Update the status check constraint to allow 'failed'
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (status IN ('draft', 'published', 'failed'));
