import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ItemCard from "@/components/ItemCard";
import { CATEGORIES, LOCATIONS, STATUS_META } from "@/lib/constants";
import type { ItemList, ItemStatus } from "@/lib/types";

const TYPE_TABS = [
  { value: "", label: "All items" },
  { value: "lost", label: "Lost" },
  { value: "found", label: "Found" },
] as const;

export default function BrowseItems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [qInput, setQInput] = useState(searchParams.get("q") ?? "");
  const q = useDebounced(qInput);

  const type = searchParams.get("type") ?? "";
  const category = searchParams.get("category") ?? "";
  const location = searchParams.get("location") ?? "";
  const status = searchParams.get("status") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setParam("q", q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (category) params.set("category", category);
  if (location) params.set("location", location);
  if (status) params.set("status", status);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  if (q) params.set("q", q);

  const query = useInfiniteQuery({
    queryKey: ["items", "browse", params.toString()],
    queryFn: ({ pageParam }) =>
      apiGet<ItemList>(`/items?${params.toString()}${params.toString() ? "&" : ""}page=${pageParam}&page_size=12`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.page_size < last.total ? last.page + 1 : undefined),
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Browse Lost &amp; Found</h1>
        <p className="text-base text-slate-600">
          Every listing here was verified by the DSW office. Contact details stay private — handovers happen at the DSW Office.
        </p>
      </div>

      {/* Filter bar */}
      <div className="sticky top-20 z-20 mt-6 rounded-xl border border-slate-200/90 bg-white/95 p-4 shadow-xs backdrop-blur-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search items… (e.g. laptop, keys, spectacles)"
              className="pl-9"
              data-testid="items-search-input"
              aria-label="Search items"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Select value={category} onValueChange={(value: string) => setParam("category", value === "all" ? "" : value)}>
              <SelectTrigger className="w-full lg:w-44" data-testid="items-category-filter" aria-label="Filter by category">
                <SelectValue placeholder="All categories">{category || "All categories"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={location} onValueChange={(value: string) => setParam("location", value === "all" ? "" : value)}>
              <SelectTrigger className="w-full lg:w-44" data-testid="items-location-filter" aria-label="Filter by location">
                <SelectValue placeholder="All locations">{location || "All locations"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {LOCATIONS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value: string) => setParam("status", value === "all" ? "" : value)}>
              <SelectTrigger className="w-full lg:w-40" data-testid="items-status-filter" aria-label="Filter by status">
                <SelectValue placeholder="Any status">{status ? STATUS_META[status as ItemStatus].label : "Any status"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {(["approved", "matched", "returned"] as ItemStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1">
              <Input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setParam("from", e.target.value)}
                data-testid="items-date-from-filter"
                aria-label="From date"
              />
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setParam("to", e.target.value)}
                data-testid="items-date-to-filter"
                aria-label="To date"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Type
          </span>
          {TYPE_TABS.map((t) => (
            <button
              key={t.value || "all"}
              onClick={() => setParam("type", t.value)}
              data-testid={`items-type-tab-${t.value || "all"}`}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 hover:scale-105",
                type === t.value
                  ? "bg-[#0B2545] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {t.label}
            </button>
          ))}
          {(category || location || status || dateFrom || dateTo || q) && (
            <button
              onClick={() => setSearchParams({}, { replace: true })}
              className="ml-auto text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm font-medium text-slate-500" data-testid="items-count">
        {query.isError ? "—" : `${total} item${total === 1 ? "" : "s"} found`}
      </p>

      {/* Results */}
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {query.isError && (
          <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            Listings are temporarily unavailable. Please try again in a moment.
          </p>
        )}
        {query.isPending &&
          [1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100" />)}
        {!query.isPending && items.length === 0 && !query.isError && (
          <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No items match these filters yet. Try widening your search — or report what you lost or found.
            <span className="mt-3 block">
              <a href="/report/lost" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mr-2")}>Report Lost</a>
              <a href="/report/found" className={cn(buttonVariants({ size: "sm" }))}>Report Found</a>
            </span>
          </p>
        )}
        {items.map((item, i) => (
          <ItemCard key={item.id} item={item} index={i} />
        ))}
      </div>

      {query.hasNextPage && (
        <div className="mt-10 text-center">
          <button
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className={cn(buttonVariants({ variant: "outline" }), "px-8")}
            data-testid="items-load-more"
          >
            {query.isFetchingNextPage ? "Loading…" : `Load more (${total - items.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
