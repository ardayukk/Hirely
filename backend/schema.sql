-- Hirely Database Schema (Simplified)
-- Minimal, presentation-friendly, raw SQL (no migrations/triggers/views)

-- ============================================
-- USERS
-- ============================================

CREATE TABLE IF NOT EXISTS "User" (
    user_id SERIAL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'client',
    date_joined TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "NonAdmin" (
    user_id INTEGER,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    wallet_balance DECIMAL(10, 2) DEFAULT 0,
    biography TEXT,
    age INTEGER
);

CREATE TABLE IF NOT EXISTS "Admin" (
    user_id INTEGER,
    username TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Client" (
    user_id INTEGER,
    display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Freelancer" (
    user_id INTEGER,
    tagline TEXT,
    avg_rating DECIMAL(3, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    biography TEXT,
    required_hours INTEGER
);

-- ============================================
-- SERVICES & REVIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS "Service" (
    service_id SERIAL,
    freelancer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    delivery_time INTEGER,
    hourly_price DECIMAL(10, 2),
    package_tier TEXT DEFAULT 'basic',
    revision_limit INTEGER DEFAULT 1,
    status TEXT DEFAULT 'ACTIVE',
    average_rating DECIMAL(3, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SampleWork" (
    sample_work_id SERIAL,
    service_id INTEGER NOT NULL,
    sample_work TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS & ORDERS
-- ============================================

CREATE TABLE IF NOT EXISTS "Payment" (
    payment_id SERIAL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'HELD',
    released_amount DECIMAL(10, 2) DEFAULT 0,
    refunded_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Order" (
    order_id SERIAL,
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    payment_id INTEGER,
    status TEXT DEFAULT 'pending',
    total_price DECIMAL(10, 2),
    requirements TEXT,
    revision_count INTEGER DEFAULT 0,
    included_revision_limit INTEGER DEFAULT 1,
    last_revision_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Review" (
    review_id SERIAL,
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    highlights TEXT
);

-- ============================================
-- REVISIONS
-- ============================================

CREATE TABLE IF NOT EXISTS "Revision" (
    revision_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    revision_no INTEGER NOT NULL,
    revision_text TEXT NOT NULL,
    status TEXT DEFAULT 'requested',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

DO $$ BEGIN 
    ALTER TABLE "Revision" ADD CONSTRAINT revision_status_check 
    CHECK (status IN ('requested', 'in_progress', 'resolved')); 
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_revision_order_id ON "Revision" (order_id);

CREATE TABLE IF NOT EXISTS "RevisionPurchase" (
    purchase_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    purchased_revisions INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER TYPES: BigOrder (milestone-based) vs SmallOrder (single delivery)
-- ============================================

CREATE TABLE IF NOT EXISTS "SmallOrder" (
    order_id INTEGER,
    delivery_date TIMESTAMPTZ NOT NULL,
    required_hours INTEGER
);

CREATE TABLE IF NOT EXISTS "BigOrder" (
    order_id INTEGER,
    milestone_count INTEGER NOT NULL,
    current_phase INTEGER DEFAULT 1,
    milestone_delivery_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "Deliverable" (
    deliverable_id SERIAL,
    order_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    payment_amount DECIMAL(10, 2),
    status TEXT DEFAULT 'pending',
    phase_number INTEGER NOT NULL,
    file_url TEXT,
    submitted_at TIMESTAMPTZ
);

-- ============================================
-- DELIVERIES (single delivery submissions)
-- ============================================

CREATE TABLE IF NOT EXISTS "Delivery" (
    delivery_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "DeliveryFile" (
    file_id SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXTRA FEATURE: Service Add-ons
-- ============================================

CREATE TABLE IF NOT EXISTS "ServiceAddon" (
    addon_id SERIAL,
    service_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    delivery_time_extension INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "OrderAddon" (
    order_id INTEGER NOT NULL,
    addon_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1
);

-- Compatibility view for older code paths that read from `order_addon`
CREATE OR REPLACE VIEW order_addon AS
SELECT
    oa.order_id,
    sa.service_id AS addon_service_id
FROM "OrderAddon" oa
JOIN "ServiceAddon" sa ON oa.addon_id = sa.addon_id;

-- ============================================
-- EXTRA FEATURE: Freelancer Portfolio/Sample Work
-- ============================================

CREATE TABLE IF NOT EXISTS "Portfolio" (
    portfolio_id SERIAL,
    freelancer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    project_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PortfolioTag" (
    tag_id SERIAL,
    tag_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "PortfolioTagMapping" (
    portfolio_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXTRA FEATURE: Favorites/Bookmarks
-- ============================================

CREATE TABLE IF NOT EXISTS "Favorite" (
    favorite_id SERIAL,
    client_id INTEGER NOT NULL,
    service_id INTEGER,
    freelancer_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    note TEXT
);

-- ============================================
-- NOVEL EXTRA FEATURE: Service Availability Calendar/Booking Slots
-- ============================================

CREATE TABLE IF NOT EXISTS "AvailabilitySlot" (
    slot_id SERIAL,
    freelancer_id INTEGER NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    booked_by_order_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOVEL EXTRA FEATURE: Dynamic Pricing Based on Demand
-- ============================================

CREATE TABLE IF NOT EXISTS "PricingHistory" (
    history_id SERIAL,
    service_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    demand_multiplier DECIMAL(3,2) DEFAULT 1.0,
    active_orders_count INTEGER DEFAULT 0,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_until TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (Removed) Service Warranty/Guarantee System

-- ============================================
-- NOVEL EXTRA FEATURE: Time Tracking for Hourly Projects
-- ============================================

CREATE TABLE IF NOT EXISTS "TimeEntry" (
    entry_id SERIAL,
    order_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    description TEXT,
    hourly_rate DECIMAL(10,2) NOT NULL,
    approved_by_client BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOVEL EXTRA FEATURE: Service Versioning/Change History
-- ============================================

CREATE TABLE IF NOT EXISTS "ServiceVersion" (
    version_id SERIAL,
    service_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    delivery_time INTEGER,
    changed_fields TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS "ServiceEvent" (
    event_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    user_id INTEGER,
    event_type TEXT NOT NULL CHECK (event_type IN ('VIEW', 'CLICK', 'ORDER_CONVERSION', 'CONTACT')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_event_service_time ON "ServiceEvent"(service_id, created_at);
CREATE INDEX IF NOT EXISTS idx_service_event_type ON "ServiceEvent"(event_type);

CREATE TABLE IF NOT EXISTS "ServiceDailyMetric" (
    metric_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    date DATE NOT NULL,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 4) DEFAULT 0.0000,
    avg_response_time DECIMAL(10, 2),
    avg_rating DECIMAL(3, 2),
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    impressions_count INTEGER DEFAULT 0,
    ctr DECIMAL(5, 4) DEFAULT 0.0000,
    UNIQUE(service_id, date)
);

CREATE INDEX IF NOT EXISTS idx_service_daily_metric_service_date ON "ServiceDailyMetric"(service_id, date);

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

CREATE INDEX IF NOT EXISTS idx_cat_metrics_date_cat ON "CategoryDailyMetrics"(metric_date, category);

CREATE TABLE IF NOT EXISTS "CategoryMetadata" (
    category TEXT PRIMARY KEY,
    is_promoted BOOLEAN DEFAULT FALSE,
    recruitment_needed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compatibility bridges (keep app code working while staying simple)
CREATE TABLE IF NOT EXISTS "create_service" (
    freelancer_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    date_of_creation TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "make_order" (
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "finish_order" (
    order_id INTEGER NOT NULL,
    payment_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MESSAGES & FILES
-- ============================================

CREATE TABLE IF NOT EXISTS "Messages" (
    message_id SERIAL,
    order_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keep simple client/freelancer linkage for existing code paths
CREATE TABLE IF NOT EXISTS "Send_Message" (
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Receive_Message" (
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "File" (
    file_id SERIAL,
    message_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISPUTES
-- ============================================

CREATE TABLE IF NOT EXISTS "Dispute" (
    dispute_id SERIAL,
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    admin_id INTEGER,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    freelancer_response TEXT,
    freelancer_response_at TIMESTAMPTZ,
    admin_notes TEXT,
    resolution_message TEXT,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "DisputeEvidence" (
    evidence_id SERIAL,
    dispute_id INTEGER NOT NULL,
    submitted_by INTEGER NOT NULL,
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "reported" (
    dispute_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    admin_id INTEGER,
    order_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WITHDRAWALS
-- ============================================

CREATE TABLE IF NOT EXISTS "WithdrawalMethod" (
    method_id SERIAL,
    freelancer_id INTEGER NOT NULL,
    method_type TEXT NOT NULL,
    account_holder_name TEXT,
    account_number TEXT,
    bank_name TEXT,
    swift_code TEXT,
    paypal_email TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Withdrawal" (
    withdrawal_id SERIAL,
    freelancer_id INTEGER NOT NULL,
    withdrawal_method_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    fee DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    transaction_reference TEXT
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS "Notification" (
    notification_id SERIAL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONSTRAINTS (Separated for coursework clarity)
-- ============================================


-- Core constraints only (trimmed down to keep the schema readable)

-- Primary Keys
DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT user_pk PRIMARY KEY (user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "NonAdmin" ADD CONSTRAINT nonadmin_pk PRIMARY KEY (user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Admin" ADD CONSTRAINT admin_pk PRIMARY KEY (user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Client" ADD CONSTRAINT client_pk PRIMARY KEY (user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Freelancer" ADD CONSTRAINT freelancer_pk PRIMARY KEY (user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Service" ADD CONSTRAINT service_pk PRIMARY KEY (service_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT payment_pk PRIMARY KEY (payment_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT order_pk PRIMARY KEY (order_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Messages" ADD CONSTRAINT messages_pk PRIMARY KEY (message_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Dispute" ADD CONSTRAINT dispute_pk PRIMARY KEY (dispute_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WithdrawalMethod" ADD CONSTRAINT withdrawalmethod_pk PRIMARY KEY (method_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Withdrawal" ADD CONSTRAINT withdrawal_pk PRIMARY KEY (withdrawal_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT notification_pk PRIMARY KEY (notification_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Unique Constraints
DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT user_email_uq UNIQUE (email); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Check Constraints (keep a small representative set)
DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT user_role_check CHECK (role IN ('admin', 'client', 'freelancer')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT order_status_check CHECK (status IN ('pending', 'accepted', 'in_progress', 'delivered', 'revision_requested', 'completed', 'cancelled', 'disputed')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Foreign Keys (core relationships only)
DO $$ BEGIN ALTER TABLE "NonAdmin" ADD CONSTRAINT nonadmin_user_fk FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Client" ADD CONSTRAINT client_nonadmin_fk FOREIGN KEY (user_id) REFERENCES "NonAdmin"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Freelancer" ADD CONSTRAINT freelancer_nonadmin_fk FOREIGN KEY (user_id) REFERENCES "NonAdmin"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Service" ADD CONSTRAINT service_freelancer_fk FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT order_client_fk FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT order_freelancer_fk FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT order_service_fk FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT order_payment_fk FOREIGN KEY (payment_id) REFERENCES "Payment"(payment_id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Messages" ADD CONSTRAINT messages_order_fk FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Messages" ADD CONSTRAINT messages_sender_fk FOREIGN KEY (sender_id) REFERENCES "User"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Messages" ADD CONSTRAINT messages_receiver_fk FOREIGN KEY (receiver_id) REFERENCES "User"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Dispute" ADD CONSTRAINT dispute_order_fk FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Dispute" ADD CONSTRAINT dispute_client_fk FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Dispute" ADD CONSTRAINT dispute_admin_fk FOREIGN KEY (admin_id) REFERENCES "Admin"(user_id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WithdrawalMethod" ADD CONSTRAINT withdrawalmethod_freelancer_fk FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Withdrawal" ADD CONSTRAINT withdrawal_freelancer_fk FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Withdrawal" ADD CONSTRAINT withdrawal_method_fk FOREIGN KEY (withdrawal_method_id) REFERENCES "WithdrawalMethod"(method_id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT notification_user_fk FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Foreign Keys (consolidated from archived migration scripts)
DO $$ BEGIN ALTER TABLE "Revision" ADD CONSTRAINT revision_order_fk FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Revision" ADD CONSTRAINT revision_client_fk FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Revision" ADD CONSTRAINT revision_freelancer_fk FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RevisionPurchase" ADD CONSTRAINT revisionpurchase_order_fk FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "Delivery" ADD CONSTRAINT delivery_order_fk FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Delivery" ADD CONSTRAINT delivery_freelancer_fk FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "DeliveryFile" ADD CONSTRAINT deliveryfile_delivery_fk FOREIGN KEY (delivery_id) REFERENCES "Delivery"(delivery_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "ServiceEvent" ADD CONSTRAINT serviceevent_service_fk FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ServiceEvent" ADD CONSTRAINT serviceevent_user_fk FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ServiceDailyMetric" ADD CONSTRAINT servicedailymetric_service_fk FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- VIEWS (Simplified Query Access Patterns)
-- ============================================

-- View: Orders with full details (client name, freelancer name, service title)
CREATE OR REPLACE VIEW view_order_details AS
SELECT 
    o.order_id,
    o.client_id,
    c.display_name AS client_name,
    o.freelancer_id,
    f.user_id AS freelancer_user_id,
    na.name AS freelancer_name,
    o.service_id,
    s.title AS service_title,
    s.category,
    o.status,
    o.total_price,
    o.requirements,
    o.revision_count,
    o.included_revision_limit,
    o.payment_id,
    o.created_at,
    p.status AS payment_status
FROM "Order" o
LEFT JOIN "Client" c ON o.client_id = c.user_id
LEFT JOIN "Freelancer" f ON o.freelancer_id = f.user_id
LEFT JOIN "NonAdmin" na ON f.user_id = na.user_id
LEFT JOIN "Service" s ON o.service_id = s.service_id
LEFT JOIN "Payment" p ON o.payment_id = p.payment_id;

-- View: Messages with sender/receiver names
CREATE OR REPLACE VIEW view_message_details AS
SELECT 
    m.message_id,
    m.order_id,
    m.sender_id,
    u_sender.email AS sender_email,
    na_sender.name AS sender_name,
    m.receiver_id,
    u_receiver.email AS receiver_email,
    na_receiver.name AS receiver_name,
    m.message_text,
    m.is_read,
    m.created_at
FROM "Messages" m
LEFT JOIN "User" u_sender ON m.sender_id = u_sender.user_id
LEFT JOIN "NonAdmin" na_sender ON u_sender.user_id = na_sender.user_id
LEFT JOIN "User" u_receiver ON m.receiver_id = u_receiver.user_id
LEFT JOIN "NonAdmin" na_receiver ON u_receiver.user_id = na_receiver.user_id;

-- View: Disputes with order and user details
CREATE OR REPLACE VIEW view_dispute_details AS
SELECT 
    d.dispute_id,
    d.order_id,
    d.client_id,
    c.display_name AS client_name,
    d.admin_id,
    COALESCE(admin_user.username, 'Unassigned') AS admin_name,
    o.freelancer_id,
    f_na.name AS freelancer_name,
    o.service_id,
    s.title AS service_title,
    d.description,
    d.status,
    d.freelancer_response,
    d.admin_notes,
    d.resolution_message,
    d.opened_at,
    d.resolved_at
FROM "Dispute" d
LEFT JOIN "Client" c ON d.client_id = c.user_id
LEFT JOIN "Admin" admin_user ON d.admin_id = admin_user.user_id
LEFT JOIN "Order" o ON d.order_id = o.order_id
LEFT JOIN "Freelancer" f ON o.freelancer_id = f.user_id
LEFT JOIN "NonAdmin" f_na ON f.user_id = f_na.user_id
LEFT JOIN "Service" s ON o.service_id = s.service_id;

-- View: Services with freelancer details
CREATE OR REPLACE VIEW view_service_details AS
SELECT 
    s.service_id,
    s.freelancer_id,
    na.name AS freelancer_name,
    f.tagline,
    f.avg_rating,
    f.total_orders,
    s.title,
    s.category,
    s.description,
    s.delivery_time,
    s.hourly_price,
    s.package_tier,
    s.status,
    s.average_rating,
    s.created_at
FROM "Service" s
LEFT JOIN "Freelancer" f ON s.freelancer_id = f.user_id
LEFT JOIN "NonAdmin" na ON f.user_id = na.user_id;

-- View: User profiles (combining Client and Freelancer data)
CREATE OR REPLACE VIEW view_user_profiles AS
SELECT 
    u.user_id,
    u.email,
    u.role,
    na.name,
    na.phone,
    na.address,
    na.wallet_balance,
    u.date_joined,
    CASE 
        WHEN u.role = 'client' THEN c.display_name
        ELSE NULL
    END AS client_display_name,
    CASE 
        WHEN u.role = 'freelancer' THEN f.tagline
        ELSE NULL
    END AS freelancer_tagline,
    CASE 
        WHEN u.role = 'freelancer' THEN f.avg_rating
        ELSE NULL
    END AS freelancer_rating,
    CASE 
        WHEN u.role = 'freelancer' THEN f.total_orders
        ELSE NULL
    END AS freelancer_total_orders
FROM "User" u
LEFT JOIN "NonAdmin" na ON u.user_id = na.user_id
LEFT JOIN "Client" c ON u.user_id = c.user_id
LEFT JOIN "Freelancer" f ON u.user_id = f.user_id;

-- View: Order timeline (status history view for tracking)
CREATE OR REPLACE VIEW view_order_timeline AS
SELECT 
    o.order_id,
    o.client_id,
    c.display_name AS client_name,
    o.freelancer_id,
    na.name AS freelancer_name,
    o.status,
    o.created_at AS order_created,
    so.delivery_date AS small_order_deadline,
    bo.milestone_delivery_date AS big_order_deadline,
    p.created_at AS payment_created,
    p.status AS payment_status
FROM "Order" o
LEFT JOIN "Client" c ON o.client_id = c.user_id
LEFT JOIN "Freelancer" f ON o.freelancer_id = f.user_id
LEFT JOIN "NonAdmin" na ON f.user_id = na.user_id
LEFT JOIN "SmallOrder" so ON o.order_id = so.order_id
LEFT JOIN "BigOrder" bo ON o.order_id = bo.order_id
LEFT JOIN "Payment" p ON o.payment_id = p.payment_id;

-- View: Freelancer dashboard stats
CREATE OR REPLACE VIEW view_freelancer_stats AS
SELECT 
    f.user_id AS freelancer_id,
    na.name AS freelancer_name,
    f.avg_rating,
    f.total_orders,
    f.total_reviews,
    COUNT(DISTINCT s.service_id) AS active_services,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.order_id END) AS completed_orders,
    COUNT(DISTINCT CASE WHEN o.status IN ('in_progress', 'revision_requested') THEN o.order_id END) AS active_orders,
    COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_price ELSE 0 END), 0) AS total_earnings
FROM "Freelancer" f
LEFT JOIN "NonAdmin" na ON f.user_id = na.user_id
LEFT JOIN "Service" s ON f.user_id = s.freelancer_id AND s.status = 'ACTIVE'
LEFT JOIN "Order" o ON f.user_id = o.freelancer_id
GROUP BY f.user_id, na.name, f.avg_rating, f.total_orders, f.total_reviews;

-- View: Client dashboard stats
CREATE OR REPLACE VIEW view_client_stats AS
SELECT 
    c.user_id AS client_id,
    c.display_name AS client_name,
    na.wallet_balance,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.order_id END) AS completed_orders,
    COUNT(DISTINCT CASE WHEN o.status IN ('pending', 'accepted', 'in_progress', 'revision_requested') THEN o.order_id END) AS active_orders,
    COALESCE(SUM(o.total_price), 0) AS total_spent
FROM "Client" c
LEFT JOIN "NonAdmin" na ON c.user_id = na.user_id
LEFT JOIN "Order" o ON c.user_id = o.client_id
GROUP BY c.user_id, c.display_name, na.wallet_balance;

-- View: Notifications with user context
CREATE OR REPLACE VIEW view_notification_context AS
SELECT 
    n.notification_id,
    n.user_id,
    u.email,
    na.name,
    n.type,
    n.message,
    n.is_read,
    n.created_at
FROM "Notification" n
LEFT JOIN "User" u ON n.user_id = u.user_id
LEFT JOIN "NonAdmin" na ON u.user_id = na.user_id;

-- View: Recent activity (orders, messages, disputes)
CREATE OR REPLACE VIEW view_recent_activity AS
SELECT 
    o.order_id,
    'order_created' AS activity_type,
    o.created_at,
    c.user_id AS user_id,
    c.display_name AS user_name,
    'Order created: ' || s.title AS activity_description
FROM "Order" o
LEFT JOIN "Client" c ON o.client_id = c.user_id
LEFT JOIN "Service" s ON o.service_id = s.service_id
UNION ALL
SELECT 
    m.order_id,
    'message_sent' AS activity_type,
    m.created_at,
    m.sender_id AS user_id,
    na.name AS user_name,
    'Sent message in order' AS activity_description
FROM "Messages" m
LEFT JOIN "NonAdmin" na ON m.sender_id = na.user_id
UNION ALL
SELECT 
    d.order_id,
    'dispute_opened' AS activity_type,
    d.opened_at,
    d.client_id AS user_id,
    c.display_name AS user_name,
    'Opened dispute' AS activity_description
FROM "Dispute" d
LEFT JOIN "Client" c ON d.client_id = c.user_id
ORDER BY created_at DESC;

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_service_freelancer ON "Service"(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_service_status ON "Service"(status);
CREATE INDEX IF NOT EXISTS idx_order_client ON "Order"(client_id);
CREATE INDEX IF NOT EXISTS idx_order_freelancer ON "Order"(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_messages_order ON "Messages"(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_user ON "Notification"(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_order ON "Dispute"(order_id);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update freelancer stats (avg_rating, total_reviews)
CREATE OR REPLACE FUNCTION update_freelancer_stats_func() RETURNS TRIGGER AS $$
DECLARE
    target_freelancer_id INTEGER;
BEGIN
    target_freelancer_id := COALESCE(NEW.freelancer_id, OLD.freelancer_id);
    
    UPDATE "Freelancer"
    SET avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM "Review" WHERE freelancer_id = target_freelancer_id),
        total_reviews = (SELECT COUNT(*) FROM "Review" WHERE freelancer_id = target_freelancer_id)
    WHERE user_id = target_freelancer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call update_freelancer_stats_func
DROP TRIGGER IF EXISTS trg_update_freelancer_stats ON "Review";
CREATE TRIGGER trg_update_freelancer_stats
AFTER INSERT OR UPDATE OR DELETE ON "Review"
FOR EACH ROW EXECUTE FUNCTION update_freelancer_stats_func();

-- Function to update service stats (average_rating)
CREATE OR REPLACE FUNCTION update_service_stats_func() RETURNS TRIGGER AS $$
DECLARE
    target_service_id INTEGER;
    target_order_id INTEGER;
BEGIN
    target_order_id := COALESCE(NEW.order_id, OLD.order_id);
    
    -- Get service_id from the order
    SELECT service_id INTO target_service_id FROM "Order" WHERE order_id = target_order_id;
    
    IF target_service_id IS NOT NULL THEN
        UPDATE "Service"
        SET average_rating = (
            SELECT COALESCE(AVG(r.rating), 0)
            FROM "Review" r
            JOIN "Order" o ON r.order_id = o.order_id
            WHERE o.service_id = target_service_id
        )
        WHERE service_id = target_service_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call update_service_stats_func
DROP TRIGGER IF EXISTS trg_update_service_stats ON "Review";
CREATE TRIGGER trg_update_service_stats
AFTER INSERT OR UPDATE OR DELETE ON "Review"
FOR EACH ROW EXECUTE FUNCTION update_service_stats_func();

-- Function to update freelancer total orders
CREATE OR REPLACE FUNCTION update_freelancer_orders_func() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE "Freelancer"
        SET total_orders = (SELECT COUNT(*) FROM "Order" WHERE freelancer_id = NEW.freelancer_id AND status = 'completed')
        WHERE user_id = NEW.freelancer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call update_freelancer_orders_func
DROP TRIGGER IF EXISTS trg_update_freelancer_orders ON "Order";
CREATE TRIGGER trg_update_freelancer_orders
AFTER UPDATE OF status ON "Order"
FOR EACH ROW EXECUTE FUNCTION update_freelancer_orders_func();
