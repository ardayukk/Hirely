import os
import sys
# Avoid importing backend.db which has async pool issues
sys.modules['backend'] = type(sys)('backend')
sys.modules['backend.db'] = type(sys)('backend.db')

import psycopg
from dotenv import load_dotenv

load_dotenv('.env')
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    db_name = os.getenv("DB_NAME", "hirelydb")
    db_user = os.getenv("DB_USER", "auser")
    db_pass = os.getenv("DB_PASSWORD", "1234")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    DATABASE_URL = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

with psycopg.connect(DATABASE_URL) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
        tables = cur.fetchall()
        
        print()
        print("=" * 100)
        print("HIRELY DATABASE SCHEMA REPORT")
        print("=" * 100)
        print(f"Total Tables: {len(tables)}")
        print("=" * 100)
        
        for (table_name,) in tables:
            # Get column details
            cur.execute("""
                SELECT column_name, data_type, character_maximum_length, 
                       is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
            """, (table_name,))
            columns = cur.fetchall()
            
            # Get row count
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                count = cur.fetchone()[0]
            except:
                count = "N/A"
            
            print()
            print(f"TABLE: {table_name}")
            print("-" * 100)
            print(f"{'Column':<35} {'Type':<25} {'Nullable':<10} {'Default'}")
            print("-" * 100)
            
            for col_name, data_type, max_len, nullable, default in columns:
                type_str = f"{data_type}({max_len})" if max_len else data_type
                nullable_str = "YES" if nullable == "YES" else "NO"
                default_str = str(default)[:30] if default else ""
                print(f"{col_name:<35} {type_str:<25} {nullable_str:<10} {default_str}")
        
        print()
        print("=" * 100)
        print("END OF REPORT")
        print("=" * 100)
