"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [
        IndexModel([("user_id", ASCENDING)], name="user_id", unique=True),
        IndexModel([("role", ASCENDING)], name="role"),
    ],
    "items": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("status", ASCENDING), ("type", ASCENDING), ("created_at", DESCENDING)], name="browse"),
        IndexModel([("reporter_id", ASCENDING), ("created_at", DESCENDING)], name="reporter_created"),
        IndexModel([("type", ASCENDING), ("status", ASCENDING), ("category", ASCENDING)], name="suggest"),
    ],
    "notifications": [
        IndexModel([("notif_key", ASCENDING)], name="notif_key", unique=True),
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("kind", ASCENDING), ("created_at", DESCENDING)], name="feed"),
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_feed"),
    ],
    "notification_reads": [
        IndexModel([("notification_id", ASCENDING), ("user_id", ASCENDING)], name="notif_user", unique=True),
    ],
    "matches": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
        IndexModel([("found_item_id", ASCENDING)], name="found_item"),
        IndexModel([("lost_item_id", ASCENDING)], name="lost_item"),
    ],
    "handovers": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("handed_over_at", DESCENDING)], name="handed_over_desc"),
    ],
    "announcements": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
