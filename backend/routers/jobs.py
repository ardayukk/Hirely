from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/jobs", tags=["jobs"])

class Job(BaseModel):
    id: int
    title: str
    company: str
    location: str

# In-memory sample data
_JOBS: List[Job] = [
    Job(id=1, title="Backend Engineer", company="Acme", location="Remote"),
    Job(id=2, title="Frontend Engineer", company="Globex", location="Istanbul"),
]

@router.get("/", response_model=List[Job])
def list_jobs():
    return _JOBS
