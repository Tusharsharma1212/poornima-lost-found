import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Archive, CheckCircle2, FileText, GitMerge, Handshake, Megaphone, PackageCheck, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotificationList } from "@/lib/types";

const ICONS: Record<string, typeof Bell> = {
  report: FileText,
  status: CheckCircle2,
  match: GitMerge,
  handover: Handshake,
  announcement: Megaphone,
  found: Search,
  custody: Archive,
  info: Bell,
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications", "nav"],
    queryFn: () => apiGet<NotificationList>("/notifications?page=1&page_size=6"),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiPost(`/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => apiPost("/notifications/read-all", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  const openItem = (id: string, link: string | null) => {
    markRead.mutate(id);
    setOpen(false);
    navigate(link || "/notifications");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notifications" data-testid="navbar-notifications-button" className="relative" />
        }
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-bold text-slate-900">Notifications</p>
          <Button variant="link" size="xs" className="h-auto p-0" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Mark all read
          </Button>
        </div>
        <div className="h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No notifications yet. Match and handover updates will appear here.
            </p>
          ) : (
            <ul>
              {items.map((n) => {
                const Icon = ICONS[n.ntype] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      data-testid="notification-list-item"
                      onClick={() => openItem(n.id, n.item_id ? `/items/${n.item_id}` : "/notifications")}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                        !n.read && "bg-orange-50/50",
                      )}
                    >
                      <span className="mt-0.5 rounded-lg bg-slate-100 p-1.5">
                        <Icon className="h-4 w-4 text-[#0B2545]" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className={cn("truncate text-sm", n.read ? "font-medium text-slate-700" : "font-bold text-slate-900")}>
                            {n.title}
                          </span>
                          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-orange-600" aria-hidden />}
                        </span>
                        <span className="line-clamp-2 block text-xs leading-relaxed text-slate-500">{n.body}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-slate-200 px-4 py-2 text-center">
          <Button variant="link" size="sm" className="h-auto" onClick={() => { setOpen(false); navigate("/notifications"); }}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
