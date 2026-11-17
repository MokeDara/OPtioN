"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Megaphone, Pencil, Pin, Plus, Trash2, X } from "lucide-react";
import { AppHeader, fmtDate, useRequireRole } from "@/components/ui";
import { Avatar } from "@/components/profile";
import { useStore } from "@/lib/store";
import { announcementsFor, calendarItems, deleteAnnouncement, deleteEvent, postAnnouncement, saveEvent, uid } from "@/lib/logic";
import type { Announcement, CalendarEvent, EventKind, Year } from "@/lib/types";

const KIND: Record<EventKind, { label: string; dot: string; chip: string }> = {
  deadline: { label: "Deadline", dot: "bg-brand", chip: "bg-brand/10 text-brand" },
  exam: { label: "Exam", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-800" },
  event: { label: "Event", dot: "bg-sky-500", chip: "bg-sky-100 text-sky-800" },
  class: { label: "Class", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800" },
};
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const audienceLabel = (a: 0 | Year) => (a === 0 ? "Everyone" : `Year ${a}`);
const covers = (e: CalendarEvent, day: string) => e.date === day || (!!e.endDate && e.date <= day && day <= e.endDate);

export default function CalendarPage() {
  const user = useRequireRole(["student", "director", "assistant", "professor"]);
  const { db, now } = useStore();
  const staff = user?.role === "director" || user?.role === "assistant";
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(() => iso(now));
  const [filter, setFilter] = useState<0 | Year>(0);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingNews, setEditingNews] = useState<Announcement | null>(null);

  const year: 0 | Year = !user ? 0 : user.role === "student" ? (user.year ?? 0) : filter;
  const items = useMemo(() => calendarItems(db, year), [db, year]);
  const news = announcementsFor(db, year);

  if (!user) return null;

  // month grid, weeks start on Monday
  const first = new Date(month);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const today = iso(now);
  const dayItems = items.filter((e) => covers(e, selected));
  const upcoming = items.filter((e) => (e.endDate ?? e.date) >= today).slice(0, 8);
  const newEvent = (date: string): CalendarEvent => ({ id: uid("ev"), programmeId: db.programme.id, date, title: "", kind: "event", audience: 0, createdBy: user.id });

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Calendar & news</h1>
            <p className="mt-1 text-ink/60">
              {staff ? "Add dates and post announcements — students see the ones for their year." : `Dates and announcements for Year ${user.year} students.`}
            </p>
          </div>
          {staff && (
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 rounded-xl border border-line bg-white p-1 text-sm">
                {([0, 1, 2] as const).map((y) => (
                  <button key={y} onClick={() => setFilter(y)} className={`rounded-lg px-3 py-1 font-semibold ${filter === y ? "bg-ink text-white" : "text-ink/60"}`}>
                    {y === 0 ? "All" : `Year ${y}`}
                  </button>
                ))}
              </div>
              <button className="btn-ghost" onClick={() => setEditingNews({ id: uid("an"), programmeId: db.programme.id, title: "", body: "", audience: filter, createdAt: new Date().toISOString(), authorId: user.id })}>
                <Megaphone className="size-4" /> Post announcement
              </button>
              <button className="btn-brand" onClick={() => setEditingEvent(newEvent(selected))}>
                <Plus className="size-4" /> Add date
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Month */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="font-display text-lg font-bold">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
              <div className="flex items-center gap-1">
                <button className="rounded-lg p-2 hover:bg-paper" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-paper"
                  onClick={() => {
                    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelected(today);
                  }}
                >
                  Today
                </button>
                <button className="rounded-lg p-2 hover:bg-paper" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-line bg-band/50 text-center text-xs font-semibold uppercase tracking-wide text-ink/50">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const key = iso(d);
                const inMonth = d.getMonth() === month.getMonth();
                const evs = items.filter((e) => covers(e, key));
                const isSel = key === selected;
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    onDoubleClick={() => staff && setEditingEvent(newEvent(key))}
                    className={`min-h-[86px] border-b border-r border-line p-1.5 text-left align-top transition [&:nth-child(7n)]:border-r-0 ${
                      isSel ? "bg-brand/5 ring-2 ring-inset ring-brand" : "hover:bg-paper/70"
                    } ${inMonth ? "" : "bg-paper/40 text-ink/35"}`}
                  >
                    <span className={`inline-grid size-6 place-items-center rounded-full text-xs font-semibold ${key === today ? "bg-brand text-white" : ""}`}>{d.getDate()}</span>
                    <span className="mt-0.5 block space-y-0.5">
                      {evs.slice(0, 2).map((e) => (
                        <span key={e.id} className={`block truncate rounded px-1 py-px text-[10px] font-semibold ${KIND[e.kind].chip}`}>
                          {e.title}
                        </span>
                      ))}
                      {evs.length > 2 && <span className="block px-1 text-[10px] text-ink/50">+{evs.length - 2} more</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 px-5 py-3 text-xs text-ink/55">
              {Object.entries(KIND).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${v.dot}`} /> {v.label}
                </span>
              ))}
              {staff && <span className="ml-auto">Double-click a day to add a date</span>}
            </div>
          </section>

          {/* Selected day + upcoming */}
          <section className="space-y-6">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">
                  {new Date(selected + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                </h2>
                {staff && (
                  <button className="rounded-lg p-1.5 text-brand hover:bg-paper" aria-label="Add date on this day" onClick={() => setEditingEvent(newEvent(selected))}>
                    <Plus className="size-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 space-y-3">
                {dayItems.length === 0 && <p className="text-sm text-ink/45">Nothing on this day.</p>}
                {dayItems.map((e) => (
                  <EventRow key={e.id} e={e} canEdit={staff && !("auto" in e && e.auto)} onEdit={() => setEditingEvent(e)} />
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h2 className="font-display text-lg font-bold">Coming up</h2>
              <div className="mt-3 space-y-3">
                {upcoming.length === 0 && <p className="text-sm text-ink/45">No upcoming dates.</p>}
                {upcoming.map((e) => (
                  <button
                    key={e.id}
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => {
                      setSelected(e.date);
                      const d = new Date(e.date + "T12:00");
                      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                    }}
                  >
                    <span className="grid w-11 shrink-0 rounded-lg bg-paper py-1 text-center leading-tight">
                      <span className="text-[10px] font-semibold uppercase text-brand">{new Date(e.date + "T12:00").toLocaleDateString("en-GB", { month: "short" })}</span>
                      <span className="font-display text-lg font-bold">{new Date(e.date + "T12:00").getDate()}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{e.title}</span>
                      <span className="block text-xs text-ink/50">
                        {KIND[e.kind].label}
                        {e.time && ` · ${e.time}`} · {audienceLabel(e.audience)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Announcements */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">Announcements</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {news.length === 0 && <p className="text-sm text-ink/50">No announcements yet.</p>}
            {news.map((a) => {
              const author = db.users.find((u) => u.id === a.authorId);
              return (
                <article key={a.id} className={`card p-5 ${a.pinned ? "border-brand/40" : ""}`}>
                  <div className="flex items-start gap-3">
                    {author && <Avatar user={author} size={38} />}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold">
                        {a.pinned && <Pin className="size-3.5 shrink-0 text-brand" />}
                        {a.title}
                      </p>
                      <p className="text-xs text-ink/50">
                        {author?.name ?? "Staff"} · {fmtDate(a.createdAt)} · {audienceLabel(a.audience)}
                      </p>
                    </div>
                    {staff && (
                      <button className="rounded-lg p-1.5 text-ink/40 hover:bg-paper hover:text-ink" aria-label="Edit announcement" onClick={() => setEditingNews(a)}>
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-ink/80">{a.body}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {editingEvent && <EventEditor e={editingEvent} onClose={() => setEditingEvent(null)} />}
      {editingNews && <NewsEditor a={editingNews} onClose={() => setEditingNews(null)} />}
    </>
  );
}

function EventRow({ e, canEdit, onEdit }: { e: CalendarEvent; canEdit: boolean; onEdit: () => void }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND[e.kind].chip}`}>{KIND[e.kind].label}</span>
          <p className="mt-1 font-semibold">{e.title}</p>
          <p className="text-xs text-ink/50">
            {e.time ?? "All day"}
            {e.endDate && e.endDate !== e.date && ` · until ${new Date(e.endDate + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`} · {audienceLabel(e.audience)}
          </p>
        </div>
        {canEdit && (
          <button className="rounded-lg p-1.5 text-ink/40 hover:bg-paper hover:text-ink" aria-label="Edit date" onClick={onEdit}>
            <Pencil className="size-4" />
          </button>
        )}
      </div>
      {e.location && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink/60">
          <MapPin className="size-3.5" /> {e.location}
        </p>
      )}
      {e.description && <p className="mt-2 text-sm text-ink/70">{e.description}</p>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" onClick={onClose}>
      <div className="card max-h-[92vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="mb-5 flex items-start justify-between">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-paper" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EventEditor({ e, onClose }: { e: CalendarEvent; onClose: () => void }) {
  const { db, act } = useStore();
  const [x, setX] = useState(e);
  const isNew = !db.events.some((y) => y.id === e.id);
  const set = (p: Partial<CalendarEvent>) => setX({ ...x, ...p });
  return (
    <Modal title={isNew ? "Add a date" : "Edit date"} onClose={onClose}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (act((d) => saveEvent(d, x))) onClose();
        }}
      >
        <div className="sm:col-span-2">
          <label className="label">Title</label>
          <input className="input" value={x.title} onChange={(ev) => set({ title: ev.target.value })} placeholder="e.g. Dissertation proposals due" required autoFocus />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={x.date} onChange={(ev) => set({ date: ev.target.value })} required />
        </div>
        <div>
          <label className="label">Ends (optional)</label>
          <input type="date" className="input" value={x.endDate ?? ""} min={x.date} onChange={(ev) => set({ endDate: ev.target.value || undefined })} />
        </div>
        <div>
          <label className="label">Time (optional)</label>
          <input type="time" className="input" value={x.time ?? ""} onChange={(ev) => set({ time: ev.target.value || undefined })} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={x.kind} onChange={(ev) => set({ kind: ev.target.value as EventKind })}>
            {Object.entries(KIND).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">For</label>
          <select className="input" value={x.audience} onChange={(ev) => set({ audience: Number(ev.target.value) as 0 | Year })}>
            <option value={0}>Everyone</option>
            <option value={1}>Year 1</option>
            <option value={2}>Year 2</option>
          </select>
        </div>
        <div>
          <label className="label">Location (optional)</label>
          <input className="input" value={x.location ?? ""} onChange={(ev) => set({ location: ev.target.value || undefined })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Details (optional)</label>
          <textarea className="input min-h-20" value={x.description ?? ""} onChange={(ev) => set({ description: ev.target.value || undefined })} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          {!isNew && (
            <button type="button" className="btn-ghost text-brand" onClick={() => confirm("Delete this date?") && act((d) => deleteEvent(d, e.id)) && onClose()}>
              <Trash2 className="size-4" /> Delete
            </button>
          )}
          <button type="button" className="btn-ghost ml-auto" onClick={onClose}>Cancel</button>
          <button className="btn-brand">{isNew ? "Add to calendar" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function NewsEditor({ a, onClose }: { a: Announcement; onClose: () => void }) {
  const { db, act } = useStore();
  const [x, setX] = useState(a);
  const [notify, setNotify] = useState(true);
  const isNew = !db.announcements.some((y) => y.id === a.id);
  const set = (p: Partial<Announcement>) => setX({ ...x, ...p });
  return (
    <Modal title={isNew ? "Post an announcement" : "Edit announcement"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (act((d, n) => postAnnouncement(d, isNew ? { ...x, createdAt: n.toISOString() } : x, n, isNew && notify))) onClose();
        }}
      >
        <div>
          <label className="label">Title</label>
          <input className="input" value={x.title} onChange={(ev) => set({ title: ev.target.value })} required autoFocus />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea className="input min-h-32" value={x.body} onChange={(ev) => set({ body: ev.target.value })} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">For</label>
            <select className="input" value={x.audience} onChange={(ev) => set({ audience: Number(ev.target.value) as 0 | Year })}>
              <option value={0}>All students</option>
              <option value={1}>Year 1</option>
              <option value={2}>Year 2</option>
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
            <input type="checkbox" className="accent-brand" checked={!!x.pinned} onChange={(ev) => set({ pinned: ev.target.checked })} /> Pin to the top
          </label>
        </div>
        {isNew && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-brand" checked={notify} onChange={(ev) => setNotify(ev.target.checked)} /> Also email it to these students
          </label>
        )}
        <div className="flex items-center gap-2">
          {!isNew && (
            <button type="button" className="btn-ghost text-brand" onClick={() => confirm("Delete this announcement?") && act((d) => deleteAnnouncement(d, a.id)) && onClose()}>
              <Trash2 className="size-4" /> Delete
            </button>
          )}
          <button type="button" className="btn-ghost ml-auto" onClick={onClose}>Cancel</button>
          <button className="btn-brand">{isNew ? "Post" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
