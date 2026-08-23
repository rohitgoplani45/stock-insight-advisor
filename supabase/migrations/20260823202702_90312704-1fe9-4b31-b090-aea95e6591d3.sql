CREATE TABLE public.query_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  symbol TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  input_price NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL,
  verdict TEXT NOT NULL,
  outlook_summary TEXT,
  target_pct NUMERIC,
  timeframe TEXT
);

GRANT SELECT, INSERT ON public.query_log TO anon;
GRANT SELECT, INSERT ON public.query_log TO authenticated;
GRANT ALL ON public.query_log TO service_role;

ALTER TABLE public.query_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read the query log"
  ON public.query_log FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can add to the query log"
  ON public.query_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX query_log_created_at_idx ON public.query_log (created_at DESC);