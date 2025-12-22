#!/usr/bin/env python3
"""
Migration script to add updated_at column to Service table
Run from backend directory: python migrate_db.py
"""

import psycopg
import sys

# Database credentials
db_config = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "bilkent.31",
    "dbname": "hirelydb",
}

migration_sql = """
-- Migration: Add updated_at column to Service table
ALTER TABLE "Service"
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update all existing services to have the current timestamp
UPDATE "Service" SET updated_at = NOW() WHERE updated_at IS NULL;

-- Make the column NOT NULL
ALTER TABLE "Service" 
ALTER COLUMN updated_at SET NOT NULL;

-- Create index for performance on status queries
CREATE INDEX IF NOT EXISTS idx_service_status ON "Service"(status);
"""

def run_migration():
    try:
        print("Connecting to database...")
        conn = psycopg.connect(**db_config)
        cur = conn.cursor()
        
        print("Running migration...")
        cur.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print("   - Added 'updated_at' column to Service table")
        print("   - Created index on status column")
        
        cur.close()
        conn.close()
        
    except psycopg.errors.DuplicateColumn:
        print("⚠️  Column 'updated_at' already exists in Service table")
        print("   Migration may have already been applied.")
        conn.close()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
