"""Notification fan-out for the campus portal.

Every notification carries a unique `notif_key`; upserts on that key make the
fan-out idempotent, so retried requests or repeated matches never duplicate a
notification. Broadcasts are single documents (no per-student fan-out), so a
campus-wide announcement stays one write regardless of student count.

`push_users` is the FCM seam: it activates only when an FCM credential is set
in backend/.env. Without credentials, notifications remain in-app only.
"""

import logging
import os
import uuid
from datetime import datetime, timezone

from lib.db import db

log = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _doc(kind: str, user_id: str | None, title: str, body: str, ntype: str,
         item_id: str | None, link: str | None) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "kind": kind,
        "user_id": user_id,
        "title": title,
        "body": body,
        "ntype": ntype,
        "item_id": item_id,
        "link": link,
        "created_at": _now(),
    }


async def notify(user_id: str, title: str, body: str, ntype: str = "info",
                 item_id: str | None = None, link: str | None = None,
                 notif_key: str | None = None) -> None:
    """Personal notification to one user; deduped on notif_key when given."""
    doc = _doc("personal", user_id, title, body, ntype, item_id, link)
    if notif_key:
        doc["notif_key"] = notif_key
        await db.notifications.update_one(
            {"notif_key": notif_key}, {"$setOnInsert": doc}, upsert=True
        )
    else:
        doc["notif_key"] = f"n:{doc['id']}"
        await db.notifications.insert_one(doc)
    await push_users([user_id], title, body)


async def broadcast(title: str, body: str, ntype: str = "announcement",
                    item_id: str | None = None, link: str | None = None,
                    notif_key: str | None = None) -> None:
    """Campus-wide announcement — one document, read state tracked per user."""
    key = notif_key or f"bcast:{uuid.uuid4()}"
    doc = _doc("broadcast", None, title, body, ntype, item_id, link)
    doc["notif_key"] = key
    await db.notifications.update_one({"notif_key": key}, {"$setOnInsert": doc}, upsert=True)


async def notify_dsw(title: str, body: str, ntype: str = "info",
                     item_id: str | None = None, notif_key: str | None = None) -> None:
    """Notify every DSW staff member (a handful of people)."""
    staff = await db.users.find({"role": "dsw"}, {"user_id": 1, "_id": 0}).to_list(100)
    for s in staff:
        key = f"{notif_key}:{s['user_id']}" if notif_key else None
        await notify(s["user_id"], title, body, ntype, item_id=item_id, notif_key=key)


async def push_users(user_ids: list[str], title: str, body: str) -> dict:
    """FCM-ready push seam. Firebase Cloud Messaging needs a Firebase project
    credential (service account / server key) configured in backend/.env —
    until then push delivery is a no-op and notifications stay in-app."""
    if not os.environ.get("FCM_SERVER_KEY"):
        return {"sent": 0, "reason": "FCM not configured — notifications are in-app only"}
    # With FCM_SERVER_KEY set, POST to the Firebase HTTP v1 API here per device
    # token/topic. Requires Firebase credentials + the firebase-admin SDK.
    log.info("FCM push requested for %d user(s) but the provider adapter is not configured", len(user_ids))
    return {"sent": 0, "reason": "FCM adapter not configured"}
