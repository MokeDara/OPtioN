"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, LifeBuoy, Send, X } from "lucide-react";
import { fmtDate } from "@/components/ui";
import { useStore } from "@/lib/store";
import { createTicket, replyTicket } from "@/lib/logic";
import type { SupportTicket, TicketStatus, TicketTopic } from "@/lib/types";

export const TOPICS: Record<TicketTopic, string> = {
  access: "Signing in / my account",
  selection: "Choosing options",
  courses: "Courses & programme setup",
  technical: "Something isn't working",
  other: "Something else",
};
export const STATUS: Record<TicketStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-amber-100 text-amber-800" },
  in_progress: { label: "In progress", cls: "bg-sky-100 text-sky-800" },
  resolved: { label: "Resolved", cls: "bg-emerald-100 text-emerald-800" },
};
const MINE_KEY = "option-my-tickets";

export function StatusChip({ status }: { status: TicketStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[status].cls}`}>{STATUS[status].label}</span>;
}

export function Thread({ t }: { t: SupportTicket }) {
  return (
    <div className="space-y-2">
      {t.messages.map((m, i) => (
        <div key={i} className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${m.from === "team" ? "ml-auto bg-brand text-white" : "bg-paper"}`}>
          <p className={`text-[11px] font-semibold ${m.from === "team" ? "text-white/75" : "text-ink/50"}`}>
            {m.authorName} · {fmtDate(m.at)}
          </p>
          <p className="whitespace-pre-line">{m.body}</p>
        </div>
      ))}
    </div>
  );
}

/** Floating help button on every page: messages go to the School of Engineering team (portal → Support). */
export function SupportWidget() {
  const { school, user, act } = useStore();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"new" | "list" | string>("new");
  const [anonIds, setAnonIds] = useState<string[]>([]);
  const [f, setF] = useState({ name: "", email: "", topic: "selection" as TicketTopic, subject: "", message: "" });
  const [reply, setReply] = useState("");

  useEffect(() => {
    try {
      setAnonIds(JSON.parse(localStorage.getItem(MINE_KEY) ?? "[]"));
    } catch {}
  }, []);

  if (user?.role === "admin") return null; // the team answers from the portal

  const mine = school.tickets.filter((t) => (user ? t.userId === user.id : anonIds.includes(t.id)));
  const unread = mine.filter((t) => t.status !== "resolved" && t.messages[t.messages.length - 1].from === "team").length;
  const thread = mine.find((t) => t.id === view);

  const send = () => {
    let id: string | undefined;
    const ok = act((d, n, me) => {
      const r = createTicket(d, { ...f, page: path }, me, n);
      if (r.ok) id = r.ticketId;
      return r;
    });
    if (ok && id) {
      if (!user) {
        const ids = [id, ...anonIds];
        setAnonIds(ids);
        try {
          localStorage.setItem(MINE_KEY, JSON.stringify(ids));
        } catch {}
      }
      setF({ ...f, subject: "", message: "" });
      setView(id);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen((o) => !o);
          setView(mine.length && !open ? "list" : "new");
        }}
        className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition hover:scale-105 hover:bg-brand-dark"
        aria-label={open ? "Close support" : "Get help from the School of Engineering"}
        title="Help & support"
      >
        {open ? <X className="size-6" /> : <LifeBuoy className="size-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold">{unread}</span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex max-h-[min(640px,calc(100vh-8rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
          <div className="bg-[linear-gradient(120deg,#a6192e_0%,#d9475a_70%,#f2a65a_130%)] px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/75">{school.school}</p>
            <p className="font-display text-lg font-bold">How can we help?</p>
            <p className="text-sm text-white/80">The management team reads every message.</p>
          </div>

          <div className="flex border-b border-line text-sm">
            <button className={`flex-1 py-2.5 font-semibold ${view === "new" ? "border-b-2 border-brand text-ink" : "text-ink/50"}`} onClick={() => setView("new")}>
              New message
            </button>
            <button
              className={`flex-1 py-2.5 font-semibold ${view !== "new" ? "border-b-2 border-brand text-ink" : "text-ink/50"}`}
              onClick={() => setView("list")}
            >
              My requests {mine.length > 0 && `(${mine.length})`}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {view === "new" && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                {!user && (
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
                    <input className="input" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
                  </div>
                )}
                <select className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value as TicketTopic })}>
                  {Object.entries(TOPICS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <input className="input" placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} required />
                <textarea className="input min-h-28" placeholder="Describe the problem…" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required />
                <p className="text-xs text-ink/45">
                  {user ? `Sent as ${user.name}` : "We'll reply here and by email"} · page {path}
                </p>
                <button className="btn-brand w-full">
                  <Send className="size-4" /> Send to the team
                </button>
              </form>
            )}

            {view === "list" && (
              <div className="space-y-2">
                {mine.length === 0 && <p className="py-8 text-center text-sm text-ink/50">No requests yet.</p>}
                {mine.map((t) => (
                  <button key={t.id} onClick={() => setView(t.id)} className="block w-full rounded-xl border border-line p-3 text-left hover:bg-paper/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{t.subject}</span>
                      <StatusChip status={t.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-ink/50">
                      {t.messages[t.messages.length - 1].from === "team" ? "Team replied · " : ""}
                      {fmtDate(t.updatedAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {thread && (
              <div>
                <button className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-ink/50 hover:text-ink" onClick={() => setView("list")}>
                  <ArrowLeft className="size-3.5" /> All requests
                </button>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="font-semibold">{thread.subject}</p>
                  <StatusChip status={thread.status} />
                </div>
                <Thread t={thread} />
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (act((d, n, me) => replyTicket(d, thread.id, reply, me, n))) setReply("");
                  }}
                >
                  <input className="input" placeholder="Add a message…" value={reply} onChange={(e) => setReply(e.target.value)} />
                  <button className="btn-brand px-3" aria-label="Send">
                    <Send className="size-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
