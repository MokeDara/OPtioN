"use client";
import { useRef } from "react";
import { Camera, Cake, GraduationCap, ImagePlus, Link2, Sparkles, Trash2 } from "lucide-react";
import { optionFor, studentTerm } from "@/lib/logic";
import type { DB, User, Year } from "@/lib/types";

// ───────────── images ─────────────

/** Reads an image file and returns a resized JPEG data URL (keeps localStorage small). */
export function resizeImage(file: File, max: number, square = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (square) {
        const side = Math.min(sw, sh);
        sx = (sw - side) / 2;
        sy = (sh - side) / 2;
        sw = sh = side;
      }
      const scale = Math.min(1, max / Math.max(sw, sh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("That image couldn't be read."));
    img.src = url;
  });
}

const AVATAR_TONES = ["bg-rose-200 text-rose-900", "bg-amber-200 text-amber-900", "bg-emerald-200 text-emerald-900", "bg-sky-200 text-sky-900", "bg-violet-200 text-violet-900"];

export function Avatar({ user, size = 40, className = "" }: { user: Pick<User, "name" | "photo">; size?: number; className?: string }) {
  const initials = user.name.replace(/\(.*?\)/g, "").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const tone = AVATAR_TONES[[...user.name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
  return user.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.photo} alt="" width={size} height={size} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size }} />
  ) : (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-display font-bold ${tone} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

/** Photo picker: upload (resized) or paste a link. */
export function ImageInput({
  value,
  onChange,
  onError,
  shape = "round",
  label = "Photo",
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  onError: (msg: string) => void;
  shape?: "round" | "wide";
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={`group relative grid shrink-0 place-items-center overflow-hidden border-2 border-dashed border-line bg-paper text-ink/40 hover:border-brand hover:text-brand ${
          shape === "round" ? "size-24 rounded-full" : "h-24 w-40 rounded-xl"
        }`}
        aria-label={`Upload ${label.toLowerCase()}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        ) : shape === "round" ? (
          <Camera className="size-7" />
        ) : (
          <ImagePlus className="size-7" />
        )}
        {value && <span className="absolute inset-0 grid place-items-center bg-ink/50 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">Change</span>}
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-semibold">{label}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => fileRef.current?.click()}>
            Upload
          </button>
          <button
            type="button"
            className="btn-ghost py-1.5 text-xs"
            onClick={() => {
              const url = prompt("Paste an image link (https://…)");
              if (url && /^https?:\/\//.test(url)) onChange(url);
            }}
          >
            <Link2 className="size-3.5" /> Link
          </button>
          {value && (
            <button type="button" className="btn-ghost py-1.5 text-xs text-brand" onClick={() => onChange(undefined)}>
              <Trash2 className="size-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            onChange(await resizeImage(f, shape === "round" ? 320 : 1000, shape === "round"));
          } catch (err) {
            onError((err as Error).message);
          }
        }}
      />
    </div>
  );
}

// ───────────── profile form (sign-up + edit) ─────────────

export function ProfileFields({ u, set, onError }: { u: User; set: (patch: Partial<User>) => void; onError: (m: string) => void }) {
  const student = u.role === "student";
  return (
    <div className="space-y-5">
      <ImageInput value={u.photo} onChange={(photo) => set({ photo })} onError={onError} label="Profile picture" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-name">Full name</label>
          <input id="pf-name" className="input" value={u.name} onChange={(e) => set({ name: e.target.value })} placeholder="First and last name" required />
        </div>
        {student ? (
          <div>
            <label className="label" htmlFor="pf-year">Level</label>
            <select id="pf-year" className="input" value={u.year ?? ""} onChange={(e) => set({ year: Number(e.target.value) as Year })} required>
              <option value="" disabled>Choose…</option>
              <option value={1}>1st year</option>
              <option value={2}>2nd year</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="pf-title">Title / role</label>
            <input id="pf-title" className="input" value={u.title ?? ""} onChange={(e) => set({ title: e.target.value || undefined })} placeholder="Associate Professor" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="pf-dob">Date of birth <span className="normal-case text-ink/35">(optional)</span></label>
          <input id="pf-dob" type="date" className="input" value={u.dob ?? ""} onChange={(e) => set({ dob: e.target.value || undefined })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-bio">Short bio</label>
          <input id="pf-bio" className="input" maxLength={120} value={u.bio ?? ""} onChange={(e) => set({ bio: e.target.value || undefined })} placeholder="One line about you" />
        </div>
        {student && (
          <>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="pf-asp">What do you want to be in the future?</label>
              <input id="pf-asp" className="input" value={u.aspiration ?? ""} onChange={(e) => set({ aspiration: e.target.value || undefined })} placeholder="e.g. Data & BI consultant" />
            </div>
            <div className="sm:col-span-2 grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-[2fr_2fr_1fr]">
              <p className="text-xs font-bold uppercase tracking-wider text-brand sm:col-span-3">Bachelor&apos;s degree</p>
              <div>
                <label className="label" htmlFor="pf-deg">Degree</label>
                <input id="pf-deg" className="input" value={u.bachelor?.degree ?? ""} onChange={(e) => set({ bachelor: { ...u.bachelor, degree: e.target.value } })} placeholder="Computer Science" required />
              </div>
              <div>
                <label className="label" htmlFor="pf-inst">University</label>
                <input id="pf-inst" className="input" value={u.bachelor?.institution ?? ""} onChange={(e) => set({ bachelor: { degree: u.bachelor?.degree ?? "", ...u.bachelor, institution: e.target.value || undefined } })} />
              </div>
              <div>
                <label className="label" htmlFor="pf-grad">Graduated</label>
                <input id="pf-grad" className="input" inputMode="numeric" maxLength={4} value={u.bachelor?.graduated ?? ""} onChange={(e) => set({ bachelor: { degree: u.bachelor?.degree ?? "", ...u.bachelor, graduated: e.target.value || undefined } })} placeholder="2024" />
              </div>
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-about">About yourself</label>
          <textarea id="pf-about" className="input min-h-28" value={u.about ?? ""} onChange={(e) => set({ about: e.target.value || undefined })} placeholder={student ? "Interests, work experience, what you hope to get from the master's…" : "Research interests, office hours, how students can reach you…"} />
        </div>
      </div>
    </div>
  );
}

// ───────────── profile card (read-only) ─────────────

const age = (dob: string) => {
  const d = new Date(dob);
  const now = new Date();
  return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};

export function ProfileCard({ db, user, showPrivate = false }: { db: DB; user: User; showPrivate?: boolean }) {
  const student = user.role === "student";
  const groups = db.groups.filter((g) => student && g.year <= (user.year ?? 0)).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="card overflow-hidden">
      <div className="h-24 bg-[linear-gradient(120deg,#a6192e_0%,#d9475a_55%,#f2a65a_100%)]" />
      <div className="px-6 pb-6">
        <div className="-mt-12 flex flex-wrap items-end gap-4">
          <Avatar user={user} size={96} className="ring-4 ring-white" />
          <div className="translate-y-3">
            <h2 className="font-display text-2xl font-bold leading-tight">{user.name}</h2>
            <p className="text-sm text-ink/60">
              {student ? `${user.username} · ${db.programme.short}` : user.title ?? "Course director"}
            </p>
            {student && (
              <span className="mt-1.5 inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand" title="Follows the academic calendar — updates on its own">
                {studentTerm(user, new Date()).label}
              </span>
            )}
          </div>
        </div>
        {user.bio && <p className="mt-6 text-lg">{user.bio}</p>}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {student && user.aspiration && (
            <div className="flex gap-3 rounded-xl bg-paper p-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Wants to become</p>
                <p className="font-medium">{user.aspiration}</p>
              </div>
            </div>
          )}
          {student && user.bachelor?.degree && (
            <div className="flex gap-3 rounded-xl bg-paper p-3">
              <GraduationCap className="mt-0.5 size-5 shrink-0 text-brand" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Bachelor&apos;s</p>
                <p className="font-medium">{user.bachelor.degree}</p>
                <p className="text-xs text-ink/55">{[user.bachelor.institution, user.bachelor.graduated].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          )}
          {showPrivate && user.dob && (
            <div className="flex gap-3 rounded-xl bg-paper p-3">
              <Cake className="mt-0.5 size-5 shrink-0 text-brand" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Date of birth</p>
                <p className="font-medium">
                  {new Date(user.dob).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {age(user.dob)}
                </p>
              </div>
            </div>
          )}
        </div>

        {user.about && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">About</p>
            <p className="mt-1 whitespace-pre-line text-ink/80">{user.about}</p>
          </div>
        )}

        {groups.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Options</p>
            <div className="mt-2 divide-y divide-line rounded-xl border border-line">
              {groups.map((g) => {
                const o = optionFor(db, user, g.id);
                return (
                  <div key={g.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="w-20 shrink-0 font-semibold">{g.name}</span>
                    <span className="flex-1 truncate">{o ? o.course.name : <span className="text-ink/35">Not chosen yet</span>}</span>
                    {o && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          o.status === "pending" ? "bg-amber-100 text-amber-800" : o.status === "completed" ? "bg-ink/10 text-ink/60" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {o.status === "completed" ? "Completed" : o.status === "pending" ? "Pending" : "Enrolled"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <p className="mt-5 text-xs text-ink/40">{user.email}</p>
      </div>
    </div>
  );
}
