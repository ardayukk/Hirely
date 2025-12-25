#!/usr/bin/env python3
import psycopg

DSN = "postgresql://gokdes:12345@localhost:5432/hirelydb"

def main():
    with psycopg.connect(DSN) as conn:
        with conn.cursor() as cur:
            for tbl in ("WarrantyClaim", "ServiceWarranty"):
                try:
                    cur.execute(f'DROP TABLE IF EXISTS "{tbl}" CASCADE')
                    print(f"Dropped table {tbl} (if existed)")
                except Exception as e:
                    print(f"Could not drop {tbl}: {e}")
            conn.commit()

if __name__ == "__main__":
    main()
