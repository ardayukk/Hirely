# Hirely
This is a freelance job finding application
Hirely – minimal full‑stack scaffold

Structure:
- `backend/` FastAPI app exposing `/api` routes
- `frontend/` Vite + React app (JavaScript) consuming the API

Where FastAPI calls are handled:
- Frontend: `frontend/src/utils/api.js` centralizes fetch logic. Components (e.g., `frontend/src/ui/App.jsx`) call `api.get('/api/...')`.
- Dev proxy: `frontend/vite.config.js` proxies any request starting with `/api` to `http://localhost:8000` so the browser avoids CORS in development.
- Backend: Route handlers live under `backend/routers/` and are mounted in `backend/main.py` with a common `/api` prefix. Examples: `health.py` (GET `/api/health`), `jobs.py` (GET `/api/jobs/`).

Run locally (PowerShell):

Backend
```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
copy backend\.env.example backend\.env
uvicorn backend.main:app --reload --port 8000
```

Frontend (new terminal)
```
cd frontend
npm install
npm run dev
```

Notes:
- Adjust `backend/.env` for your Postgres DSN when you connect to a real database.
- In production you’ll typically serve the built frontend separately and point it at the FastAPI base URL (set Vite env `VITE_API_BASE` or similar, then use it in `api.ts`).
