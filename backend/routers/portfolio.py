from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from backend.db import get_connection
from pydantic import BaseModel

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class PortfolioItemPublic(BaseModel):
    portfolio_id: int
    freelancer_id: int
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    project_url: Optional[str] = None
    tags: List[str] = []
    created_at: str


@router.get("/{freelancer_id}", response_model=List[PortfolioItemPublic])
async def get_portfolio(freelancer_id: int):
    """Get all portfolio items for a freelancer with tags"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            # Fetch portfolio items
            await cur.execute(
                '''
                SELECT portfolio_id, freelancer_id, title, description, image_url, project_url, created_at
                FROM "Portfolio"
                WHERE freelancer_id = %s
                ORDER BY created_at DESC
                ''',
                (freelancer_id,)
            )
            rows = await cur.fetchall()
            
            result = []
            for row in rows:
                portfolio_id = row[0]
                # Fetch tags for this portfolio item
                await cur.execute(
                    '''
                    SELECT pt.tag_name
                    FROM "PortfolioTagMapping" ptm
                    JOIN "PortfolioTag" pt ON ptm.tag_id = pt.tag_id
                    WHERE ptm.portfolio_id = %s
                    ''',
                    (portfolio_id,)
                )
                tag_rows = await cur.fetchall()
                tags = [t[0] for t in tag_rows]
                
                result.append(PortfolioItemPublic(
                    portfolio_id=portfolio_id,
                    freelancer_id=row[1],
                    title=row[2],
                    description=row[3],
                    image_url=row[4],
                    project_url=row[5],
                    created_at=row[6].isoformat() if row[6] else None,
                    tags=tags,
                ))
            return result
