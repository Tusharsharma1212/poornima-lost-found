"""Role-based access for the Lost & Found portal.

Principal comes from a verified Clerk session (Emergent-managed auth); the role
lives on the app's own `users` doc keyed by the stable Clerk user id. Role list
is code (ships on every publish); each person's role is data.
"""

import os
from datetime import datetime, timezone

import requests
from fastapi import Depends, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from clerk_auth import require_user, verify_session_token
from lib.db import db

# Highest first. `dsw` = Dean of Student Welfare staff; everyone else is a student.
ROLES = ["dsw", "student"]
DEFAULT_ROLE = "student"
RETIRED_ROLES: dict[str, str] = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}

# Which Clerk instance signed the person in: the first publish copies preview users into Live's database.
ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


def _clerk_headers() -> dict:
    return {
        "Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}",
        "User-Agent": "emergent-app",
    }


def _is_admin_email(user_id: str) -> bool:
    """One Clerk lookup on first sign-in (never per request). ADMIN_EMAIL holds the
    first DSW admin email(s), comma-separated; the person signs up with that email."""
    admins = {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}
    if not admins:
        return False
    r = requests.get(
        f"https://api.clerk.com/v1/users/{user_id}", timeout=10, headers=_clerk_headers()
    )
    r.raise_for_status()
    return any(
        e["email_address"].lower() in admins and (e.get("verification") or {}).get("status") == "verified"
        for e in r.json().get("email_addresses", [])
    )


def _clerk_profile(user_id: str) -> dict:
    """Fetch display name + primary email from Clerk — once, at profile creation."""
    r = requests.get(
        f"https://api.clerk.com/v1/users/{user_id}", timeout=10, headers=_clerk_headers()
    )
    r.raise_for_status()
    data = r.json()
    email = None
    primary_id = data.get("primary_email_address_id")
    for e in data.get("email_addresses", []):
        if e.get("id") == primary_id:
            email = e.get("email_address")
            break
    name = " ".join(p for p in [data.get("first_name"), data.get("last_name")] if p).strip()
    return {"email": email, "name": name or "Student"}


async def _load_member(user_id: str) -> dict:
    member = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if member is None or not member.get("role"):
        # First sign-in for this person: resolve role from ADMIN_EMAIL, snapshot profile.
        role = "dsw" if await run_in_threadpool(_is_admin_email, user_id) else DEFAULT_ROLE
        profile: dict = {}
        if member is None:
            try:
                profile = await run_in_threadpool(_clerk_profile, user_id)
            except Exception:
                profile = {}  # name/email stay editable from the Profile page
        await db.users.update_one(
            {"user_id": user_id},
            {
                "$setOnInsert": {
                    "user_id": user_id,
                    "email": profile.get("email"),
                    "name": profile.get("name") or "Student",
                    "phone": "",
                    "department": "",
                    "reg_no": "",
                    "role": role,
                    "env": ENV,
                    "created_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
        member = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if member.get("env") != ENV:
        await db.users.update_one({"user_id": user_id}, {"$set": {"env": ENV}})
        member["env"] = ENV
    member["role"] = effective_role(member.get("role"))
    return member


async def current_member(user: dict = Depends(require_user)) -> dict:
    """The signed-in app user with a fresh role read from the database."""
    return await _load_member(user["user_id"])


async def optional_member(request: Request) -> dict | None:
    """Member when a valid session rides the request, None otherwise (public views)."""
    auth = request.headers.get("authorization", "")
    token = auth[7:] if auth.lower().startswith("bearer ") else request.cookies.get("__session", "")
    if not token:
        return None
    try:
        claims = verify_session_token(token)
    except HTTPException:
        return None
    try:
        return await _load_member(claims["sub"])
    except HTTPException:
        return None


def require_role(*roles: str):
    """Route dependency: 403 when the caller's role is not in `roles`."""

    async def check(member: dict = Depends(current_member)) -> dict:
        if member["role"] not in roles:
            raise HTTPException(status_code=403, detail="DSW staff access required")
        return member

    return check
