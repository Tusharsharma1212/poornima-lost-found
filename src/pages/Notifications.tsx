import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CheckCheck, MailCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NotificationList } from "@/lib/types";

const ICONS: Record<string, string> = {
  report: "📄",
  status: "✅",
  match: "🔗",
  handover: "🤝",
  announcement: "📣",
  found: "🔎",
  custody: "📦",
  info: "🔔",
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["notifications", "page"],
    queryFn: ({ pageParam }) => apiGet<NotificationList>(`/notifications?page=${pageParam}&page_size=15`),
    initialPageParam: 1,
    getNextPageParam: (last, allPages) => (last.has_more ? allPages.length + 1 : undefined),
  });

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  const unread = pages[0]?.unread ?? 0;

  const markRead = useMutation({
    mutationFn: (id: string) => apiPost(`/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => apiPost("/notifications/read-all", {}),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const openItem = (id: string, itemId: string | null) => {
    markRead.mutate(id);
    navigate(itemId ? `/items/${itemId}` : "/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Match alerts, approval updates, DSW announcements and handover records.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending} data-testid="notifications-mark-all-button">
          <CheckCheck className="mr-1 h-4 w-4" aria-hidden /> Mark all read
        </Button>
      </div>

      {unread > 0 && <Badge className="mt-4 bg-orange-600 text-white">{unread} unread</Badge>}

      <ul className="mt-6 space-y-3">
        {query.isPending && [1, 2, 3].map((i) => <li key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
        {query.isError && (
          <li className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            Notifications are temporarily unavailable.
          </li>
        )}
        {!query.isPending && items.length === 0 && !query.isError && (
          <li className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <MailCheck className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-slate-700">You're all caught up</p>
            <p className="mt-1 text-sm text-slate-500">Campus announcements and match alerts will appear here.</p>
          </li>
        )}
        {items.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => openItem(n.id, n.item_id)}
              data-testid="notification-list-item"
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                n.read ? "border-slate-200 bg-white" : "border-orange-200 bg-orange-50/60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span aria-hidden>{ICONS[n.ntype] ?? "🔔"}</span>
                    {n.title}
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-orange-600" aria-label="unread" />}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{n.body}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {n.kind === "broadcast" ? "Campus-wide announcement · " : ""}
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {pages[0]?.has_more && (
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} data-testid="notifications-load-more">
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
