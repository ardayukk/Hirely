#!/usr/bin/env python3
"""
TEMPORARY SCRIPT - DELETE AFTER USE
Captures screenshots of all frontend pages in the Hirely application.

Requirements:
- Backend running on http://localhost:8000
- Frontend running on http://localhost:5173
- Install: pip install selenium

Usage:
python capture_screenshots.py

Creates a 'screenshots' folder with PNG files.
"""

import os
import time
from pathlib import Path

import psycopg
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

FRONTEND_URL = "http://localhost:5173"
SCREENSHOTS_DIR = Path("screenshots")
DSN = "postgresql://gokdes:12345@localhost:5432/hirelydb"

# Seeded credentials
ROLE_CREDS = {
    "client": {"email": "client@hirely.com", "password": "client123"},
    "freelancer": {"email": "freelancer@hirely.com", "password": "freelancer123"},
    "admin": {"email": "admin@hirely.com", "password": "admin123"},
}

def fetch_latest_ids():
    """Fetch latest service_id and order_id for detail pages."""
    try:
        with psycopg.connect(DSN) as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT service_id FROM "Service" ORDER BY service_id DESC LIMIT 1')
                service_id = cur.fetchone()[0]
                cur.execute('SELECT order_id FROM "Order" ORDER BY order_id DESC LIMIT 1')
                order_id = cur.fetchone()[0]
                return {"service_id": service_id, "order_id": order_id}
    except Exception as e:
        print(f"⚠️  Could not fetch IDs from DB: {e}")
        return {"service_id": None, "order_id": None}


ROLE_PAGES = {
    "client": [
        {"name": "home", "path": "/home", "wait_for": "h3"},
        {"name": "services", "path": "/services", "wait_for": "h5"},
        {"name": "service-detail", "path": "/services/{service_id}", "wait_for": ("body", 5)},
        {"name": "orders", "path": "/orders", "wait_for": ("body", 5)},
        {"name": "order-detail", "path": "/orders/{order_id}", "wait_for": ("body", 5)},
        {"name": "inbox", "path": "/inbox", "wait_for": ("body", 5)},
        {"name": "notifications", "path": "/notifications", "wait_for": ("body", 5)},
        {"name": "profile", "path": "/profile", "wait_for": ("body", 5)},
    ],
    "freelancer": [
        {"name": "home", "path": "/home", "wait_for": "h3"},
        {"name": "services", "path": "/services", "wait_for": "h5"},
        {"name": "service-detail", "path": "/services/{service_id}", "wait_for": ("body", 5)},
        {"name": "create-service", "path": "/create-service", "wait_for": "button"},
        {"name": "myServices", "path": "/myServices", "wait_for": ("body", 5)},
        {"name": "orders", "path": "/orders", "wait_for": ("body", 5)},
        {"name": "order-detail", "path": "/orders/{order_id}", "wait_for": ("body", 5)},
        {"name": "inbox", "path": "/inbox", "wait_for": ("body", 5)},
        {"name": "notifications", "path": "/notifications", "wait_for": ("body", 5)},
        {"name": "profile", "path": "/profile", "wait_for": ("body", 5)},
    ],
    "admin": [
        {"name": "home", "path": "/home", "wait_for": "h3"},
        {"name": "admin", "path": "/admin", "wait_for": ("body", 5)},
        {"name": "notifications", "path": "/notifications", "wait_for": ("body", 5)},
        {"name": "profile", "path": "/profile", "wait_for": ("body", 5)},
    ],
}


def ensure_screenshot_dir():
    SCREENSHOTS_DIR.mkdir(exist_ok=True)
    print(f"✅ Screenshots directory: {SCREENSHOTS_DIR.absolute()}")


def login(driver, email, password):
    print(f"🔐 Logging in as {email}...")
    driver.delete_all_cookies()
    driver.get(f"{FRONTEND_URL}/login")

    # Wait for and fill email
    email_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="email"]'))
    )
    email_input.clear()
    email_input.send_keys(email)

    # Fill password
    password_input = driver.find_element(By.CSS_SELECTOR, 'input[type="password"]')
    password_input.clear()
    password_input.send_keys(password)

    # Click submit
    submit_btn = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
    submit_btn.click()

    # Wait for redirect to /home or verify login
    WebDriverWait(driver, 10).until(EC.url_contains("/home"))
    time.sleep(1)
    print("✅ Login successful")


def capture_pages(driver, pages, role, ids):
    for page_config in pages:
        try:
            path = page_config["path"].format(**ids)
            url = f"{FRONTEND_URL}{path}"
            print(f"📸 [{role}] Capturing: {page_config['name']} ({path})...")

            driver.get(url)

            # Wait for content to load
            if isinstance(page_config.get("wait_for"), tuple):
                selector, timeout = page_config["wait_for"]
                WebDriverWait(driver, timeout).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
            else:
                try:
                    WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, page_config["wait_for"]))
                    )
                except Exception:
                    print("⚠️  Selector not found, proceeding anyway...")

            # Extra wait for rendering
            time.sleep(1)

            # Take screenshot
            screenshot_path = SCREENSHOTS_DIR / f"{role}_{page_config['name']}.png"
            driver.save_screenshot(str(screenshot_path))
            print(f"✅ Saved: {screenshot_path.absolute()}")

        except Exception as e:
            print(f"❌ Error capturing {page_config['name']} for role {role}: {e}")


def main():
    print("🚀 Starting screenshot capture...\n")
    ensure_screenshot_dir()

    ids = fetch_latest_ids()
    if not ids.get("service_id") or not ids.get("order_id"):
        print("⚠️  Missing service_id/order_id; detail pages may be skipped.")

    for role, creds in ROLE_CREDS.items():
        driver = None
        try:
            print(f"\n=== Capturing for role: {role} ===")
            options = webdriver.ChromeOptions()
            options.add_argument("--start-maximized")
            driver = webdriver.Chrome(options=options)

            login(driver, creds["email"], creds["password"])
            capture_pages(driver, ROLE_PAGES[role], role, ids)

        except Exception as e:
            print(f"❌ Fatal error for role {role}: {e}")
        finally:
            if driver:
                driver.quit()

    print(f"\n✨ All screenshots saved to: {SCREENSHOTS_DIR.absolute()}")
    print("📝 Delete the 'screenshots' folder when done.")
    return 0


if __name__ == "__main__":
    exit(main())
