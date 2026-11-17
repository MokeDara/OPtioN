"use client";
// Programme-management panels shared by the director dashboard and the DSI portal's override tab.
import { useState } from "react";
import { Check, FileSpreadsheet, Inbox as InboxIcon, Search, X } from "lucide-react";
import { Empty, RoundPill, SeatMeter, fmtDate } from "@/components/ui";
import { Avatar } from "@/components/profile";
import { ProfileModal, download } from "@/components/staff";
import { useStore } from "@/lib/store";
import { ectsFor, generalList, generalListCsv, incompleteStudents, pendingCount, requiredEcts, seatsLeft, seatsTaken } from "@/lib/logic";
import type { Round, User, Year } from "@/lib/types";

// ───────────── Approval requests ─────────────
export function Requests() {
  const { db, decide } = useStore();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<User | null>(null);
  const pending = db.selections
    .filter((s) => s.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (pending.length === 0)
    return <Empty icon={InboxIcon} title="No pending requests" text="Requests for courses that need director acceptance will appear here." />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60">Oldest first. Pending requests don&apos;t hold a seat — approving takes one, so it fails if the course is already full.</p>
      {pending.map((s) => {
        const c = db.courses.find((c) => c.id === s.courseId)!;
        const st = db.users.find((u) => u.id === s.studentId)!;
        const left = seatsLeft(db, c);
        return (
          <div key={s.id} className="card grid gap-4 p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
            <div>
              <button onClick={() => setProfile(st)} className="flex items-center gap-3 text-left hover:opacity-80">
                <Avatar user={st} size={40} />
                <span>
                  <span className="block font-semibold">{st.name} <span className="font-normal text-ink/50">· {st.username}</span></span>
                  <span className="block text-xs text-brand">View profile</span>
                </span>
              </button>
              <p className="text-sm text-ink/60">
                wants <b className="text-ink">{c.code} {c.name}</b> ({c.ects} ECTS) · {fmtDate(s.createdAt)}
              </p>
              {s.motivation && <p className="mt-2 rounded-lg bg-paper p-2.5 text-sm">“{s.motivation}”</p>}
              <p className="mt-2 text-xs text-ink/50">
                Already confirmed: {ectsFor(db, st.id, c.year, ["enrolled"])} of {requiredEcts(db, c.year)} option ECTS in Year {c.year}
              </p>
            </div>
            <div>
              <SeatMeter taken={seatsTaken(db, c.id)} capacity={c.capacity} pending={pendingCount(db, c.id)} />
              <input
                className="input mt-3"
                placeholder="Note to student (optional)"
                value={notes[s.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
              />
            </div>
            <div className="flex gap-2 lg:flex-col">
              <button className="btn-primary" disabled={left === 0} onClick={() => decide(s.id, true, notes[s.id])} title={left === 0 ? "Course is full" : ""}>
                <Check className="size-4" /> Accept
              </button>
              <button className="btn-ghost text-brand" onClick={() => decide(s.id, false, notes[s.id])}>
                <X className="size-4" /> Reject
              </button>
            </div>
          </div>
        );
      })}
      {profile && <ProfileModal user={profile} onClose={() => setProfile(null)} />}
    </div>
  );
}

// ───────────── Rounds ─────────────
const toLocal = (iso: string) => {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export function Rounds() {
  const { db } = useStore();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {db.rounds
        .slice()
        .sort((a, b) => a.year - b.year)
        .map((r) => (
          <RoundEditor key={r.id + r.opensAt + r.closesAt} round={r} />
        ))}
    </div>
  );
}

function RoundEditor({ round }: { round: Round }) {
  const { saveRound } = useStore();
  const [r, setR] = useState(round);
  const save = (next: Round) => saveRound(next);
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Year {round.year} round</h3>
        <RoundPill round={round} />
      </div>
      <p className="mt-1 text-xs text-ink/50">
        {round.emailSentAt ? `Opening email sent ${fmtDate(round.emailSentAt)}` : "Opening email goes to all students automatically when the round opens."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Opens</label>
          <input type="datetime-local" className="input" value={toLocal(r.opensAt)} onChange={(e) => setR({ ...r, opensAt: new Date(e.target.value).toISOString() })} />
        </div>
        <div>
          <label className="label">Closes</label>
          <input type="datetime-local" className="input" value={toLocal(r.closesAt)} onChange={(e) => setR({ ...r, closesAt: new Date(e.target.value).toISOString() })} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => save(r)}>Save</button>
        <button
          className="btn-ghost"
          onClick={() => {
            const now = new Date();
            save({ ...r, opensAt: now.toISOString(), closesAt: new Date(now.getTime() + 14 * 86400000).toISOString() });
          }}
        >
          Open now for 2 weeks
        </button>
        <button className="btn-ghost" onClick={() => save({ ...r, closesAt: new Date().toISOString(), opensAt: r.opensAt < new Date().toISOString() ? r.opensAt : new Date(Date.now() - 60000).toISOString() })}>
          Close now
        </button>
      </div>
    </div>
  );
}

// ───────────── Student list ─────────────
export function Students({ year: dashYear }: { year: Year }) {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const [year, setYear] = useState<Year | 0>(dashYear);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const { groups: allGroups, rows: allRows } = generalList(db, year || undefined);
  const visible = (g: { year: Year }) => !year || g.year <= year;
  const incomplete = new Set([1, 2].flatMap((y) => incompleteStudents(db, y as Year).map((x) => x.student.id)));
  const rows = allRows
    .filter(({ student }) => (student.name + student.username + student.email).toLowerCase().includes(q.toLowerCase()))
    .filter(({ student }) => !onlyIncomplete || incomplete.has(student.id));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-line bg-white p-1 text-sm">
          {([0, 1, 2] as const).map((y) => (
            <button key={y} onClick={() => setYear(y)} className={`rounded-lg px-3 py-1 font-semibold ${year === y ? "bg-ink text-white" : "text-ink/60"}`}>
              {y === 0 ? "All" : `Year ${y}`}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
          <input className="input w-60 pl-9" placeholder="Name, number or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand" checked={onlyIncomplete} onChange={(e) => setOnlyIncomplete(e.target.checked)} />
          Still choosing ({allRows.filter((r) => incomplete.has(r.student.id)).length})
        </label>
        <button className="btn-brand ml-auto" onClick={() => download(`option-general-list${year ? `-year${year}` : ""}.csv`, generalListCsv(db, year || undefined))}>
          <FileSpreadsheet className="size-4" /> Download list
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-band/60 text-xs uppercase tracking-wide text-ink/55">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Year</th>
              {allGroups.filter(visible).map((g) => (
                <th key={g.id} className="px-4 py-3 font-semibold">{g.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={3 + allGroups.filter(visible).length} className="px-4 py-10 text-center text-ink/50">No students match.</td>
              </tr>
            )}
            {rows.map(({ student, options }) => (
              <tr key={student.id} className="cursor-pointer hover:bg-paper/60" onClick={() => setProfile(student)}>
                <td className="px-4 py-3 font-mono text-xs">{student.username}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar user={student} size={30} />
                    <span className="font-medium">{student.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-ink/60">{student.year}</td>
                {allGroups.map((g, i) => {
                  if (!visible(g)) return null;
                  const o = options[i];
                  return (
                    <td key={g.id} className="px-4 py-3">
                      {g.year > (student.year ?? 0) ? (
                        <span className="text-ink/25">—</span>
                      ) : o ? (
                        <span className="flex flex-col">
                          <span className="leading-snug">{o.course.name}</span>
                          {o.status === "pending" && <span className="text-xs font-semibold text-amber-700">pending</span>}
                          {o.status === "completed" && <span className="text-xs text-ink/40">completed</span>}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-brand">not chosen</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {profile && <ProfileModal user={profile} onClose={() => setProfile(null)} />}
    </div>
  );
}
