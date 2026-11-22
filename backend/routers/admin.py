"""DSW (Dean of Student Welfare) admin routes — every route requires the dsw role."""

import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.authz import IN_ENV, ROLES, effective_role, require_role
from lib.db import db
from lib.dates import today_iso
from lib.notify import broadcast, notify, notify_dsw
from models.portal import (
    PROOF_TYPES,
    AdminItemList,
    AdminUserOut,
    AnnouncementCreate,
    AnnouncementOut,
    CollectedBody,
    HandoverCreate,
    HandoverOut,
    ItemListOut,
    ItemOut,
    MatchCreate,
    MatchOut,
    RejectBody,
    RoleUpdate,
    SuggestionOut,
    StatsOut,
    UsersListOut,
)

router = APIRouter()


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _get_item(item_id: str) -> dict:
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Report not found")
    return item


# ---------------------------------------------------------------- reports

@router.get("/admin/items", response_model=AdminItemList)
async def admin_list_items(
    member: dict = Depends(require_role("dsw")),
    type: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    flt: dict = {}
    if type in ("lost", "found"):
        flt["type"] = type
    if status in ("pending", "approved", "rejected", "matched", "returned"):
        flt["status"] = status
    if q and q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        flt["$or"] = [
            {"title": rx},
            {"reporter_name": rx},
            {"location": rx},
        ]
    total = await db.items.count_documents(flt)
    docs = (
        await db.items.find(flt, {"_id": 0})
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list(page_size)
    )
    return AdminItemList(items=[ItemOut(**d) for d in docs], total=total, page=page, page_size=page_size)


@router.post("/admin/items/{item_id}/approve", response_model=ItemOut)
async def approve_item(item_id: str, member: dict = Depends(require_role("dsw"))):
    item = await _get_item(item_id)
    if item["status"] not in ("pending", "rejected"):
        raise HTTPException(status_code=409, detail="Only pending reports can be approved")
    await db.items.update_one(
        {"id": item_id},
        {"$set": {"status": "approved", "rejection_reason": None, "updated_at": _now()}},
    )
    await notify(
        item["reporter_id"],
        f"Your {item['type']} report was approved",
        f"\"{item['title']}\" is now live on the Poornima Campus Lost & Found portal.",
        ntype="status",
        item_id=item_id,
        link="/dashboard",
        notif_key=f"status:{item_id}:approved",
    )
    if item["type"] == "found":
        await broadcast(
            f"Found: {item['title']}",
            f"A {item['category'].lower()} was found at {item['location']}. Recognise it? Visit the DSW Office with proof of ownership.",
            ntype="found",
            item_id=item_id,
            link=f"/items/{item_id}",
            notif_key=f"found-approved:{item_id}",
        )
    item.update({"status": "approved", "rejection_reason": None})
    return ItemOut(**item)


@router.post("/admin/items/{item_id}/reject", response_model=ItemOut)
async def reject_item(item_id: str, body: RejectBody, member: dict = Depends(require_role("dsw"))):
    item = await _get_item(item_id)
    if item["status"] not in ("pending", "approved"):
        raise HTTPException(status_code=409, detail="Only pending or approved reports can be rejected")
    await db.items.update_one(
        {"id": item_id},
        {"$set": {"status": "rejected", "rejection_reason": body.reason, "updated_at": _now()}},
    )
    await notify(
        item["reporter_id"],
        f"Your {item['type']} report was not approved",
        f"\"{item['title']}\": {body.reason}",
        ntype="status",
        item_id=item_id,
        link="/dashboard",
        notif_key=f"status:{item_id}:rejected",
    )
    item.update({"status": "rejected", "rejection_reason": body.reason})
    return ItemOut(**item)


@router.post("/admin/items/{item_id}/collected", response_model=ItemOut)
async def mark_collected(item_id: str, body: CollectedBody, member: dict = Depends(require_role("dsw"))):
    """Record that the physical item is received into DSW custody."""
    item = await _get_item(item_id)
    if item["type"] != "found":
        raise HTTPException(status_code=400, detail="Only found items are taken into DSW custody")
    if item["status"] not in ("approved", "matched"):
        raise HTTPException(status_code=409, detail="Only approved found items can be recorded into custody")
    await db.items.update_one(
        {"id": item_id},
        {"$set": {"collected_by_dsw": True, "dsw_remarks": body.remarks or None, "updated_at": _now()}},
    )
    await notify(
        item["reporter_id"],
        "Your found item is recorded at the DSW Office",
        f"\"{item['title']}\" is now in DSW custody at the Admin Block (Ground Floor).",
        ntype="custody",
        item_id=item_id,
        link="/dashboard",
        notif_key=f"custody:{item_id}",
    )
    item.update({"collected_by_dsw": True, "dsw_remarks": body.remarks or None})
    return ItemOut(**item)


# ---------------------------------------------------------------- matching

@router.get("/admin/matches/suggestions", response_model=list[SuggestionOut])
async def match_suggestions(found_item_id: str, member: dict = Depends(require_role("dsw"))):
    """Score approved lost reports against a found item: category, location, date and title overlap."""
    found = await _get_item(found_item_id)
    if found["type"] != "found":
        raise HTTPException(status_code=400, detail="Suggestions are computed for found items")
    losts = await db.items.find(
        {"type": "lost", "status": {"$in": ["approved", "matched"]}, "id": {"$ne": found["id"]}},
        {"_id": 0},
    ).to_list(500)
    try:
        found_day = date.fromisoformat(found["incident_date"])
    except ValueError:
        found_day = None

    scored: list[SuggestionOut] = []
    for lost in losts:
        score = 0
        reasons: list[str] = []
        if lost["category"] == found["category"]:
            score += 3
            reasons.append("Same category")
        if lost["location"] == found["location"]:
            score += 2
            reasons.append("Same location")
        try:
            lost_day = date.fromisoformat(lost["incident_date"])
        except ValueError:
            lost_day = None
        if found_day and lost_day:
            gap = abs((found_day - lost_day).days)
            if gap <= 3:
                score += 3
                reasons.append("Dates within 3 days")
            elif gap <= 14:
                score += 1
                reasons.append("Dates within 2 weeks")
        f_words = {w for w in found["title"].lower().split() if len(w) > 3}
        l_words = {w for w in lost["title"].lower().split() if len(w) > 3}
        overlap = f_words & l_words
        if overlap:
            score += len(overlap)
            reasons.append(f"Title overlap: {', '.join(sorted(overlap))}")
        if score > 0:
            scored.append(SuggestionOut(item=ItemOut(**lost), score=score, reasons=reasons))
    scored.sort(key=lambda s: s.score, reverse=True)
    return scored[:8]


@router.post("/admin/matches", response_model=MatchOut, status_code=201)
async def create_match(body: MatchCreate, member: dict = Depends(require_role("dsw"))):
    lost = await _get_item(body.lost_item_id)
    found = await _get_item(body.found_item_id)
    if lost["type"] != "lost" or found["type"] != "found":
        raise HTTPException(status_code=400, detail="Match needs one lost report and one found report")
    for item in (lost, found):
        if item["status"] not in ("approved",):
            raise HTTPException(
                status_code=409,
                detail=f"\"{item['title']}\" is {item['status']} — only approved reports can be matched",
            )
    clash = await db.matches.find_one(
        {
            "status": "active",
            "$or": [
                {"lost_item_id": lost["id"]},
                {"found_item_id": found["id"]},
            ],
        },
        {"_id": 0},
    )
    if clash:
        raise HTTPException(status_code=409, detail="One of these reports is already part of an active match")

    match = {
        "id": str(uuid.uuid4()),
        "lost_item_id": lost["id"],
        "found_item_id": found["id"],
        "matched_by": member["user_id"],
        "matched_by_name": member.get("name") or "DSW",
        "status": "active",
        "note": body.note,
        "created_at": _now(),
    }
    await db.matches.insert_one(match)
    match.pop("_id", None)
    await db.items.update_one({"id": lost["id"]}, {"$set": {"status": "matched", "updated_at": _now()}})
    await db.items.update_one({"id": found["id"]}, {"$set": {"status": "matched", "updated_at": _now()}})
    dsw_office = "the DSW Office (Admin Block, Ground Floor), 10:00-16:00 on working days"
    await notify(
        lost["reporter_id"],
        "Possible match for your lost item",
        f"Your lost \"{lost['title']}\" may have been found. Visit {dsw_office} with proof of ownership.",
        ntype="match",
        item_id=lost["id"],
        link="/dashboard",
        notif_key=f"match:{match['id']}:lost",
    )
    await notify(
        found["reporter_id"],
        "Your found item was matched",
        f"The found \"{found['title']}\" you reported belongs to a student. DSW will handle the handover — thank you!",
        ntype="match",
        item_id=found["id"],
        link="/dashboard",
        notif_key=f"match:{match['id']}:found",
    )
    return MatchOut(
        **match,
        lost_title=lost["title"],
        found_title=found["title"],
        lost_reporter_id=lost["reporter_id"],
        found_reporter_id=found["reporter_id"],
        lost_reporter_name=lost.get("reporter_name") or "",
        found_reporter_name=found.get("reporter_name") or "",
        lost_location=lost["location"],
        found_location=found["location"],
        lost_incident_date=lost["incident_date"],
        found_incident_date=found["incident_date"],
        lost_photos=lost.get("photos") or [],
        found_photos=found.get("photos") or [],
    )


@router.get("/admin/matches", response_model=list[MatchOut])
async def list_matches(
    member: dict = Depends(require_role("dsw")), status: Optional[str] = None
):
    flt: dict = {}
    if status in ("active", "handed_over"):
        flt["status"] = status
    docs = await db.matches.find(flt, {"_id": 0}).sort("created_at", -1).to_list(200)
    if not docs:
        return []
    item_ids = {d["lost_item_id"] for d in docs} | {d["found_item_id"] for d in docs}
    items = {i["id"]: i for i in await db.items.find({"id": {"$in": list(item_ids)}}, {"_id": 0}).to_list(len(item_ids))}
    out: list[MatchOut] = []
    for m in docs:
        lost, found = items.get(m["lost_item_id"]), items.get(m["found_item_id"])
        if not lost or not found:
            continue
        out.append(
            MatchOut(
                **m,
                lost_title=lost["title"],
                found_title=found["title"],
                lost_reporter_id=lost["reporter_id"],
                found_reporter_id=found["reporter_id"],
                lost_reporter_name=lost.get("reporter_name") or "",
                found_reporter_name=found.get("reporter_name") or "",
                lost_location=lost["location"],
                found_location=found["location"],
                lost_incident_date=lost["incident_date"],
                found_incident_date=found["incident_date"],
                lost_photos=lost.get("photos") or [],
                found_photos=found.get("photos") or [],
            )
        )
    return out


# ---------------------------------------------------------------- handover

@router.post("/admin/matches/{match_id}/handover", response_model=HandoverOut, status_code=201)
async def confirm_handover(match_id: str, body: HandoverCreate, member: dict = Depends(require_role("dsw"))):
    """Final step: DSW verifies ownership in person and hands the item over."""
    if body.proof_type not in PROOF_TYPES:
        raise HTTPException(status_code=400, detail="Choose a valid proof type")
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match["status"] != "active":
        raise HTTPException(status_code=409, detail="This match has already been handed over")
    lost = await _get_item(match["lost_item_id"])
    found = await _get_item(match["found_item_id"])

    handover = {
        "id": str(uuid.uuid4()),
        "match_id": match_id,
        "proof_type": body.proof_type,
        "collector_name": body.collector_name.strip(),
        "enrollment_id": body.enrollment_id.strip(),
        "officer_notes": body.officer_notes,
        "verified_by": member["user_id"],
        "verified_by_name": member.get("name") or "DSW",
        "handed_over_at": _now(),
    }
    await db.handovers.insert_one(handover)
    handover.pop("_id", None)
    await db.matches.update_one({"id": match_id}, {"$set": {"status": "handed_over"}})
    await db.items.update_one({"id": lost["id"]}, {"$set": {"status": "returned", "updated_at": _now()}})
    await db.items.update_one({"id": found["id"]}, {"$set": {"status": "returned", "updated_at": _now()}})
    await notify(
        lost["reporter_id"],
        "Item returned — handover complete",
        f"Your lost \"{lost['title']}\" was collected at the DSW Office after ownership verification. Case closed.",
        ntype="handover",
        item_id=lost["id"],
        link="/dashboard",
        notif_key=f"handover:{match_id}:lost",
    )
    await notify(
        found["reporter_id"],
        "Found item handed to its owner",
        f"The \"{found['title']}\" you found was collected by its verified owner at the DSW Office. Thank you for helping!",
        ntype="handover",
        item_id=found["id"],
        link="/dashboard",
        notif_key=f"handover:{match_id}:found",
    )
    return HandoverOut(
        **handover,
        lost_title=lost["title"],
        found_title=found["title"],
    )


@router.get("/admin/handovers", response_model=list[HandoverOut])
async def list_handovers(member: dict = Depends(require_role("dsw"))):
    docs = await db.handovers.find({}, {"_id": 0}).sort("handed_over_at", -1).to_list(200)
    if not docs:
        return []
    item_ids = {d["lost_item_id"] for d in docs} | {d["found_item_id"] for d in docs}
    items = {i["id"]: i for i in await db.items.find({"id": {"$in": list(item_ids)}}, {"_id": 0}).to_list(len(item_ids))}
    out: list[HandoverOut] = []
    for h in docs:
        lost, found = items.get(h["lost_item_id"]), items.get(h["found_item_id"])
        if not lost or not found:
            continue
        out.append(HandoverOut(**h, lost_title=lost["title"], found_title=found["title"]))
    return out


# ---------------------------------------------------------------- announcements

@router.post("/admin/announcements", response_model=AnnouncementOut, status_code=201)
async def create_announcement(body: AnnouncementCreate, member: dict = Depends(require_role("dsw"))):
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "created_by": member["user_id"],
        "created_by_name": member.get("name") or "DSW Office",
        "created_at": _now(),
    }
    await db.announcements.insert_one(doc)
    doc.pop("_id", None)
    await broadcast(
        body.title,
        body.body,
        ntype="announcement",
        notif_key=f"announce:{doc['id']}",
    )
    return AnnouncementOut(**doc)


@router.get("/admin/announcements", response_model=list[AnnouncementOut])
async def list_announcements(member: dict = Depends(require_role("dsw"))):
    docs = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [AnnouncementOut(**d) for d in docs]


# ---------------------------------------------------------------- people

@router.get("/admin/users", response_model=UsersListOut)
async def list_users(
    member: dict = Depends(require_role("dsw")), q: Optional[str] = None
):
    flt: dict = {**IN_ENV}
    if q and q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        flt["$or"] = [{"name": rx}, {"email": rx}, {"reg_no": rx}]
    total = await db.users.count_documents(flt)
    docs = (
        await db.users.find(flt, {"_id": 0})
        .sort("created_at", -1)
        .limit(500)
        .to_list(500)
    )
    return UsersListOut(
        roles=ROLES,
        users=[AdminUserOut(**{**d, "role": effective_role(d.get("role"))}) for d in docs],
        total=total,
    )


@router.patch("/admin/users/{user_id}/role")
async def set_role(user_id: str, body: RoleUpdate, member: dict = Depends(require_role("dsw"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=403, detail="Unknown role")
    target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Person not found")
    if (
        effective_role(target.get("role")) == "dsw"
        and body.role != "dsw"
        and await db.users.count_documents({"role": "dsw", **IN_ENV}) <= 1
    ):
        raise HTTPException(status_code=409, detail="Keep at least one DSW staff member")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": body.role}})
    return {"user_id": user_id, "role": body.role}


# ---------------------------------------------------------------- stats

@router.get("/admin/stats", response_model=StatsOut)
async def admin_stats(member: dict = Depends(require_role("dsw"))):
    async def count(flt: dict) -> int:
        return await db.items.count_documents(flt)

    days: list[dict] = []
    today = date.fromisoformat(today_iso())
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        c = await db.items.count_documents({"created_at": {"$gte": start, "$lt": end}})
        days.append({"date": day.isoformat(), "count": c})

    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top = await db.items.aggregate(pipeline).to_list(5)

    return StatsOut(
        total_reports=await count({}),
        lost_count=await count({"type": "lost"}),
        found_count=await count({"type": "found"}),
        pending_count=await count({"status": "pending"}),
        approved_count=await count({"status": "approved"}),
        matched_count=await count({"status": "matched"}),
        returned_count=await count({"status": "returned"}),
        rejected_count=await count({"status": "rejected"}),
        in_custody=await count({"type": "found", "collected_by_dsw": True, "status": {"$in": ["approved", "matched"]}}),
        students_count=await db.users.count_documents({**IN_ENV, "role": "student"}),
        matches_count=await db.matches.count_documents({}),
        handovers_count=await db.handovers.count_documents({}),
        last7=[{"date": d["date"], "count": d["count"]} for d in days],
        top_categories=[{"category": t["_id"] or "Other", "count": t["count"]} for t in top],
    )
