-- Helper used for duplicate-patient detection: matches when the normalised name tokens
-- of one name are all contained in the other (e.g. "Ama Mensah" vs "Mensah Ama Serwaa").
CREATE OR REPLACE FUNCTION similarity_name(a text, b text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  WITH ta AS (SELECT array_agg(t ORDER BY t) AS toks FROM regexp_split_to_table(lower(regexp_replace(a, '[^A-Za-z ]', '', 'g')), '\s+') t WHERE t <> ''),
       tb AS (SELECT array_agg(t ORDER BY t) AS toks FROM regexp_split_to_table(lower(regexp_replace(b, '[^A-Za-z ]', '', 'g')), '\s+') t WHERE t <> '')
  SELECT COALESCE((SELECT ta.toks <@ tb.toks OR tb.toks <@ ta.toks FROM ta, tb), false);
$$;
