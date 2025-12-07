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
    status TEXT DEFAULT 'active',
    average_rating DECIMAL(3, 2) DEFAULT 0.00
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
    client_id INTEGER NOT NULL,
    FOREIGN KEY (client_id) REFERENCES "Client"(user_id) ON DELETE CASCADE
);

-- ============================================
-- ORDER & PAYMENT ENTITIES
-- ============================================

CREATE TABLE IF NOT EXISTS "Payment" (
    payment_id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW()
);

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
    revision_count INTEGER DEFAULT 0,
    total_price DECIMAL(10, 2),
    review_given BOOLEAN DEFAULT FALSE,
    report_id INTEGER,
    FOREIGN KEY (report_id) REFERENCES "AnalyticsReport"(report_id) ON DELETE SET NULL
);

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

-- ============================================
-- REVISION ENTITY
-- ============================================

CREATE TABLE IF NOT EXISTS "Revision" (
    revision_id SERIAL PRIMARY KEY,
    revision_text TEXT,
    revision_no INTEGER DEFAULT 1
);

-- ============================================
-- MESSAGING & FILE ENTITIES
-- ============================================

CREATE TABLE IF NOT EXISTS "Messages" (
    message_id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    reply_to_id INTEGER,
    message_text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (sender_id) REFERENCES "User"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES "User"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES "Messages"(message_id) ON DELETE SET NULL
);

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
    decision TEXT,
    resolution_date TIMESTAMPTZ,
    status TEXT DEFAULT 'open'
);

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
    admin_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    PRIMARY KEY (dispute_id, client_id, admin_id, order_id),
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

CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_notification_user ON "Notification"(user_id);
CREATE INDEX idx_service_category ON "Service"(category);
CREATE INDEX idx_order_date ON "Order"(order_date);
CREATE INDEX idx_messages_sender ON "Messages"(sender_id);
CREATE INDEX idx_messages_receiver ON "Messages"(receiver_id);
CREATE INDEX idx_review_client ON "Review"(client_id);
