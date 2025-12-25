-- Migration: Allow 'disputed' status for orders

-- Safely drop the existing check constraint if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'order_status_check'
    ) THEN
        ALTER TABLE "Order" DROP CONSTRAINT order_status_check;
    END IF;
EXCEPTION WHEN undefined_object THEN
    -- Constraint wasn't found; nothing to drop
    NULL;
END $$;

-- Recreate the constraint including 'disputed'
DO $$
BEGIN
    ALTER TABLE "Order"
    ADD CONSTRAINT order_status_check
    CHECK (status IN ('pending', 'accepted', 'in_progress', 'delivered', 'revision_requested', 'completed', 'cancelled', 'disputed'));
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists; ignore
    NULL;
END $$;
