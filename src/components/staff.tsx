"use client";
import { useState } from "react";
import { ArrowDownUp, Download, Eye, Mail, Pencil, Plus, Trash2, X } from "lucide-react";
import { SeatMeter, fmtDate } from "@/components/ui";
import { CourseDetail, CourseImage } from "@/components/course-detail";
import { Avatar, ImageInput, ProfileCard } from "@/components/profile";
import { useStore } from "@/lib/store";
import { AREAS } from "@/lib/seed";
import { courseListCsv, deleteGroup, groupsForYear, lastListSent, pendingCount, professorUnits, saveGroup, sendCourseList, setCourseType, uid } from "@/lib/logic";
import type { Course, OptionGroup, Semester, User, Year } from "@/lib/types";

export function download(filename: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Student profile in a pop-up (used from requests and the student list). */
export function ProfileModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { db } = useStore();
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 sm:p-10" onClick={onClose}>
      <div className="relative w-full max-w-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 hover:bg-white" aria-label="Close">
          <X className="size-5" />
        </button>
        <ProfileCard db={db} user={user} showPrivate />
      </div>
    </div>
  );
}

// ───────────── Courses ─────────────
const blank = (programmeId: string, year: Year, groupId?: string): Course => ({
  id: uid("c"),
  programmeId,
  code: "",
  name: "",
  year,
  semester: "S1",
  area: "TSI",
  ects: 5,
  groupId,
  capacity: 10,
  requiresApproval: false,
  description: "",
  details: { teachingType: "Presential", classHours: 30, classType: "Theory Practice", autonomousHours: 110 },
});

export function Courses({ year }: { year: Year }) {
  const { db, deleteCourse, act } = useStore();
  const [editing, setEditing] = useState<Course | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Course | null>(null);
  const [slot, setSlot] = useState<SlotDraft | null>(null);
  const groups = groupsForYear(db, year);
  const mandatory = db.courses.filter((c) => c.year === year && !c.groupId);

  const row = (c: Course) => {
    const enrolled = db.selections.filter((s) => s.courseId === c.id && s.status === "enrolled");
    return (
      <div key={c.id}>
        <div className="grid cursor-pointer items-center gap-4 p-4 hover:bg-paper/60 md:grid-cols-[56px_2fr_1.4fr_auto]" onClick={() => setOpen(open === c.id ? null : c.id)}>
          <CourseImage course={c} className="hidden size-14 rounded-lg md:grid" />
          <div>
            <p className="text-xs font-semibold text-ink/50">
              {c.code} · {c.semester} · {c.ects} ECTS · {db.professors.find((p) => p.id === c.professorId)?.name ?? <span className="text-brand">no professor</span>}
            </p>
            <p className="font-semibold">
              {c.name}
              {c.requiresApproval && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">Needs acceptance</span>}
            </p>
          </div>
          <SeatMeter taken={enrolled.length} capacity={c.capacity} pending={pendingCount(db, c.id)} />
          <Actions c={c} />
        </div>
        {open === c.id && (
          <div className="bg-paper/60 px-4 pb-4">
            {enrolled.length === 0 ? (
              <p className="text-sm text-ink/50">No students enrolled yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {enrolled.map((s) => {
                  const u = db.users.find((u) => u.id === s.studentId)!;
                  return (
                    <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pl-0.5 pr-2.5 text-xs">
                      <Avatar user={u} size={22} /> {u.name} <span className="text-ink/40">{u.username}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const Actions = ({ c }: { c: Course }) => (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        className="rounded-lg p-2 hover:bg-paper"
        onClick={() =>
          confirm(c.groupId ? `Make ${c.name} a mandatory course? It will leave its option slot.` : `Make ${c.name} an optional course? Students will choose it in an option slot.`) &&
          act((d) => setCourseType(d, c.id, !c.groupId))
        }
        aria-label={c.groupId ? `Make ${c.name} mandatory` : `Make ${c.name} optional`}
        title={c.groupId ? "Make mandatory" : "Make optional"}
      >
        <ArrowDownUp className="size-4" />
      </button>
      {c.groupId && (
        <button
          className="rounded-lg p-2 hover:bg-paper"
          onClick={() => {
            const prof = db.professors.find((p) => p.id === c.professorId);
            const last = lastListSent(db, c.id);
            if (!prof) return act(() => ({ ok: false, error: `${c.name} has no professor yet — set one with Edit.` }));
            if (confirm(`Email the current student list for ${c.name} to ${prof.title} ${prof.name} (${prof.email})?${last ? `\n\nLast sent ${fmtDate(last.sentAt)}.` : ""}`))
              act((d, n, me) => sendCourseList(d, c.id, me!, n));
          }}
          aria-label={`Email student list for ${c.name} to its professor`}
          title={lastListSent(db, c.id) ? `Email list to professor (last sent ${fmtDate(lastListSent(db, c.id)!.sentAt)})` : "Email list to professor"}
        >
          <Mail className={`size-4 ${lastListSent(db, c.id) ? "text-emerald-600" : ""}`} />
        </button>
      )}
      {c.groupId && (
        <button
          className="rounded-lg p-2 hover:bg-paper"
          onClick={() => download(`${slug(c.code + " " + c.name)}-students.csv`, courseListCsv(db, c.id))}
          aria-label={`Download student list for ${c.name}`}
          title="Download student list"
        >
          <Download className="size-4" />
        </button>
      )}
      <button className="rounded-lg p-2 hover:bg-paper" onClick={() => setViewing(c)} aria-label={`Preview ${c.name}`} title="Preview as students see it">
        <Eye className="size-4" />
      </button>
      <button className="rounded-lg p-2 hover:bg-paper" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`} title="Edit">
        <Pencil className="size-4" />
      </button>
      <button
        className="rounded-lg p-2 text-ink/50 hover:bg-paper hover:text-brand"
        onClick={() => confirm(`Delete ${c.name}?`) && deleteCourse(c.id)}
        aria-label={`Delete ${c.name}`}
        title="Delete"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );

  const mandRow = (c: Course) => (
    <div key={c.id} className="flex items-center gap-4 p-4">
      <CourseImage course={c} className="size-12 rounded-lg" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-ink/50">
          {c.code} · {c.area} · {c.ects} ECTS · {db.professors.find((p) => p.id === c.professorId)?.name ?? <span className="text-brand">no professor</span>}
        </p>
        <p className="font-semibold">{c.name}</p>
      </div>
      <Actions c={c} />
    </div>
  );

  // Semester 1, Semester 2 — and "Whole year" only when the plan has annual courses or slots.
  const semesters = (["S1", "S2", "A"] as Semester[]).filter(
    (sem) => sem !== "A" || mandatory.some((c) => c.semester === "A") || groups.some((g) => g.semester === "A"),
  );

  return (
    <div className="space-y-12">
      {semesters.map((sem) => {
        const mand = mandatory.filter((c) => c.semester === sem).sort((a, b) => a.name.localeCompare(b.name));
        const slots = groups.filter((g) => g.semester === sem);
        return (
          <section key={sem}>
            <h3 className="border-b-2 border-ink pb-2 font-display text-xl font-bold">
              Year {year} · {sem === "S1" ? "Semester 1" : sem === "S2" ? "Semester 2" : "Whole year"}
            </h3>

            {/* 1. Mandatory courses */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Mandatory courses ({mand.length})</p>
                <button className="btn-ghost py-1.5 text-xs" onClick={() => setEditing({ ...blank(db.programme.id, year), semester: sem, capacity: 0 })}>
                  <Plus className="size-3.5" /> Add mandatory course
                </button>
              </div>
              <div className="card divide-y divide-line overflow-hidden">
                {mand.length ? mand.map(mandRow) : <p className="p-4 text-sm text-ink/50">No mandatory courses this semester.</p>}
              </div>
            </div>

            {/* 2. Each Opção with its courses */}
            {slots.map((g) => {
              const list = db.courses.filter((c) => c.groupId === g.id).sort((a, b) => a.name.localeCompare(b.name));
              return (
                <div key={g.id} className="mt-6">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-brand px-2.5 py-1 font-display text-sm font-bold text-white">{g.name}</span>
                    <span className="text-sm text-ink/55">{g.ects} ECTS · {list.length} course{list.length === 1 ? "" : "s"}</span>
                    <button className="rounded-lg p-1.5 text-ink/50 hover:bg-paper hover:text-ink" onClick={() => setSlot(g)} aria-label={`Edit ${g.name}`} title="Edit option">
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      className="rounded-lg p-1.5 text-ink/50 hover:bg-paper hover:text-brand"
                      onClick={() => confirm(`Remove ${g.name}?`) && act((d) => deleteGroup(d, g.id))}
                      aria-label={`Remove ${g.name}`}
                      title="Remove option (must be empty)"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <button className="btn-primary ml-auto py-1.5 text-xs" onClick={() => setEditing({ ...blank(db.programme.id, year, g.id), semester: g.semester, ects: g.ects })}>
                      <Plus className="size-3.5" /> Add course to {g.name}
                    </button>
                  </div>
                  <div className="card divide-y divide-line overflow-hidden">
                    {list.length ? list.map(row) : <p className="p-4 text-sm text-ink/50">No courses in {g.name} yet.</p>}
                  </div>
                </div>
              );
            })}

            {/* 3. New Opção in this semester */}
            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 py-4 text-sm font-semibold text-ink/55 hover:border-brand hover:text-brand"
              onClick={() => setSlot({ programmeId: db.programme.id, year, semester: sem, ects: 5 })}
            >
              <Plus className="size-4" /> Add option to Year {year} · {sem === "S1" ? "Semester 1" : sem === "S2" ? "Semester 2" : "Whole year"}
            </button>
          </section>
        );
      })}

      {slot && <SlotEditor slot={slot} onClose={() => setSlot(null)} />}
      {editing && <CourseEditor course={editing} onClose={() => setEditing(null)} />}
      {viewing && <CourseDetail course={viewing} group={db.groups.find((g) => g.id === viewing.groupId)} onClose={() => setViewing(null)} />}
    </div>
  );
}

type SlotDraft = Omit<OptionGroup, "id" | "name"> & { id?: string; name?: string };

/** Create or edit an Opção: its name, semester and ECTS. */
function SlotEditor({ slot, onClose }: { slot: SlotDraft; onClose: () => void }) {
  const { act } = useStore();
  const [x, setX] = useState(slot);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <form
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (act((d) => saveGroup(d, x))) onClose();
        }}
      >
        <h2 className="font-display text-xl font-bold">{slot.id ? `Edit ${slot.name}` : "New option"}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="slot-name">Name</label>
            <input id="slot-name" className="input" value={x.name ?? ""} onChange={(e) => setX({ ...x, name: e.target.value })} placeholder="Leave empty for the next number (Opção N)" />
          </div>
          <div>
            <label className="label" htmlFor="slot-sem">Semester</label>
            <select id="slot-sem" className="input" value={x.semester} onChange={(e) => setX({ ...x, semester: e.target.value as Semester })}>
              <option value="S1">Semester 1</option>
              <option value="S2">Semester 2</option>
              <option value="A">Whole year</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="slot-ects">ECTS to choose</label>
            <input id="slot-ects" className="input" type="number" min={0.5} step={0.5} value={x.ects} onChange={(e) => setX({ ...x, ects: Number(e.target.value) })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary">{slot.id ? "Save" : "Create option"}</button>
        </div>
      </form>
    </div>
  );
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function CourseEditor({ course, onClose }: { course: Course; onClose: () => void }) {
  const { saveCourse, db, school } = useStore();
  const [c, setC] = useState(course);
  const [outcomes, setOutcomes] = useState((course.details.outcomes ?? []).join("\n"));
  const [program, setProgram] = useState((course.details.program ?? []).map((p) => `${p.title}: ${p.text}`).join("\n"));
  const [biblio, setBiblio] = useState((course.details.bibliography ?? []).join("\n"));
  const isNew = !db.courses.some((x) => x.id === course.id);
  const set = <K extends keyof Course>(k: K, v: Course[K]) => setC({ ...c, [k]: v });
  const setD = <K extends keyof Course["details"]>(k: K, v: Course["details"][K]) => setC({ ...c, details: { ...c.details, [k]: v } });
  const groups = groupsForYear(db, c.year);

  const submit = () => {
    const details = {
      ...c.details,
      outcomes: lines(outcomes),
      bibliography: lines(biblio),
      program: lines(program).map((l) => {
        const i = l.indexOf(":");
        return i > 0 ? { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { title: l, text: "" };
      }),
    };
    // One professor per course, unless the DSI team confirms an exception.
    const other = c.professorId && c.professorId !== course.professorId ? professorUnits(school, c.professorId, c) : [];
    const prof = db.professors.find((p) => p.id === c.professorId);
    if (other.length && !confirm(`${prof?.name} already teaches ${other.join(", ")}. Each professor normally teaches one course — assign ${c.name || "this course"} as well?`)) return;
    if (saveCourse({ ...c, details })) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <form
        className="card max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 className="font-display text-xl font-bold">{isNew ? "New course" : `Edit ${course.name}`}</h2>

        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-brand">Course</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-3">
            <label className="label">Name</label>
            <input className="input" value={c.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="label">Code</label>
            <input className="input" value={c.code} onChange={(e) => set("code", e.target.value.toUpperCase())} required />
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input" value={c.year} onChange={(e) => setC({ ...c, year: Number(e.target.value) as Year, groupId: undefined })}>
              <option value={1}>Year 1</option>
              <option value={2}>Year 2</option>
            </select>
          </div>
          <div>
            <label className="label">Semester</label>
            <select className="input" value={c.semester} disabled={!!c.groupId} title={c.groupId ? "Set by its option" : undefined} onChange={(e) => set("semester", e.target.value as Semester)}>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="A">Annual</option>
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={c.groupId ?? ""}
              onChange={(e) => {
                const g = groups.find((x) => x.id === e.target.value);
                setC({ ...c, groupId: g?.id, semester: g ? g.semester : c.semester, capacity: g && !c.capacity ? 10 : c.capacity });
              }}
            >
              <option value="">Mandatory</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.semester === "A" ? "Whole year" : g.semester === "S1" ? "Semester 1" : "Semester 2"} (option)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Area</label>
            <select className="input" value={c.area} onChange={(e) => set("area", e.target.value)}>
              {Object.keys(AREAS).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">ECTS</label>
            <input className="input" type="number" min={1} step={0.5} value={c.ects} onChange={(e) => set("ects", Number(e.target.value))} />
          </div>
          {c.groupId && (
            <div>
              <label className="label">Seats</label>
              <input className="input" type="number" min={1} value={c.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label">Professor (receives the student list)</label>
            <select className="input" value={c.professorId ?? ""} onChange={(e) => set("professorId", e.target.value || undefined)}>
              <option value="">— choose —</option>
              {db.professors
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => {
                  const teaches = professorUnits(school, p.id, c);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.name}
                      {teaches.length ? ` — teaches ${teaches[0]}${teaches.length > 1 ? ` +${teaches.length - 1}` : ""}` : " — free"}
                    </option>
                  );
                })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Accepts seat requests (name)</label>
            <input className="input" value={c.courseDirector ?? ""} onChange={(e) => set("courseDirector", e.target.value || undefined)} />
          </div>
          {c.groupId && (
            <label className="flex items-center gap-3 rounded-xl border border-line p-3 sm:col-span-4">
              <input type="checkbox" className="size-4 accent-brand" checked={c.requiresApproval} onChange={(e) => set("requiresApproval", e.target.checked)} />
              <span className="text-sm">
                <b>Needs course director&apos;s acceptance</b> — students request a seat instead of taking one.
              </span>
            </label>
          )}
          {c.groupId && c.requiresApproval && (
            <div className="sm:col-span-4">
              <label className="label">What should students write in their request?</label>
              <input className="input" value={c.requestPrompt ?? ""} onChange={(e) => set("requestPrompt", e.target.value || undefined)} placeholder="Proposed topic and preferred supervisor" />
            </div>
          )}
          <div className="sm:col-span-4">
            <ImageInput value={c.image} onChange={(image) => set("image", image)} onError={(m) => alert(m)} shape="wide" label="Course image" />
          </div>
          <div className="sm:col-span-4">
            <label className="label">Short description</label>
            <textarea className="input min-h-16" value={c.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-wider text-brand">Course sheet (shown in the course pop-up)</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Teaching type</label>
            <input className="input" value={c.details.teachingType ?? ""} onChange={(e) => setD("teachingType", e.target.value || undefined)} />
          </div>
          <div>
            <label className="label">Language</label>
            <input className="input" value={c.details.language ?? ""} onChange={(e) => setD("language", e.target.value || undefined)} />
          </div>
          <div>
            <label className="label">Class hours</label>
            <input className="input" type="number" min={0} value={c.details.classHours ?? ""} onChange={(e) => setD("classHours", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div>
            <label className="label">Autonomous hours</label>
            <input className="input" type="number" min={0} value={c.details.autonomousHours ?? ""} onChange={(e) => setD("autonomousHours", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          {[
            { k: "objectives" as const, label: "Objectives of education" },
            { k: "teachingMethods" as const, label: "Teaching methods" },
            { k: "assessment" as const, label: "Assessment methods" },
          ].map(({ k, label }) => (
            <div key={k} className="sm:col-span-4">
              <label className="label">{label}</label>
              <textarea className="input min-h-20" value={c.details[k] ?? ""} onChange={(e) => setD(k, e.target.value || undefined)} />
            </div>
          ))}
          <div className="sm:col-span-4">
            <label className="label">Key learning outcomes — one per line</label>
            <textarea className="input min-h-20" value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <label className="label">Program summary — one chapter per line, “Title: text”</label>
            <textarea className="input min-h-24" value={program} onChange={(e) => setProgram(e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <label className="label">Essential bibliography — one per line</label>
            <textarea className="input min-h-20" value={biblio} onChange={(e) => setBiblio(e.target.value)} />
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex justify-end gap-2 border-t border-line bg-white px-6 py-4">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary">{isNew ? "Create course" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}

