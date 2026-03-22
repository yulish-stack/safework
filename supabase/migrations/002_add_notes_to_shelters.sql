-- Add notes field to shelters (used for user submissions and GIS hearot data)
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS notes text;
