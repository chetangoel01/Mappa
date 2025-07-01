#!/usr/bin/env python3
"""
Script to check the ShapeRoute table schema
"""

import os
from supabase import create_client, Client

def check_schema():
    """Check the ShapeRoute table schema"""
    try:
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required")
            return
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Try to get a sample record to see the structure
        try:
            result = supabase.table('ShapeRoute').select('*').limit(1).execute()
            print(f"Sample record: {result.data}")
            
            if result.data:
                sample = result.data[0]
                print(f"Available columns: {list(sample.keys())}")
                
                if 'name' in sample:
                    print("✅ name column exists")
                else:
                    print("❌ name column does not exist")
            else:
                print("No records found in ShapeRoute table")
                
        except Exception as e:
            print(f"Error querying ShapeRoute table: {e}")
            
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")

if __name__ == "__main__":
    check_schema() 