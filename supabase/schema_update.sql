-- Facebook Accounts table for Auto-Connect Feature
CREATE TABLE IF NOT EXISTS facebook_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  facebook_account_id TEXT NOT NULL,
  facebook_account_name TEXT NOT NULL,
  access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for the new table
CREATE INDEX IF NOT EXISTS idx_facebook_accounts_user_id ON facebook_accounts(user_id);

-- Row Level Security
ALTER TABLE facebook_accounts ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists (to prevent errors if run multiple times)
DROP POLICY IF EXISTS "Users can manage own facebook account" ON facebook_accounts;

-- RLS Policy for facebook_accounts
CREATE POLICY "Users can manage own facebook account"
  ON facebook_accounts FOR ALL
  USING (auth.uid() = user_id);
