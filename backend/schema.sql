-- Hirely Database Schema (Simplified)
-- Minimal, presentation-friendly, raw SQL (no migrations/triggers/views)

-- ============================================
-- USERS
-- ============================================

CREATE TABLE IF NOT EXISTS "User" (
    user_id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client', 'freelancer')),
    date_joined TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "NonAdmin" (
    user_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    wallet_balance DECIMAL(10, 2) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Admin" (
    user_id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
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
    avg_rating DECIMAL(3, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES "NonAdmin"(user_id) ON DELETE CASCADE
);

-- ============================================
-- SERVICES & REVIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS "Service" (
    service_id SERIAL PRIMARY KEY,
    freelancer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    delivery_time INTEGER,
    hourly_price DECIMAL(10, 2),
    package_tier TEXT DEFAULT 'basic',
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED')),
    average_rating DECIMAL(3, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SampleWork" (
    sample_work_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL UNIQUE,
    sample_work TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

-- ============================================
-- PAYMENTS & ORDERS
-- ============================================

CREATE TABLE IF NOT EXISTS "Payment" (
    payment_id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'HELD' CHECK (status IN ('HELD', 'RELEASED', 'REFUNDED')),
    released_amount DECIMAL(10, 2) DEFAULT 0,
    refunded_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Order" (
    order_id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    payment_id INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'delivered', 'revision_requested', 'completed', 'cancelled')),
    total_price DECIMAL(10, 2),
    requirements TEXT,
    revision_count INTEGER DEFAULT 0,
    included_revision_limit INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES "Payment"(payment_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Review" (
    review_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

-- ============================================
-- ORDER TYPES: BigOrder (milestone-based) vs SmallOrder (single delivery)
-- ============================================

CREATE TABLE IF NOT EXISTS "SmallOrder" (
    order_id INTEGER PRIMARY KEY,
    delivery_date TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "BigOrder" (
    order_id INTEGER PRIMARY KEY,
    milestone_count INTEGER NOT NULL,
    current_phase INTEGER DEFAULT 1,
    milestone_delivery_date TIMESTAMPTZ,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Deliverable" (
    deliverable_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    payment_amount DECIMAL(10, 2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    phase_number INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES "BigOrder"(order_id) ON DELETE CASCADE
);

-- ============================================
-- EXTRA FEATURE: Service Add-ons
-- ============================================

CREATE TABLE IF NOT EXISTS "ServiceAddon" (
    addon_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    delivery_time_extension INTEGER DEFAULT 0,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "OrderAddon" (
    order_id INTEGER NOT NULL,
    addon_id INTEGER NOT NULL,
    PRIMARY KEY (order_id, addon_id),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (addon_id) REFERENCES "ServiceAddon"(addon_id) ON DELETE CASCADE
);

-- ============================================
-- EXTRA FEATURE: Freelancer Portfolio/Sample Work
-- ============================================

CREATE TABLE IF NOT EXISTS "Portfolio" (
    portfolio_id SERIAL PRIMARY KEY,
    freelancer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    project_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PortfolioTag" (
    tag_id SERIAL PRIMARY KEY,
    tag_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "PortfolioTagMapping" (
    portfolio_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (portfolio_id, tag_id),
    FOREIGN KEY (portfolio_id) REFERENCES "Portfolio"(portfolio_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES "PortfolioTag"(tag_id) ON DELETE CASCADE
);

-- ============================================
-- EXTRA FEATURE: Favorites/Bookmarks
-- ============================================

CREATE TABLE IF NOT EXISTS "Favorite" (
    favorite_id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    service_id INTEGER,
    freelancer_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    CHECK (service_id IS NOT NULL OR freelancer_id IS NOT NULL)
);

-- ============================================
-- NOVEL EXTRA FEATURE: Service Availability Calendar/Booking Slots
-- ============================================

CREATE TABLE IF NOT EXISTS "AvailabilitySlot" (
    slot_id SERIAL PRIMARY KEY,
    freelancer_id INTEGER NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    booked_by_order_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (booked_by_order_id) REFERENCES "Order"(order_id) ON DELETE SET NULL
);

-- ============================================
-- NOVEL EXTRA FEATURE: Dynamic Pricing Based on Demand
-- ============================================

CREATE TABLE IF NOT EXISTS "PricingHistory" (
    history_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    demand_multiplier DECIMAL(3,2) DEFAULT 1.0,
    active_orders_count INTEGER DEFAULT 0,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_until TIMESTAMPTZ,
    reason TEXT,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

-- ============================================
-- NOVEL EXTRA FEATURE: Service Warranty/Guarantee System
-- ============================================

CREATE TABLE IF NOT EXISTS "ServiceWarranty" (
    warranty_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    description TEXT NOT NULL,
    terms TEXT,
    active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "WarrantyClaim" (
    claim_id SERIAL PRIMARY KEY,
    warranty_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'approved', 'rejected', 'resolved')),
    filed_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    FOREIGN KEY (warranty_id) REFERENCES "ServiceWarranty"(warranty_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE
);

-- ============================================
-- NOVEL EXTRA FEATURE: Time Tracking for Hourly Projects
-- ============================================

CREATE TABLE IF NOT EXISTS "TimeEntry" (
    entry_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    description TEXT,
    hourly_rate DECIMAL(10,2) NOT NULL,
    approved_by_client BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

-- ============================================
-- NOVEL EXTRA FEATURE: Service Versioning/Change History
-- ============================================

CREATE TABLE IF NOT EXISTS "ServiceVersion" (
    version_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    delivery_time INTEGER,
    changed_fields TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

-- Compatibility bridges (keep app code working while staying simple)
CREATE TABLE IF NOT EXISTS "create_service" (
    freelancer_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    date_of_creation TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (freelancer_id, service_id),
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "make_order" (
    order_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY (order_id, client_id, service_id),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES "Service"(service_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "finish_order" (
    order_id INTEGER NOT NULL,
    payment_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    PRIMARY KEY (order_id, payment_id, freelancer_id),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES "Payment"(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE
);

-- ============================================
-- MESSAGES & FILES
-- ============================================

CREATE TABLE IF NOT EXISTS "Messages" (
    message_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES "User"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES "User"(user_id) ON DELETE CASCADE
);

-- Keep simple client/freelancer linkage for existing code paths
CREATE TABLE IF NOT EXISTS "Send_Message" (
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    PRIMARY KEY (client_id, freelancer_id, message_id),
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES "Messages"(message_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Receive_Message" (
    client_id INTEGER NOT NULL,
    freelancer_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    PRIMARY KEY (client_id, freelancer_id, message_id),
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES "Freelancer"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES "Messages"(message_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "File" (
    file_id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (message_id) REFERENCES "Messages"(message_id) ON DELETE CASCADE
);

-- ============================================
-- DISPUTES
-- ============================================

CREATE TABLE IF NOT EXISTS "Dispute" (
    dispute_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE,
    client_id INTEGER NOT NULL,
    admin_id INTEGER,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INFO_REQUESTED', 'RESOLVED')),
    freelancer_response TEXT,
    admin_notes TEXT,
    resolution_message TEXT,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    FOREIGN KEY (order_id) REFERENCES "Order"(order_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES "Admin"(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "DisputeEvidence" (
    evidence_id SERIAL PRIMARY KEY,
    dispute_id INTEGER NOT NULL,
    submitted_by INTEGER NOT NULL,
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (dispute_id) REFERENCES "Dispute"(dispute_id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES "User"(user_id) ON DELETE CASCADE
);

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

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS "Notification" (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE CASCADE
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_service_freelancer ON "Service"(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_order_client ON "Order"(client_id);
CREATE INDEX IF NOT EXISTS idx_order_freelancer ON "Order"(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_messages_order ON "Messages"(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_user ON "Notification"(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_order ON "Dispute"(order_id);
