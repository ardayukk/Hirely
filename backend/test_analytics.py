import requests
import datetime

BASE_URL = "http://localhost:8000"

def test_category_trends():
    print("Testing /analytics/categories/trends...")
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=30)
    
    response = requests.get(f"{BASE_URL}/analytics/categories/trends", params={
        "start_date": start_date,
        "end_date": end_date
    })
    
    if response.status_code == 200:
        print("✅ Trends endpoint working")
        data = response.json()
        print(f"Received {len(data)} data points")
        if len(data) > 0:
            print(f"Sample: {data[0]}")
    else:
        print(f"❌ Trends endpoint failed: {response.status_code} {response.text}")

def test_category_growth():
    print("\nTesting /analytics/categories/growth...")
    response = requests.get(f"{BASE_URL}/analytics/categories/growth", params={
        "period": "month"
    })
    
    if response.status_code == 200:
        print("✅ Growth endpoint working")
        data = response.json()
        print(f"Received {len(data)} categories")
        if len(data) > 0:
            print(f"Sample: {data[0]}")
    else:
        print(f"❌ Growth endpoint failed: {response.status_code} {response.text}")

if __name__ == "__main__":
    try:
        test_category_trends()
        test_category_growth()
    except Exception as e:
        print(f"Test failed: {e}")
