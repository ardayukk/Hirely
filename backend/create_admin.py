import asyncio
import sys

# Fix for Windows: psycopg requires WindowsSelectorEventLoopPolicy
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, '.')

from backend.core.security import hash_password
from backend.db import get_connection

async def create_admin():
    email = "admin@bcc.com"
    username = "adminamk"
    password = "123"
    
    hashed = hash_password(password)
    
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Check if admin already exists
                await cur.execute('SELECT user_id FROM "User" WHERE email = %s', (email,))
                if await cur.fetchone():
                    print(f"❌ User with email {email} already exists")
                    return
                
                # 1. Insert into User table
                await cur.execute(
                    'INSERT INTO "User" (email, password, role) VALUES (%s, %s, %s) RETURNING user_id',
                    (email, hashed, 'admin')
                )
                user_id = (await cur.fetchone())[0]
                
                # 2. Insert into Admin table
                await cur.execute(
                    'INSERT INTO "Admin" (user_id, username) VALUES (%s, %s)',
                    (user_id, username)
                )
                
                await conn.commit()
                print(f"✅ Admin account created successfully!")
                print(f"   User ID: {user_id}")
                print(f"   Email: {email}")
                print(f"   Username: {username}")
                print(f"   Password: {password}")
                
            except Exception as e:
                await conn.rollback()
                print(f"❌ Error creating admin: {e}")

if __name__ == "__main__":
    asyncio.run(create_admin())
