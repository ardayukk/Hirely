#!/usr/bin/env python3
"""
Seeds the Hirely PostgreSQL database with comprehensive sample data
covering all entities in backend/schema.sql.

Usage:
  python seed_all_features.py
"""

import psycopg
from datetime import datetime, timedelta
from passlib.context import CryptContext
import os

DSN = "postgresql://gokdes:12345@localhost:5432/hirelydb"
pwd_ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)

def iso(dt):
    return dt.isoformat() if dt else None

def run():
    schema_path = os.path.join(os.path.dirname(__file__), 'backend', 'schema.sql')
    with psycopg.connect(DSN) as conn:
        with conn.cursor() as cur:
            print("\n🧹 Resetting database schema (DROP SCHEMA public CASCADE)...")
            cur.execute('DROP SCHEMA IF EXISTS public CASCADE')
            cur.execute('CREATE SCHEMA public')

            print("📜 Applying schema from:", schema_path)
            with open(schema_path, 'r', encoding='utf-8') as f:
                sql = f.read()

            # Extract CREATE TABLE statements by name
            def extract_table_sql(sql_text: str):
                tables = {}
                remainder_lines = []
                lines = sql_text.splitlines()
                i = 0
                while i < len(lines):
                    line = lines[i]
                    if line.strip().startswith('CREATE TABLE IF NOT EXISTS '):
                        # capture table name
                        start = i
                        # accumulate until semicolon
                        stmt_lines = [line]
                        i += 1
                        while i < len(lines):
                            stmt_lines.append(lines[i])
                            if lines[i].strip().endswith(';'):
                                break
                            i += 1
                        stmt = '\n'.join(stmt_lines)
                        # parse table name between quotes after CREATE TABLE IF NOT EXISTS
                        try:
                            head = stmt_lines[0]
                            name_part = head.split('CREATE TABLE IF NOT EXISTS ')[1]
                            tbl_name = name_part.split('(')[0].strip().strip('"')
                            tables[tbl_name] = stmt
                        except Exception:
                            remainder_lines.extend(stmt_lines)
                    else:
                        remainder_lines.append(line)
                    i += 1
                return tables, '\n'.join(remainder_lines)

            table_sql_map, remainder = extract_table_sql(sql)

            ordered_tables = [
                'User','NonAdmin','Admin','Client','Freelancer',
                'Payment','Service','Order',
                'SmallOrder','BigOrder','Deliverable',
                'ServiceAddon','OrderAddon',
                'Portfolio','PortfolioTag','PortfolioTagMapping',
                'Favorite','AvailabilitySlot','PricingHistory',
                'TimeEntry','ServiceVersion',
                'create_service','make_order','finish_order',
                'Messages','Send_Message','Receive_Message','File',
                'Dispute','DisputeEvidence','reported','Notification'
            ]

            # Execute CREATE TABLEs in dependency order
            for tbl in ordered_tables:
                stmt = table_sql_map.get(tbl)
                if not stmt:
                    continue
                try:
                    cur.execute(stmt)
                except Exception as e:
                    print(f"⚠️ Failed creating table {tbl}:", e)
                    raise

            # Execute any remaining CREATE TABLEs (if any missed)
            for tbl, stmt in table_sql_map.items():
                if tbl in ordered_tables:
                    continue
                try:
                    cur.execute(stmt)
                except Exception as e:
                    print(f"⚠️ Failed creating extra table {tbl}:", e)
                    raise

            # Execute remaining statements (indexes etc.)
            rem_lines = []
            for line in remainder.splitlines():
                if line.strip().startswith('--') or not line.strip():
                    continue
                rem_lines.append(line)
                if line.strip().endswith(';'):
                    stmt = '\n'.join(rem_lines)
                    try:
                        cur.execute(stmt)
                    except Exception as e:
                        print("⚠️ Failed executing remainder stmt:", e)
                        raise
                    rem_lines = []

            # Users
            print("👤 Creating users...")
            cur.execute('INSERT INTO "User" (email, password, role) VALUES (%s, %s, %s) RETURNING user_id',
                        ("admin@hirely.com", hash_password("admin123"), "admin"))
            admin_id = cur.fetchone()[0]
            cur.execute('INSERT INTO "Admin" (user_id, username) VALUES (%s, %s)', (admin_id, "admin"))

            cur.execute('INSERT INTO "User" (email, password, role) VALUES (%s, %s, %s) RETURNING user_id',
                        ("client@hirely.com", hash_password("client123"), "client"))
            client_id = cur.fetchone()[0]
            cur.execute('INSERT INTO "NonAdmin" (user_id, name, phone, address, wallet_balance) VALUES (%s, %s, %s, %s, %s)',
                        (client_id, "John Client", "+1234567890", "123 Main St", 500.00))
            cur.execute('INSERT INTO "Client" (user_id, display_name) VALUES (%s, %s)', (client_id, "John Client"))

            cur.execute('INSERT INTO "User" (email, password, role) VALUES (%s, %s, %s) RETURNING user_id',
                        ("freelancer@hirely.com", hash_password("freelancer123"), "freelancer"))
            freelancer_id = cur.fetchone()[0]
            cur.execute('INSERT INTO "NonAdmin" (user_id, name, phone, address, wallet_balance) VALUES (%s, %s, %s, %s, %s)',
                        (freelancer_id, "Jane Freelancer", "+1987654321", "456 Oak Ave", 1000.00))
            cur.execute('INSERT INTO "Freelancer" (user_id, tagline, avg_rating, total_orders, total_reviews) VALUES (%s, %s, %s, %s, %s)',
                        (freelancer_id, "Expert developer with 5+ years", 4.8, 12, 10))

            # Services
            print("📦 Creating services + versions + pricing history...")
            services = [
                {"title": "Web Development", "category": "technology", "description": "Build modern web apps", "delivery_time": 14, "hourly_price": 60.00, "package_tier": "standard"},
                {"title": "UI/UX Design", "category": "design", "description": "Pixel-perfect design", "delivery_time": 10, "hourly_price": 80.00, "package_tier": "premium"},
            ]
            service_ids = []
            for s in services:
                cur.execute('INSERT INTO "Service" (freelancer_id, title, category, description, delivery_time, hourly_price, package_tier, status, average_rating) VALUES (%s,%s,%s,%s,%s,%s,%s,\'ACTIVE\',%s) RETURNING service_id',
                            (freelancer_id, s["title"], s["category"], s["description"], s["delivery_time"], s["hourly_price"], s["package_tier"], 4.5))
                sid = cur.fetchone()[0]
                service_ids.append(sid)
                cur.execute('INSERT INTO create_service (freelancer_id, service_id) VALUES (%s, %s)', (freelancer_id, sid))
                # Versions
                cur.execute('INSERT INTO "ServiceVersion" (service_id, version_number, title, description, price, delivery_time, changed_fields) VALUES (%s,%s,%s,%s,%s,%s,%s)',
                            (sid, 1, s["title"], s["description"], s["hourly_price"], s["delivery_time"], "initial"))
                cur.execute('INSERT INTO "ServiceVersion" (service_id, version_number, title, description, price, delivery_time, changed_fields) VALUES (%s,%s,%s,%s,%s,%s,%s)',
                            (sid, 2, s["title"] + " v2", s["description"] + " (rev)", s["hourly_price"] + 5, s["delivery_time"], "title,price"))
                # Pricing history
                now = datetime.utcnow()
                cur.execute('INSERT INTO "PricingHistory" (service_id, price, demand_multiplier, active_orders_count, effective_from, reason) VALUES (%s,%s,%s,%s,%s,%s)',
                            (sid, s["hourly_price"], 1.0, 0, now - timedelta(days=30), "baseline"))
                cur.execute('INSERT INTO "PricingHistory" (service_id, price, demand_multiplier, active_orders_count, effective_from, reason) VALUES (%s,%s,%s,%s,%s,%s)',
                            (sid, s["hourly_price"] * 1.1, 1.1, 2, now - timedelta(days=7), "increased demand"))

            # Portfolio + tags
            print("🖼️ Portfolio and tags...")
            cur.execute('INSERT INTO "Portfolio" (freelancer_id, title, description, image_url, project_url) VALUES (%s,%s,%s,%s,%s) RETURNING portfolio_id',
                        (freelancer_id, "Landing Page", "Modern SaaS LP", "https://pics.example/lp.png", "https://example.com/saas"))
            portfolio_id = cur.fetchone()[0]
            cur.execute('INSERT INTO "PortfolioTag" (tag_name) VALUES (%s) RETURNING tag_id', ("web",))
            tag_web = cur.fetchone()[0]
            cur.execute('INSERT INTO "PortfolioTag" (tag_name) VALUES (%s) RETURNING tag_id', ("design",))
            tag_design = cur.fetchone()[0]
            cur.execute('INSERT INTO "PortfolioTagMapping" (portfolio_id, tag_id) VALUES (%s, %s)', (portfolio_id, tag_web))
            cur.execute('INSERT INTO "PortfolioTagMapping" (portfolio_id, tag_id) VALUES (%s, %s)', (portfolio_id, tag_design))

            # Favorites
            print("⭐ Favorites (service + freelancer)...")
            cur.execute('INSERT INTO "Favorite" (client_id, service_id) VALUES (%s, %s)', (client_id, service_ids[0]))
            cur.execute('INSERT INTO "Favorite" (client_id, freelancer_id) VALUES (%s, %s)', (client_id, freelancer_id))

            # Availability Slots
            print("📆 Availability slots...")
            now = datetime.utcnow()
            slot_times = [
                (now + timedelta(days=1), now + timedelta(days=1, hours=2)),
                (now + timedelta(days=2), now + timedelta(days=2, hours=1)),
                (now + timedelta(days=3), now + timedelta(days=3, hours=2)),
            ]
            slot_ids = []
            for st, et in slot_times:
                cur.execute('INSERT INTO "AvailabilitySlot" (freelancer_id, start_time, end_time, is_booked) VALUES (%s,%s,%s,FALSE) RETURNING slot_id',
                            (freelancer_id, st, et))
                slot_ids.append(cur.fetchone()[0])

            # Service add-ons
            print("➕ Service add-ons...")
            cur.execute('INSERT INTO "ServiceAddon" (service_id, title, description, price, delivery_time_extension) VALUES (%s,%s,%s,%s,%s) RETURNING addon_id',
                        (service_ids[0], "Extra Page", "Add one more page", 50.00, 2))
            addon_extra_page = cur.fetchone()[0]
            cur.execute('INSERT INTO "ServiceAddon" (service_id, title, description, price, delivery_time_extension) VALUES (%s,%s,%s,%s,%s) RETURNING addon_id',
                        (service_ids[0], "Priority Delivery", "Faster delivery", 100.00, 0))
            addon_priority = cur.fetchone()[0]

            # Payments
            print("💳 Payments...")
            cur.execute('INSERT INTO "Payment" (amount, status) VALUES (%s, %s) RETURNING payment_id', (200.00, 'HELD'))
            payment_small = cur.fetchone()[0]
            cur.execute('INSERT INTO "Payment" (amount, status) VALUES (%s, %s) RETURNING payment_id', (500.00, 'HELD'))
            payment_big = cur.fetchone()[0]

            # Orders: small and big
            print("🧾 Orders (small + big)...")
            cur.execute('INSERT INTO "Order" (client_id, freelancer_id, service_id, payment_id, status, total_price, requirements, revision_count, included_revision_limit) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING order_id',
                        (client_id, freelancer_id, service_ids[0], payment_small, 'in_progress', 200.00, 'Small site build', 0, 3))
            order_small = cur.fetchone()[0]
            cur.execute('INSERT INTO "SmallOrder" (order_id, delivery_date) VALUES (%s, %s)', (order_small, now + timedelta(days=7)))
            cur.execute('INSERT INTO make_order (order_id, client_id, service_id) VALUES (%s,%s,%s)', (order_small, client_id, service_ids[0]))
            cur.execute('INSERT INTO finish_order (order_id, payment_id, freelancer_id) VALUES (%s,%s,%s)', (order_small, payment_small, freelancer_id))
            cur.execute('INSERT INTO "OrderAddon" (order_id, addon_id) VALUES (%s,%s)', (order_small, addon_extra_page))

            cur.execute('INSERT INTO "Order" (client_id, freelancer_id, service_id, payment_id, status, total_price, requirements, revision_count, included_revision_limit) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING order_id',
                        (client_id, freelancer_id, service_ids[1], payment_big, 'in_progress', 500.00, 'Brand redesign project', 1, None))
            order_big = cur.fetchone()[0]
            cur.execute('INSERT INTO "BigOrder" (order_id, milestone_count, current_phase, milestone_delivery_date) VALUES (%s,%s,%s,%s)',
                        (order_big, 3, 1, now + timedelta(days=14)))
            cur.execute('INSERT INTO make_order (order_id, client_id, service_id) VALUES (%s,%s,%s)', (order_big, client_id, service_ids[1]))
            cur.execute('INSERT INTO finish_order (order_id, payment_id, freelancer_id) VALUES (%s,%s,%s)', (order_big, payment_big, freelancer_id))
            # Book an availability slot for big order
            cur.execute('UPDATE "AvailabilitySlot" SET is_booked = TRUE, booked_by_order_id = %s WHERE slot_id = %s', (order_big, slot_ids[0]))

            # Deliverables (phase_number required)
            print("📦 Deliverables for big order...")
            cur.execute('INSERT INTO "Deliverable" (order_id, description, due_date, payment_amount, status, phase_number) VALUES (%s,%s,%s,%s,%s,%s)',
                        (order_big, "Initial wireframes", now + timedelta(days=5), 100.00, 'completed', 1))
            cur.execute('INSERT INTO "Deliverable" (order_id, description, due_date, payment_amount, status, phase_number) VALUES (%s,%s,%s,%s,%s,%s)',
                        (order_big, "High-fidelity mockups", now + timedelta(days=10), 150.00, 'in_progress', 2))

            # Warranty feature removed

            # Time tracking entries
            print("⏱️ Time entries...")
            cur.execute('INSERT INTO "TimeEntry" (order_id, freelancer_id, start_time, end_time, duration_minutes, description, hourly_rate, approved_by_client) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
                        (order_big, freelancer_id, now - timedelta(hours=2), now - timedelta(hours=1), 60, "Exploration", 80.00, False))
            cur.execute('INSERT INTO "TimeEntry" (order_id, freelancer_id, start_time, end_time, duration_minutes, description, hourly_rate, approved_by_client) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
                        (order_big, freelancer_id, now - timedelta(hours=1), now, 60, "Mockup work", 80.00, True))

            # Messages + file
            print("💬 Messages + file attachments...")
            cur.execute('INSERT INTO "Messages" (order_id, sender_id, receiver_id, message_text) VALUES (%s,%s,%s,%s) RETURNING message_id',
                        (order_small, client_id, freelancer_id, "Hello! Can we tweak the hero copy?") )
            msg_small_1 = cur.fetchone()[0]
            cur.execute('INSERT INTO "Send_Message" (client_id, freelancer_id, message_id) VALUES (%s,%s,%s)', (client_id, freelancer_id, msg_small_1))
            cur.execute('INSERT INTO "Receive_Message" (client_id, freelancer_id, message_id) VALUES (%s,%s,%s)', (client_id, freelancer_id, msg_small_1))
            cur.execute('INSERT INTO "File" (message_id, file_name, file_path, file_type) VALUES (%s,%s,%s,%s)',
                        (msg_small_1, "requirements.txt", "/files/requirements.txt", "text/plain"))

            cur.execute('INSERT INTO "Messages" (order_id, sender_id, receiver_id, message_text) VALUES (%s,%s,%s,%s) RETURNING message_id',
                        (order_big, freelancer_id, client_id, "First wireframes attached.") )
            msg_big_1 = cur.fetchone()[0]
            cur.execute('INSERT INTO "Send_Message" (client_id, freelancer_id, message_id) VALUES (%s,%s,%s)', (client_id, freelancer_id, msg_big_1))
            cur.execute('INSERT INTO "Receive_Message" (client_id, freelancer_id, message_id) VALUES (%s,%s,%s)', (client_id, freelancer_id, msg_big_1))

            # Review
            print("📝 Review...")
            cur.execute('INSERT INTO "Review" (order_id, client_id, freelancer_id, rating, comment) VALUES (%s,%s,%s,%s,%s)',
                        (order_small, client_id, freelancer_id, 5, "Great work!"))

            # Dispute + evidence
            print("⚖️ Dispute + evidence...")
            cur.execute('INSERT INTO "Dispute" (order_id, client_id, admin_id, description, status) VALUES (%s,%s,%s,%s,%s) RETURNING dispute_id',
                        (order_small, client_id, admin_id, "Late delivery concerns", 'OPEN'))
            dispute_id = cur.fetchone()[0]
            cur.execute('INSERT INTO "DisputeEvidence" (dispute_id, submitted_by, description, file_url) VALUES (%s,%s,%s,%s)',
                        (dispute_id, client_id, "Screenshots", "https://files.example/evidence.png"))
            cur.execute('INSERT INTO reported (dispute_id, client_id, admin_id, order_id) VALUES (%s,%s,%s,%s)',
                        (dispute_id, client_id, admin_id, order_small))

            # Notifications
            print("🔔 Notifications...")
            cur.execute('INSERT INTO "Notification" (user_id, type, message) VALUES (%s,%s,%s)', (client_id, 'order_update', 'Your order progressed to in_progress'))
            cur.execute('INSERT INTO "Notification" (user_id, type, message) VALUES (%s,%s,%s)', (freelancer_id, 'new_message', 'You have a new message'))
            cur.execute('INSERT INTO "Notification" (user_id, type, message) VALUES (%s,%s,%s)', (admin_id, 'dispute_report', 'A new dispute was opened'))

            conn.commit()
            print("\n✅ Seeding complete!")
            print(f"Admin: admin@hirely.com / admin123 (id={admin_id})")
            print(f"Client: client@hirely.com / client123 (id={client_id})")
            print(f"Freelancer: freelancer@hirely.com / freelancer123 (id={freelancer_id})")
            print(f"Order small id={order_small}, Order big id={order_big}")

if __name__ == "__main__":
    run()
