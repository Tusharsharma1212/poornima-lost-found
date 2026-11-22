"""Lost & found item routes: public browsing, student reports, item detail."""

import re
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.authz import current_member, optional_member
from lib.db import db
from lib.dates import today_iso
from lib.notify import notify_dsw
from models.portal import (
    CATEGORIES,
    LOCATIONS,
    ItemCreate,
    ItemDetail,
    ItemList,
    ItemListOut,
    ItemOut,
    ItemPublic,
    PublicStats,
)

router = APIRouter()

PUBLIC_STATUSES = ["approved", "matched", "returned"]
MAX_PHOTOS = 3


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _validate_photos(photos: list[str]) -> None:
    if len(photos) > MAX_PHOTOS:
        raise HTTPException(status_code=400, detail=f"Up to {MAX_PHOTOS} photos are allowed")
    for url in photos:
        if not url.startswith("/api/uploads/") or ".." in url:
            raise HTTPException(status_code=400, detail="Invalid photo reference")


def _validate_incident_date(value: str) -> None:
    try:
        day = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be in YYYY-MM-DD format")
    if day > datetime.strptime(today_iso(), "%Y-%m-%d").date():
        raise HTTPException(status_code=400, detail="The date cannot be in the future")


@router.get("/items", response_model=ItemList)
async def browse_items(
    q: Optional[str] = None,
    type: Optional[Literal["lost", "found"]] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=48),
):
    """Public browse — only approved/matched/returned items, never contact details."""
    flt: dict = {"status": {"$in": PUBLIC_STATUSES}}
    if type:
        flt["type"] = type
    if status in PUBLIC_STATUSES:
        flt["status"] = status
    if category:
        flt["category"] = category
    if location:
        flt["location"] = location
    if date_from or date_to:
        rng: dict = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to
        flt["incident_date"] = rng
    if q and q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        flt["$or"] = [{"title": rx}, {"description": rx}]
    total = await db.items.count_documents(flt)
    docs = (
        await db.items.find(flt, {"_id": 0})
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list(page_size)
    )
    return ItemList(items=[ItemPublic(**d) for d in docs], total=total, page=page, page_size=page_size)


@router.get("/items/mine", response_model=ItemListOut)
async def my_items(member: dict = Depends(current_member)):
    """The signed-in student's own reports — every status, full details."""
    docs = (
        await db.items.find({"reporter_id": member["user_id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(500)
    )
    return ItemListOut(items=[ItemOut(**d) for d in docs], total=len(docs))


@router.post("/items", response_model=ItemOut, status_code=201)
async def create_item(body: ItemCreate, member: dict = Depends(current_member)):
    if body.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Choose a valid category")
    if body.location not in LOCATIONS:
        raise HTTPException(status_code=400, detail="Choose a valid campus location")
    _validate_photos(body.photos)
    _validate_incident_date(body.incident_date)

    # Duplicate-report guard: same reporter already has a live report with the
    # same type/category/title (case-insensitive).
    dup = await db.items.find_one(
        {
            "reporter_id": member["user_id"],
            "type": body.type,
            "category": body.category,
            "title": {"$regex": f"^{re.escape(body.title.strip())}$", "$options": "i"},
            "status": {"$in": ["pending", "approved", "matched"]},
        },
        {"_id": 0},
    )
    if dup:
        raise HTTPException(
            status_code=409,
            detail="You already have a similar live report. Check My Reports before submitting again.",
        )

    item = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "status": "pending",
        "reporter_id": member["user_id"],
        "reporter_name": member.get("name") or "Student",
        "rejection_reason": None,
        "collected_by_dsw": False,
        "dsw_remarks": None,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.items.insert_one(item)
    item.pop("_id", None)
    await notify_dsw(
        f"New {body.type} report needs review",
        f"{item['reporter_name']} reported a {body.type} item \"{body.title}\" at {body.location}.",
        ntype="report",
        item_id=item["id"],
        notif_key=f"submitted:{item['id']}",
    )
    return ItemOut(**item)


@router.get("/items/{item_id}", response_model=ItemDetail)
async def get_item(item_id: str, member: Optional[dict] = Depends(optional_member)):
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    is_owner = bool(member and item["reporter_id"] == member["user_id"])
    is_dsw = bool(member and member["role"] == "dsw")
    # Pending/rejected reports stay private to their owner and DSW staff.
    if item["status"] in ("pending", "rejected") and not (is_owner or is_dsw):
        raise HTTPException(status_code=404, detail="Item not found")
    show_contact = is_owner or is_dsw
    data = {k: item[k] for k in ItemDetail.model_fields if k in item}
    data.update(
        {
            "reporter_name": item.get("reporter_name") if show_contact else None,
            "contact_phone": item.get("contact_phone") if show_contact else None,
            "contact_email": item.get("contact_email") if show_contact else None,
            "mine": is_owner,
        }
    )
    return ItemDetail(**data)


@router.get("/stats/public", response_model=PublicStats)
async def public_stats():
    """Landing-page counters — aggregate only, no personal data."""
    return PublicStats(
        found_items=await db.items.count_documents({"type": "found", "status": {"$in": ["approved", "matched"]}}),
        lost_items=await db.items.count_documents({"type": "lost", "status": {"$in": ["approved", "matched"]}}),
        matched_items=await db.items.count_documents({"status": "matched"}),
        returned_items=await db.items.count_documents({"status": "returned"}),
    )
