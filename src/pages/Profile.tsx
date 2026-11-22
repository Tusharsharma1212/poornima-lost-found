import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, UserRound } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<Profile>("/auth/me"),
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [regNo, setRegNo] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setDepartment(profile.department ?? "");
      setRegNo(profile.reg_no ?? "");
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      apiPatch<Profile>("/auth/me", {
        name: name.trim(),
        phone: phone.trim(),
        department: department.trim(),
        reg_no: regNo.trim(),
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Could not update your profile — please try again"),
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">My Profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your contact details prefill every report you submit. They are never shown on the public board.
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B2545]">
            <UserRound className="h-6 w-6 text-orange-400" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{profile?.email ?? "Signed-in account"}</p>
            {profile?.role === "dsw" ? (
              <p className="flex items-center gap-1 text-xs font-bold text-[#0B2545]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> DSW Staff
              </p>
            ) : (
              <p className="text-xs font-semibold text-slate-500">Student</p>
            )}
          </div>
        </div>

        <form
          className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <Label htmlFor="profile-name">Full name *</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} data-testid="profile-name-input" />
          </div>
          <div>
            <Label htmlFor="profile-phone">Phone</Label>
            <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" maxLength={20} data-testid="profile-phone-input" />
          </div>
          <div>
            <Label htmlFor="profile-regno">Enrollment / Registration no.</Label>
            <Input id="profile-regno" value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="PU2023CS0142" maxLength={40} data-testid="profile-regno-input" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="profile-dept">Department &amp; year</Label>
            <Input id="profile-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="B.Tech CSE (Year 2)" maxLength={100} data-testid="profile-department-input" />
          </div>
          <div className="sm:col-span-2 flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={save.isPending}
              data-testid="profile-save-button"
              className={cn(buttonVariants(), "bg-orange-600 hover:bg-orange-700 disabled:opacity-60")}
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
