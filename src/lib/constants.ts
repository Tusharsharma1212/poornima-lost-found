// Campus-wide option lists — mirrors of the lists in backend/models/portal.py.
import type { ItemStatus, ItemType } from "@/lib/types";

export const CATEGORIES = [
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
] as const;

export const LOCATIONS = [
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
] as const;

export const PROOF_TYPES = [
  "Student ID card",
  "Original bill / receipt",
  "Device unlock demonstration",
  "Description of distinctive marks",
  "Other proof accepted by DSW",
] as const;

export const STATUS_META: Record<ItemStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-sky-100 text-sky-800 border-sky-200" },
  matched: { label: "Matched", className: "bg-orange-100 text-orange-800 border-orange-200" },
  returned: { label: "Returned", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-800 border-rose-200" },
};

export const TYPE_META: Record<ItemType, { label: string; className: string }> = {
  lost: { label: "Lost", className: "bg-rose-50 text-rose-700 border-rose-200" },
  found: { label: "Found", className: "bg-sky-50 text-sky-700 border-sky-200" },
};

export const DSW_OFFICE = {
  name: "DSW Office — Admin Block, Ground Floor",
  hours: "Open 10:00–16:00 on all working days",
  note: "Handovers happen only after in-person ownership verification. The service is completely free.",
};
