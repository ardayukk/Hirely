-- Analytics Tables Migration

-- Table to store raw events (views, clicks, etc.)
CREATE TABLE IF NOT EXISTS "ServiceEvent" (
    event_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    user_id INTEGER, -- Nullable, as viewers might not be logged in
    event_type TEXT NOT NULL CHECK (event_type IN ('VIEW', 'CLICK', 'ORDER_CONVERSION', 'CONTACT')),
    metadata JSONB DEFAULT '{}', -- Store extra info like source, device, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE SET NULL
);

-- Index for querying events by service and time
CREATE INDEX IF NOT EXISTS idx_service_event_service_time ON "ServiceEvent"(service_id, created_at);
CREATE INDEX IF NOT EXISTS idx_service_event_type ON "ServiceEvent"(event_type);

-- Table to store daily aggregated metrics for faster querying
CREATE TABLE IF NOT EXISTS "ServiceDailyMetric" (
    metric_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    date DATE NOT NULL,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 4) DEFAULT 0.0000, -- orders / views
    avg_response_time DECIMAL(10, 2), -- in seconds
    avg_rating DECIMAL(3, 2),
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    UNIQUE(service_id, date),
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

-- Index for querying metrics by service and date range
CREATE INDEX IF NOT EXISTS idx_service_daily_metric_service_date ON "ServiceDailyMetric"(service_id, date);
