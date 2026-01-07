import requests

base_url = "http://localhost:8000/api"

# Register a temporary admin
email = "testadmin@example.com"
password = "password123"
data = {
    "email": email,
    "password": password,
    "name": "Test Admin",
    "role": "admin"
}

try:
    # Try login first
    resp = requests.post(f"{base_url}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        # Register if login fails
        print("Registering new admin...")
        resp = requests.post(f"{base_url}/auth/register", json=data)
    
    if resp.status_code != 200:
        print(f"Auth failed: {resp.text}")
        exit(1)
        
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get Stats
    print("\nFetching Stats...")
    stats_resp = requests.get(f"{base_url}/dashboard/stats", headers=headers)
    print(f"Stats Code: {stats_resp.status_code}")
    print(f"Stats Data: {stats_resp.json()}")
    
    # Get Driver Payments
    print("\nFetching Driver Payments...")
    payments_resp = requests.get(f"{base_url}/dashboard/admin/driver-payments", headers=headers)
    print(f"Payments Code: {payments_resp.status_code}")
    print(f"Payments Data: {payments_resp.json()}")

except Exception as e:
    print(f"Error: {e}")
