from flask import Flask, request, jsonify
import logging
import json
import os
from datetime import datetime

from pymongo import MongoClient
from dotenv import load_dotenv

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
app.logger.setLevel(logging.INFO)

# Load env and connect to MongoDB
load_dotenv()
MONGODB_URI = os.environ.get("MONGODB_URI")
DB_NAME = os.environ.get("MONGODB_DB", "mizuna_companion")
COLLECTION_NAME = os.environ.get("MONGODB_COLLECTION", "events")

mongo_coll = None
if MONGODB_URI:
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        mongo_coll = client[DB_NAME][COLLECTION_NAME]
        app.logger.info("Connected to MongoDB db=%s collection=%s", DB_NAME, COLLECTION_NAME)
    except Exception as e:
        app.logger.error("MongoDB connection failed: %s", e)
else:
    app.logger.warning("MONGODB_URI not set. Skipping DB connection.")

@app.route("/data", methods=["POST"])
def receive_data():
    if not request.is_json:
        return jsonify(error="Content-Type must be application/json"), 415

    data = request.get_json(silent=True)
    if data is None:
        return jsonify(error="Malformed JSON"), 400

    # DEBUG: print full JSON payload
    print("Raw JSON received:", flush=True)
    print(json.dumps(data, indent=2, ensure_ascii=False), flush=True)

    # Extract title and overview from structured
    structured = data.get("structured", {})
    title = structured.get("title")
    overview = structured.get("overview")

    # Extract first apps_results content if present
    apps_results = data.get("apps_results", [])
    content = None
    if apps_results and isinstance(apps_results[0], dict):
        content = apps_results[0].get("content")

    # Print for debug
    print(f"title: {title}", flush=True)
    print(f"overview: {overview}", flush=True)
    print(f"content: {content}", flush=True)

    # Prepare document
    now_local = datetime.now().isoformat()
    doc = {
        "title": title,
        "overview": overview,
        "local_time": now_local,
        "content": content
    }

    # Store in MongoDB
    if mongo_coll is not None and title and overview and content:
        try:
            mongo_coll.insert_one(doc)
            app.logger.info("Inserted document: %s", doc)
        except Exception as e:
            app.logger.error("MongoDB insert failed: %s", e)

    return jsonify(status="ok"), 200

@app.route("/", methods=["GET"])
def health():
    return jsonify(status="running"), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
