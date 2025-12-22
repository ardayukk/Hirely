-- Migration: Add updated_at column to Service table
-- This enables the pause/reactivate/edit features for services

ALTER TABLE "Service"
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update all existing services to have the current timestamp
UPDATE "Service" SET updated_at = NOW() WHERE updated_at IS NULL;

-- Make the column NOT NULL
ALTER TABLE "Service" 
ALTER COLUMN updated_at SET NOT NULL;

-- Create index for performance on status queries
CREATE INDEX IF NOT EXISTS idx_service_status ON "Service"(status);

COMMIT;
