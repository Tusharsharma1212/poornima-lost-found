"""Student notification center: personal notifications + campus-wide broadcasts.

Broadcasts are single documents; read state lives in notification_reads so a
campus-wide message costs one write, not one write per student. Read-state
uniqueness is enforced by a compound index, so double-marks never duplicate.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.authz import current_member
from lib.db import db
from models.portal import NotificationList, NotificationOut, OkBody

router = APIRouter()


def _visible_filter(member: dict) -> dict:
    return {"$or": [{"kind": "broadcast"}, {"user_id": member["user_id"]}]}


async def _read_ids(member: dict, visible_ids: list[str]) -> set[str]:
    rows = await db.notification_reads.find(
        {"user_id": member["user_id"], "notification_id": {"$in": visible_ids}},
        {"notification_id": 1, "_id": 0},
    ).to_list(len(visible_ids) or 1)
    return {r["notification_id"] for r in rows}


@router.get("/notifications", response_model=NotificationList)
async def list_notifications(
    member: dict = Depends(current_member),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=15, ge=1, le=50),
):
    visible = _visible_filter(member)
    total = await db.notifications.count_documents(visible)
    docs = (
        await db.notifications.find(visible, {"_id": 0})
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size + 1)
        .to_list(page_size + 1)
    )
    has_more = len(docs) > page_size
    docs = docs[:page_size]
    all_ids = [
        d["id"] for d in await db.notifications.find(visible, {"id": 1, "_id": 0}).to_list(2000)
    ]
    read = await _read_ids(member, all_ids)
    items = [NotificationOut(**{**d, "read": d["id"] in read}) for d in docs]
    return NotificationList(items=items, unread=max(total - len(read), 0), has_more=has_more)


@router.post("/notifications/{notification_id}/read", response_model=OkBody)
async def mark_read(notification_id: str, member: dict = Depends(current_member)):
    notif = await db.notifications.find_one({"id": notification_id}, {"_id": 0})
    if not notif or (notif["kind"] != "broadcast" and notif.get("user_id") != member["user_id"]):
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.notification_reads.update_one(
        {"notification_id": notification_id, "user_id": member["user_id"]},
        {"$setOnInsert": {"notification_id": notification_id, "user_id": member["user_id"]}},
        upsert=True,
    )
    return OkBody()


@router.post("/notifications/read-all", response_model=OkBody)
async def mark_all_read(member: dict = Depends(current_member)):
    all_ids = await db.notifications.find(
        _visible_filter(member), {"id": 1, "_id": 0}
    ).to_list(2000)
    read = await _read_ids(member, [d["id"] for d in all_ids])
    missing = [
        {"notification_id": d["id"], "user_id": member["user_id"]}
        for d in all_ids
        if d["id"] not in read
    ]
    if missing:
        from pymongo.errors import DuplicateKeyError

        try:
            await db.notification_reads.insert_many(missing, ordered=False)
        except DuplicateKeyError:
            pass  # a concurrent mark-read for the same notification — fine
    return OkBody()
