import psycopg
DSN = "postgresql://gokdes:12345@localhost:5432/hirelydb"

with psycopg.connect(DSN) as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM "Service"')
        print('Services:', cur.fetchone()[0])
        cur.execute('SELECT COUNT(*) FROM "Order"')
        print('Orders:', cur.fetchone()[0])
        cur.execute('SELECT COUNT(*) FROM "Deliverable"')
        print('Deliverables:', cur.fetchone()[0])
        cur.execute('SELECT COUNT(*) FROM "ServiceAddon"')
        print('ServiceAddon:', cur.fetchone()[0])
        cur.execute('SELECT COUNT(*) FROM "AvailabilitySlot" WHERE is_booked = TRUE')
        print('Booked Slots:', cur.fetchone()[0])
        cur.execute('SELECT COUNT(*) FROM "TimeEntry" WHERE approved_by_client = TRUE')
        print('Approved TimeEntries:', cur.fetchone()[0])
