"use client";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, BookOpen, Building2, Copy, FileSpreadsheet, Info, KeyRound, LifeBuoy, Mail, Pencil, Plus, Search, Send, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { AppHeader, Empty, fmtDate } from "@/components/ui";
import { SignInForm } from "@/components/sign-in";
import { Avatar } from "@/components/profile";
import { Courses, ProfileModal, download } from "@/components/staff";
import { Requests, Rounds } from "@/components/programme-admin";
import { Professors } from "@/components/professors";
import { STATUS, StatusChip, TOPICS, Thread } from "@/components/support";
import { ProgrammeInfo } from "@/components/programme-info";
import { useStore } from "@/lib/store";
import { approveAccess, declineAccess } from "@/lib/logic";
import { activeSelections, assignStaff, scope, createProgramme, generalListCsv, setStaffRole, setStaffTitle, createStaff, directorOf, linkStaffProfessor, replyTicket, resetPassword, setTicketStatus, setUserActive, updateProgramme, type NewProgramme } from "@/lib/logic";
import { STAFF_ROLES, type Programme, type ProgrammeContact, type TicketStatus, type User, type Year } from "@/lib/types";

type Tab = "programmes" | "access" | "students" | "courses" | "rounds" | "professors" | "support" | "mail";
type Creds = { name: string; email: string; username: string; password: string; link: string };
type StaffRole = "director" | "assistant" | "professor" | "admin";
const ROLE: Record<string, { label: string; cls: string }> = {
  director: { label: "Course director", cls: "bg-brand/10 text-brand" },
  assistant: { label: "Assistant", cls: "bg-sky-100 text-sky-800" },
  professor: { label: "Professor", cls: "bg-emerald-100 text-emerald-800" },
  admin: { label: "DSI team", cls: "bg-ink text-white" },
};

export default function PortalPage() {
  const { school, user } = useStore();
  const [tab, setTab] = useState<Tab>("programmes");
  const [invite, setInvite] = useState<{ role: StaffRole; programmeId?: string } | null>(null);
  const [creds, setCreds] = useState<Creds | null>(null);

  if (!user || user.role !== "admin")
    return (
      <SignInForm
        roles={["admin"]}
        badge="DSI"
        title="DSI portal"
        subtitle="For the DSI management and technical team: programmes, staff access, courses, professors and support requests."
        idLabel="Username or email"
        idPlaceholder="admin"
        onSignedIn={() => undefined}
        showHome={false}
      />
    );

  const openTickets = school.tickets.filter((t) => t.status !== "resolved").length;
  const pendingAccess = (school.accessRequests ?? []).filter((r) => r.status === "pending").length;
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "programmes", label: "Master's degrees" },
    { id: "access", label: "Staff access", badge: pendingAccess },
    { id: "students", label: "All students" },
    { id: "courses", label: "Courses" },
    { id: "rounds", label: "Rounds & requests", badge: school.selections.filter((x) => x.status === "pending").length },
    { id: "professors", label: "Professors" },
    { id: "support", label: "Support", badge: openTickets },
    { id: "mail", label: "Sent mail" },
  ];

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Management portal</p>
            <h1 className="font-display text-3xl font-bold">{school.school}</h1>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {[
            { k: "Programmes", v: school.programmes.length },
            { k: "Students", v: school.users.filter((u) => u.role === "student").length },
            { k: "Staff", v: school.users.filter((u) => STAFF_ROLES.includes(u.role) && u.active !== false).length },
            { k: "Professors", v: school.professors.length },
            { k: "Open support", v: openTickets },
          ].map((s) => (
            <div key={s.k} className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{s.k}</p>
              <p className="mt-1 font-display text-3xl font-bold">{s.v}</p>
            </div>
          ))}
        </div>

        <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === t.id ? "border-brand text-ink" : "border-transparent text-ink/50 hover:text-ink"}`}
            >
              {t.label}
              {!!t.badge && <span className="rounded-full bg-amber-400 px-1.5 text-xs text-ink">{t.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "programmes" && <Programmes onInvite={setInvite} onCourses={() => setTab("courses")} />}
          {tab === "access" && <StaffAccess onInvite={setInvite} onCreds={setCreds} />}
          {tab === "students" && <AllStudents />}
          {tab === "courses" && <CoursesTab />}
          {tab === "rounds" && <RoundsAndRequests />}
          {tab === "professors" && <Professors canEdit />}
          {tab === "support" && <Support />}
          {tab === "mail" && <SentMail />}
        </div>
      </main>

      {invite && (
        <AddStaff
          initial={invite}
          onClose={() => setInvite(null)}
          onCreated={(c) => {
            setInvite(null);
            setCreds(c);
          }}
        />
      )}
      {creds && <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />}
    </>
  );
}

// ───────────── Programmes ─────────────
function Programmes({ onInvite, onCourses }: { onInvite: (i: { role: StaffRole; programmeId?: string }) => void; onCourses: () => void }) {
  const { school, act, setViewProgramme } = useStore();
  const [editing, setEditing] = useState<Programme | "new" | null>(null);
  const [info, setInfo] = useState<Programme | null>(null);
  const departments = [...new Set(school.programmes.map((p) => p.department))].sort();

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span />
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> New Master&apos;s degree
        </button>
      </div>

      {departments.map((dep) => (
        <section key={dep} className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <Building2 className="size-5 text-brand" /> {dep}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {school.programmes
              .filter((p) => p.department === dep)
              .map((p) => {
                const staff = school.users.filter((u) => STAFF_ROLES.includes(u.role) && u.programmeId === p.id);
                const nStudents = school.users.filter((u) => u.role === "student" && u.programmeId === p.id).length;
                const courses = school.courses.filter((c) => c.programmeId === p.id);
                const hasDirector = !!directorOf(school, p.id);
                const official = p.contacts?.find((c) => c.role === "Course Director");
                return (
                  <div key={p.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-brand">{p.short}</p>
                        <h3 className="font-display text-lg font-bold leading-tight">{p.name}</h3>
                        <p className="text-sm text-ink/55">
                          {p.degree} · {p.ects} ECTS · {p.regime}
                          {p.academicYear && ` · ${p.academicYear}`}
                        </p>
                        {official && <p className="mt-1 text-xs text-ink/50">Official course director: {official.name}</p>}
                      </div>
                      <div className="flex">
                        <button className="rounded-lg p-2 hover:bg-paper" onClick={() => setInfo(p)} aria-label={`Official information for ${p.short}`} title="Official information">
                          <Info className="size-4" />
                        </button>
                        <button className="rounded-lg p-2 hover:bg-paper" onClick={() => setEditing(p)} aria-label={`Edit ${p.short}`} title="Edit">
                          <Pencil className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-paper py-2">
                        <p className="font-display text-xl font-bold">{nStudents}</p>
                        <p className="text-[11px] text-ink/50">students</p>
                      </div>
                      <div className="rounded-xl bg-paper py-2">
                        <p className="font-display text-xl font-bold">{courses.filter((c) => c.groupId).length}</p>
                        <p className="text-[11px] text-ink/50">optional</p>
                      </div>
                      <div className="rounded-xl bg-paper py-2">
                        <p className="font-display text-xl font-bold">{courses.filter((c) => !c.groupId).length}</p>
                        <p className="text-[11px] text-ink/50">mandatory</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink/45">Programme team</p>
                    <div className="mt-2 space-y-2">
                      {!hasDirector && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">No course director account yet.</p>}
                      {staff.map((s) => (
                        <div key={s.id} className={`flex items-center gap-2 text-sm ${s.active === false ? "opacity-50" : ""}`}>
                          <Avatar user={s} size={28} />
                          <span className="flex-1 truncate font-medium">{s.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROLE[s.role].cls}`}>{ROLE[s.role].label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!hasDirector && (
                        <button className="btn-ghost py-1.5 text-xs" onClick={() => onInvite({ role: "director", programmeId: p.id })}>
                          <UserPlus className="size-3.5" /> Assign director
                        </button>
                      )}
                      <button className="btn-ghost py-1.5 text-xs" onClick={() => onInvite({ role: "assistant", programmeId: p.id })}>
                        <UserPlus className="size-3.5" /> Assign assistant
                      </button>
                      <button
                        className="btn-brand ml-auto py-1.5 text-xs"
                        onClick={() => {
                          setViewProgramme(p.id);
                          onCourses();
                        }}
                      >
                        <BookOpen className="size-3.5" /> Courses
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ))}

      {info && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 sm:p-10" onClick={() => setInfo(null)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
            <button onClick={() => setInfo(null)} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 hover:bg-white" aria-label="Close">
              <X className="size-5" />
            </button>
            <ProgrammeInfo p={info} schoolContact={school.schoolContact} director={directorOf(school, info.id)} />
          </div>
        </div>
      )}
      {editing && (
        <ProgrammeEditor
          p={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(input, existing) => {
            if (existing) return act((d) => updateProgramme(d, { ...existing, ...input }));
            let id: string | undefined;
            const ok = act((d, n) => {
              const r = createProgramme(d, input, n);
              if (r.ok) id = r.programmeId;
              return r;
            });
            if (ok && id) setViewProgramme(id);
            return ok;
          }}
        />
      )}
    </div>
  );
}

const lines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);
const contactsToText = (cs?: ProgrammeContact[]) => (cs ?? []).map((c) => [c.role, c.name, c.email ?? "", c.phone ?? ""].join(" | ")).join("\n");
const textToContacts = (t: string): ProgrammeContact[] =>
  lines(t).map((l) => {
    const [role, name, email, phone] = l.split("|").map((x) => x.trim());
    return { role: role || "Contact", name: name || role, email: email || undefined, phone: phone || undefined };
  });

function ProgrammeEditor({ p, onClose, onSave }: { p?: Programme; onClose: () => void; onSave: (input: NewProgramme, existing?: Programme) => boolean }) {
  const { school } = useStore();
  const [f, setF] = useState<NewProgramme>(
    p ?? { name: "", short: "", department: "", degree: "Master's degree", ects: 120, duration: "4 academic semesters", regime: "Daytime", location: "Azurém Campus, Guimarães" },
  );
  const [contacts, setContacts] = useState(contactsToText(p?.contacts) || "Course Director | ");
  const [outcomes, setOutcomes] = useState((p?.learningOutcomes ?? []).join("\n"));
  const [careers, setCareers] = useState((p?.careers ?? []).join("\n"));
  const departments = [...new Set(school.programmes.map((x) => x.department))];
  const set = (patch: Partial<NewProgramme>) => setF({ ...f, ...patch });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" onClick={onClose}>
      <form
        className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (onSave({ ...f, contacts: textToContacts(contacts), learningOutcomes: lines(outcomes), careers: lines(careers) }, p)) onClose();
        }}
      >
        <h2 className="font-display text-xl font-bold">{p ? `Edit ${p.short}` : "New Master's degree"}</h2>
        {!p && <p className="mt-1 text-sm text-ink/60">Year 1 and Year 2 selection rounds are created for you; adjust their dates later.</p>}

        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-brand">General</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="label">Department</label>
            <input className="input" list="departments" value={f.department} onChange={(e) => set({ department: e.target.value })} placeholder="Department of Information Systems" required />
            <datalist id="departments">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Short name</label>
            <input className="input" value={f.short} onChange={(e) => set({ short: e.target.value.toUpperCase() })} placeholder="MEGSI" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Full name</label>
            <input className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Academic year</label>
            <input className="input" value={f.academicYear ?? ""} onChange={(e) => set({ academicYear: e.target.value || undefined })} placeholder="2026/2027" />
          </div>
          <div>
            <label className="label">Degree</label>
            <input className="input" value={f.degree} onChange={(e) => set({ degree: e.target.value })} />
          </div>
          <div>
            <label className="label">ECTS</label>
            <input type="number" className="input" value={f.ects} onChange={(e) => set({ ects: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Duration</label>
            <input className="input" value={f.duration} onChange={(e) => set({ duration: e.target.value })} />
          </div>
          <div>
            <label className="label">Regime</label>
            <input className="input" value={f.regime} onChange={(e) => set({ regime: e.target.value })} placeholder="Daytime / Mixed" />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={f.location ?? ""} onChange={(e) => set({ location: e.target.value || undefined })} />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Predominant scientific area</label>
            <input className="input" value={f.scientificArea ?? ""} onChange={(e) => set({ scientificArea: e.target.value || undefined })} />
          </div>
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-wider text-brand">Shown to students on their profile</p>
        <div className="mt-2 space-y-4">
          <div>
            <label className="label">Contacts — one per line: Role | Name | email | phone</label>
            <textarea className="input min-h-20 font-mono text-xs" value={contacts} onChange={(e) => setContacts(e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-28" value={f.description ?? ""} onChange={(e) => set({ description: e.target.value || undefined })} />
          </div>
          <div>
            <label className="label">Learning outcomes — one per line</label>
            <textarea className="input min-h-28" value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
          </div>
          <div>
            <label className="label">Access to higher education</label>
            <textarea className="input min-h-16" value={f.higherEducation ?? ""} onChange={(e) => set({ higherEducation: e.target.value || undefined })} />
          </div>
          <div>
            <label className="label">Career opportunities — one per line</label>
            <textarea className="input min-h-24" value={careers} onChange={(e) => setCareers(e.target.value)} />
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex justify-end gap-2 border-t border-line bg-white px-6 py-4">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary">{p ? "Save" : "Create Master's degree"}</button>
        </div>
      </form>
    </div>
  );
}

// ───────────── Staff access ─────────────
function StaffAccess({ onInvite, onCreds }: { onInvite: (i: { role: StaffRole }) => void; onCreds: (c: Creds) => void }) {
  const { school, user: me, act } = useStore();
  const staff = school.users.filter((u) => STAFF_ROLES.includes(u.role) || u.role === "admin");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Per Master's: course director, then assistants, then professors A→Z. Unassigned staff and the DSI team last.
  const RANK: Record<string, number> = { director: 0, assistant: 1, professor: 2 };
  const ordered = (list: User[]) => list.slice().sort((x, y) => (RANK[x.role] ?? 9) - (RANK[y.role] ?? 9) || x.name.localeCompare(y.name));
  const sections: { key: string; title: string; people: User[] }[] = [
    ...school.programmes.map((p) => ({ key: p.id, title: `${p.short} — ${p.name}`, people: ordered(staff.filter((u) => u.role !== "admin" && u.programmeId === p.id)) })),
    { key: "none", title: "No Master's yet", people: ordered(staff.filter((u) => u.role !== "admin" && !school.programmes.some((p) => p.id === u.programmeId))) },
    { key: "dsi", title: "DSI team", people: ordered(staff.filter((u) => u.role === "admin")) },
  ].filter((g) => g.people.length);

  const row = (u: User) => (
          <div key={u.id} className={`flex flex-wrap items-center gap-4 p-4 ${u.active === false ? "opacity-55" : ""}`}>
            <Avatar user={u} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {u.name} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE[u.role].cls}`}>{ROLE[u.role].label}</span>
                {u.active === false && <span className="ml-1 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink/60">Disabled</span>}
              </p>
              <p className="text-sm text-ink/55">
                {u.username} · {u.email}
                {u.invitedAt && ` · credentials sent ${fmtDate(u.invitedAt)}`}
              </p>
              <input
                key={u.title ?? ""}
                className="input mt-2 max-w-xs py-1 text-sm"
                defaultValue={u.title ?? ""}
                placeholder="Title, e.g. Programme Director, MEGSI"
                aria-label={`Title shown for ${u.name}`}
                onBlur={(e) => e.target.value.trim() !== (u.title ?? "") && act((d) => setStaffTitle(d, u.id, e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
            </div>
            {u.role !== "admin" && (
              <select
                className="input w-auto py-1.5 text-sm"
                value={u.programmeId ?? ""}
                onChange={(e) => e.target.value && act((d) => assignStaff(d, u.id, e.target.value))}
                aria-label={`Programme managed by ${u.name}`}
              >
                <option value="" disabled>No programme</option>
                {school.programmes.map((p) => (
                  <option key={p.id} value={p.id}>{p.short}</option>
                ))}
              </select>
            )}
            {u.role !== "admin" && (
              <select
                className="input w-auto max-w-[11rem] py-1.5 text-sm"
                value={u.professorId ?? ""}
                onChange={(e) => act((d) => linkStaffProfessor(d, u.id, (e.target.value || undefined) as string | undefined))}
                aria-label={`Professor record for ${u.name}`}
                title="Also teaches courses as…"
              >
                <option value="">Doesn&apos;t teach</option>
                <option value="new">Teaches — create professor</option>
                {school.professors
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => (
                    <option key={p.id} value={p.id}>Teaches as {p.name}</option>
                  ))}
              </select>
            )}
            {u.id !== me?.id && u.role !== "admin" && (
              <>
                <button
                  className="btn-ghost py-1.5 text-xs"
                  onClick={() => {
                    if (!confirm(`Create a new password for ${u.name} and email it to ${u.email}? The old one stops working.`)) return;
                    let c: { username: string; password: string } | undefined;
                    act((d, n) => {
                      const r = resetPassword(d, u.id, n, origin);
                      if (r.ok) c = r.credentials;
                      return r;
                    });
                    if (c) onCreds({ name: u.name, email: u.email, link: `${origin}/staff`, ...c });
                  }}
                >
                  <KeyRound className="size-3.5" /> Reset & resend
                </button>
                {u.role === "professor" && (
                  <button
                    className="btn-ghost py-1.5 text-xs text-brand"
                    onClick={() => confirm(`Make ${u.name} course director of ${school.programmes.find((p) => p.id === u.programmeId)?.short ?? "their Master's"}?`) && act((d, n) => setStaffRole(d, u.id, "director", n))}
                  >
                    <ArrowUpCircle className="size-3.5" /> Promote to director
                  </button>
                )}
                {u.role === "director" && (
                  <button className="btn-ghost py-1.5 text-xs" onClick={() => confirm(`Move ${u.name} back to professor?`) && act((d, n) => setStaffRole(d, u.id, "professor", n))}>
                    <ArrowDownCircle className="size-3.5" /> Back to professor
                  </button>
                )}
                <button className="btn-ghost py-1.5 text-xs" onClick={() => act((d) => setUserActive(d, u.id, u.active === false))}>
                  {u.active === false ? (
                    <>
                      <UserCheck className="size-3.5" /> Enable
                    </>
                  ) : (
                    <>
                      <UserX className="size-3.5" /> Disable
                    </>
                  )}
                </button>
              </>
            )}
          </div>
  );

  return (
    <div>
      <AccessRequests onCreds={onCreds} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span />
        <button className="btn-primary" onClick={() => onInvite({ role: "professor" })}>
          <Plus className="size-4" /> Give access
        </button>
      </div>
      <div className="space-y-8">
        {sections.map((g) => (
          <section key={g.key}>
            <h3 className="mb-2 font-display text-lg font-bold">
              {g.title} <span className="text-sm font-normal text-ink/50">· {g.people.length}</span>
            </h3>
            <div className="card divide-y divide-line">{g.people.map(row)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

function AccessRequests({ onCreds }: { onCreds: (c: Creds) => void }) {
  const { school, act } = useStore();
  const all = school.accessRequests ?? [];
  const pending = all.filter((r) => r.status === "pending");
  const handled = all.filter((r) => r.status !== "pending").slice(0, 5);
  if (!all.length) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <section className="mb-8">
      <h2 className="font-display text-lg font-bold">
        Access requests {pending.length > 0 && <span className="ml-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs text-ink">{pending.length} waiting</span>}
      </h2>
      <div className="mb-3" />
      {pending.length === 0 && <p className="card p-4 text-sm text-ink/55">No requests waiting.</p>}
      <div className="space-y-3">
        {pending.map((r) => {
          const p = school.programmes.find((x) => x.id === r.programmeId);
          const units = [...new Set(r.courseIds.map((id) => school.courses.find((c) => c.id === id)?.name).filter(Boolean))];
          return (
            <div key={r.id} className="card flex flex-wrap items-start gap-4 border-amber-300 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {r.name} <span className="ml-1 rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-ink/70">{p?.short ?? "?"}</span> <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Professor</span>
                </p>
                <p className="text-sm text-ink/55">
                  {r.email} · asked {fmtDate(r.createdAt)}
                </p>
                {units.length > 0 && <p className="mt-1 text-sm text-ink/70">Teaches: {units.join(", ")}</p>}
              </div>
              <button
                className="btn-brand py-1.5 text-sm"
                onClick={() => {
                  let c: { username: string; password: string } | undefined;
                  act((d, n) => {
                    const res = approveAccess(d, r.id, n, origin);
                    if (res.ok) c = res.credentials;
                    return res;
                  });
                  if (c) onCreds({ name: r.name, email: r.email, link: `${origin}/staff`, ...c });
                }}
              >
                <UserCheck className="size-4" /> Approve & send login
              </button>
              <button className="btn-ghost py-1.5 text-sm" onClick={() => confirm(`Decline the request from ${r.name}?`) && act((d, n) => declineAccess(d, r.id, n))}>
                <UserX className="size-4" /> Decline
              </button>
            </div>
          );
        })}
      </div>
      {handled.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-ink/50">
          {handled.map((r) => (
            <li key={r.id}>
              {r.name} ({r.email}) — {r.status === "approved" ? "approved" : "declined"} {r.decidedAt && fmtDate(r.decidedAt)}
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-8 font-display text-lg font-bold">Staff accounts</h2>
    </section>
  );
}

function AddStaff({ initial, onClose, onCreated }: { initial: { role: StaffRole; programmeId?: string }; onClose: () => void; onCreated: (c: Creds) => void }) {
  const { school, act } = useStore();
  const [f, setF] = useState({ name: "", email: "", title: "", role: initial.role, programmeId: initial.programmeId ?? school.programmes[0]?.id ?? "" });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" onClick={onClose}>
      <form
        className="card w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          let c: { username: string; password: string } | undefined;
          act((d, n) => {
            const r = createStaff(d, { ...f, programmeId: f.role === "admin" ? undefined : f.programmeId }, n, window.location.origin);
            if (r.ok) c = r.credentials;
            return r;
          });
          if (c) onCreated({ name: f.name, email: f.email, link: `${window.location.origin}${f.role === "admin" ? "/portal" : "/staff"}`, ...c });
        }}
      >
        <h2 className="font-display text-xl font-bold">Give access</h2>
        <p className="mt-1 text-sm text-ink/60">We create their login with a temporary password. Give it to them: they can change it under My profile.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Access</label>
            <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole })}>
              <option value="director">Course director</option>
              <option value="assistant">Assistant</option>
              <option value="professor">Professor</option>
              <option value="admin">DSI team (portal)</option>
            </select>
          </div>
          {f.role !== "admin" ? (
            <div>
              <label className="label">Programme</label>
              <select className="input" value={f.programmeId} onChange={(e) => setF({ ...f, programmeId: e.target.value })} required>
                {school.programmes.map((p) => (
                  <option key={p.id} value={p.id}>{p.short} — {p.department.replace(/^Department of /, "")}</option>
                ))}
              </select>
            </div>
          ) : (
            <div />
          )}
          <div className="sm:col-span-2">
            <label className="label">Full name</label>
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Title (optional)</label>
            <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={f.role === "admin" ? "Technical support" : "Associate Professor"} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-brand">
            <Mail className="size-4" /> Create & send
          </button>
        </div>
      </form>
    </div>
  );
}

function CredentialsDialog({ creds, onClose }: { creds: Creds; onClose: () => void }) {
  const text = `Sign in: ${creds.link}\nUsername: ${creds.username}\nPassword: ${creds.password}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl font-bold">Access sent to {creds.name.split(" ")[0]}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-paper" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink/60">
          Give these to {creds.name.split(" ")[0]} ({creds.email}). They can sign in with the username or the email, and change the password under My profile. Copy it now: it isn&apos;t shown again.
        </p>
        <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-paper p-4 font-mono text-sm">{text}</pre>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            className="btn-ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
              } catch {}
            }}
          >
            <Copy className="size-4" /> {copied ? "Copied" : "Copy"}
          </button>
          <a
            className="btn-brand"
            href={`mailto:${creds.email}?subject=${encodeURIComponent("Your OPtioN! access")}&body=${encodeURIComponent(`Hi ${creds.name.split(" ")[0]},\n\nYou now have access to OPtioN!.\n\n${text}\n\nPlease change your password after signing in.`)}`}
          >
            <Mail className="size-4" /> Open in email app
          </a>
        </div>
      </div>
    </div>
  );
}

// ───────────── Courses (per programme) ─────────────
function CoursesTab() {
  const { school, viewProgramme, setViewProgramme } = useStore();
  const [year, setYear] = useState<Year>(1);
  const p = school.programmes.find((x) => x.id === viewProgramme);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select className="input w-auto font-semibold" value={viewProgramme} onChange={(e) => setViewProgramme(e.target.value)} aria-label="Programme">
          {school.programmes.map((x) => (
            <option key={x.id} value={x.id}>{x.short} — {x.name}</option>
          ))}
        </select>
        <div className="flex w-fit gap-1 rounded-xl border border-line bg-white p-1 text-sm">
          {([1, 2] as Year[]).map((y) => (
            <button key={y} onClick={() => setYear(y)} className={`rounded-lg px-3 py-1.5 font-semibold ${year === y ? "bg-brand text-white" : "text-ink/60"}`}>
              Year {y}
            </button>
          ))}
        </div>
      </div>
      {p ? <Courses year={year} /> : <Empty title="No programme yet" text="Create one under Programmes." />}
    </div>
  );
}

// ───────────── All students (every Master's) ─────────────
function AllStudents() {
  const { school, setViewProgramme } = useStore();
  const [q, setQ] = useState("");
  const [prog, setProg] = useState("");
  const [year, setYear] = useState<0 | Year>(0);
  const [profile, setProfile] = useState<User | null>(null);
  const rows = school.users
    .filter((u) => u.role === "student")
    .filter((u) => (!prog || u.programmeId === prog) && (!year || u.year === year))
    .filter((u) => (u.name + u.username + u.email).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.programmeId ?? "").localeCompare(b.programmeId ?? "") || a.name.localeCompare(b.name));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input w-auto" value={prog} onChange={(e) => setProg(e.target.value)} aria-label="Master's">
          <option value="">All Master&apos;s</option>
          {school.programmes.map((p) => (
            <option key={p.id} value={p.id}>{p.short}</option>
          ))}
        </select>
        <div className="flex gap-1 rounded-xl border border-line bg-white p-1 text-sm">
          {([0, 1, 2] as const).map((y) => (
            <button key={y} onClick={() => setYear(y)} className={`rounded-lg px-3 py-1 font-semibold ${year === y ? "bg-brand text-white" : "text-ink/60"}`}>
              {y === 0 ? "All" : `Year ${y}`}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
          <input className="input w-60 pl-9" placeholder="Name, number or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-sm text-ink/50">{rows.length} students</span>
        {prog && (
          <button
            className="btn-ghost ml-auto"
            onClick={() => download(`option-${prog.toLowerCase()}-students.csv`, generalListCsv(scope(school, prog), year || undefined))}
          >
            <FileSpreadsheet className="size-4" /> Download list
          </button>
        )}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-band/60 text-xs uppercase tracking-wide text-ink/55">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Master&apos;s</th>
              <th className="px-4 py-3 font-semibold">Year</th>
              <th className="px-4 py-3 font-semibold">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink/50">No students match.</td>
              </tr>
            )}
            {rows.map((u) => {
              const sels = activeSelections(school, u.id);
              const pending = sels.filter((x) => x.status === "pending").length;
              return (
                <tr key={u.id} className="cursor-pointer hover:bg-paper/60" onClick={() => {
                    if (u.programmeId) setViewProgramme(u.programmeId);
                    setProfile(u);
                  }}>
                  <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar user={u} size={30} />
                      <span>
                        <span className="block font-medium">{u.name}</span>
                        <span className="block text-xs text-ink/50">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">{school.programmes.find((p) => p.id === u.programmeId)?.short ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/60">{u.year ?? "—"}</td>
                  <td className="px-4 py-3">
                    {sels.length - pending} enrolled
                    {pending > 0 && <span className="ml-1 text-xs font-semibold text-amber-700">· {pending} pending</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {profile && <ProfileModal user={profile} onClose={() => setProfile(null)} />}
    </div>
  );
}

// ───────────── Rounds & requests (override for any Master's) ─────────────
function RoundsAndRequests() {
  const { school, viewProgramme, setViewProgramme } = useStore();
  return (
    <div>
      <select className="input mb-5 w-auto font-semibold" value={viewProgramme} onChange={(e) => setViewProgramme(e.target.value)} aria-label="Master's">
        {school.programmes.map((x) => (
          <option key={x.id} value={x.id}>{x.short} — {x.name}</option>
        ))}
      </select>
      <h3 className="mb-3 font-display text-lg font-bold">Selection rounds</h3>
      <Rounds />
      <h3 className="mb-3 mt-8 font-display text-lg font-bold">Seat requests</h3>
      <Requests />
    </div>
  );
}

// ───────────── Support ─────────────
function Support() {
  const { school, act } = useStore();
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(school.tickets.find((t) => t.status !== "resolved")?.id ?? null);
  const [reply, setReply] = useState("");
  const list = school.tickets
    .filter((t) => filter === "all" || t.status === filter)
    .sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || b.updatedAt.localeCompare(a.updatedAt));
  const t = school.tickets.find((x) => x.id === openId);
  const programme = (id?: string) => school.programmes.find((p) => p.id === id)?.short;

  if (school.tickets.length === 0) return <Empty icon={LifeBuoy} title="No support requests" text="Messages sent with the help button on any page arrive here." />;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <div className="mb-3 flex gap-1 rounded-xl border border-line bg-white p-1 text-sm">
          {(["all", "open", "in_progress", "resolved"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`flex-1 rounded-lg px-2 py-1 font-semibold ${filter === s ? "bg-ink text-white" : "text-ink/60"}`}>
              {s === "all" ? "All" : STATUS[s].label}
            </button>
          ))}
        </div>
        <div className="card divide-y divide-line">
          {list.length === 0 && <p className="p-6 text-center text-sm text-ink/50">Nothing here.</p>}
          {list.map((x) => (
            <button key={x.id} onClick={() => setOpenId(x.id)} className={`block w-full p-4 text-left ${openId === x.id ? "bg-brand/5" : "hover:bg-paper/60"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{x.subject}</span>
                <StatusChip status={x.status} />
              </div>
              <p className="mt-1 truncate text-xs text-ink/50">
                {x.name}
                {x.role && ` · ${x.role}`}
                {programme(x.programmeId) && ` · ${programme(x.programmeId)}`} · {TOPICS[x.topic]} · {fmtDate(x.updatedAt)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {t ? (
        <div className="card flex flex-col p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">{t.subject}</h2>
              <p className="text-sm text-ink/55">
                {t.name} · <a className="text-brand hover:underline" href={`mailto:${t.email}`}>{t.email}</a>
                {t.role && ` · ${t.role}`}
                {programme(t.programmeId) && ` · ${programme(t.programmeId)}`}
              </p>
              <p className="mt-1 text-xs text-ink/45">
                {TOPICS[t.topic]}
                {t.page && ` · sent from ${t.page}`} · opened {fmtDate(t.createdAt)}
              </p>
            </div>
            <select
              className="input w-auto py-1.5 text-sm"
              value={t.status}
              onChange={(e) => act((d, n) => setTicketStatus(d, t.id, e.target.value as TicketStatus, n))}
              aria-label="Status"
            >
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="mt-5 flex-1">
            <Thread t={t} />
          </div>
          <form
            className="mt-5 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (act((d, n, me) => replyTicket(d, t.id, reply, me, n))) setReply("");
            }}
          >
            <textarea className="input min-h-24" placeholder={`Reply to ${t.name.split(" ")[0]}… (also emailed)`} value={reply} onChange={(e) => setReply(e.target.value)} />
            <div className="flex justify-end gap-2">
              {t.status !== "resolved" && (
                <button type="button" className="btn-ghost" onClick={() => act((d, n) => setTicketStatus(d, t.id, "resolved", n))}>
                  Mark resolved
                </button>
              )}
              <button className="btn-brand">
                <Send className="size-4" /> Send reply
              </button>
            </div>
          </form>
        </div>
      ) : (
        <Empty icon={LifeBuoy} title="Pick a request" />
      )}
    </div>
  );
}

// ───────────── Sent mail ─────────────
function SentMail() {
  const { school } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const mails = school.emails.filter((e) => e.kind && e.kind !== "system");
  const KIND = { invite: "Access", list: "Student list", announcement: "Announcement", support: "Support reply", system: "System" } as const;
  return (
    <div className="card divide-y divide-line">
      {mails.length === 0 && <p className="p-8 text-center text-sm text-ink/50">Nothing sent yet.</p>}
      {mails.map((m) => (
        <button key={m.id} onClick={() => setOpen(open === m.id ? null : m.id)} className="block w-full p-4 text-left hover:bg-paper/60">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-semibold">{KIND[m.kind ?? "system"]}</span>
            <span className="flex-1 font-semibold">{m.subject}</span>
            <span className="text-xs text-ink/45">{fmtDate(m.sentAt)}</span>
          </div>
          <p className="mt-1 text-sm text-ink/55">
            To: {m.toAddresses?.length ? m.toAddresses.join(", ") : `${m.to.length} student${m.to.length === 1 ? "" : "s"}`}
          </p>
          {open === m.id && <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-paper p-3 font-sans text-sm text-ink/80">{m.body}</pre>}
        </button>
      ))}
    </div>
  );
}

