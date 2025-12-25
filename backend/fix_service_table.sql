-- Add missing freelancer_id column to Service table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Service' AND column_name = 'freelancer_id'
    ) THEN
        ALTER TABLE "Service" ADD COLUMN freelancer_id INTEGER NOT NULL DEFAULT 0;
        -- You may want to update existing rows with proper freelancer_id values
        -- For now, setting default to 0 to allow the column creation
    END IF;
END $$;
