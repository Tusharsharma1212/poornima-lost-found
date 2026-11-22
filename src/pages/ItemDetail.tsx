import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Archive, CalendarDays, CheckCircle2, Eye, FileWarning, MapPin, Package, Phone, Search, ShieldCheck } from "lucide-react";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge, TypeBadge } from "@/components/ItemCard";
import { DSW_OFFICE } from "@/lib/constants";
import type { ItemDetail } from "@/lib/types";

const TIMELINE: { key: ItemDetail["status"]; label: string }[] = [
  { key: "pending", label: "Submitted" },
  { key: "approved", label: "Approved by DSW" },
  { key: "matched", label: "Matched" },
  { key: "returned", label: "Returned" },
];

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [active, setActive] = useState(0);

  const { data: item, isError, isPending } = useQuery({
    queryKey: ["items", "detail", id],
    queryFn: () => apiGet<ItemDetail>(`/items/${id}`),
    retry: false,
  });

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6">
        <Package className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
        <h1 className="mt-4 font-heading text-2xl font-bold text-slate-900">Item not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This report may have been removed, or it is still pending review and only visible to its owner.
        </p>
        <Link to="/browse" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
          Back to Browse
        </Link>
      </div>
    );
  }

  const photos = item.photos;
  const currentStep = TIMELINE.findIndex((t) => t.key === item.status);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Gallery */}
        <div className="lg:col-span-7">
          <div className="flex h-80 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 lg:h-[26rem]">
            {photos.length > 0 ? (
              <img src={photos[active]} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <Package className="h-14 w-14 text-slate-300" aria-hidden />
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-3">
              {photos.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-16 w-16 overflow-hidden rounded-lg border-2 transition-all",
                    i === active ? "border-orange-600" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                  aria-label={`Photo ${i + 1}`}
                >
                  <img src={p} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Status timeline */}
          {item.status !== "rejected" ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Status timeline</p>
              <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TIMELINE.map((step, i) => {
                  const done = i <= currentStep;
                  return (
                    <li key={step.key} className="flex flex-col items-center gap-2 text-center">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold",
                          done ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300 bg-white text-slate-400",
                        )}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
                      </span>
                      <span className={cn("text-xs font-semibold", done ? "text-slate-900" : "text-slate-400")}>{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5">
              <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
              <div>
                <p className="text-sm font-bold text-rose-800">This report was not approved</p>
                <p className="mt-1 text-sm text-rose-700">
                  DSW note: this listing is hidden from the campus board. Reason: rejected by the DSW office.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5 lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={item.type} />
            <StatusBadge status={item.status} />
            <Badge variant="outline" className="border-slate-200 bg-slate-50 font-medium text-slate-600">
              {item.category}
            </Badge>
            {item.collected_by_dsw && (
              <Badge variant="outline" className="border-[#0B2545]/20 bg-[#0B2545]/5 font-semibold text-[#0B2545]">
                <Archive className="mr-1 h-3 w-3" aria-hidden /> In DSW custody
              </Badge>
            )}
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{item.title}</h1>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-orange-600" aria-hidden /> {item.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
              {item.type === "lost" ? "Lost on" : "Found on"} {format(new Date(item.incident_date), "d MMM yyyy")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-slate-400" aria-hidden />
              Listed {format(new Date(item.created_at), "d MMM yyyy")}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.description}</p>
          </div>

          {/* Owner-only contact panel */}
          {item.mine && item.contact_phone && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">Your report — contact details on file</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
                <Phone className="h-4 w-4" aria-hidden /> {item.contact_phone}
                {item.contact_email ? ` · ${item.contact_email}` : ""}
              </p>
            </div>
          )}

          {/* Claim flow for found items */}
          {item.type === "found" && (item.status === "approved" || item.status === "matched") && !item.mine && (
            <Dialog>
              <DialogTrigger
                render={
                  <button className={cn(buttonVariants({ size: "lg" }), "w-full bg-orange-600 hover:bg-orange-700")} data-testid="item-claim-button">
                    <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden /> This is mine — how do I get it back?
                  </button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Collect this item from the DSW Office</DialogTitle>
                  <DialogDescription>
                    For your safety, items are never handed over online. Follow these steps:
                  </DialogDescription>
                </DialogHeader>
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                  <li>Visit <strong>{DSW_OFFICE.name}</strong> ({DSW_OFFICE.hours}).</li>
                  <li>Bring your <strong>Student ID card</strong>.</li>
                  <li>Prove ownership: a bill, distinctive marks, or unlocking the device.</li>
                  <li>The DSW officer verifies and hands the item over, and marks it <strong>Returned</strong> on the portal.</li>
                </ol>
                <DialogFooter>
                  <p className="text-xs text-slate-500">No fees involved — the service is free for every Poornima student.</p>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {item.status === "matched" && item.mine && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-bold text-orange-800">Match found — visit the DSW Office</p>
              <p className="mt-1 text-sm text-orange-700">
                {DSW_OFFICE.name}. {DSW_OFFICE.hours}. Bring your Student ID and proof of ownership.
              </p>
            </div>
          )}
          {item.status === "pending" && item.mine && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-bold text-amber-800">Pending DSW review</p>
              <p className="mt-1 text-sm text-amber-700">
                Your report is in the DSW approval queue. It will appear on the public board once approved — usually within a working day.
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <Search className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <p className="text-xs leading-relaxed text-slate-500">
              Contact details are never shown publicly. All coordination happens through the DSW office so that
              belongings reach verified owners only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
