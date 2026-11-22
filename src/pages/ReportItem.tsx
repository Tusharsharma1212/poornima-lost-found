import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost, apiUpload } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, LOCATIONS } from "@/lib/constants";
import type { Profile, UploadOut } from "@/lib/types";

const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;

interface Pending {
  name: string;
  url: string;
  file: File;
}

export default function ReportItem() {
  const { type: typeParam } = useParams();
  const type = typeParam === "found" ? "found" : "lost";
  const isLost = type === "lost";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<Profile>("/auth/me"),
  });

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Pending[] = [];
    for (const f of Array.from(files)) {
      if (pending.length + next.length >= MAX_PHOTOS) {
        toast.error(`Up to ${MAX_PHOTOS} photos are allowed`);
        break;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        toast.error(`${f.name}: only JPEG, PNG or WebP images are allowed`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is larger than 5 MB`);
        continue;
      }
      next.push({ name: f.name, url: URL.createObjectURL(f), file: f });
    }
    setPending([...pending, ...next]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const removePhoto = (name: string) => setPending((p) => p.filter((x) => x.name !== name));

  const submit = useMutation({
    mutationFn: async () => {
      if (title.trim().length < 3) throw new Error("Give the item a clear name (at least 3 characters)");
      if (!category) throw new Error("Choose a category");
      if (!location) throw new Error("Choose the campus location");
      if (!incidentDate) throw new Error("Pick the date");
      if (description.trim().length < 10) throw new Error("Describe the item in at least 10 characters");
      if (phone.trim().length < 5) throw new Error("Add a contact phone number");

      // Upload photos first, then submit the report with their URLs.
      const urls: string[] = [];
      for (const p of pending) {
        const fd = new FormData();
        fd.append("file", p.file);
        const res = await apiUpload<UploadOut>("/uploads", fd);
        urls.push(res.url);
      }

      return apiPost("/items", {
        type,
        title: title.trim(),
        category,
        description: description.trim(),
        location,
        incident_date: incidentDate,
        photos: urls,
        contact_phone: phone.trim(),
        contact_email: email.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(
        isLost
          ? "Lost report submitted — DSW will review it shortly"
          : "Found report submitted — thank you! DSW will review it shortly",
      );
      queryClient.invalidateQueries({ queryKey: ["mine-items"] });
      navigate("/dashboard");
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        const detail = (err.body as { detail?: string } | null)?.detail;
        toast.error(typeof detail === "string" ? detail : `Submission failed (${err.status})`);
      } else {
        toast.error(err instanceof Error ? err.message : "Submission failed");
      }
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {isLost ? "Report a Lost Item" : "Report a Found Item"}
        </h1>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(["lost", "found"] as const).map((t) => (
            <Link
              key={t}
              to={`/report/${t}`}
              replace
              data-testid={`report-toggle-${t}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-all",
                type === t ? "bg-white text-[#0B2545] shadow-xs" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {t === "lost" ? "Lost" : "Found"}
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {isLost
          ? "Describe what you lost and where you last saw it. The DSW office reviews every report before it appears on the board."
          : "Thank you for helping! Describe what you found. DSW will keep it safe and match it with the owner — your contact details are never shown publicly."}
      </p>

      <form
        className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="item-title">Item name *</Label>
            <Input
              id="item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isLost ? "e.g. Dell Inspiron laptop, black" : "e.g. Blue college backpack"}
              maxLength={120}
              required
              data-testid="report-title-input"
            />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={category} onValueChange={(value: string) => setCategory(value)}>
              <SelectTrigger data-testid="report-category-select" aria-label="Category">
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isLost ? "Where did you lose it? *" : "Where did you find it? *"}</Label>
            <Select value={location} onValueChange={(value: string) => setLocation(value)}>
              <SelectTrigger data-testid="report-location-select" aria-label="Location">
                <SelectValue placeholder="Choose campus location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="item-date">{isLost ? "Date lost *" : "Date found *"}</Label>
            <Input
              id="item-date"
              type="date"
              value={incidentDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setIncidentDate(e.target.value)}
              required
              data-testid="report-date-input"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="item-description">
              Description * <span className="font-normal text-slate-400">(colour, brand, distinctive marks — it helps DSW verify the real owner)</span>
            </Label>
            <Textarea
              id="item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              required
              data-testid="report-description-textarea"
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Photos <span className="font-normal text-slate-400">(up to {MAX_PHOTOS}, JPEG/PNG/WebP, max 5 MB each)</span></Label>
            <label
              className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-orange-400 hover:bg-orange-50/50"
              data-testid="report-photo-dropzone"
            >
              <ImagePlus className="h-6 w-6 text-slate-400" aria-hidden />
              <span className="text-sm font-medium text-slate-600">Click to add photos</span>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
                data-testid="report-photo-input"
              />
            </label>
            {pending.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {pending.map((p) => (
                  <div key={p.name} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                    <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.name)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-white" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="item-phone">Contact phone *</Label>
            <Input
              id="item-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={profile?.phone || "+91 …"}
              maxLength={20}
              required
              data-testid="report-phone-input"
            />
          </div>
          <div>
            <Label htmlFor="item-email">Contact email</Label>
            <Input
              id="item-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={profile?.email || "you@poornima.ac.in"}
              data-testid="report-email-input"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p className="text-xs leading-relaxed text-slate-400">
            Never share OTPs or pay anyone for a return — handovers happen only at the DSW Office, free of cost.
          </p>
          <button
            type="submit"
            disabled={submit.isPending}
            data-testid={isLost ? "report-lost-submit-button" : "report-found-submit-button"}
            className={cn(buttonVariants({ size: "lg" }), "shrink-0 bg-orange-600 hover:bg-orange-700 disabled:opacity-60")}
          >
            {submit.isPending ? "Submitting…" : `Submit ${isLost ? "lost" : "found"} report`}
          </button>
        </div>
      </form>
    </div>
  );
}
