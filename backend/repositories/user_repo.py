from typing import Optional, Tuple


async def get_user_by_email(conn, email: str) -> Optional[Tuple]:
    async with conn.cursor() as cur:
        await cur.execute("SELECT * FROM auth_user WHERE email = %s;", (email,))
        return await cur.fetchone()


async def create_user(conn, username: str, email: str, hashed_password: str, role: str) -> Tuple:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO auth_user (username, email, hashed_password, role)
            VALUES (%s, %s, %s, %s)
            RETURNING id, username, email, role, date_joined;
            """,
            (username, email, hashed_password, role),
        )
        return await cur.fetchone()
