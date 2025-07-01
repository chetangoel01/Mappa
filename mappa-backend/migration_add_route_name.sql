-- Migration to add name field to ShapeRoute table
-- Run this in your Supabase SQL editor

-- Add name column to the ShapeRoute table
ALTER TABLE "ShapeRoute" 
ADD COLUMN IF NOT EXISTS "name" TEXT;

-- Add index on name for better performance
CREATE INDEX IF NOT EXISTS idx_shape_route_name ON "ShapeRoute"("name");

-- Verify the table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'ShapeRoute' 
-- ORDER BY ordinal_position; 