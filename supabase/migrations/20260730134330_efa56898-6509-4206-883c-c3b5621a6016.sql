CREATE TABLE public.weekly_quotes (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week_key text NOT NULL,
  mode text NOT NULL DEFAULT 'quote',
  custom_text text NOT NULL DEFAULT '',
  displayed_quote text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_quotes TO authenticated;
GRANT ALL ON public.weekly_quotes TO service_role;
ALTER TABLE public.weekly_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own weekly quotes" ON public.weekly_quotes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quote_collections (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  quotes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_collections TO authenticated;
GRANT ALL ON public.quote_collections TO service_role;
ALTER TABLE public.quote_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own quote collection" ON public.quote_collections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER weekly_quotes_updated_at BEFORE UPDATE ON public.weekly_quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quote_collections_updated_at BEFORE UPDATE ON public.quote_collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();