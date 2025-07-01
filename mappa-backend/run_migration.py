#!/usr/bin/env python3
"""
Script to run the database migration for profile fields
"""
import os
from app import supabase

def run_migration():
    print("Running database migration for profile fields...")
    
    # SQL commands to add the new columns
    migration_commands = [
        """
        ALTER TABLE "User" 
        ADD COLUMN IF NOT EXISTS "name" TEXT,
        ADD COLUMN IF NOT EXISTS "location" TEXT,
        ADD COLUMN IF NOT EXISTS "bio" TEXT,
        ADD COLUMN IF NOT EXISTS "profile_picture" TEXT,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_user_name ON "User"("name");
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_user_created_at ON "User"("created_at");
        """
    ]
    
    try:
        for i, command in enumerate(migration_commands, 1):
            print(f"Running migration step {i}...")
            result = supabase.rpc('exec_sql', {'sql': command}).execute()
            print(f"✓ Step {i} completed")
        
        print("\n✅ Migration completed successfully!")
        print("\nYou can now:")
        print("1. Register new users with names")
        print("2. View and edit user profiles")
        print("3. Access profile data in settings")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("\nAlternative: Run the SQL commands manually in your Supabase SQL editor:")
        print("1. Go to your Supabase dashboard")
        print("2. Navigate to SQL Editor")
        print("3. Copy and paste the contents of 'migration_add_profile_fields.sql'")
        print("4. Execute the commands")

if __name__ == "__main__":
    run_migration() 