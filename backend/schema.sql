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
CREATE INDEX IF NOT EXISTS idx_order_client ON "Order"(client_id);
CREATE INDEX IF NOT EXISTS idx_order_freelancer ON "Order"(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_messages_order ON "Messages"(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_user ON "Notification"(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_order ON "Dispute"(order_id);
