-- SafeWork: create businesses and shelters tables

CREATE TABLE IF NOT EXISTS businesses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  address       text,
  type          text,
  latitude      float,
  longitude     float,
  opening_hours text,
  wifi          boolean DEFAULT false,
  wifi_quality  text,
  power_outlets boolean DEFAULT false,
  is_approved   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shelters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  address       text,
  latitude      float,
  longitude     float,
  is_accessible boolean DEFAULT false,
  is_public     boolean DEFAULT true,
  is_approved   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- Disable RLS for development (enable + add policies in production)
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE shelters   DISABLE ROW LEVEL SECURITY;
