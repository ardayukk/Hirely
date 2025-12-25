import sys
import asyncio

# Fix for Windows: psycopg requires WindowsSelectorEventLoopPolicy
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

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
    admin_disputes,
    withdrawals,
    earnings,
    satisfaction,
    pricing_analytics,
    notifications,
    deliverables,
    workdone,
    favorites,
    portfolio,
    my_portfolio,
    availability,
    warranty,
    pricing_history,
)

# Hirely API
app = FastAPI(title="Hirely API", version="0.1.0")

# Initialize database connection pool on startup/shutdown
from backend.db import init_pool, close_pool

@app.on_event("startup")
async def _on_startup():
    await init_pool()

@app.on_event("shutdown")
async def _on_shutdown():
    await close_pool()

# CORS for local dev (allow all localhost ports for development)
# CORS for local dev (allow common localhost origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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
app.include_router(admin_disputes.router, prefix="/api")
app.include_router(withdrawals.router)
app.include_router(earnings.router, prefix="/api")
app.include_router(satisfaction.router)
app.include_router(pricing_analytics.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(deliverables.router, prefix="/api")
app.include_router(workdone.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(my_portfolio.router, prefix="/api")
app.include_router(availability.router, prefix="/api")
app.include_router(warranty.router, prefix="/api")
app.include_router(pricing_history.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Hirely API running"}
