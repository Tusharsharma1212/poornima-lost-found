import { Link, Navigate } from "react-router-dom";
import { Show, SignUp } from "@clerk/react";
import { BadgeCheck, GraduationCap, ShieldCheck } from "lucide-react";

export default function SignUpPage() {
  return (
    <>
      <Show when="signed-out">
        <div className="flex min-h-svh bg-[#F8FAFC]">
          {/* Branding panel */}
          <aside className="hidden flex-col justify-between bg-[#0B2545] p-10 text-white lg:flex lg:w-1/2">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <GraduationCap className="h-6 w-6 text-orange-400" aria-hidden />
              </span>
              <span className="font-heading text-lg font-extrabold">Poornima Campus Lost &amp; Found</span>
            </Link>
            <div>
              <h2 className="font-heading text-3xl font-extrabold leading-tight">
                Join the campus recovery network.
              </h2>
              <ul className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300">
                <li className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" aria-hidden />
                  Track every report you submit — Pending, Approved, Matched or Returned.
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" aria-hidden />
                  Your contact details stay private. Only the DSW office can see them.
                </li>
              </ul>
            </div>
            <p className="text-xs text-slate-400">Free forever — run by the Dean of Student Welfare office, Poornima Campus.</p>
          </aside>

          {/* Auth card */}
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md">
              <Link to="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B2545]">
                  <GraduationCap className="h-5 w-5 text-orange-500" aria-hidden />
                </span>
                <span className="font-heading text-base font-extrabold text-slate-900">Poornima Campus Lost &amp; Found</span>
              </Link>
              <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
            </div>
          </div>
        </div>
      </Show>
      <Show when="signed-in">
        <Navigate to="/" replace />
      </Show>
    </>
  );
}
