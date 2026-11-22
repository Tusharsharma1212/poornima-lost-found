"""Pydantic models shared across the portal routers. Every model here has a
hand-written TS mirror in frontend/src/lib/types.ts — keep the pair in sync."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

ItemType = Literal["lost", "found"]
ItemStatus = Literal["pending", "approved", "rejected", "matched", "returned"]

CATEGORIES = [
    "Electronics",
    "ID Cards & Documents",
    "Keys",
    "Bags & Books",
    "Wallets & Money",
    "Clothing",
    "Jewellery & Accessories",
    "Water Bottles",
    "Chargers & Cables",
    "Spectacles",
    "Stationery & Calculators",
    "Sports Equipment",
    "Other",
]

LOCATIONS = [
    "Academic Block A",
    "Academic Block B",
    "Academic Block C",
    "Central Library",
    "DSW Office",
    "Central Mess",
    "Sports Ground",
    "Auditorium",
    "Main Gate",
    "Parking Area",
    "Workshop & Labs",
    "Hostel 1",
    "Hostel 2",
    "Hostel 3",
    "Hostel 4",
    "Other",
]

PROOF_TYPES = [
    "Student ID card",
    "Original bill / receipt",
    "Device unlock demonstration",
    "Description of distinctive marks",
    "Other proof accepted by DSW",
]


class ProfileOut(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    phone: str = ""
    department: str = ""
    reg_no: str = ""
    role: str = "student"


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    phone: Optional[str] = Field(default=None, min_length=0, max_length=20)
    department: Optional[str] = Field(default=None, min_length=0, max_length=100)
    reg_no: Optional[str] = Field(default=None, min_length=0, max_length=40)


class ItemPublic(BaseModel):
    id: str
    type: ItemType
    title: str
    category: str
    description: str
    location: str
    incident_date: str
    photos: list[str] = []
    status: ItemStatus
    created_at: datetime


class ItemOut(ItemPublic):
    """Full item — reporter + contact fields. Only exposed to the owner and DSW staff."""

    reporter_id: str
    reporter_name: str = ""
    contact_phone: str = ""
    contact_email: Optional[str] = None
    rejection_reason: Optional[str] = None
    collected_by_dsw: bool = False
    dsw_remarks: Optional[str] = None
    updated_at: datetime


class ItemDetail(ItemPublic):
    """Single-item view: contact fields stay None unless the caller owns it or is DSW."""

    reporter_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    collected_by_dsw: bool = False
    mine: bool = False


class ItemCreate(BaseModel):
    type: ItemType
    title: str = Field(min_length=3, max_length=120)
    category: str
    description: str = Field(min_length=10, max_length=2000)
    location: str
    incident_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    photos: list[str] = []
    contact_phone: str = Field(min_length=5, max_length=20)
    contact_email: Optional[EmailStr] = None


class ItemList(BaseModel):
    items: list[ItemPublic]
    total: int
    page: int
    page_size: int


class AdminItemList(BaseModel):
    items: list[ItemOut]
    total: int
    page: int
    page_size: int


class ItemListOut(BaseModel):
    items: list[ItemOut]
    total: int


class PublicStats(BaseModel):
    found_items: int
    lost_items: int
    matched_items: int
    returned_items: int


class RejectBody(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class CollectedBody(BaseModel):
    remarks: str = Field(default="", max_length=500)


class NotificationOut(BaseModel):
    id: str
    kind: Literal["personal", "broadcast"]
    title: str
    body: str
    ntype: str
    item_id: Optional[str] = None
    read: bool = False
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationOut]
    unread: int
    has_more: bool


class OkBody(BaseModel):
    ok: bool = True


class MatchCreate(BaseModel):
    lost_item_id: str
    found_item_id: str
    note: str = Field(default="", max_length=500)


class MatchOut(BaseModel):
    id: str
    lost_item_id: str
    found_item_id: str
    lost_title: str
    found_title: str
    lost_reporter_id: str
    found_reporter_id: str
    lost_reporter_name: str
    found_reporter_name: str
    lost_location: str
    found_location: str
    lost_incident_date: str
    found_incident_date: str
    lost_photos: list[str] = []
    found_photos: list[str] = []
    status: Literal["active", "handed_over"]
    note: str = ""
    created_at: datetime


class SuggestionOut(BaseModel):
    item: ItemOut
    score: int
    reasons: list[str] = []


class HandoverCreate(BaseModel):
    proof_type: str
    collector_name: str = Field(min_length=2, max_length=100)
    enrollment_id: str = Field(min_length=2, max_length=40)
    officer_notes: str = Field(default="", max_length=500)


class HandoverOut(BaseModel):
    id: str
    match_id: str
    lost_title: str
    found_title: str
    collector_name: str
    enrollment_id: str
    proof_type: str
    officer_notes: str = ""
    verified_by_name: str
    handed_over_at: datetime


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    body: str = Field(min_length=5, max_length=1000)


class AnnouncementOut(BaseModel):
    id: str
    title: str
    body: str
    created_by_name: str
    created_at: datetime


class AdminUserOut(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    phone: str = ""
    department: str = ""
    reg_no: str = ""
    role: str
    created_at: datetime


class UsersListOut(BaseModel):
    roles: list[str]
    users: list[AdminUserOut]
    total: int


class RoleUpdate(BaseModel):
    role: Literal["dsw", "student"]


class DayCount(BaseModel):
    date: str
    count: int


class CategoryCount(BaseModel):
    category: str
    count: int


class StatsOut(BaseModel):
    total_reports: int
    lost_count: int
    found_count: int
    pending_count: int
    approved_count: int
    matched_count: int
    returned_count: int
    rejected_count: int
    in_custody: int
    students_count: int
    matches_count: int
    handovers_count: int
    last7: list[DayCount]
    top_categories: list[CategoryCount]


class UploadOut(BaseModel):
    url: str
