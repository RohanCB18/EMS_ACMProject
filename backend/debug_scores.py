
import os
from google.cloud import firestore

# Set credentials path if needed or rely on default
# os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "path/to/key.json"

db = firestore.Client()
scores = db.collection("scores").get()

print(f"Total scores found: {len(scores)}")
for s in scores:
    data = s.to_dict()
    print(f"ID: {s.id} | Project: {data.get('project_title')} | Round: {data.get('round')} | Score: {data.get('weighted_total')} | Event: {data.get('event_id')}")
