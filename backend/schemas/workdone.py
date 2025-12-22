from pydantic import BaseModel


class WorkDoneCreate(BaseModel):
    work_done: str


class WorkDonePublic(BaseModel):
    freelancer_id: int
    work_done: str
