-- Hirely Database Schema (CS353)
-- Complete E/R Model Implementation
-- Raw SQL - No ORM

-- ============================================
-- CORE USER ENTITIES
-- ============================================

CREATE TABLE IF NOT EXISTS "User" (
    user_id SERIAL PRIMARY KEY,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Admin" (
    user_id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "NonAdmin" (
    user_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    date_of_birth DATE,
    profile_picture TEXT,
    phone TEXT,
    address TEXT,
    age INTEGER,
    biography TEXT,
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Client" (
    user_id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "NonAdmin"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Freelancer" (
    user_id INTEGER PRIMARY KEY,
    tagline TEXT,
    avg_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES "NonAdmin"(user_id) ON DELETE CASCADE
);

-- ============================================
-- NOTIFICATION ENTITY
-- ============================================

CREATE TABLE IF NOT EXISTS "Notification" (
    user_id INTEGER NOT NULL,
    notification_id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    date_sent TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE CASCADE
);

-- ============================================
-- SERVICE & REVIEW ENTITIES
-- ============================================

CREATE TABLE IF NOT EXISTS "Service" (
    service_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    delivery_time INTEGER,
    hourly_price DECIMAL(10, 2),
    package_tier TEXT,
    revision_limit INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED')),
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SampleWork" (
    service_id INTEGER PRIMARY KEY,
    sample_work TEXT,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Review" (
    review_id SERIAL PRIMARY KEY,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    highlights TEXT,
    client_id INTEGER NOT NULL,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE
);

-- ============================================
-- ORDER & PAYMENT ENTITIES
-- ============================================

CREATE TABLE IF NOT EXISTS "Payment" (
    payment_id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    released BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'HELD',
    released_amount DECIMAL(10, 2) DEFAULT 0,
    refunded_amount DECIMAL(10, 2) DEFAULT 0,
    released_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    CONSTRAINT payment_amount_flow CHECK ((COALESCE(released_amount,0) + COALESCE(refunded_amount,0)) <= amount)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment' AND column_name = 'status') THEN
        ALTER TABLE "Payment" ADD COLUMN status TEXT DEFAULT 'HELD';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment' AND column_name = 'released_amount') THEN
        ALTER TABLE "Payment" ADD COLUMN released_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment' AND column_name = 'refunded_amount') THEN
        ALTER TABLE "Payment" ADD COLUMN refunded_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment' AND column_name = 'released_at') THEN
        ALTER TABLE "Payment" ADD COLUMN released_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment' AND column_name = 'refunded_at') THEN
        ALTER TABLE "Payment" ADD COLUMN refunded_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'payment' AND constraint_name = 'payment_amount_flow'
    ) THEN
        ALTER TABLE "Payment" ADD CONSTRAINT payment_amount_flow CHECK ((COALESCE(released_amount,0) + COALESCE(refunded_amount,0)) <= amount);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "AnalyticsReport" (
    report_id SERIAL PRIMARY KEY,
    report_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    avg_pricing DECIMAL(10, 2),
    avg_dispute_rate DECIMAL(5, 2),
    avg_satisfaction DECIMAL(3, 2)
);

CREATE TABLE IF NOT EXISTS "Order" (
    order_id SERIAL PRIMARY KEY,
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'HELD',
    amount_released DECIMAL(10, 2) DEFAULT 0,
    amount_refunded DECIMAL(10, 2) DEFAULT 0,
    revision_count INTEGER DEFAULT 0,
    included_revision_limit INTEGER DEFAULT 1,
    extra_revisions_purchased INTEGER NOT NULL DEFAULT 0 CHECK (extra_revisions_purchased >= 0),
    total_price DECIMAL(10, 2),
    required_hours INTEGER,
    review_given BOOLEAN DEFAULT FALSE,
    report_id INTEGER,
    requirements TEXT,
    FOREIGN KEY (report_id) REFERENCES "AnalyticsReport"(report_id) ON DELETE SET NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order' AND column_name = 'payment_status') THEN
        ALTER TABLE "Order" ADD COLUMN payment_status TEXT DEFAULT 'HELD';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order' AND column_name = 'amount_released') THEN
        ALTER TABLE "Order" ADD COLUMN amount_released DECIMAL(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order' AND column_name = 'amount_refunded') THEN
        ALTER TABLE "Order" ADD COLUMN amount_refunded DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BigOrder" (
    order_id INTEGER PRIMARY KEY,
    milestone_count INTEGER NOT NULL,
    current_phase INTEGER DEFAULT 1,
    milestone_delivery_date TIMESTAMPTZ,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SmallOrder" (
    order_id INTEGER PRIMARY KEY,
    delivery_date TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Deliverable" (
    deliverable_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    payment_amount DECIMAL(10, 2),
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (order_id) REFERENCES "BigOrder"(order_id) ON DELETE CASCADE
);

-- Delivery submissions (freelancer -> client)
CREATE TABLE IF NOT EXISTS "Delivery" (
    delivery_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DeliveryFile" (
    file_id SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (delivery_id) REFERENCES "Delivery"(delivery_id) ON DELETE CASCADE
);

-- ============================================
-- REVISION ENTITY
-- ============================================

CREATE TABLE IF NOT EXISTS "Revision" (
    revision_id SERIAL PRIMARY KEY,
    revision_text TEXT,
    revision_no INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "RevisionPurchase" (
    purchase_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    purchased_revisions INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE
);

-- ============================================
-- MESSAGING & FILE ENTITIES
-- ============================================

CREATE TABLE IF NOT EXISTS "Messages" (
    message_id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    order_id INTEGER,
    reply_to_id INTEGER,
    message_text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (sender_id) REFERENCES "User"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES "User"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES "Messages"(message_id) ON DELETE SET NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'order_id'
    ) THEN
        ALTER TABLE "Messages" ADD COLUMN order_id INTEGER;
        BEGIN
            ALTER TABLE "Messages" ADD CONSTRAINT messages_order_fk FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            -- constraint already exists
            NULL;
        END;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "File" (
    file_id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    file_type TEXT,
    FOREIGN KEY (message_id) REFERENCES "Messages"(message_id) ON DELETE CASCADE
);

-- ============================================
-- DISPUTE & REPORT ENTITIES
-- ============================================

CREATE TABLE IF NOT EXISTS "Dispute" (
    dispute_id SERIAL PRIMARY KEY,
    -- legacy columns
    decision TEXT,
    resolution_date TIMESTAMPTZ,
    -- new fields for Admin Dispute Review Interface (#17)
    status TEXT DEFAULT 'OPEN',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_notes TEXT,
    description TEXT,
    closed_at TIMESTAMPTZ,
    resolution_message TEXT,
    freelancer_response TEXT,
    freelancer_response_at TIMESTAMPTZ
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute' AND column_name = 'closed_at') THEN
        ALTER TABLE "Dispute" ADD COLUMN closed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute' AND column_name = 'resolution_message') THEN
        ALTER TABLE "Dispute" ADD COLUMN resolution_message TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute' AND column_name = 'freelancer_response') THEN
        ALTER TABLE "Dispute" ADD COLUMN freelancer_response TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute' AND column_name = 'freelancer_response_at') THEN
        ALTER TABLE "Dispute" ADD COLUMN freelancer_response_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DisputeResolution" (
    resolution_id SERIAL PRIMARY KEY,
    dispute_id INTEGER NOT NULL,
    admin_id INTEGER,
    resolution_type TEXT NOT NULL,
    client_amount DECIMAL(10, 2) DEFAULT 0,
    freelancer_amount DECIMAL(10, 2) DEFAULT 0,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (dispute_id) REFERENCES "Dispute"(dispute_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES "Admin"(user_id) ON DELETE SET NULL,
    CONSTRAINT dispute_resolution_amount_flow CHECK (COALESCE(client_amount,0) + COALESCE(freelancer_amount,0) >= 0)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'disputeresolution' AND constraint_name = 'dispute_resolution_amount_flow'
    ) THEN
        ALTER TABLE "DisputeResolution" ADD CONSTRAINT dispute_resolution_amount_flow CHECK (COALESCE(client_amount,0) + COALESCE(freelancer_amount,0) >= 0);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Report" (
    report_id SERIAL PRIMARY KEY,
    report_type TEXT NOT NULL,
    admin_id INTEGER NOT NULL,
    report_context TEXT,
    report_title TEXT,
    report_data TEXT,
    report_file_path TEXT,
    FOREIGN KEY (admin_id) REFERENCES "Admin"(user_id) ON DELETE CASCADE
);

-- ============================================
-- RELATIONSHIP TABLES
-- ============================================

-- reported: Links Dispute, Client, Admin, Order
CREATE TABLE IF NOT EXISTS "reported" (
    dispute_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    admin_id INTEGER,
    order_id INTEGER NOT NULL,
    PRIMARY KEY (dispute_id, client_id, order_id),
    FOREIGN KEY (dispute_id) REFERENCES "Dispute"(dispute_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES "Admin"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE
);

-- cancel: Links Client, Freelancer, Order, Admin
CREATE TABLE IF NOT EXISTS "cancel" (
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    admin_id INTEGER NOT NULL,
    PRIMARY KEY (client_id, freelancer_id, order_id, admin_id),
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES "Admin"(user_id) ON DELETE CASCADE
);

-- finish_order: Links Order, Payment, Freelancer
CREATE TABLE IF NOT EXISTS "finish_order" (
    order_id INTEGER NOT NULL,
    payment_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    PRIMARY KEY (order_id, payment_id, freelancer_id),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES "Payment"(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

-- request_revision: Links Revision, Client, Order
CREATE TABLE IF NOT EXISTS "request_revision" (
    revision_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    PRIMARY KEY (revision_id, client_id, order_id),
    FOREIGN KEY (revision_id) REFERENCES "Revision"(revision_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE
);

-- create_service: Links Freelancer, Service
CREATE TABLE IF NOT EXISTS "create_service" (
    freelancer_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    date_of_creation TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (freelancer_id, service_id),
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

-- make_order: Links Order, Client, Service
CREATE TABLE IF NOT EXISTS "make_order" (
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY (order_id, client_id, service_id),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

-- give_review: Links User, Review, Service
CREATE TABLE IF NOT EXISTS "give_review" (
    user_id INTEGER NOT NULL,
    review_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, review_id, service_id),
    FOREIGN KEY (user_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES "Review"(review_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

-- add_on: Self-referencing Service relationship
CREATE TABLE IF NOT EXISTS "add_on" (
    service_id1 INTEGER NOT NULL,
    service_id2 INTEGER NOT NULL,
    PRIMARY KEY (service_id1, service_id2),
    FOREIGN KEY (service_id1) REFERENCES "Service"(service_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id2) REFERENCES "Service"(service_id) ON DELETE CASCADE,
    CHECK (service_id1 < service_id2)
);

-- order_addon: selected add-ons per order
CREATE TABLE IF NOT EXISTS order_addon (
    order_id INTEGER NOT NULL,
    addon_service_id INTEGER NOT NULL,
    PRIMARY KEY (order_id, addon_service_id),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (addon_service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

-- Update_Rating: Links Review, Freelancer
CREATE TABLE IF NOT EXISTS "Update_Rating" (
    review_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    PRIMARY KEY (review_id, freelancer_id),
    FOREIGN KEY (review_id) REFERENCES "Review"(review_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

-- Receive_Message: Links Client, Freelancer, Message
CREATE TABLE IF NOT EXISTS "Receive_Message" (
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    PRIMARY KEY (client_id, freelancer_id, message_id),
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES "Messages"(message_id) ON DELETE CASCADE
);

-- Send_Message: Links Client, Freelancer, Message
CREATE TABLE IF NOT EXISTS "Send_Message" (
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    PRIMARY KEY (client_id, freelancer_id, message_id),
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES "Messages"(message_id) ON DELETE CASCADE
);

-- WorkDone: Links Freelancer to work done
CREATE TABLE IF NOT EXISTS "WorkDone" (
    freelancer_id INTEGER NOT NULL,
    work_done TEXT,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

-- ============================================
-- INDICES (for performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_notification_user ON "Notification"(user_id);
CREATE INDEX IF NOT EXISTS idx_service_category ON "Service"(category);
CREATE INDEX IF NOT EXISTS idx_order_date ON "Order"(order_date);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON "Messages"(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON "Messages"(receiver_id);
CREATE INDEX IF NOT EXISTS idx_review_client ON "Review"(client_id);

-- ============================================
-- ADMIN DISPUTE REVIEW - SCHEMA EXTENSIONS
-- ============================================

-- Add optional order link to Messages so order chats can be queried in admin view
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Messages' AND column_name = 'order_id'
    ) THEN
        EXECUTE 'ALTER TABLE "Messages" ADD COLUMN order_id INTEGER NULL';
        EXECUTE 'ALTER TABLE "Messages" ADD CONSTRAINT messages_order_fk FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE SET NULL';
    END IF;
END $$;

-- Add created_at to Revision for timeline ordering
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Revision' AND column_name = 'created_at'
    ) THEN
        EXECUTE 'ALTER TABLE "Revision" ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()';
    END IF;
END $$;

-- Ensure Dispute fields and constraints exist (idempotent updates for existing DBs)
DO $$
BEGIN
    -- order_id linkage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Dispute' AND column_name = 'order_id'
    ) THEN
        EXECUTE 'ALTER TABLE "Dispute" ADD COLUMN order_id INTEGER';
        EXECUTE 'ALTER TABLE "Dispute" ADD CONSTRAINT dispute_order_fk FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE';
    END IF;

    -- opened_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Dispute' AND column_name = 'opened_at'
    ) THEN
        EXECUTE 'ALTER TABLE "Dispute" ADD COLUMN opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()';
    END IF;

    -- admin_notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Dispute' AND column_name = 'admin_notes'
    ) THEN
        EXECUTE 'ALTER TABLE "Dispute" ADD COLUMN admin_notes TEXT';
    END IF;

    -- admin_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Dispute' AND column_name = 'admin_id'
    ) THEN
        EXECUTE 'ALTER TABLE "Dispute" ADD COLUMN admin_id INTEGER';
        EXECUTE 'ALTER TABLE "Dispute" ADD CONSTRAINT dispute_admin_fk FOREIGN KEY (admin_id) REFERENCES "Admin"(user_id) ON DELETE SET NULL';
    END IF;

    -- description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Dispute' AND column_name = 'description'
    ) THEN
        EXECUTE 'ALTER TABLE "Dispute" ADD COLUMN description TEXT';
    END IF;

    -- status to uppercase policy and check
    -- Normalize any legacy statuses to uppercase variants
    BEGIN
        EXECUTE 'UPDATE "Dispute" SET status = UPPER(status) WHERE status IS NOT NULL';
    EXCEPTION WHEN others THEN NULL; END;

    -- Add CHECK constraint if missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dispute_status_check'
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE "Dispute" ADD CONSTRAINT dispute_status_check CHECK (status IN (''OPEN'',''RESOLVED'',''INFO_REQUESTED''))';
        EXCEPTION WHEN others THEN NULL; END;
    END IF;

    -- Unique per order (only one active dispute per order)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dispute_order_unique'
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE "Dispute" ADD CONSTRAINT dispute_order_unique UNIQUE(order_id)';
        EXCEPTION WHEN others THEN NULL; END;
    END IF;
END $$;

-- DisputeEvidence table for file submissions by both parties
CREATE TABLE IF NOT EXISTS "DisputeEvidence" (
    evidence_id SERIAL PRIMARY KEY,
    dispute_id INTEGER NOT NULL,
    submitted_by_user_id INTEGER NOT NULL,
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (dispute_id) REFERENCES "Dispute"(dispute_id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by_user_id) REFERENCES "User"(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disputeevidence_dispute ON "DisputeEvidence"(dispute_id);

-- Allow reported.admin_id to be nullable (admin can be assigned later)
DO $$
BEGIN
        IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'reported' AND column_name = 'admin_id' AND is_nullable = 'NO'
        ) THEN
                EXECUTE 'ALTER TABLE "reported" ALTER COLUMN admin_id DROP NOT NULL';
        END IF;
    -- Ensure primary key does not include admin_id so it can be NULL
    BEGIN
        EXECUTE 'ALTER TABLE "reported" DROP CONSTRAINT IF EXISTS reported_pkey';
        EXECUTE 'ALTER TABLE "reported" ADD PRIMARY KEY (dispute_id, client_id, order_id)';
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;

-- ============================================
-- VIEWS FOR ANALYTICS / ADMIN
-- ============================================

CREATE OR REPLACE VIEW ActiveOrdersPerFreelancer AS
SELECT
    f.user_id         AS freelancer_id,
    na.name           AS freelancer_name,
    COUNT(*)          AS active_order_count
FROM "Order" o
JOIN finish_order fo ON o.order_id = fo.order_id
JOIN "Freelancer" f ON fo.freelancer_id = f.user_id
JOIN "NonAdmin" na ON f.user_id = na.user_id
WHERE o.status IN ('pending', 'in_progress', 'delivered', 'revision_requested')
GROUP BY f.user_id, na.name;

CREATE OR REPLACE VIEW TopServicesByRating AS
SELECT
    s.service_id,
    s.title,
    s.category,
    s.average_rating,
    COUNT(r.review_id) AS review_count
FROM "Service" s
LEFT JOIN give_review gr ON s.service_id = gr.service_id
LEFT JOIN "Review" r ON gr.review_id = r.review_id
GROUP BY s.service_id, s.title, s.category, s.average_rating;

-- ============================================
-- TRIGGER TO KEEP FREELANCER RATINGS IN SYNC
-- ============================================

CREATE OR REPLACE FUNCTION update_freelancer_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Freelancer" f
    SET avg_rating = (
                SELECT AVG(r.rating)
                FROM "Update_Rating" ur
                JOIN "Review" r ON ur.review_id = r.review_id
                WHERE ur.freelancer_id = f.user_id
            ),
            total_reviews = (
                SELECT COUNT(*)
                FROM "Update_Rating" ur
                WHERE ur.freelancer_id = f.user_id
            ),
            total_orders = (
                SELECT COUNT(*) FROM finish_order fo WHERE fo.freelancer_id = f.user_id
            )
    WHERE f.user_id = NEW.freelancer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_freelancer_rating ON "Update_Rating";
CREATE TRIGGER trg_update_freelancer_rating
AFTER INSERT ON "Update_Rating"
FOR EACH ROW
EXECUTE FUNCTION update_freelancer_rating();

-- ============================================
-- SCHEMA UPDATES (Drop & Recreate for Modifications)
-- ============================================
-- When schema changes after initial creation, we drop and recreate affected tables with raw SQL.
-- This complies with CS353: no ORM, no migration framework, all raw SQL.

-- ============================================
-- IDPOTENT MIGRATIONS (ALTER for existing DBs)
-- ============================================

DO $$
BEGIN
    -- Ensure revision policy columns exist on Order.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Order' AND column_name = 'required_hours'
    ) THEN
        EXECUTE 'ALTER TABLE "Order" ADD COLUMN required_hours INTEGER';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Order' AND column_name = 'requirements'
    ) THEN
        EXECUTE 'ALTER TABLE "Order" ADD COLUMN requirements TEXT';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Order' AND column_name = 'included_revision_limit'
    ) THEN
        EXECUTE 'ALTER TABLE "Order" ADD COLUMN included_revision_limit INTEGER';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Order' AND column_name = 'extra_revisions_purchased'
    ) THEN
        EXECUTE 'ALTER TABLE "Order" ADD COLUMN extra_revisions_purchased INTEGER';
    END IF;

    -- Defaults / backfill for existing rows.
    EXECUTE 'UPDATE "Order" SET extra_revisions_purchased = COALESCE(extra_revisions_purchased, 0)';

    -- Backfill included_revision_limit using service.package_tier when possible.
    -- Premium -> NULL (unlimited), Standard -> 3, Basic/unknown -> 1
    EXECUTE '
        UPDATE "Order" o
        SET included_revision_limit = CASE LOWER(COALESCE(s.package_tier, ''''))
            WHEN ''premium'' THEN NULL
            WHEN ''standard'' THEN 3
            WHEN ''basic'' THEN 1
            ELSE 1
        END
        FROM make_order mo
        JOIN "Service" s ON mo.service_id = s.service_id
        WHERE mo.order_id = o.order_id
          AND o.included_revision_limit IS NULL
    ';

        -- Any remaining NULL (e.g. orphaned rows) default to 1, BUT keep Premium as NULL (unlimited).
        EXECUTE '
                UPDATE "Order" o
                SET included_revision_limit = 1
                WHERE o.included_revision_limit IS NULL
                    AND NOT EXISTS (
                        SELECT 1
                        FROM make_order mo
                        JOIN "Service" s ON mo.service_id = s.service_id
                        WHERE mo.order_id = o.order_id
                            AND LOWER(COALESCE(s.package_tier, '''')) = ''premium''
                    )
        ';

    -- Add non-negative constraint for extra_revisions_purchased if missing.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'order_extra_revisions_purchased_nonneg'
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE "Order" ADD CONSTRAINT order_extra_revisions_purchased_nonneg CHECK (extra_revisions_purchased >= 0)';
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;

    -- Set default values going forward.
    BEGIN
        EXECUTE 'ALTER TABLE "Order" ALTER COLUMN extra_revisions_purchased SET DEFAULT 0';
    EXCEPTION WHEN others THEN
        NULL;
    END;

    BEGIN
        EXECUTE 'ALTER TABLE "Order" ALTER COLUMN included_revision_limit SET DEFAULT 1';
    EXCEPTION WHEN others THEN
        NULL;
    END;

    -- Ensure Payment.released exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Payment' AND column_name = 'released'
    ) THEN
        EXECUTE 'ALTER TABLE "Payment" ADD COLUMN released BOOLEAN DEFAULT FALSE';
        EXECUTE 'UPDATE "Payment" SET released = FALSE WHERE released IS NULL';
        BEGIN
            EXECUTE 'ALTER TABLE "Payment" ALTER COLUMN released SET DEFAULT FALSE';
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;
END $$;

DROP TABLE IF EXISTS "reported" CASCADE;

CREATE TABLE "reported" (
    dispute_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    admin_id INTEGER,
    order_id INTEGER NOT NULL,
    PRIMARY KEY (dispute_id, client_id, order_id),
    FOREIGN KEY (dispute_id) REFERENCES "Dispute"(dispute_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES "Admin"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS "cancel" CASCADE;

CREATE TABLE "cancel" (
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    admin_id INTEGER,
    PRIMARY KEY (client_id, freelancer_id, order_id),
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES "Admin"(user_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS "reject" CASCADE;

CREATE TABLE "reject" (
    rejection_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE,
    freelancer_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    reason TEXT,
    rejection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE
);

-- ============================================
-- WITHDRAWAL MANAGEMENT SYSTEM
-- ============================================

DROP TABLE IF EXISTS "WithdrawalMethod" CASCADE;

CREATE TABLE "WithdrawalMethod" (
    method_id SERIAL PRIMARY KEY,
    freelancer_id INTEGER NOT NULL,
    method_type TEXT NOT NULL CHECK (method_type IN ('bank_account', 'paypal', 'stripe')),
    account_holder_name TEXT NOT NULL,
    account_number TEXT,
    bank_name TEXT,
    swift_code TEXT,
    paypal_email TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS "Withdrawal" CASCADE;

CREATE TABLE "Withdrawal" (
    withdrawal_id SERIAL PRIMARY KEY,
    freelancer_id INTEGER NOT NULL,
    withdrawal_method_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    fee DECIMAL(10, 2) DEFAULT 0.00,
    net_amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    transaction_reference TEXT,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (withdrawal_method_id) REFERENCES "WithdrawalMethod"(method_id) ON DELETE RESTRICT
);

-- NPS Survey: Net Promoter Score and satisfaction surveys
CREATE TABLE IF NOT EXISTS "NPSSurvey" (
    survey_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    response_time_rating INTEGER CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    would_repeat BOOLEAN DEFAULT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);
