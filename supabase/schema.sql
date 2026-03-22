-- Novatix FB Tool - Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Facebook Accounts table
CREATE TABLE IF NOT EXISTS facebook_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  facebook_account_id TEXT NOT NULL,
  facebook_account_name TEXT NOT NULL,
  access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facebook Pages table
CREATE TABLE IF NOT EXISTS facebook_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_name TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_access_token TEXT,
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facebook_page_id UUID REFERENCES facebook_pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  short_text TEXT,
  destination_url TEXT,
  cta TEXT,
  media_url TEXT,
  media_type TEXT,
  facebook_post_id TEXT,
  facebook_object_id TEXT,
  publish_error TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'failed')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facebook_accounts_user_id ON facebook_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_user_id ON facebook_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON posts(user_id, status);

-- Row Level Security
ALTER TABLE facebook_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facebook_accounts
DROP POLICY IF EXISTS "Users can manage own facebook account" ON facebook_accounts;
CREATE POLICY "Users can manage own facebook account"
  ON facebook_accounts FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for facebook_pages
DROP POLICY IF EXISTS "Users can view own pages" ON facebook_pages;
CREATE POLICY "Users can view own pages"
  ON facebook_pages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pages" ON facebook_pages;
CREATE POLICY "Users can insert own pages"
  ON facebook_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pages" ON facebook_pages;
CREATE POLICY "Users can update own pages"
  ON facebook_pages FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pages" ON facebook_pages;
CREATE POLICY "Users can delete own pages"
  ON facebook_pages FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for posts
DROP POLICY IF EXISTS "Users can view own posts" ON posts;
CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for post media
-- Note: Create this bucket manually in Supabase Dashboard > Storage
-- Bucket name: post-media
-- Public: Yes (for serving media URLs)
