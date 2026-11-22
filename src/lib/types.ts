// Hand-written mirrors of the Pydantic models in backend/models/portal.py.
// Nothing infers across the Python boundary — keep these in sync in the same edit.

export type ItemType = "lost" | "found";
export type ItemStatus = "pending" | "approved" | "rejected" | "matched" | "returned";

export interface ItemPublic {
  id: string;
  type: ItemType;
  title: string;
  category: string;
  description: string;
  location: string;
  incident_date: string;
  photos: string[];
  status: ItemStatus;
  created_at: string;
}

export interface ItemDetail extends ItemPublic {
  reporter_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  collected_by_dsw: boolean;
  mine: boolean;
}

export interface ItemOut extends ItemPublic {
  reporter_id: string;
  reporter_name: string;
  contact_phone: string;
  contact_email: string | null;
  rejection_reason: string | null;
  collected_by_dsw: boolean;
  dsw_remarks: string | null;
  updated_at: string;
}

export interface ItemList {
  items: ItemPublic[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminItemList {
  items: ItemOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface ItemListOut {
  items: ItemOut[];
  total: number;
}

export interface PublicStats {
  found_items: number;
  lost_items: number;
  matched_items: number;
  returned_items: number;
}

export interface Profile {
  user_id: string;
  name: string;
  email: string | null;
  phone: string;
  department: string;
  reg_no: string;
  role: string;
}

export interface NotificationOut {
  id: string;
  kind: "personal" | "broadcast";
  title: string;
  body: string;
  ntype: string;
  item_id: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationList {
  items: NotificationOut[];
  unread: number;
  has_more: boolean;
}

export interface MatchOut {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  lost_title: string;
  found_title: string;
  lost_reporter_id: string;
  found_reporter_id: string;
  lost_reporter_name: string;
  found_reporter_name: string;
  lost_location: string;
  found_location: string;
  lost_incident_date: string;
  found_incident_date: string;
  lost_photos: string[];
  found_photos: string[];
  status: "active" | "handed_over";
  note: string;
  created_at: string;
}

export interface SuggestionOut {
  item: ItemOut;
  score: number;
  reasons: string[];
}

export interface HandoverOut {
  id: string;
  match_id: string;
  lost_title: string;
  found_title: string;
  collector_name: string;
  enrollment_id: string;
  proof_type: string;
  officer_notes: string;
  verified_by_name: string;
  handed_over_at: string;
}

export interface AnnouncementOut {
  id: string;
  title: string;
  body: string;
  created_by_name: string;
  created_at: string;
}

export interface AdminUserOut {
  user_id: string;
  name: string;
  email: string | null;
  phone: string;
  department: string;
  reg_no: string;
  role: string;
  created_at: string;
}

export interface UsersListOut {
  roles: string[];
  users: AdminUserOut[];
  total: number;
}

export interface StatsOut {
  total_reports: number;
  lost_count: number;
  found_count: number;
  pending_count: number;
  approved_count: number;
  matched_count: number;
  returned_count: number;
  rejected_count: number;
  in_custody: number;
  students_count: number;
  matches_count: number;
  handovers_count: number;
  last7: { date: string; count: number }[];
  top_categories: { category: string; count: number }[];
}

export interface OkBody {
  ok: boolean;
}

export interface UploadOut {
  url: string;
}
