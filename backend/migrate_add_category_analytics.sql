-- Create CategoryDailyMetrics table for analytics
CREATE TABLE IF NOT EXISTS "CategoryDailyMetrics" (
    metric_id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    category TEXT NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0.00,
    avg_order_value DECIMAL(10, 2) DEFAULT 0.00,
    unique_buyers INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(metric_date, category)
);

-- Index for fast retrieval by date range and category
CREATE INDEX IF NOT EXISTS idx_cat_metrics_date_cat ON "CategoryDailyMetrics"(metric_date, category);
