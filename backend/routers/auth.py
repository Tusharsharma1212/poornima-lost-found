"""Profile routes — identity is owned by Clerk; the app stores profile + role."""

from fastapi import APIRouter, Depends

from lib.authz import current_member
from lib.db import db
from models.portal import ProfileOut, ProfileUpdate

router = APIRouter()


def _profile_out(member: dict) -> ProfileOut:
    return ProfileOut(
        user_id=member["user_id"],
        name=member.get("name") or "Student",
        email=member.get("email"),
        phone=member.get("phone") or "",
        department=member.get("department") or "",
        reg_no=member.get("reg_no") or "",
        role=member["role"],
    )


@router.get("/auth/me", response_model=ProfileOut)
async def me(member: dict = Depends(current_member)):
    return _profile_out(member)


@router.patch("/auth/me", response_model=ProfileOut)
async def update_me(body: ProfileUpdate, member: dict = Depends(current_member)):
    # Whitelist only editable fields — role/email/user_id never come from the body.
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"user_id": member["user_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"user_id": member["user_id"]}, {"_id": 0})
    fresh["role"] = member["role"]
    return _profile_out(fresh)
