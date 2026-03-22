-- Ratings: one vote per voter per category per entity
CREATE TABLE IF NOT EXISTS ratings (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id   uuid        NOT NULL,
  entity_type text        NOT NULL CHECK (entity_type IN ('business', 'shelter')),
  category    text        NOT NULL,
  score       int         NOT NULL CHECK (score BETWEEN 1 AND 5),
  voter_token text        NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (entity_id, entity_type, category, voter_token)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id    uuid        NOT NULL,
  entity_type  text        NOT NULL CHECK (entity_type IN ('business', 'shelter')),
  display_name text        NOT NULL,
  body         text        NOT NULL,
  voter_token  text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE ratings  DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
