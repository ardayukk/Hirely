#!/usr/bin/env python3
"""
TEMPORARY SCRIPT - DELETE AFTER USE
Populates the Hirely database with sample data for testing/screenshots.

Requirements:
- PostgreSQL running with hirelydb database
- Backend running on http://localhost:8000

Usage:
python seed_sample_data.py

Creates:
- 1 Admin user
- 1 Freelancer user  
- 1 Client user
- Sample services
- Sample orders
- Sample messages/chats
- Sample disputes
"""

import psycopg
import json
from datetime import datetime, timedelta
from passlib.context import CryptContext

DSN = "postgresql://gokdes:12345@localhost:5432/hirelydb"

# Match backend hashing (pbkdf2_sha256 via passlib)
pwd_ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def seed_database():
    """Populate database with sample data."""
    conn = None
    try:
        conn = psycopg.connect(DSN)
        cur = conn.cursor()
        
        print("🌱 Seeding sample data...\n")
        
        # 0. Cleanup existing seeded users (by email)
        cur.execute('DELETE FROM "User" WHERE email IN (%s, %s, %s)', (
            "admin@hirely.com", "client@hirely.com", "freelancer@hirely.com"
        ))

        # 1. Create Admin User
        print("👤 Creating admin user...")
        admin_pass = hash_password("admin123")
        cur.execute(
            'INSERT INTO "User" (email, password, date_joined) VALUES (%s, %s, NOW()) RETURNING user_id',
            ("admin@hirely.com", admin_pass),
        )
        admin_id = cur.fetchone()[0]
        cur.execute(
            'INSERT INTO "Admin" (user_id, username) VALUES (%s, %s)',
            (admin_id, "admin_user"),
        )
        print(f"✅ Admin user created (ID: {admin_id})")
        
        # 2. Create Client User
        print("👤 Creating client user...")
        client_pass = hash_password("client123")
        cur.execute(
            'INSERT INTO "User" (email, password, date_joined) VALUES (%s, %s, NOW()) RETURNING user_id',
            ("client@hirely.com", client_pass),
        )
        client_id = cur.fetchone()[0]
        cur.execute(
            'INSERT INTO "NonAdmin" (user_id, name, phone, address, wallet_balance) VALUES (%s, %s, %s, %s, %s)',
            (client_id, "John Client", "+1234567890", "123 Main St", 500.00),
        )
        cur.execute(
            'INSERT INTO "Client" (user_id, display_name) VALUES (%s, %s)',
            (client_id, "John Client"),
        )
        print(f"✅ Client user created (ID: {client_id})")
        
        # 3. Create Freelancer User
        print("👤 Creating freelancer user...")
        freelancer_pass = hash_password("freelancer123")
        cur.execute(
            'INSERT INTO "User" (email, password, date_joined) VALUES (%s, %s, NOW()) RETURNING user_id',
            ("freelancer@hirely.com", freelancer_pass),
        )
        freelancer_id = cur.fetchone()[0]
        cur.execute(
            'INSERT INTO "NonAdmin" (user_id, name, phone, address, wallet_balance) VALUES (%s, %s, %s, %s, %s)',
            (freelancer_id, "Jane Freelancer", "+0987654321", "456 Oak Ave", 1000.00),
        )
        cur.execute(
            'INSERT INTO "Freelancer" (user_id, tagline, avg_rating, total_orders, total_reviews) VALUES (%s, %s, %s, %s, %s)',
            (freelancer_id, "Expert developer with 5+ years", 4.8, 12, 10),
        )
        print(f"✅ Freelancer user created (ID: {freelancer_id})")
        
        # 4. Create Services
        print("📦 Creating sample services...")
        services = [
            ("Web Development", "technology", "Build modern web applications", "basic", 50.00, 7),
            ("UI/UX Design", "design", "Professional design services", "standard", 75.00, 14),
            ("Content Writing", "writing", "High-quality content for your blog", "premium", 100.00, 30),
        ]
        service_ids = []
        for title, category, desc, tier, price, days in services:
            cur.execute(
                '''INSERT INTO "Service" (title, category, description, delivery_time, hourly_price, package_tier, status, average_rating)
                   VALUES (%s, %s, %s, %s, %s, %s, 'ACTIVE', %s) RETURNING service_id''',
                (title, category, desc, days, price, tier, 4.5),
            )
            service_id = cur.fetchone()[0]
            service_ids.append(service_id)
            cur.execute(
                'INSERT INTO create_service (freelancer_id, service_id) VALUES (%s, %s)',
                (freelancer_id, service_id),
            )
        print(f"✅ Created {len(services)} services")
        
        # 5. Create Payment
        print("💳 Creating payment record...")
        cur.execute(
            'INSERT INTO "Payment" (amount) VALUES (%s) RETURNING payment_id',
            (150.00,),
        )
        payment_id = cur.fetchone()[0]
        print(f"✅ Payment created (ID: {payment_id})")
        
        # 6. Create Order
        print("📋 Creating sample order...")
        requirements = {
            "description": "I need a professional landing page for my startup. Should include hero section, features list, and contact form.",
            "details": "5 sections, responsive design, contact form integration"
        }
        cur.execute(
            '''INSERT INTO "Order" (order_date, status, revision_count, included_revision_limit, extra_revisions_purchased, total_price, review_given, required_hours, requirements)
               VALUES (NOW(), %s, %s, %s, %s, %s, %s, %s, %s) RETURNING order_id''',
            ("pending", 0, 3, 0, 150.00, False, 20, json.dumps(requirements)),
        )
        order_id = cur.fetchone()[0]
        cur.execute(
            'INSERT INTO make_order (order_id, client_id, service_id) VALUES (%s, %s, %s)',
            (order_id, client_id, service_ids[0]),
        )
        cur.execute(
            'INSERT INTO finish_order (order_id, payment_id, freelancer_id) VALUES (%s, %s, %s)',
            (order_id, payment_id, freelancer_id),
        )
        # Set delivery_date only if column exists (simplified schema removed SmallOrder)
        try:
            cur.execute(
                'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMPTZ'
            )
            cur.execute(
                'UPDATE "Order" SET delivery_date = %s WHERE order_id = %s',
                (datetime.now() + timedelta(days=7), order_id),
            )
        except Exception:
            pass
        print(f"✅ Order created (ID: {order_id})")
        
        # 7. Create Messages/Chat
        print("💬 Creating sample messages...")
        messages = [
            (client_id, freelancer_id, "Hi! I'd like to discuss the project requirements.", order_id),
            (freelancer_id, client_id, "Sure! I'm excited about this project. Let me know what you need.", order_id),
            (client_id, freelancer_id, "Can you add a testimonials section?", order_id),
            (freelancer_id, client_id, "Absolutely, I'll add that. No additional charge.", order_id),
        ]
        for sender_id, receiver_id, text, oid in messages:
            cur.execute(
                'INSERT INTO "Messages" (sender_id, receiver_id, order_id, message_text, timestamp, is_read) VALUES (%s, %s, %s, %s, NOW(), FALSE) RETURNING message_id',
                (sender_id, receiver_id, oid, text),
            )
            msg_id = cur.fetchone()[0]
            cur.execute(
                'INSERT INTO "Send_Message" (client_id, freelancer_id, message_id) VALUES (%s, %s, %s)',
                (client_id, freelancer_id, msg_id),
            )
            cur.execute(
                'INSERT INTO "Receive_Message" (client_id, freelancer_id, message_id) VALUES (%s, %s, %s)',
                (client_id, freelancer_id, msg_id),
            )
        print(f"✅ Created {len(messages)} messages")
        
        # 8. Create Dispute
        print("⚖️  Creating sample dispute...")
        cur.execute(
            'INSERT INTO "Dispute" (status, description, freelancer_response) VALUES (%s, %s, %s) RETURNING dispute_id',
            ("RESOLVED", "The deliverable doesn't match the design mockup provided.", "I've revised the design based on your feedback. Please review the updated version."),
        )
        dispute_id = cur.fetchone()[0]
        cur.execute(
            'INSERT INTO reported (dispute_id, client_id, admin_id, order_id) VALUES (%s, %s, %s, %s)',
            (dispute_id, client_id, admin_id, order_id),
        )
        print(f"✅ Dispute created (ID: {dispute_id})")
        
        # 9. Create Notifications
        print("🔔 Creating sample notifications...")
        notifications = [
            (client_id, "new_order", "Your order #1 has been accepted by the freelancer"),
            (freelancer_id, "new_message", "New message in order #1"),
            (client_id, "order_update", "Your order has been delivered"),
            (admin_id, "dispute_report", "New dispute has been reported"),
        ]
        for user_id, notif_type, message in notifications:
            cur.execute(
                'INSERT INTO "Notification" (user_id, type, message, date_sent, is_read) VALUES (%s, %s, %s, NOW(), FALSE)',
                (user_id, notif_type, message),
            )
        print(f"✅ Created {len(notifications)} notifications")
        
        conn.commit()
        print("\n✨ Sample data seeded successfully!")
        print(f"\n📋 Test Credentials:")
        print(f"  Admin:      admin@hirely.com / admin123")
        print(f"  Client:     client@hirely.com / client123")
        print(f"  Freelancer: freelancer@hirely.com / freelancer123")
        print(f"\n🎯 Sample IDs:")
        print(f"  Admin ID:       {admin_id}")
        print(f"  Client ID:      {client_id}")
        print(f"  Freelancer ID:  {freelancer_id}")
        print(f"  Order ID:       {order_id}")
        print(f"  Dispute ID:     {dispute_id}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    seed_database()
