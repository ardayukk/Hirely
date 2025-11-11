# Hirely Backend (FastAPI)

Local development:

1. Install deps from `requirements.txt` (system-wide or per-user),
2. Copy `.env.example` to `.env` and adjust `DATABASE_URL` (optional),
3. Run the server

If you prefer not to use a virtual environment, here's a simple workflow (PowerShell):

```
# go to the backend folder
cd 'C:\Users\Ahmet Hakan\OneDrive\Desktop\Hirely\backend'

# install dependencies system-wide (or use --user to avoid admin privileges)
pip install -r requirements.txt

# copy env if needed
copy .env.example .env

# start the server
python -m uvicorn main:app --reload --port 8000
```

If you previously created a local virtual environment folder (for example `.venv`) and want to remove it, delete the folder:

PowerShell:

```
Remove-Item -Recurse -Force .venv
```

Windows cmd.exe:

```
rmdir /s /q .venv
```

Notes:
- Installing packages system-wide affects your global Python environment. If you want to avoid global changes but still not use a venv, consider `pip install --user -r requirements.txt` which installs to your user site-packages.
- The app doesn't require a database to run the sample `/api/health` and `/api/jobs/` endpoints. Create a `.env` only if you need database connectivity.

Endpoints:
- GET `/api/health` – health check
- GET `/api/jobs/` – list sample jobs

Environment variables:
- Either set `DATABASE_URL` directly, or set `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` and the backend will construct the URL automatically.
