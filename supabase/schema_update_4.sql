-- Add card_description column to posts table to allow custom Open Graph descriptions (or fake domains)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS card_description TEXT;
