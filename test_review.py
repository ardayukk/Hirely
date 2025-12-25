import requests
import json

url = "http://localhost:8000/api/orders/14/review"
params = {"client_id": 48}
payload = {
    "rating": 5,
    "comment": "Great work!",
    "highlights": "Very professional"
}

response = requests.post(url, json=payload, params=params)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
