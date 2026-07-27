CREATE TABLE public.weekly_backgrounds (
  user_id UUID NOT NULL,
  week_key TEXT NOT NULL,
  path TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_backgrounds TO authenticated;
GRANT ALL ON public.weekly_backgrounds TO service_role;
ALTER TABLE public.weekly_backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_backgrounds_own" ON public.weekly_backgrounds FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);