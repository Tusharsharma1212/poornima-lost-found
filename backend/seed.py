"""Idempotent seed for the Poornima Campus Lost & Found preview.

Run: cd /app/backend && python seed.py
Creates demo student profiles (data owners — they are not Clerk accounts),
realistic reports covering every status, one active match, one completed
handover with its record, and one DSW announcement.
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from lib.db import db
from models.portal import CATEGORIES

DSW_OFFICER = "Dr. Rajesh Verma (DSW)"

STUDENTS = {
    "pooja": {
        "user_id": "seed_pooja",
        "name": "Pooja Sharma",
        "email": "pooja.demo@poornima.ac.in",
        "phone": "+91 98290 12340",
        "department": "B.Tech CSE (Year 2)",
        "reg_no": "PU2023CS0142",
        "role": "student",
    },
    "rahul": {
        "user_id": "seed_rahul",
        "name": "Rahul Meena",
        "email": "rahul.demo@poornima.ac.in",
        "phone": "+91 98290 12341",
        "department": "B.Tech Mechanical (Year 3)",
        "reg_no": "PU2022ME0311",
        "role": "student",
    },
    "neha": {
        "user_id": "seed_neha",
        "name": "Neha Gupta",
        "email": "neha.demo@poornima.ac.in",
        "phone": "+91 98290 12342",
        "department": "BBA (Year 1)",
        "reg_no": "PU2024BA0077",
        "role": "student",
    },
    "arpit": {
        "user_id": "seed_arpit",
        "name": "Arpit Jain",
        "email": "arpit.demo@poornima.ac.in",
        "phone": "+91 98290 12343",
        "department": "B.Tech IT (Year 2)",
        "reg_no": "PU2023IT0450",
        "role": "student",
    },
}

IMG_LAPTOP = "https://images.unsplash.com/photo-1528921581519-52b9d779df2b?crop=entropy&cs=srgb&fm=jpg&q=85"
IMG_KEYS = "https://images.pexels.com/photos/31816627/pexels-photo-31816627.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
IMG_BACKPACK = "https://images.unsplash.com/photo-1650500426868-27a68714a4a4?crop=entropy&cs=srgb&fm=jpg&q=85"
IMG_CAMPUS = "https://images.unsplash.com/photo-1576495199011-eb94736d05d6?crop=entropy&cs=srgb&fm=jpg&q=85"


def _item(idx, itype, title, category, description, location, incident_days_ago,
          status, reporter_key, photos, **extra):
    reporter = STUDENTS[reporter_key]
    now = datetime.now(timezone.utc)
    return {
        "id": str(uuid.uuid4()),
        "type": itype,
        "title": title,
        "category": category,
        "description": description,
        "location": location,
        "incident_date": (now - timedelta(days=incident_days_ago)).strftime("%Y-%m-%d"),
        "photos": photos,
        "status": status,
        "reporter_id": reporter["user_id"],
        "reporter_name": reporter["name"],
        "contact_phone": reporter["phone"],
        "contact_email": reporter["email"],
        "rejection_reason": extra.get("rejection_reason"),
        "collected_by_dsw": extra.get("collected_by_dsw", False),
        "dsw_remarks": extra.get("dsw_remarks"),
        "seeded": True,
        "created_at": now - timedelta(days=incident_days_ago, hours=-2),
        "updated_at": now - timedelta(days=max(incident_days_ago - 1, 0)),
    }


ITEMS = [
    _item(1, "lost", "Dell Inspiron 15 laptop (black, stickers on lid)", "Electronics",
          "Black Dell Inspiron 15 laptop with a Poornima fest sticker on the lid, in a grey sleeve. Last seen on the second-floor reading desk of the Central Library. Contains coursework — please help!",
          "Central Library", 4, "approved", "pooja", [IMG_LAPTOP]),
    _item(2, "found", "Casio FX-991EX scientific calculator", "Stationery & Calculators",
          "Found a Casio FX-991EX calculator on a desk in Academic Block B, Room 204 after the morning lecture. No name on it. Deposited with the DSW office for safekeeping.",
          "Academic Block B", 3, "approved", "rahul", [IMG_LAPTOP], collected_by_dsw=True,
          dsw_remarks="Received at DSW front desk, tagged DSW-2024-118"),
    _item(3, "lost", "Hostel keys with blue Poornima keychain", "Keys",
          "Lost my hostel key bunch with a blue Poornima University keychain and a small torch attached, most likely near the Central Mess during lunch.",
          "Central Mess", 2, "approved", "neha", [IMG_KEYS]),
    _item(4, "found", "Blue college backpack with notebooks", "Bags & Books",
          "A blue college backpack left on a bench outside the Central Library. Contains B.Tech notebooks and a lunch box. Handed to the finder until DSW collects it.",
          "Central Library", 2, "approved", "arpit", [IMG_BACKPACK], collected_by_dsw=True,
          dsw_remarks="Collected from finder; stored in DSW cupboard, tag DSW-2024-121"),
    _item(5, "lost", "Steel water bottle (green, name etched)", "Water Bottles",
          "Green steel bottle with 'NEHA' etched on the base, left near the Sports Ground pavilion during the basketball practice.",
          "Sports Ground", 1, "pending", "neha", []),
    _item(6, "found", "Black umbrella with wooden handle", "Other",
          "Found a black umbrella with a wooden handle near the Central Mess entrance after the rain. Currently with the finder, ready to deposit at DSW.",
          "Central Mess", 1, "pending", "rahul", []),
    _item(7, "lost", "iPhone 14 with transparent case", "Electronics",
          "Lost an iPhone 14 in a transparent case somewhere between the Main Gate and the Parking Area after the last lecture. Lock screen shows a mountain photo. Rewarded with gratitude!",
          "Parking Area", 8, "approved", "rahul", [IMG_CAMPUS]),
    _item(8, "found", "Smartphone found near Main Gate shrubs", "Electronics",
          "Found a smartphone near the Main Gate shrubs while walking back to the hostel. Screen locked; handed to DSW so the owner can verify and collect.",
          "Main Gate", 6, "approved", "neha", [IMG_CAMPUS], collected_by_dsw=True,
          dsw_remarks="Kept in DSW safe, tag DSW-2024-115"),
    _item(9, "lost", "Spectacles in brown case", "Spectacles",
          "Brown rectangular spectacles in a brown case, last seen in the Central Library computer section.",
          "Central Library", 14, "returned", "neha", []),
    _item(10, "found", "Brown-cased spectacles at library computer lab", "Spectacles",
          "Brown cased spectacles found beside a computer in the Central Library computer section. Deposited at the DSW office.",
          "Central Library", 13, "returned", "arpit", [], collected_by_dsw=True,
          dsw_remarks="Returned to owner after verification"),
    _item(11, "lost", "Party-wear jacket outside Auditorium", "Clothing",
          "Lost a navy blue party-wear jacket outside the Auditorium after the freshers' event. Has a ₹500 note in the pocket.",
          "Auditorium", 20, "rejected", "arpit", [],
          rejection_reason="Insufficient details to verify ownership — please describe the jacket label and edit before resubmitting."),
]

ANNOUNCEMENT = {
    "id": str(uuid.uuid4()),
    "title": "DSW Lost & Found desk timings",
    "body": "The DSW Lost & Found desk (Admin Block, Ground Floor) is open 10:00-16:00 on all working days. Bring your Student ID and proof of ownership to collect matched items. The service is completely free for every Poornima student.",
    "created_by": "seed_dsw",
    "created_by_name": DSW_OFFICER,
}


async def seed() -> None:
    if await db.items.count_documents({"seeded": True}) > 0:
        print("Seed data already present — skipping (idempotent).")
        return

    now = datetime.now(timezone.utc)
    await db.users.insert_many([{**s, "env": None, "created_at": now - timedelta(days=30)} for s in STUDENTS.values()])

    by_idx = {}
    for it in ITEMS:
        await db.items.insert_one(it)
        by_idx[it["title"].split()[0].lower()] = it

    iphone_lost = next(i for i in ITEMS if i["title"].startswith("iPhone"))
    phone_found = next(i for i in ITEMS if i["title"].startswith("Smartphone"))
    active_match = {
        "id": str(uuid.uuid4()),
        "lost_item_id": iphone_lost["id"],
        "found_item_id": phone_found["id"],
        "matched_by": "seed_dsw",
        "matched_by_name": DSW_OFFICER,
        "status": "active",
        "note": "Category, location cluster and dates line up; DSW will verify IMEI/lock-screen proof at handover.",
        "created_at": now - timedelta(days=5),
        "seeded": True,
    }
    await db.matches.insert_one(active_match)

    specs_lost = next(i for i in ITEMS if i["title"].startswith("Spectacles"))
    specs_found = next(i for i in ITEMS if i["title"].startswith("Brown-cased"))
    done_match = {
        "id": str(uuid.uuid4()),
        "lost_item_id": specs_lost["id"],
        "found_item_id": specs_found["id"],
        "matched_by": "seed_dsw",
        "matched_by_name": DSW_OFFICER,
        "status": "handed_over",
        "note": "Owner described the case scratches precisely — verified and returned.",
        "created_at": now - timedelta(days=10),
        "seeded": True,
    }
    await db.matches.insert_one(done_match)
    await db.handovers.insert_one({
        "id": str(uuid.uuid4()),
        "match_id": done_match["id"],
        "lost_item_id": specs_lost["id"],
        "found_item_id": specs_found["id"],
        "proof_type": "Description of distinctive marks",
        "collector_name": "Neha Gupta",
        "enrollment_id": "PU2024BA0077",
        "officer_notes": "Scratch on left lens and case sticker matched the report. Student ID verified.",
        "verified_by": "seed_dsw",
        "verified_by_name": DSW_OFFICER,
        "handed_over_at": now - timedelta(days=9),
    })

    await db.announcements.insert_one(ANNOUNCEMENT)

    print(f"Seeded {len(ITEMS)} items, 2 matches (1 active, 1 handed over), 1 handover record, 1 announcement.")


if __name__ == "__main__":
    asyncio.run(seed())
