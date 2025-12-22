from pydantic import BaseModel
from typing import Optional


class ReportCreate(BaseModel):
    report_type: str
    report_context: Optional[str] = None
    report_title: Optional[str] = None
    report_data: Optional[str] = None
    report_file_path: Optional[str] = None


class ReportPublic(BaseModel):
    report_id: int
    report_type: str
    admin_id: int
    report_context: Optional[str] = None
    report_title: Optional[str] = None
    report_data: Optional[str] = None
    report_file_path: Optional[str] = None
