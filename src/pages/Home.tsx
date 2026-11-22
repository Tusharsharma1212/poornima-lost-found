import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, CheckCircle2, GitMerge, Handshake, MapPin, PackageSearch, ShieldCheck, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import ItemCard, { StatusBadge, TypeBadge } from "@/components/ItemCard";
import { CATEGORIES } from "@/lib/constants";
import type { ItemList, PublicStats } from "@/lib/types";

const STEPS = [
  {
    icon: PackageSearch,
    title: "Report it",
    body: "Lost something? Found something? Submit a report with photos, location and date in under a minute.",
  },
  {
    icon: ShieldCheck,
    title: "DSW verifies",
    body: "The Dean of Student Welfare office reviews every report before it goes live on the portal.",
  },
  {
    icon: GitMerge,
    title: "We match",
    body: "DSW pairs lost reports with found items and both students are notified instantly.",
  },
  {
    icon: Handshake,
    title: "Verified handover",
    body: "Visit the DSW Office with proof of ownership. Once verified, the item is marked Returned.",
  },
];

export default function Home() {
  const stats = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => apiGet<PublicStats>("/stats/public"),
    retry: false,
  });
  const recent = useQuery({
    queryKey: ["items", "recent"],
    queryFn: () => apiGet<ItemList>("/items?page=1&page_size=3"),
    retry: false,
  });
  const found = useQuery({
    queryKey: ["items", "found-grid"],
    queryFn: () => apiGet<ItemList>("/items?type=found&page=1&page_size=3"),
    retry: false,
  });

  const statCards = [
    { label: "Found items on board", value: stats.data?.found_items },
    { label: "Lost items reported", value: stats.data?.lost_items },
    { label: "Matched pairs", value: stats.data?.matched_items },
    { label: "Reunited with owners", value: stats.data?.returned_items },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-[#0B2545] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24">
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
              Poornima University · Jaipur
            </p>
            <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight leading-[1.1] sm:text-5xl lg:text-6xl">
              Lost something on campus?
              <span className="block text-orange-400">We bring it home.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              The official campus Lost &amp; Found portal, run by the DSW office for all 30,000+ students.
              Report a lost or found item, and the DSW team verifies, matches and hands it back — in person, with proof of ownership.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/report/lost"
                className={buttonVariants({ size: "lg" }) + " bg-orange-600 hover:bg-orange-700 active:scale-[0.98]"}
              >
                Report a Lost Item <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/report/found"
                className={buttonVariants({ variant: "outline", size: "lg" }) + " border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"}
              >
                Report a Found Item
              </Link>
              <Link
                to="/browse"
                className={buttonVariants({ variant: "ghost", size: "lg" }) + " text-slate-200 hover:bg-white/10 hover:text-white"}
              >
                Browse items
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-slate-400">
              <Sparkles className="h-4 w-4 text-orange-400" aria-hidden />
              Completely free for every student — no charges, no subscriptions, ever.
            </p>
          </motion.div>

          {/* Live ticker card */}
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-300">Latest on campus</p>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden /> live
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                {recent.isError && (
                  <li className="rounded-lg bg-white/5 p-3 text-sm text-slate-400">
                    Live items are unavailable right now — the portal keeps working offline.
                  </li>
                )}
                {(recent.data?.items ?? []).map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/items/${item.id}`}
                      className="block rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                        <TypeBadge type={item.type} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-orange-400" aria-hidden /> {item.location}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                    </Link>
                  </li>
                ))}
                {!recent.data && !recent.isError && (
                  <>
                    <li className="h-16 animate-pulse rounded-lg bg-white/5" />
                    <li className="h-16 animate-pulse rounded-lg bg-white/5" />
                  </>
                )}
              </ul>
              <Link to="/browse" className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold text-orange-400 hover:text-orange-300">
                See all items <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live counters */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-6">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <p className="font-heading text-3xl font-extrabold text-[#0B2545]">
                {stats.isError ? "—" : (s.value ?? "…")}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            How the DSW handover works
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
            Every item moves through a controlled, verified process — so belongings reach their real owners and nothing changes hands anonymously.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="relative rounded-xl border border-slate-200 bg-[#F8FAFC] p-6"
              >
                <span className="absolute right-4 top-4 font-heading text-3xl font-extrabold text-slate-200">
                  {i + 1}
                </span>
                <span className="inline-flex rounded-lg bg-[#0B2545] p-2.5">
                  <step.icon className="h-5 w-5 text-orange-400" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Browse by category</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              to={`/browse?category=${encodeURIComponent(c)}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-105 hover:border-orange-300 hover:text-orange-700"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* Recent found items */}
      <section className="border-t border-slate-200 bg-white py-14">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Recently found on campus</h2>
              <p className="mt-2 text-base text-slate-600">Recognise something? Visit the DSW Office with proof of ownership.</p>
            </div>
            <Link to="/browse?type=found" className="hidden items-center gap-1 text-sm font-semibold text-[#0B2545] hover:text-orange-700 sm:flex">
              View all <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {found.isError && (
              <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Found-item listings are temporarily unavailable.
              </p>
            )}
            {!found.data && !found.isError &&
              [1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100" />)}
            {(found.data?.items ?? []).map((item, i) => (
              <ItemCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* DSW banner */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-[#0B2545] p-8 text-white sm:flex-row sm:items-center sm:justify-between lg:p-10">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> DSW Office — Admin Block, Ground Floor
            </p>
            <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Handovers happen in person, with proof of ownership.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              Open 10:00–16:00 on all working days. Bring your Student ID and any proof that the item is yours —
              a bill, distinctive marks, or a device unlock. The service is completely free.
            </p>
          </div>
          <Link to="/dashboard" className={buttonVariants({ size: "lg" }) + " shrink-0 bg-orange-600 hover:bg-orange-700"}>
            Track my reports
          </Link>
        </div>
      </section>
    </div>
  );
}
