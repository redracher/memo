-- Add positions column to notes table for tracking multiple stock positions
ALTER TABLE notes
ADD COLUMN positions JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance on positions
CREATE INDEX IF NOT EXISTS notes_positions_idx ON notes USING GIN (positions);
