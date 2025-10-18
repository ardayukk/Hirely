# Hirely Backend (FastAPI)

Local development:

1. Create and activate a virtual environment
2. Install deps from `requirements.txt`
3. Copy `.env.example` to `.env` and adjust `DATABASE_URL`
4. Run the server

Example (PowerShell):

```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
copy backend/.env.example backend/.env
uvicorn backend.main:app --reload --port 8000
```

Endpoints:
- GET `/api/health` – health check
- GET `/api/jobs/` – list sample jobs

Environment variables:
- Either set `DATABASE_URL` directly, or set `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` and the backend will construct the URL automatically.
