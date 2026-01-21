-- Add subtitle column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS subtitle TEXT;
