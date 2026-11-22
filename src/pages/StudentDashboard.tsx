import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Archive, Bell, GitMerge, Megaphone, Package, PackagePlus, Search, ShieldCheck, UserRound } from "lucide-react";
import { apiGet } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, TypeBadge } from "@/components/ItemCard";
import type { ItemListOut, NotificationList, Profile } from "@/lib/types";

export default function StudentDashboard() {
  const mine = useQuery({
    queryKey: ["mine-items"],
    queryFn: () => apiGet<ItemListOut>("/items/mine"),
    retry: false,
  });
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<Profile>("/auth/me"),
    retry: false,
  });
  const notifs = useQuery({
    queryKey: ["notifications", "dash"],
    queryFn: () => apiGet<NotificationList>("/notifications?page=1&page_size=5"),
  });

  const items = mine.data?.items ?? [];
  const counts = {
    pending: items.filter((i) => i.status === "pending").length,
    approved: items.filter((i) => i.status === "approved").length,
    matched: items.filter((i) => i.status === "matched").length,
    returned: items.filter((i) => i.status === "returned").length,
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">My Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back{profile.data?.name ? `, ${profile.data.name.split(" ")[0]}` : ""} — track your reports and match alerts here.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/report/lost" data-testid="dashboard-report-lost-button" className={cn(buttonVariants({ variant: "outline" }))}>
            <Search className="mr-1 h-4 w-4 text-rose-600" aria-hidden /> Report Lost
          </Link>
          <Link to="/report/found" data-testid="dashboard-report-found-button" className={cn(buttonVariants(), "bg-orange-600 hover:bg-orange-700")}>
            <PackagePlus className="mr-1 h-4 w-4" aria-hidden /> Report Found
          </Link>
        </div>
      </div>

      {/* Status counters */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(
          [
            { label: "Pending review", value: counts.pending, cls: "text-amber-700" },
            { label: "Approved live", value: counts.approved, cls: "text-sky-700" },
            { label: "Matched", value: counts.matched, cls: "text-orange-700" },
            { label: "Returned", value: counts.returned, cls: "text-emerald-700" },
          ] as const
        ).map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className={cn("font-heading text-2xl font-extrabold", c.cls)}>{mine.isError ? "—" : c.value}</p>
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Reports list */}
        <div className="space-y-4 lg:col-span-8">
          <h2 className="text-lg font-bold text-slate-900">My submitted reports</h2>
          {mine.isPending && [1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
          {mine.isError && (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Your reports could not be loaded right now.
            </p>
          )}
          {!mine.isPending && items.length === 0 && !mine.isError && (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <Package className="mx-auto h-9 w-9 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-700">No reports yet</p>
              <p className="mt-1 text-sm text-slate-500">Lost something or found something on campus? Report it — DSW takes it from there.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Link to="/report/lost" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Report Lost</Link>
                <Link to="/report/found" className={cn(buttonVariants({ size: "sm" }), "bg-orange-600 hover:bg-orange-700")}>Report Found</Link>
              </div>
            </div>
          )}
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/items/${item.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              data-testid={`dashboard-report-${item.id}`}
            >
              <div className="flex gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {item.photos[0] ? (
                    <img src={item.photos[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-slate-300" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={item.type} />
                    <StatusBadge status={item.status} />
                    {item.collected_by_dsw && item.status !== "returned" && (
                      <Badge variant="outline" className="border-[#0B2545]/20 bg-[#0B2545]/5 text-[11px] font-semibold text-[#0B2545]">
                        <Archive className="mr-1 h-3 w-3" aria-hidden /> In DSW custody
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.location} · {format(new Date(item.incident_date), "d MMM yyyy")}
                  </p>
                  {item.status === "matched" && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-orange-700">
                      <GitMerge className="h-3.5 w-3.5" aria-hidden />
                      Matched! Visit the DSW Office with proof of ownership.
                    </p>
                  )}
                  {item.status === "rejected" && item.rejection_reason && (
                    <p className="mt-1.5 text-xs font-medium text-rose-700">DSW: {item.rejection_reason}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Side rail */}
        <div className="space-y-6 lg:col-span-4">
          {/* Profile card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B2545]">
                <UserRound className="h-5 w-5 text-orange-400" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{profile.data?.name ?? "Student"}</p>
                <p className="truncate text-xs text-slate-500">
                  {profile.data?.reg_no || "Add your enrollment no."} · {profile.data?.department || "Add department"}
                </p>
              </div>
            </div>
            {profile.data?.role === "dsw" && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#0B2545]/5 px-3 py-2 text-xs font-semibold text-[#0B2545]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> DSW staff — admin dashboard available
              </p>
            )}
            <Link to="/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 w-full")}>
              Edit profile
            </Link>
          </div>

          {/* Notifications preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Bell className="h-4 w-4 text-orange-600" aria-hidden /> Notifications
              </p>
              {notifs.data && notifs.data.unread > 0 && (
                <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[11px] font-bold text-white">{notifs.data.unread} new</span>
              )}
            </div>
            <ul className="mt-3 space-y-3">
              {(notifs.data?.items ?? []).map((n) => (
                <li key={n.id} className={cn("rounded-lg p-2.5 text-xs", n.read ? "bg-slate-50" : "bg-orange-50/70")}>
                  <p className="flex items-center gap-1.5 font-bold text-slate-800">
                    {n.ntype === "announcement" && <Megaphone className="h-3.5 w-3.5 text-orange-600" aria-hidden />}
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-slate-500">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </li>
              ))}
              {notifs.data && notifs.data.items.length === 0 && (
                <li className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Nothing yet — match and handover alerts will land here.</li>
              )}
              {!notifs.data && [1, 2].map((i) => <li key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
            </ul>
            <Link to="/notifications" className={cn(buttonVariants({ variant: "link", size: "sm" }), "mt-2 h-auto px-0")}>
              View all notifications
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
