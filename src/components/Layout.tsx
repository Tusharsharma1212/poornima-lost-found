import { Link, Outlet, useLocation } from "react-router-dom";
import { UserButton, useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, LayoutDashboard, Menu, Plus, Search, ShieldCheck, UserRound } from "lucide-react";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import NotificationCenter from "@/components/NotificationCenter";
import type { Profile } from "@/lib/types";

const NAV_LINKS = [
  { to: "/browse", label: "Browse Items" },
  { to: "/dashboard", label: "My Reports" },
  { to: "/profile", label: "My Profile" },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5" data-testid="navbar-brand-link">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B2545] shadow-xs">
        <GraduationCap className="h-5 w-5 text-orange-500" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block font-heading text-base font-extrabold tracking-tight text-slate-900">Poornima Campus</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">Lost &amp; Found</span>
      </span>
    </Link>
  );
}

function NavActions({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-1">
      {NAV_LINKS.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#0B2545]"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { isSignedIn } = useAuth();
  const location = useLocation();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<Profile>("/auth/me"),
    enabled: isSignedIn === true,
    retry: false,
  });

  return (
    <div className="flex min-h-svh flex-col bg-[#F8FAFC]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-xs backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Brand />
            <div className="hidden lg:block">
              <NavActions />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/report/lost"
              data-testid="navbar-report-lost-button"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden border-slate-300 sm:inline-flex")}
            >
              <Plus className="h-4 w-4 text-rose-600" aria-hidden /> Report Lost
            </Link>
            <Link
              to="/report/found"
              data-testid="navbar-report-found-button"
              className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
            >
              <Plus className="h-4 w-4" aria-hidden /> Report Found
            </Link>
            {isSignedIn && <NotificationCenter />}
            {isSignedIn && (
              <Link
                to="/profile"
                data-testid="navbar-profile-link"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden sm:inline-flex")}
                aria-label="My profile"
              >
                <UserRound className="h-5 w-5" aria-hidden />
              </Link>
            )}
            {isSignedIn && <UserButton />}
            {profile?.role === "dsw" && (
              <Link
                to="/dsw"
                data-testid="navbar-admin-dashboard-link"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden text-[#0B2545] md:inline-flex",
                  location.pathname === "/dsw" && "bg-slate-100",
                )}
              >
                <ShieldCheck className="h-4 w-4 text-orange-600" aria-hidden /> DSW Dashboard
              </Link>
            )}
            {!isSignedIn && (
              <Link
                to="/sign-in"
                data-testid="navbar-login-button"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-[#0B2545]")}
              >
                Sign in
              </Link>
            )}

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger
                render={
                  <button
                    aria-label="Open menu"
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}
                  />
                }
              >
                <Menu className="h-5 w-5" aria-hidden />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="mt-2 space-y-4">
                  <Brand />
                  <NavActions />
                  <div className="space-y-2 pt-2">
                    <Link to="/report/lost" className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start")}>
                      <Plus className="h-4 w-4 text-rose-600" aria-hidden /> Report Lost Item
                    </Link>
                    <Link to="/report/found" className={cn(buttonVariants(), "w-full justify-start")}>
                      <Plus className="h-4 w-4" aria-hidden /> Report Found Item
                    </Link>
                    {profile?.role === "dsw" && (
                      <Link to="/dsw" className={cn(buttonVariants({ variant: "secondary" }), "w-full justify-start")}>
                        <ShieldCheck className="h-4 w-4 text-orange-600" aria-hidden /> DSW Dashboard
                      </Link>
                    )}
                    <Link to="/browse" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start")}>
                      <Search className="h-4 w-4" aria-hidden /> Browse Items
                    </Link>
                    <Link to="/dashboard" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start")}>
                      <LayoutDashboard className="h-4 w-4" aria-hidden /> My Reports
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B2545]">
                <GraduationCap className="h-4 w-4 text-orange-500" aria-hidden />
              </span>
              <p className="text-sm font-bold text-slate-900">Poornima Campus Lost &amp; Found</p>
            </div>
            <p className="text-sm text-slate-500">
              DSW Office — Admin Block, Ground Floor · Open 10:00–16:00 on working days
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            A free service by the Dean of Student Welfare office, Poornima University, Jaipur — for every student, with no fees, ever.
          </p>
        </div>
      </footer>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
