-- Meta short links + click tracking

CREATE TABLE IF NOT EXISTS public.meta_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  short_code TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  meta_title TEXT NOT NULL,
  meta_description TEXT,
  display_domain TEXT,
  cta TEXT,
  image_url TEXT,
  image_type TEXT,
  click_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meta_link_clicks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meta_link_id UUID REFERENCES public.meta_links(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash TEXT,
  user_agent TEXT,
  referer TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_links_user_id ON public.meta_links(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_links_short_code ON public.meta_links(short_code);
CREATE INDEX IF NOT EXISTS idx_meta_links_is_active ON public.meta_links(is_active);
CREATE INDEX IF NOT EXISTS idx_meta_link_clicks_meta_link_id ON public.meta_link_clicks(meta_link_id);
CREATE INDEX IF NOT EXISTS idx_meta_link_clicks_user_id ON public.meta_link_clicks(user_id);

ALTER TABLE public.meta_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meta links" ON public.meta_links;
CREATE POLICY "Users can view own meta links"
  ON public.meta_links FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meta links" ON public.meta_links;
CREATE POLICY "Users can insert own meta links"
  ON public.meta_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meta links" ON public.meta_links;
CREATE POLICY "Users can update own meta links"
  ON public.meta_links FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meta links" ON public.meta_links;
CREATE POLICY "Users can delete own meta links"
  ON public.meta_links FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read active meta links" ON public.meta_links;
CREATE POLICY "Public can read active meta links"
  ON public.meta_links FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own meta link clicks" ON public.meta_link_clicks;
CREATE POLICY "Users can view own meta link clicks"
  ON public.meta_link_clicks FOR SELECT
  USING (auth.uid() = user_id);
