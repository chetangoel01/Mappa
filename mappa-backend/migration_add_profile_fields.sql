-- Migration to add profile fields to User table
-- Run this in your Supabase SQL editor

-- Add new columns to the User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "bio" TEXT,
ADD COLUMN IF NOT EXISTS "profile_picture" TEXT,
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Make name required for new users (existing users can have NULL name)
-- Note: You may want to update existing users with a default name if needed
-- UPDATE "User" SET "name" = 'User' WHERE "name" IS NULL;

-- Add index on name for better performance
CREATE INDEX IF NOT EXISTS idx_user_name ON "User"("name");

-- Add index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "User"("created_at");

-- Verify the table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'User' 
-- ORDER BY ordinal_position; 