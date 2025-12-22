-- Add revision_limit to Service table
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS revision_limit INTEGER DEFAULT 1;

-- Update existing rows based on package_tier
UPDATE "Service" SET revision_limit = 1 WHERE LOWER(package_tier) = 'basic';
UPDATE "Service" SET revision_limit = 3 WHERE LOWER(package_tier) = 'standard';
UPDATE "Service" SET revision_limit = NULL WHERE LOWER(package_tier) = 'premium';

-- Create RevisionPurchase table
CREATE TABLE IF NOT EXISTS "RevisionPurchase" (
    purchase_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    purchased_revisions INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE
);
