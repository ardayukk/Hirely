from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import (
    health,
    jobs,
    db_test,
    auth,
    users,
    services,
    orders,
    messages,
    disputes,
    analytics,
    withdrawals,
)

# Hirely API
app = FastAPI(title="Hirely API", version="0.1.0")

# CORS for local dev (allow all localhost ports for development)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
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
app.include_router(messages.router, prefix="/api")
app.include_router(disputes.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(withdrawals.router)

@app.get("/")
def root():
    return {"message": "Hirely API running"}
