-- Create CategoryMetadata table for admin controls
CREATE TABLE IF NOT EXISTS "CategoryMetadata" (
    category TEXT PRIMARY KEY,
    is_promoted BOOLEAN DEFAULT FALSE,
    recruitment_needed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
