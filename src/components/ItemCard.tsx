import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { CalendarDays, MapPin, Package } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { STATUS_META, TYPE_META } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { ItemPublic } from "@/lib/types";

export function StatusBadge({ status }: { status: ItemPublic["status"] }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("border font-semibold", meta.className)} data-testid={`status-badge-${status}`}>
      {meta.label}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: ItemPublic["type"] }) {
  const meta = TYPE_META[type];
  return (
    <Badge variant="outline" className={cn("border font-semibold", meta.className)}>
      {meta.label}
    </Badge>
  );
}

export default function ItemCard({ item, index = 0 }: { item: ItemPublic; index?: number }) {
  const photo = item.photos[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Link
        to={`/items/${item.id}`}
        data-testid="item-card-container"
        className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
      >
        <div className="relative flex h-44 items-center justify-center overflow-hidden bg-slate-100">
          {photo ? (
            <img
              src={photo}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <Package className="h-10 w-10 text-slate-300" aria-hidden />
          )}
          <div className="absolute left-2 top-2 flex gap-1.5">
            <TypeBadge type={item.type} />
          </div>
          <div className="absolute right-2 top-2">
            <StatusBadge status={item.status} />
          </div>
        </div>
        <div className="space-y-1.5 p-4">
          <h3 className="line-clamp-1 text-base font-semibold tracking-normal text-slate-900">{item.title}</h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-orange-600" aria-hidden />
              {item.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {format(new Date(item.incident_date), "d MMM yyyy")}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{item.category}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
