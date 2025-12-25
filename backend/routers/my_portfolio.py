from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.db import get_connection

router = APIRouter(prefix="/my-portfolio", tags=["portfolio-management"])


class PortfolioItemCreate(BaseModel):
    title: str
    description: str = ""
    image_url: str = ""
    project_url: str = ""
    tags: list[str] = []


class PortfolioItemUpdate(BaseModel):
    title: str = None
    description: str = None
    image_url: str = None
    project_url: str = None
    tags: list[str] = None


@router.get("")
async def list_my_portfolio(freelancer_id: int = Query(...)):
    """
    Get all portfolio items for the authenticated freelancer.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify freelancer exists
            await cur.execute('SELECT user_id FROM "Freelancer" WHERE user_id = %s', (freelancer_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Freelancer not found")

            # Fetch portfolio items with tags
            await cur.execute(
                """
                SELECT p.portfolio_id, p.title, p.description, p.image_url, p.project_url, p.created_at
                FROM "Portfolio" p
                WHERE p.freelancer_id = %s
                ORDER BY p.created_at DESC
                """,
                (freelancer_id,)
            )
            items = await cur.fetchall()
            
            result = []
            for item in items:
                # Fetch tags for this portfolio item
                await cur.execute(
                    """
                    SELECT pt.tag_name
                    FROM "PortfolioTagMapping" ptm
                    JOIN "PortfolioTag" pt ON ptm.tag_id = pt.tag_id
                    WHERE ptm.portfolio_id = %s
                    """,
                    (item[0],)
                )
                tags = [row[0] for row in await cur.fetchall()]
                
                result.append({
                    "portfolio_id": item[0],
                    "title": item[1],
                    "description": item[2],
                    "image_url": item[3],
                    "project_url": item[4],
                    "tags": tags,
                    "created_at": item[5].isoformat() if item[5] else None,
                })
            
            return result


@router.post("")
async def create_portfolio_item(freelancer_id: int = Query(...), item: PortfolioItemCreate = None):
    """
    Create a new portfolio item for the freelancer.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify freelancer exists
            await cur.execute('SELECT user_id FROM "Freelancer" WHERE user_id = %s', (freelancer_id,))
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Freelancer not found")

            try:
                # Insert portfolio item
                await cur.execute(
                    """
                    INSERT INTO "Portfolio" (freelancer_id, title, description, image_url, project_url, created_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    RETURNING portfolio_id, created_at
                    """,
                    (freelancer_id, item.title, item.description, item.image_url, item.project_url)
                )
                row = await cur.fetchone()
                portfolio_id = row[0]
                created_at = row[1]

                # Insert tags if provided
                if item.tags:
                    for tag_name in item.tags:
                        # Get or create tag
                        await cur.execute(
                            'SELECT tag_id FROM "PortfolioTag" WHERE tag_name = %s',
                            (tag_name,)
                        )
                        tag_row = await cur.fetchone()
                        if tag_row:
                            tag_id = tag_row[0]
                        else:
                            await cur.execute(
                                'INSERT INTO "PortfolioTag" (tag_name) VALUES (%s) RETURNING tag_id',
                                (tag_name,)
                            )
                            tag_id = (await cur.fetchone())[0]
                        
                        # Link tag to portfolio item
                        await cur.execute(
                            'INSERT INTO "PortfolioTagMapping" (portfolio_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING',
                            (portfolio_id, tag_id)
                        )

                await conn.commit()
                
                return {
                    "portfolio_id": portfolio_id,
                    "title": item.title,
                    "description": item.description,
                    "image_url": item.image_url,
                    "project_url": item.project_url,
                    "tags": item.tags,
                    "created_at": created_at.isoformat() if created_at else None,
                }
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=str(e))


@router.put("/{portfolio_id}")
async def update_portfolio_item(portfolio_id: int, freelancer_id: int = Query(...), item: PortfolioItemUpdate = None):
    """
    Update a portfolio item. Only the freelancer who created it can update it.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify ownership
            await cur.execute(
                'SELECT portfolio_id FROM "Portfolio" WHERE portfolio_id = %s AND freelancer_id = %s',
                (portfolio_id, freelancer_id)
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Portfolio item not found or unauthorized")

            try:
                # Update portfolio item
                updates = []
                values = []
                if item.title is not None:
                    updates.append('title = %s')
                    values.append(item.title)
                if item.description is not None:
                    updates.append('description = %s')
                    values.append(item.description)
                if item.image_url is not None:
                    updates.append('image_url = %s')
                    values.append(item.image_url)
                if item.project_url is not None:
                    updates.append('project_url = %s')
                    values.append(item.project_url)
                
                if updates:
                    values.append(portfolio_id)
                    query = f'UPDATE "Portfolio" SET {", ".join(updates)} WHERE portfolio_id = %s'
                    await cur.execute(query, values)

                # Update tags if provided
                if item.tags is not None:
                    # Delete existing tags
                    await cur.execute(
                        'DELETE FROM "PortfolioTagMapping" WHERE portfolio_id = %s',
                        (portfolio_id,)
                    )
                    
                    # Add new tags
                    for tag_name in item.tags:
                        await cur.execute(
                            'SELECT tag_id FROM "PortfolioTag" WHERE tag_name = %s',
                            (tag_name,)
                        )
                        tag_row = await cur.fetchone()
                        if tag_row:
                            tag_id = tag_row[0]
                        else:
                            await cur.execute(
                                'INSERT INTO "PortfolioTag" (tag_name) VALUES (%s) RETURNING tag_id',
                                (tag_name,)
                            )
                            tag_id = (await cur.fetchone())[0]
                        
                        await cur.execute(
                            'INSERT INTO "PortfolioTagMapping" (portfolio_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING',
                            (portfolio_id, tag_id)
                        )

                await conn.commit()
                
                # Fetch updated item
                await cur.execute(
                    'SELECT title, description, image_url, project_url FROM "Portfolio" WHERE portfolio_id = %s',
                    (portfolio_id,)
                )
                row = await cur.fetchone()
                
                return {
                    "portfolio_id": portfolio_id,
                    "title": row[0],
                    "description": row[1],
                    "image_url": row[2],
                    "project_url": row[3],
                    "tags": item.tags or [],
                }
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{portfolio_id}")
async def delete_portfolio_item(portfolio_id: int, freelancer_id: int = Query(...)):
    """
    Delete a portfolio item. Only the freelancer who created it can delete it.
    """
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Verify ownership
            await cur.execute(
                'SELECT portfolio_id FROM "Portfolio" WHERE portfolio_id = %s AND freelancer_id = %s',
                (portfolio_id, freelancer_id)
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Portfolio item not found or unauthorized")

            try:
                # Delete tags mapping
                await cur.execute(
                    'DELETE FROM "PortfolioTagMapping" WHERE portfolio_id = %s',
                    (portfolio_id,)
                )
                
                # Delete portfolio item
                await cur.execute(
                    'DELETE FROM "Portfolio" WHERE portfolio_id = %s',
                    (portfolio_id,)
                )
                
                await conn.commit()
                
                return {"message": "Portfolio item deleted successfully"}
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=str(e))
