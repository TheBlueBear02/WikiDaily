-- RPC for clients to create a free-play game challenge.
-- game_challenges and articles have no client INSERT policy (service role only), so this
-- SECURITY DEFINER function runs as the table owner and bypasses RLS.
-- Returns the new challenge id.

CREATE OR REPLACE FUNCTION public.create_free_game_challenge(
  p_start_slug        TEXT,
  p_target_slug       TEXT,
  p_start_title       TEXT DEFAULT NULL,
  p_start_image_url   TEXT DEFAULT NULL,
  p_target_title      TEXT DEFAULT NULL,
  p_target_image_url  TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  IF p_start_slug IS NULL OR p_target_slug IS NULL THEN
    RAISE EXCEPTION 'start_slug and target_slug are required';
  END IF;
  IF p_start_slug = p_target_slug THEN
    RAISE EXCEPTION 'start_slug and target_slug must be different';
  END IF;

  -- Upsert articles so anon users aren't blocked by RLS on the articles table
  INSERT INTO public.articles (wiki_slug, display_title, image_url, is_daily)
  VALUES
    (p_start_slug,  COALESCE(p_start_title,  p_start_slug),  p_start_image_url,  false),
    (p_target_slug, COALESCE(p_target_title, p_target_slug), p_target_image_url, false)
  ON CONFLICT (wiki_slug) DO NOTHING;

  INSERT INTO public.game_challenges (type, date, start_slug, target_slug)
  VALUES ('free', NULL, p_start_slug, p_target_slug)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Only authenticated users (and anon for guest play) may call this.
REVOKE ALL ON FUNCTION public.create_free_game_challenge(TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.create_free_game_challenge(TEXT, TEXT) TO anon, authenticated;
