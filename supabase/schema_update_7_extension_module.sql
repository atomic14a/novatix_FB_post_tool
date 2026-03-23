-- Extension module foundation

CREATE TABLE IF NOT EXISTS public.extension_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  browser_id TEXT NOT NULL,
  extension_version TEXT,
  browser_name TEXT,
  platform TEXT,
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id, browser_id)
);

CREATE TABLE IF NOT EXISTS public.extension_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  assigned_session_id UUID REFERENCES public.extension_sessions(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  execution_mode TEXT DEFAULT 'test',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'processing', 'completed', 'failed', 'cancelled')),
  payload JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.extension_job_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES public.extension_jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  result_type TEXT NOT NULL,
  success BOOLEAN DEFAULT false,
  response_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.extension_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.extension_sessions(id) ON DELETE SET NULL,
  log_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.extension_facebook_contexts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.extension_sessions(id) ON DELETE SET NULL,
  facebook_detected BOOLEAN DEFAULT false,
  facebook_logged_in BOOLEAN DEFAULT false,
  account_name TEXT,
  page_name TEXT,
  page_id TEXT,
  detected_pages_count INTEGER DEFAULT 0,
  context_data JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extension_sessions_user_id ON public.extension_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_sessions_online ON public.extension_sessions(is_online);
CREATE INDEX IF NOT EXISTS idx_extension_jobs_user_id ON public.extension_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_jobs_status ON public.extension_jobs(status);
CREATE INDEX IF NOT EXISTS idx_extension_jobs_assigned_session_id ON public.extension_jobs(assigned_session_id);
CREATE INDEX IF NOT EXISTS idx_extension_job_results_job_id ON public.extension_job_results(job_id);
CREATE INDEX IF NOT EXISTS idx_extension_logs_user_id ON public.extension_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_facebook_contexts_user_id ON public.extension_facebook_contexts(user_id);

ALTER TABLE public.extension_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_job_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_facebook_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own extension sessions" ON public.extension_sessions;
CREATE POLICY "Users can view own extension sessions"
  ON public.extension_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own extension sessions" ON public.extension_sessions;
CREATE POLICY "Users can insert own extension sessions"
  ON public.extension_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own extension sessions" ON public.extension_sessions;
CREATE POLICY "Users can update own extension sessions"
  ON public.extension_sessions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own extension sessions" ON public.extension_sessions;
CREATE POLICY "Users can delete own extension sessions"
  ON public.extension_sessions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own extension jobs" ON public.extension_jobs;
CREATE POLICY "Users can view own extension jobs"
  ON public.extension_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own extension jobs" ON public.extension_jobs;
CREATE POLICY "Users can insert own extension jobs"
  ON public.extension_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own extension jobs" ON public.extension_jobs;
CREATE POLICY "Users can update own extension jobs"
  ON public.extension_jobs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own extension jobs" ON public.extension_jobs;
CREATE POLICY "Users can delete own extension jobs"
  ON public.extension_jobs FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own extension job results" ON public.extension_job_results;
CREATE POLICY "Users can view own extension job results"
  ON public.extension_job_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own extension job results" ON public.extension_job_results;
CREATE POLICY "Users can insert own extension job results"
  ON public.extension_job_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own extension logs" ON public.extension_logs;
CREATE POLICY "Users can view own extension logs"
  ON public.extension_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own extension logs" ON public.extension_logs;
CREATE POLICY "Users can insert own extension logs"
  ON public.extension_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own extension contexts" ON public.extension_facebook_contexts;
CREATE POLICY "Users can view own extension contexts"
  ON public.extension_facebook_contexts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own extension contexts" ON public.extension_facebook_contexts;
CREATE POLICY "Users can insert own extension contexts"
  ON public.extension_facebook_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own extension contexts" ON public.extension_facebook_contexts;
CREATE POLICY "Users can update own extension contexts"
  ON public.extension_facebook_contexts FOR UPDATE
  USING (auth.uid() = user_id);
