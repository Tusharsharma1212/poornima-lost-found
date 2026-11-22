import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <Compass className="h-10 w-10 text-slate-300" aria-hidden />
      <h1 className="mt-4 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        That page does not exist on the Poornima Campus Lost &amp; Found portal.
      </p>
      <Link to="/" className={cn(buttonVariants(), "mt-6 bg-orange-600 hover:bg-orange-700")}>
        Back to home
      </Link>
    </div>
  );
}
