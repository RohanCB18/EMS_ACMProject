import urllib.request
import json

url = "http://localhost:8001/api/automation/certificates/generate"
data = {"name": "Rohan", "role": "Winner", "track": "General", "project_name": "Antigravity EMS"}
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})

print("Sending request to FastAPI...")
try:
    with urllib.request.urlopen(req, timeout=5) as res:
        print(f"STATUS: {res.status}")
        print(f"BODY SIZE: {len(res.read())} bytes")
except Exception as e:
    print(f"ERROR: {e}")
