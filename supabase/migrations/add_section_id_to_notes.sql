-- Add section_id column to notes table for organizing notes into sections
ALTER TABLE notes ADD COLUMN IF NOT EXISTS section_id TEXT;

-- Add index for faster section queries
CREATE INDEX IF NOT EXISTS idx_notes_section_id ON notes(section_id);
