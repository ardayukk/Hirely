#!/usr/bin/env python3
"""Clear database and reseed with sample data"""

import psycopg

DSN = "postgresql://gokdes:12345@localhost:5432/hirelydb"

def clear_and_reseed():
    """Delete all data and reseed"""
    conn = None
    try:
        conn = psycopg.connect(DSN)
        cur = conn.cursor()
        
        print("🗑️  Clearing database...\n")
        
        # Delete in reverse dependency order
        tables_to_clear = [
            "DisputeEvidence",
            "reported",
            "Dispute",
            "TimeEntry",
            "Deliverable",
            "BigOrder",
            "SmallOrder",
            "Review",
            "File",
            "Receive_Message",
            "Send_Message",
            "Messages",
            "OrderAddon",
            "ServiceAddon",
            "ServiceVersion",
            "PricingHistory",
            "AvailabilitySlot",
            "Favorite",
            "PortfolioTagMapping",
            "Portfolio",
            "PortfolioTag",
            "finish_order",
            "make_order",
            "create_service",
            "Order",
            "Payment",
            "Withdrawal",
            "WithdrawalMethod",
            "Notification",
            "Service",
            "SampleWork",
            "Client",
            "Freelancer",
            "Admin",
            "NonAdmin",
            "User",
        ]
        
        for table in tables_to_clear:
            try:
                cur.execute(f'DELETE FROM "{table}"')
                print(f"✓ Cleared {table}")
            except Exception as e:
                print(f"⚠️  Could not clear {table}: {e}")
        
        conn.commit()
        print("\n✅ Database cleared!\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    clear_and_reseed()
    
    # Now run seed script
    print("🌱 Seeding sample data...\n")
    import subprocess
    import sys
    result = subprocess.run([sys.executable, "seed_sample_data.py"], cwd=".")
    
    if result.returncode == 0:
        print("\n✨ Database ready with fresh sample data!")
    else:
        print("\n❌ Failed to seed data")
