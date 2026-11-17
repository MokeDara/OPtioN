"use client";
import { useState } from "react";
import { Download, Mail, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { fmtDate } from "@/components/ui";
import { CourseImage } from "@/components/course-detail";
import { Avatar, ImageInput } from "@/components/profile";
import { download, slug } from "@/components/staff";
import { useStore } from "@/lib/store";
import { courseListCsv, deleteProfessor, lastListSent, professorsTeaching, saveProfessor, seatsTaken, sendCourseList, uid } from "@/lib/logic";
import type { Professor } from "@/lib/types";

/** The department's professors. The portal can edit; course directors can view and send lists. */
/** "Course director · MEGSI" when a staff account teaches as this professor. */
function useStaffRole(professorId: string) {
  const { school } = useStore();
  const u = school.users.find((x) => x.professorId === professorId && x.active !== false);
  if (!u) return null;
  const prog = school.programmes.find((p) => p.id === u.programmeId)?.short;
  return `${u.role === "director" ? "Course director" : u.role === "professor" ? "Professor" : "Assistant"}${prog ? ` · ${prog}` : ""}`;
}

function StaffBadge({ professorId }: { professorId: string }) {
  const label = useStaffRole(professorId);
  return label ? <span className="mt-1 inline-block rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">{label}</span> : null;
}

/** canEdit: DSI portal (whole department). onlyProgramme: a director's faculty roster — professors teaching in their Master's. */
export function Professors({ canEdit, onlyProgramme = false }: { canEdit: boolean; onlyProgramme?: boolean }) {
  const { db } = useStore();
  const pool = onlyProgramme ? professorsTeaching(db) : db.professors;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Professor | null>(null);
  const list = pool
    .filter((p) => (p.name + p.email + (p.area ?? "")).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const viewing = db.professors.find((p) => p.id === open);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
          <input className="input w-64 pl-9" placeholder="Name, email or area" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-sm text-ink/50">
          {pool.length} {onlyProgramme ? `professors teaching in ${db.programme.short}` : "professors in the department"}
        </span>
        {canEdit && (
          <button className="btn-primary ml-auto" onClick={() => setEditing({ id: uid("p"), name: "", title: "Prof.", email: "" })}>
            <Plus className="size-4" /> Add professor
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => {
          const courses = db.courses.filter((c) => c.professorId === p.id);
          return (
            <button key={p.id} onClick={() => setOpen(p.id)} className="card flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-3">
                <Avatar user={p} size={56} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.title} {p.name}</p>
                  <p className="truncate text-sm text-ink/55">{p.area ?? "—"}</p>
                  <StaffBadge professorId={p.id} />
                </div>
              </div>
              <p className="mt-3 truncate text-sm text-brand">{p.email}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink/45">
                {courses.length} course{courses.length === 1 ? "" : "s"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {courses.slice(0, 3).map((c) => (
                  <span key={c.id} className="max-w-full truncate rounded-full bg-paper px-2 py-0.5 text-xs">{c.name}</span>
                ))}
                {courses.length > 3 && <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink/50">+{courses.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {viewing && <ProfessorSheet p={viewing} canEdit={canEdit} onEdit={() => setEditing(viewing)} onClose={() => setOpen(null)} />}
      {editing && <ProfessorEditor p={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProfessorSheet({ p, canEdit, onEdit, onClose }: { p: Professor; canEdit: boolean; onEdit: () => void; onClose: () => void }) {
  const { db, act } = useStore();
  const courses = db.courses.filter((c) => c.professorId === p.id).sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 sm:p-10" onClick={onClose}>
      <div className="card relative w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="h-20 bg-[linear-gradient(120deg,#a6192e_0%,#d9475a_55%,#f2a65a_100%)]" />
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 hover:bg-white" aria-label="Close">
          <X className="size-5" />
        </button>
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <Avatar user={p} size={84} className="ring-4 ring-white" />
            <div className="translate-y-2">
              <h2 className="font-display text-2xl font-bold">{p.title} {p.name}</h2>
              <p className="text-sm text-ink/60">{[p.area, p.office].filter(Boolean).join(" · ")}</p>
              <StaffBadge professorId={p.id} />
            </div>
            {canEdit && (
              <button className="btn-ghost ml-auto" onClick={onEdit}>
                <Pencil className="size-4" /> Edit
              </button>
            )}
          </div>
          <a href={`mailto:${p.email}`} className="mt-5 inline-block text-sm font-semibold text-brand hover:underline">{p.email}</a>
          {p.bio && <p className="mt-2 text-ink/75">{p.bio}</p>}

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink/50">Courses</p>
          <div className="mt-2 divide-y divide-line rounded-xl border border-line">
            {courses.length === 0 && <p className="p-4 text-sm text-ink/50">Not teaching any course yet.</p>}
            {courses.map((c) => {
              const last = lastListSent(db, c.id);
              const g = db.groups.find((g) => g.id === c.groupId);
              return (
                <div key={c.id} className="flex items-center gap-3 p-3">
                  <CourseImage course={c} className="size-11 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-ink/50">
                      Year {c.year} · {g ? g.name : "Mandatory"}
                      {g && ` · ${seatsTaken(db, c.id)}/${c.capacity} enrolled`}
                      {last && <span className="text-emerald-700"> · list sent {fmtDate(last.sentAt)}</span>}
                    </p>
                  </div>
                  {g && (
                    <>
                      <button
                        className="rounded-lg p-2 hover:bg-paper"
                        title="Download student list"
                        aria-label={`Download student list for ${c.name}`}
                        onClick={() => download(`${slug(c.code + " " + c.name)}-students.csv`, courseListCsv(db, c.id))}
                      >
                        <Download className="size-4" />
                      </button>
                      <button
                        className="btn-ghost py-1.5 text-xs"
                        onClick={() => confirm(`Email the ${c.name} student list to ${p.email}?`) && act((d, n, me) => sendCourseList(d, c.id, me!, n))}
                      >
                        <Mail className="size-3.5" /> Send list
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfessorEditor({ p, onClose }: { p: Professor; onClose: () => void }) {
  const { db, act } = useStore();
  const [x, setX] = useState(p);
  const isNew = !db.professors.some((y) => y.id === p.id);
  const set = (patch: Partial<Professor>) => setX({ ...x, ...patch });
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/45 p-4" onClick={onClose}>
      <form
        className="card max-h-[92vh] w-full max-w-xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (act((d) => saveProfessor(d, x))) onClose();
        }}
      >
        <h2 className="font-display text-xl font-bold">{isNew ? "Add professor" : `Edit ${p.name}`}</h2>
        <div className="mt-5">
          <ImageInput value={x.photo} onChange={(photo) => set({ photo })} onError={(m) => alert(m)} label="Photo" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={x.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Full name</label>
            <input className="input" value={x.name} onChange={(e) => set({ name: e.target.value })} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email (course lists go here)</label>
            <input className="input" type="email" value={x.email} onChange={(e) => set({ email: e.target.value })} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Area</label>
            <input className="input" value={x.area ?? ""} onChange={(e) => set({ area: e.target.value || undefined })} />
          </div>
          <div className="sm:col-span-4">
            <label className="label">Office</label>
            <input className="input" value={x.office ?? ""} onChange={(e) => set({ office: e.target.value || undefined })} />
          </div>
          <div className="sm:col-span-4">
            <label className="label">Short bio</label>
            <textarea className="input min-h-20" value={x.bio ?? ""} onChange={(e) => set({ bio: e.target.value || undefined })} />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              className="btn-ghost text-brand"
              onClick={() => confirm(`Remove ${p.name} from the department?`) && act((d) => deleteProfessor(d, p.id)) && onClose()}
            >
              <Trash2 className="size-4" /> Remove
            </button>
          )}
          <button type="button" className="btn-ghost ml-auto" onClick={onClose}>Cancel</button>
          <button className="btn-primary">{isNew ? "Add professor" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
