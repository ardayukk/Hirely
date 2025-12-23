-- Add impressions_count to ServiceDailyMetric
ALTER TABLE "ServiceDailyMetric"
ADD COLUMN IF NOT EXISTS impressions_count INTEGER DEFAULT 0;

-- Add ctr column
ALTER TABLE "ServiceDailyMetric"
ADD COLUMN IF NOT EXISTS ctr DECIMAL(5, 4) DEFAULT 0.0000;
