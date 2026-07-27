CREATE TABLE public.weekly_notes (
    user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    header text NOT NULL DEFAULT 'Weekly Focus',
    body text NOT NULL DEFAULT '',
    banner_url text,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_notes TO authenticated;
GRANT ALL ON public.weekly_notes TO service_role;

ALTER TABLE public.weekly_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own weekly notes"
ON public.weekly_notes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_weekly_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER weekly_notes_updated_at
BEFORE UPDATE ON public.weekly_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_weekly_notes_updated_at();