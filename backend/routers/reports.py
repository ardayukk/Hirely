from typing import List
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime

from backend.db import get_connection
from backend.schemas.report import ReportCreate, ReportPublic

router = APIRouter(prefix="/admin/reports", tags=["reports"])


@router.post("", response_model=ReportPublic, status_code=201)
async def create_report(report: ReportCreate, admin_id: int = Query(...)):
    """Create an admin report"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify admin exists
                await cur.execute('SELECT user_id FROM "Admin" WHERE user_id = %s', (admin_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=403, detail="Admin access required")

                await cur.execute(
                    '''
                    INSERT INTO "Report" (report_type, admin_id, report_context, report_title, report_data, report_file_path)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING report_id
                    ''',
                    (
                        report.report_type,
                        admin_id,
                        report.report_context,
                        report.report_title,
                        report.report_data,
                        report.report_file_path,
                    ),
                )
                report_id = (await cur.fetchone())[0]
                await conn.commit()

                return ReportPublic(
                    report_id=report_id,
                    report_type=report.report_type,
                    admin_id=admin_id,
                    report_context=report.report_context,
                    report_title=report.report_title,
                    report_data=report.report_data,
                    report_file_path=report.report_file_path,
                )
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to create report: {str(e)}")


@router.get("", response_model=List[ReportPublic])
async def list_reports(admin_id: int = Query(...), report_type: str = Query(None)):
    """List reports (optionally filtered by type)"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify admin
                await cur.execute('SELECT user_id FROM "Admin" WHERE user_id = %s', (admin_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=403, detail="Admin access required")

                if report_type:
                    await cur.execute(
                        'SELECT report_id, report_type, admin_id, report_context, report_title, report_data, report_file_path FROM "Report" WHERE report_type = %s ORDER BY report_id DESC',
                        (report_type,),
                    )
                else:
                    await cur.execute(
                        'SELECT report_id, report_type, admin_id, report_context, report_title, report_data, report_file_path FROM "Report" ORDER BY report_id DESC',
                    )

                rows = await cur.fetchall()
                return [
                    ReportPublic(
                        report_id=row[0],
                        report_type=row[1],
                        admin_id=row[2],
                        report_context=row[3],
                        report_title=row[4],
                        report_data=row[5],
                        report_file_path=row[6],
                    )
                    for row in rows
                ]
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to list reports: {str(e)}")


@router.get("/{report_id}", response_model=ReportPublic)
async def get_report(report_id: int, admin_id: int = Query(...)):
    """Get a specific report"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify admin
                await cur.execute('SELECT user_id FROM "Admin" WHERE user_id = %s', (admin_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=403, detail="Admin access required")

                await cur.execute(
                    'SELECT report_id, report_type, admin_id, report_context, report_title, report_data, report_file_path FROM "Report" WHERE report_id = %s',
                    (report_id,),
                )
                row = await cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Report not found")

                return ReportPublic(
                    report_id=row[0],
                    report_type=row[1],
                    admin_id=row[2],
                    report_context=row[3],
                    report_title=row[4],
                    report_data=row[5],
                    report_file_path=row[6],
                )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to get report: {str(e)}")


@router.delete("/{report_id}")
async def delete_report(report_id: int, admin_id: int = Query(...)):
    """Delete a report"""
    async with get_connection() as conn:
        async with conn.cursor() as cur:
            try:
                # Verify admin
                await cur.execute('SELECT user_id FROM "Admin" WHERE user_id = %s', (admin_id,))
                if not await cur.fetchone():
                    raise HTTPException(status_code=403, detail="Admin access required")

                await cur.execute(
                    'DELETE FROM "Report" WHERE report_id = %s',
                    (report_id,),
                )
                await conn.commit()
                return {"message": "Report deleted"}
            except HTTPException:
                await conn.rollback()
                raise
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=400, detail=f"Failed to delete report: {str(e)}")
