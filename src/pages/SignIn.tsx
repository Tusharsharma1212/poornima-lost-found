import { Link, Navigate } from "react-router-dom";
import { Show, SignIn } from "@clerk/react";
import { GraduationCap, MapPin, ShieldCheck, Handshake } from "lucide-react";

export default function SignInPage() {
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
                The official recovery desk of Poornima University.
              </h2>
              <ul className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300">
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" aria-hidden />
                  Reports are reviewed by the DSW office before they appear on the campus board.
                </li>
                <li className="flex items-start gap-3">
                  <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" aria-hidden />
                  Handovers happen in person with proof of ownership — never online, never for money.
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" aria-hidden />
                  DSW Office, Admin Block (Ground Floor) · Open 10:00–16:00 on working days.
                </li>
              </ul>
            </div>
            <p className="text-xs text-slate-400">A free service for all 30,000+ Poornima students.</p>
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
              <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />
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
