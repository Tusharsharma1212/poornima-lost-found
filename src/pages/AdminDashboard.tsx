import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Archive,
  ClipboardCheck,
  GitMerge,
  Handshake,
  History,
  Inbox,
  Megaphone,
  Package,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, TypeBadge } from "@/components/ItemCard";
import { PROOF_TYPES, STATUS_META } from "@/lib/constants";
import type {
  AdminItemList,
  AnnouncementOut,
  HandoverOut,
  ItemOut,
  MatchOut,
  Profile,
  SuggestionOut,
  StatsOut,
  UsersListOut,
} from "@/lib/types";

function errDetail(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const d = (err.body as { detail?: string } | null)?.detail;
    if (typeof d === "string") return d;
  }
  return err instanceof Error ? err.message : fallback;
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
}

export default function AdminDashboard() {
  const { data: profile, isPending: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<Profile>("/auth/me"),
    retry: false,
  });

  if (profileLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (profile?.role !== "dsw") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center sm:px-6">
        <ShieldAlert className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
        <h1 className="mt-4 font-heading text-2xl font-bold text-slate-900">DSW staff only</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          This dashboard is restricted to authorised staff of the Dean of Student Welfare office, Poornima Campus.
          Students can track their reports from My Dashboard.
        </p>
      </div>
    );
  }

  return <DswWorkspace />;
}

function DswWorkspace() {
  const invalidate = useInvalidate();
  const [tab, setTab] = useState("approvals");

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiGet<StatsOut>("/admin/stats"),
  });

  const kpis = [
    { label: "Total reports", value: stats.data?.total_reports, icon: Inbox, cls: "text-[#0B2545]" },
    { label: "Pending approvals", value: stats.data?.pending_count, icon: ClipboardCheck, cls: "text-amber-700" },
    { label: "Items in DSW custody", value: stats.data?.in_custody, icon: Archive, cls: "text-orange-700" },
    { label: "Returned to owners", value: stats.data?.returned_count, icon: Handshake, cls: "text-emerald-700" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Admin banner */}
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-[#1E293B] p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            <ShieldCheck className="h-4 w-4" aria-hidden /> DSW Department · Poornima Campus
          </p>
          <h1 className="mt-2 font-heading text-xl font-bold tracking-tight sm:text-2xl">Lost &amp; Found Administration</h1>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-slate-400">
          Approvals, matching, handovers and campus announcements — every action is recorded against your staff account.
        </p>
      </div>

      {/* KPI row */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className={cn("flex items-center gap-2 font-heading text-2xl font-extrabold", k.cls)}>
              <k.icon className="h-4 w-4 text-slate-400" aria-hidden />
              {stats.isError ? "—" : (k.value ?? "…")}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(value: string) => setTab(value)} className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="approvals" data-testid="admin-tab-approvals">Approvals</TabsTrigger>
          <TabsTrigger value="matching" data-testid="admin-tab-matches">Matching</TabsTrigger>
          <TabsTrigger value="handovers" data-testid="admin-tab-handovers">Handovers</TabsTrigger>
          <TabsTrigger value="announcements" data-testid="admin-tab-announcements">Announcements</TabsTrigger>
          <TabsTrigger value="history" data-testid="admin-tab-history">History</TabsTrigger>
          <TabsTrigger value="people" data-testid="admin-tab-people">People</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals"><ApprovalsTab invalidate={invalidate} /></TabsContent>
        <TabsContent value="matching"><MatchingTab invalidate={invalidate} onGoHandover={() => setTab("handovers")} /></TabsContent>
        <TabsContent value="handovers"><HandoversTab invalidate={invalidate} /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab invalidate={invalidate} /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
        <TabsContent value="people"><PeopleTab invalidate={invalidate} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------ approvals */

function ApprovalsTab({ invalidate }: { invalidate: (...keys: string[]) => void }) {
  const [status, setStatus] = useState("pending");
  const [rejectTarget, setRejectTarget] = useState<ItemOut | null>(null);
  const [reason, setReason] = useState("");
  const [collectTarget, setCollectTarget] = useState<ItemOut | null>(null);
  const [remarks, setRemarks] = useState("");

  const query = useQuery({
    queryKey: ["admin-items", status],
    queryFn: () =>
      apiGet<AdminItemList>(
        `/admin/items?page=1&page_size=50${status !== "all" ? `&status=${status}` : ""}`,
      ),
  });

  const approve = useMutation({
    mutationFn: (id: string) => apiPost<ItemOut>(`/admin/items/${id}/approve`, {}),
    onSuccess: () => {
      toast.success("Report approved and published to the campus board");
      invalidate("admin-items", "admin-stats", "items", "notifications");
    },
    onError: (err) => toast.error(errDetail(err, "Could not approve this report")),
  });

  const reject = useMutation({
    mutationFn: ({ id, why }: { id: string; why: string }) =>
      apiPost<ItemOut>(`/admin/items/${id}/reject`, { reason: why }),
    onSuccess: () => {
      toast.success("Report rejected — the student has been notified");
      setRejectTarget(null);
      setReason("");
      invalidate("admin-items", "admin-stats", "items");
    },
    onError: (err) => toast.error(errDetail(err, "Could not reject this report")),
  });

  const collect = useMutation({
    mutationFn: ({ id, rem }: { id: string; rem: string }) =>
      apiPost<ItemOut>(`/admin/items/${id}/collected`, { remarks: rem }),
    onSuccess: () => {
      toast.success("Item recorded into DSW custody");
      setCollectTarget(null);
      setRemarks("");
      invalidate("admin-items", "admin-stats", "items");
    },
    onError: (err) => toast.error(errDetail(err, "Could not record custody")),
  });

  const items = query.data?.items ?? [];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <Select value={status} onValueChange={(value: string) => setStatus(value)}>
          <SelectTrigger className="w-48" data-testid="admin-status-filter" aria-label="Filter by status">
            <SelectValue>{status === "all" ? "All statuses" : STATUS_META[status as keyof typeof STATUS_META].label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm font-medium text-slate-500">{query.data?.total ?? "…"} report(s)</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Location · Date</TableHead>
              <TableHead className="hidden md:table-cell">Reporter</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending && (
              <TableRow>
                <TableCell colSpan={5} className="p-8 text-center text-sm text-slate-400">Loading reports…</TableCell>
              </TableRow>
            )}
            {query.isError && (
              <TableRow>
                <TableCell colSpan={5} className="p-8 text-center text-sm text-slate-500">Reports are temporarily unavailable.</TableCell>
              </TableRow>
            )}
            {!query.isPending && items.length === 0 && !query.isError && (
              <TableRow>
                <TableCell colSpan={5} className="p-8 text-center text-sm text-slate-500">No reports with this status.</TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id} data-testid={`admin-report-row-${item.id}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {item.photos[0] ? (
                        <img src={item.photos[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-300" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="max-w-56 truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <div className="mt-0.5 flex gap-1.5">
                        <TypeBadge type={item.type} />
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-slate-600 md:table-cell">{item.category}</TableCell>
                <TableCell className="hidden text-sm text-slate-600 lg:table-cell">
                  {item.location}
                  <span className="block text-xs text-slate-400">{format(new Date(item.incident_date), "d MMM yyyy")}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm font-medium text-slate-800">{item.reporter_name}</p>
                  <p className="text-xs text-slate-500">{item.contact_phone}</p>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {item.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => approve.mutate(item.id)}
                          disabled={approve.isPending}
                          data-testid="admin-report-approve-button"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => setRejectTarget(item)}
                          data-testid="admin-report-reject-button"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {item.type === "found" && item.status === "approved" && !item.collected_by_dsw && (
                      <Button size="sm" variant="secondary" onClick={() => setCollectTarget(item)} data-testid="admin-custody-button">
                        <Archive className="mr-1 h-3.5 w-3.5" aria-hidden /> In custody
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this report?</DialogTitle>
            <DialogDescription>
              "{rejectTarget?.title}" will stay off the campus board and the student will see your reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason shown to the student, e.g. insufficient details to verify ownership…"
            rows={3}
            data-testid="admin-reject-reason-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              className="bg-rose-700 hover:bg-rose-800"
              disabled={reason.trim().length < 3 || reject.isPending}
              onClick={() => rejectTarget && reject.mutate({ id: rejectTarget.id, why: reason.trim() })}
              data-testid="admin-reject-confirm-button"
            >
              {reject.isPending ? "Rejecting…" : "Reject report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custody dialog */}
      <Dialog open={!!collectTarget} onOpenChange={(open) => !open && setCollectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record item into DSW custody</DialogTitle>
            <DialogDescription>
              Confirm the physical item for "{collectTarget?.title}" has been received at the DSW office.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Cupboard tag / remarks (optional), e.g. DSW-2024-122"
            data-testid="admin-custody-remarks-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectTarget(null)}>Cancel</Button>
            <Button
              disabled={collect.isPending}
              onClick={() => collectTarget && collect.mutate({ id: collectTarget.id, rem: remarks.trim() })}
              data-testid="admin-custody-confirm-button"
            >
              {collect.isPending ? "Saving…" : "Record custody"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------ matching */

function MatchingTab({ invalidate, onGoHandover }: { invalidate: (...keys: string[]) => void; onGoHandover: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const found = useQuery({
    queryKey: ["admin-items", "found-approved"],
    queryFn: () => apiGet<AdminItemList>("/admin/items?type=found&status=approved&page=1&page_size=50"),
  });
  const activeMatches = useQuery({
    queryKey: ["admin-matches", "active"],
    queryFn: () => apiGet<MatchOut[]>("/admin/matches?status=active"),
  });
  const suggestions = useQuery({
    queryKey: ["admin-suggestions", selected],
    queryFn: () => apiGet<SuggestionOut[]>(`/admin/matches/suggestions?found_item_id=${selected}`),
    enabled: !!selected,
  });

  const match = useMutation({
    mutationFn: (body: { lost_item_id: string; found_item_id: string }) => apiPost<MatchOut>("/admin/matches", body),
    onSuccess: (m) => {
      toast.success(`Matched! Both students have been notified.`);
      setSelected(null);
      invalidate("admin-items", "admin-matches", "admin-stats", "notifications");
    },
    onError: (err) => toast.error(errDetail(err, "Could not create the match")),
  });

  const matchedFoundIds = new Set((activeMatches.data ?? []).map((m) => m.found_item_id));
  const foundItems = (found.data?.items ?? []).filter((i) => !matchedFoundIds.has(i.id));

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Found items awaiting match */}
      <div className="space-y-3 lg:col-span-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Found items in custody</h3>
        {found.isPending && [1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
        {foundItems.length === 0 && !found.isPending && !found.isError && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No un-matched found items right now. Approved found reports appear here.
          </p>
        )}
        {foundItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item.id === selected ? null : item.id)}
            className={cn(
              "w-full rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              selected === item.id ? "border-orange-400 bg-orange-50/60" : "border-slate-200 bg-white",
            )}
            data-testid={`admin-found-item-${item.id}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">Found</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {item.location} · {format(new Date(item.incident_date), "d MMM yyyy")} · {item.collected_by_dsw ? "in custody" : "with finder"}
            </p>
            <p className="mt-1.5 text-xs font-semibold text-orange-600">{selected === item.id ? "Hide suggested lost reports" : "Find matching lost reports"}</p>
          </button>
        ))}
      </div>

      {/* Suggestions */}
      <div className="space-y-3 lg:col-span-7">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Suggested lost reports</h3>
        {!selected && (
          <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            Pick a found item on the left — DSW's matcher scores approved lost reports by category, location, dates and title.
          </p>
        )}
        {selected && suggestions?.isPending && [1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
        {selected && suggestions?.data && suggestions.data.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No similar lost reports yet. When a student reports a matching lost item, it will score here.
          </p>
        )}
        {(suggestions.data ?? []).map((s) => (
          <div key={s.item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs" data-testid={`admin-suggestion-${s.item.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{s.item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {s.item.location} · {format(new Date(s.item.incident_date), "d MMM yyyy")} · reported by {s.item.reporter_name}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{s.item.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.reasons.map((r) => (
                    <Badge key={r} variant="outline" className="border-orange-200 bg-orange-50 text-[11px] font-semibold text-orange-700">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
              <span className="flex shrink-0 flex-col items-center rounded-lg bg-[#0B2545] px-3 py-2 text-white">
                <span className="font-heading text-lg font-extrabold leading-none">{s.score}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-300">score</span>
              </span>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => match.mutate({ lost_item_id: s.item.id, found_item_id: selected! })}
                disabled={match.isPending}
                data-testid="admin-pair-match-button"
              >
                <GitMerge className="mr-1 h-3.5 w-3.5" aria-hidden />
                {match.isPending ? "Matching…" : "Match these reports"}
              </Button>
            </div>
          </div>
        ))}
        {selected && (
          <Button variant="link" size="sm" onClick={onGoHandover} className="text-[#0B2545]">
            Already matched? Go to Handovers to confirm the return
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------ handovers */

function HandoversTab({ invalidate }: { invalidate: (...keys: string[]) => void }) {
  const [target, setTarget] = useState<MatchOut | null>(null);
  const [proof, setProof] = useState("");
  const [collector, setCollector] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [notes, setNotes] = useState("");

  const matches = useQuery({
    queryKey: ["admin-matches", "active"],
    queryFn: () => apiGet<MatchOut[]>("/admin/matches?status=active"),
  });

  const handover = useMutation({
    mutationFn: (body: { id: string; proof_type: string; collector_name: string; enrollment_id: string; officer_notes: string }) =>
      apiPost<HandoverOut>(`/admin/matches/${body.id}/handover`, {
        proof_type: body.proof_type,
        collector_name: body.collector_name,
        enrollment_id: body.enrollment_id,
        officer_notes: body.officer_notes,
      }),
    onSuccess: () => {
      toast.success("Handover confirmed — item marked as Returned");
      setTarget(null);
      setProof("");
      setCollector("");
      setEnrollment("");
      setNotes("");
      invalidate("admin-matches", "admin-handovers", "admin-items", "admin-stats", "notifications");
    },
    onError: (err) => toast.error(errDetail(err, "Could not confirm the handover")),
  });

  const rows = matches.data ?? [];

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Matched pairs awaiting handover</h3>
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lost report</TableHead>
              <TableHead>Found report</TableHead>
              <TableHead className="hidden md:table-cell">Matched</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.isPending && (
              <TableRow><TableCell colSpan={4} className="p-8 text-center text-sm text-slate-400">Loading…</TableCell></TableRow>
            )}
            {!matches.isPending && rows.length === 0 && !matches.isError && (
              <TableRow>
                <TableCell colSpan={4} className="p-8 text-center text-sm text-slate-500">
                  No active matches. Create matches in the Matching tab first.
                </TableCell>
              </TableRow>
            )}
            {rows.map((m) => (
              <TableRow key={m.id} data-testid={`admin-handover-row-${m.id}`}>
                <TableCell>
                  <p className="text-sm font-semibold text-slate-900">{m.lost_title}</p>
                  <p className="text-xs text-slate-500">{m.lost_reporter_name} · {m.lost_location}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-semibold text-slate-900">{m.found_title}</p>
                  <p className="text-xs text-slate-500">{m.found_reporter_name} · {m.found_location}</p>
                </TableCell>
                <TableCell className="hidden text-sm text-slate-600 md:table-cell">
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setTarget(m)}
                    data-testid="admin-handover-open-button"
                  >
                    <Handshake className="mr-1 h-3.5 w-3.5" aria-hidden /> Confirm handover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm handover — "{target?.lost_title}"</DialogTitle>
            <DialogDescription>
              Verify the student in person (Student ID + ownership proof), then record the handover. This marks both reports as Returned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Proof verified *</Label>
              <Select value={proof} onValueChange={(value: string) => setProof(value)}>
                <SelectTrigger data-testid="admin-handover-proof-select" aria-label="Proof type">
                  <SelectValue placeholder="Choose proof type" />
                </SelectTrigger>
                <SelectContent>
                  {PROOF_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="collector-name">Collected by (name) *</Label>
                <Input id="collector-name" value={collector} onChange={(e) => setCollector(e.target.value)} placeholder="e.g. Pooja Sharma" data-testid="admin-handover-collector-input" />
              </div>
              <div>
                <Label htmlFor="collector-enrollment">Enrollment no. *</Label>
                <Input id="collector-enrollment" value={enrollment} onChange={(e) => setEnrollment(e.target.value)} placeholder="PU2023CS0142" data-testid="admin-handover-enrollment-input" />
              </div>
            </div>
            <div>
              <Label htmlFor="officer-notes">Officer notes</Label>
              <Textarea id="officer-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Verification remarks (optional)" data-testid="admin-handover-notes-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!proof || collector.trim().length < 2 || enrollment.trim().length < 2 || handover.isPending}
              onClick={() =>
                target &&
                handover.mutate({
                  id: target.id,
                  proof_type: proof,
                  collector_name: collector.trim(),
                  enrollment_id: enrollment.trim(),
                  officer_notes: notes.trim(),
                })
              }
              data-testid="admin-handover-confirm-button"
            >
              {handover.isPending ? "Recording…" : "Mark as Returned"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------ announcements */

function AnnouncementsTab({ invalidate }: { invalidate: (...keys: string[]) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const list = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => apiGet<AnnouncementOut[]>("/admin/announcements"),
  });

  const create = useMutation({
    mutationFn: () => apiPost<AnnouncementOut>("/admin/announcements", { title: title.trim(), body: body.trim() }),
    onSuccess: () => {
      toast.success("Announcement sent to the whole campus");
      setTitle("");
      setBody("");
      invalidate("admin-announcements", "notifications");
    },
    onError: (err) => toast.error(errDetail(err, "Could not send the announcement")),
  });

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Megaphone className="h-4 w-4 text-orange-600" aria-hidden /> New campus announcement
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="ann-title">Title *</Label>
              <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. DSW desk closed on Saturday" data-testid="admin-announcement-title-input" />
            </div>
            <div>
              <Label htmlFor="ann-body">Message *</Label>
              <Textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={1000} placeholder="Message every student will see in their notification center" data-testid="admin-announcement-body-input" />
            </div>
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={title.trim().length < 3 || body.trim().length < 5 || create.isPending}
              onClick={() => create.mutate()}
              data-testid="admin-announcement-send-button"
            >
              {create.isPending ? "Sending…" : "Send to all students"}
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-3 lg:col-span-7">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Sent announcements</h3>
        {list.isPending && [1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
        {list.isError && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Announcements are temporarily unavailable.</p>
        )}
        {(list.data ?? []).length === 0 && !list.isPending && !list.isError && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Nothing sent yet.</p>
        )}
        {(list.data ?? []).map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs" data-testid={`admin-announcement-${a.id}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">{a.title}</p>
              <span className="shrink-0 text-xs text-slate-400">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{a.body}</p>
            <p className="mt-2 text-xs text-slate-400">— {a.created_by_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------ history */

function HistoryTab() {
  const query = useQuery({
    queryKey: ["admin-handovers"],
    queryFn: () => apiGet<HandoverOut[]>("/admin/handovers"),
  });
  const rows = query.data ?? [];

  return (
    <div className="mt-4 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        <History className="h-4 w-4" aria-hidden /> Complete handover record
      </h3>
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="hidden md:table-cell">Collected by</TableHead>
              <TableHead className="hidden lg:table-cell">Proof</TableHead>
              <TableHead className="hidden lg:table-cell">Officer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending && (
              <TableRow><TableCell colSpan={5} className="p-8 text-center text-sm text-slate-400">Loading…</TableCell></TableRow>
            )}
            {!query.isPending && rows.length === 0 && !query.isError && (
              <TableRow><TableCell colSpan={5} className="p-8 text-center text-sm text-slate-500">No handovers recorded yet.</TableCell></TableRow>
            )}
            {rows.map((h) => (
              <TableRow key={h.id} data-testid={`admin-history-row-${h.id}`}>
                <TableCell className="text-sm text-slate-600">{format(new Date(h.handed_over_at), "d MMM yyyy")}</TableCell>
                <TableCell>
                  <p className="text-sm font-semibold text-slate-900">{h.lost_title}</p>
                  <p className="text-xs text-slate-400">matched with: {h.found_title}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm font-medium text-slate-800">{h.collector_name}</p>
                  <p className="text-xs text-slate-500">{h.enrollment_id}</p>
                </TableCell>
                <TableCell className="hidden max-w-44 truncate text-sm text-slate-600 lg:table-cell">{h.proof_type}</TableCell>
                <TableCell className="hidden text-sm text-slate-600 lg:table-cell">{h.verified_by_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------------------------ people */

function PeopleTab({ invalidate }: { invalidate: (...keys: string[]) => void }) {
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => apiGet<UsersListOut>(`/admin/users${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`),
  });

  const setRole = useMutation({
    mutationFn: (body: { userId: string; role: string }) =>
      apiPatch(`/admin/users/${body.userId}/role`, { role: body.role }),
    onSuccess: () => {
      toast.success("Role updated");
      invalidate("admin-users", "admin-stats");
    },
    onError: (err) => toast.error(errDetail(err, "Could not update the role")),
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          <Users className="h-4 w-4" aria-hidden /> Students &amp; staff
        </h3>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email or enrollment no."
          className="max-w-xs"
          data-testid="admin-people-search-input"
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead className="hidden md:table-cell">Enrollment</TableHead>
              <TableHead className="hidden lg:table-cell">Department</TableHead>
              <TableHead className="text-right">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending && (
              <TableRow><TableCell colSpan={4} className="p-8 text-center text-sm text-slate-400">Loading…</TableCell></TableRow>
            )}
            {query.isError && (
              <TableRow><TableCell colSpan={4} className="p-8 text-center text-sm text-slate-500">People are temporarily unavailable.</TableCell></TableRow>
            )}
            {!query.isPending && (query.data?.users ?? []).length === 0 && !query.isError && (
              <TableRow><TableCell colSpan={4} className="p-8 text-center text-sm text-slate-500">No matching people.</TableCell></TableRow>
            )}
            {(query.data?.users ?? []).map((u) => (
              <TableRow key={u.user_id} data-testid={`admin-person-row-${u.user_id}`}>
                <TableCell>
                  <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email ?? "—"}</p>
                </TableCell>
                <TableCell className="hidden text-sm text-slate-600 md:table-cell">{u.reg_no || "—"}</TableCell>
                <TableCell className="hidden text-sm text-slate-600 lg:table-cell">{u.department || "—"}</TableCell>
                <TableCell className="text-right">
                  <Select value={u.role} onValueChange={(value: string) => setRole.mutate({ userId: u.user_id, role: value })}>
                    <SelectTrigger size="sm" className="ml-auto w-32" data-testid={`admin-role-select-${u.user_id}`} aria-label={`Role for ${u.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="dsw">DSW Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
