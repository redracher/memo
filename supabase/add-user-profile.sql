-- Add profile for existing user
-- Run this in your Supabase SQL editor
-- Replace the email with your actual email if different

INSERT INTO profiles (id, first_name, last_name)
SELECT id, 'David', 'Mikhail'
FROM auth.users
WHERE email = 'davidmikhail@gmail.com'
ON CONFLICT (id)
DO UPDATE SET
  first_name = 'David',
  last_name = 'Mikhail',
  updated_at = NOW();
