from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import health, jobs, db_test, auth, users, services, orders

app = FastAPI(title="Hirely API", version="0.1.0")

# CORS for local dev (Vite default port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(db_test.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(services.router, prefix="/api")
app.include_router(orders.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Hirely API running"}
