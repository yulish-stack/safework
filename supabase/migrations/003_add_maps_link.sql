-- Add maps_link reference field for admin moderation
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS maps_link text;
ALTER TABLE shelters   ADD COLUMN IF NOT EXISTS maps_link text;
