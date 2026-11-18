"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, CheckCircle2, Clock3, LayoutDashboard, LogOut, X, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { PrefsToggle, useT } from "@/lib/prefs";
import { Avatar } from "@/components/profile";
import { roundState, studentTerm } from "@/lib/logic";
import type { Role, Round, SelectionStatus, User } from "@/lib/types";

/** The department line shown on the home page and the professor access page. */
export const DEPARTMENT_LINE = "Department of Information Systems | University of Minho";

export function Logo({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={`whitespace-nowrap font-display text-2xl font-bold tracking-tight ${className}`}>
      OPtioN
      <span className={`ml-0.5 inline-block -rotate-6 rounded-md px-1.5 ${inverted ? "bg-white text-brand" : "bg-brand text-white"}`}>!</span>
    </span>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-24 right-5 z-50 flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${
            t.kind === "ok" ? "bg-ink text-white" : "bg-rose-600 text-white"
          }`}
        >
          {t.kind === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
          <span className="flex-1">{t.text}</span>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

const STATUS: Record<SelectionStatus, { label: string; cls: string }> = {
  enrolled: { label: "Enrolled", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  pending: { label: "Awaiting director", cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  rejected: { label: "Not accepted", cls: "bg-rose-100 text-rose-800 ring-rose-200" },
};

export function StatusBadge({ status }: { status: SelectionStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.cls}`}>{s.label}</span>;
}

export function SeatMeter({ taken, capacity, pending = 0 }: { taken: number; capacity: number; pending?: number }) {
  const left = Math.max(0, capacity - taken);
  const pct = Math.min(100, (taken / capacity) * 100);
  const tone = left === 0 ? "bg-rose-500" : left / capacity <= 0.2 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className={`font-semibold ${left === 0 ? "text-rose-600" : "text-ink"}`}>
          {left === 0 ? "Full" : `${left} seat${left === 1 ? "" : "s"} left`}
        </span>
        <span className="text-ink/50">
          {taken}/{capacity} admitted{pending > 0 && ` · ${pending} pending`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60) };
}

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const { d, h, m } = parts(new Date(to).getTime() - now);
  return (
    <span className="font-display tabular-nums">
      {d}d {h}h {m}m
    </span>
  );
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function RoundPill({ round }: { round: Round }) {
  const { now } = useStore();
  const t = useT();
  const st = roundState(round, now);
  const cls =
    st === "open" ? "bg-emerald-100 text-emerald-800" : st === "upcoming" ? "bg-sky-100 text-sky-800" : "bg-ink/10 text-ink/60";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {st === "open" && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}
      {t(st === "open" ? "Open" : st === "upcoming" ? "Opens soon" : "Closed")}
    </span>
  );
}

export function Inbox({ user }: { user: User }) {
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const mails = db.emails.filter((e) => e.to.includes(user.id));
  useEffect(() => {
    try {
      setSeen(Number(localStorage.getItem(`option-seen-${user.id}`) ?? 0));
    } catch {}
  }, [user.id]);
  const unread = Math.max(0, mails.length - seen);
  const toggle = () => {
    setOpen((o) => !o);
    setSeen(mails.length);
    try {
      localStorage.setItem(`option-seen-${user.id}`, String(mails.length));
    } catch {}
  };
  return (
    <div className="relative">
      <button onClick={toggle} className="relative rounded-xl p-2 hover:bg-white/10" aria-label="Notifications">
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-white text-[10px] font-bold text-brand">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-semibold">Email notifications</span>
            <span className="text-xs text-ink/50">sent to {user.email}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {mails.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink/50">No emails yet.</p>}
            {mails.map((m) => (
              <div key={m.id} className="border-b border-line px-4 py-3 last:border-0">
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-semibold">{m.subject}</p>
                  <span className="shrink-0 text-xs text-ink/40">{fmtDate(m.sentAt)}</span>
                </div>
                <p className="mt-1 text-sm text-ink/70">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const homeFor = (role: Role) => (role === "student" ? "/student" : role === "admin" ? "/portal" : role === "professor" ? "/my-courses" : "/director");
export const signInFor = (role: Role) => (role === "student" ? "/login" : role === "admin" ? "/portal" : "/staff");

// ── Dual-hat: a course director (or assistant) who also teaches switches between two workspaces. ──
const VIEW_KEY = "option-staff-view";
type StaffView = "courses" | "programme";
/** Directors/assistants linked to a professor record wear two hats. */
export const isDualHat = (u: User) => (u.role === "director" || u.role === "assistant") && !!u.professorId;
function savedView(): StaffView {
  try {
    return localStorage.getItem(VIEW_KEY) === "courses" ? "courses" : "programme";
  } catch {
    return "programme";
  }
}
function saveView(v: StaffView) {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {}
}
/** Where this person lands after sign-in: dual-hat staff return to the workspace they used last. */
export const homeForUser = (u: User) => (isDualHat(u) && savedView() === "courses" ? "/my-courses" : homeFor(u.role));

const ROLE_LABEL: Record<Role, string> = { student: "Student", director: "Course director", assistant: "Programme assistant", professor: "Professor", admin: "Department of Information Systems" };

const CALENDAR = { href: "/calendar", label: "Calendar & news" };
const PROGRAMME_NAV = [{ href: "/director", label: "Dashboard" }, { href: "/professors", label: "Professors" }, CALENDAR];
const COURSES_NAV = [{ href: "/my-courses", label: "My courses" }, CALENDAR];
const NAV: Record<Role, { href: string; label: string }[]> = {
  student: [{ href: "/student", label: "My options" }, CALENDAR],
  director: PROGRAMME_NAV,
  assistant: PROGRAMME_NAV,
  professor: COURSES_NAV,
  admin: [{ href: "/portal", label: "Portal" }],
};

/** One button, like the day/night switch: flips between My Courses (professor view) and Programme Management (director view). */
function WorkspaceSwitch({ view }: { view: StaffView }) {
  const t = useT();
  const router = useRouter();
  const next: StaffView = view === "courses" ? "programme" : "courses";
  const label = next === "courses" ? t("Switch to My Courses (professor view)") : t("Switch to Programme Management (director view)");
  const Icon = view === "courses" ? BookOpen : LayoutDashboard;
  return (
    <button
      type="button"
      onClick={() => {
        saveView(next);
        router.push(next === "courses" ? "/my-courses" : "/director");
      }}
      className="grid size-8 place-items-center rounded-lg border border-white/25 bg-white/10 text-white/75 transition hover:text-white"
      aria-label={label}
      title={label}
    >
      <Icon className="size-4" />
    </button>
  );
}

export function AppHeader({ user, children }: { user: User; children?: React.ReactNode }) {
  const { logout, now } = useStore();
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const dual = isDualHat(user);
  const view: StaffView = path === "/my-courses" ? "courses" : "programme";
  const nav = dual && view === "courses" ? COURSES_NAV : NAV[user.role];
  return (
    <header className="sticky top-0 z-30 bg-brand text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link href={homeForUser(user)} className="shrink-0">
          <Logo className="text-white" inverted />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${path === n.href ? "bg-white/20 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
            >
              {t(n.label)}
            </Link>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
        <div className="flex shrink-0 items-center gap-2">
          {dual && <WorkspaceSwitch view={view} />}
          <PrefsToggle onBrand className="mr-1" />
          {user.role === "student" && <Inbox user={user} />}
          {user.role !== "admin" ? (
            <Link href="/profile" className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-white/10" title="My profile">
              <Avatar user={user} size={34} className="ring-2 ring-white/40" />
              <span className="hidden max-w-[11rem] text-left xl:block">
                <span className="block truncate whitespace-nowrap text-sm font-semibold leading-tight">{user.name}</span>
                <span className="block truncate whitespace-nowrap text-xs text-white/60">{user.role === "student" ? `${user.username} · ${t(studentTerm(user, now).label)}` : t(ROLE_LABEL[user.role])}</span>
              </span>
            </Link>
          ) : (
            <span className="hidden text-sm font-semibold sm:inline">{t(ROLE_LABEL.admin)}</span>
          )}
          <button
            onClick={() => {
              logout();
              router.push(signInFor(user.role));
            }}
            className="ml-2 rounded-xl p-2 hover:bg-white/10"
            aria-label={t("Sign out")}
            title={t("Sign out")}
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
      {/* mobile nav */}
      <nav className="flex gap-1 overflow-x-auto px-5 pb-2 md:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-lg px-3 py-1 text-sm font-semibold ${path === n.href ? "bg-white/20" : "text-white/75"}`}>
            {t(n.label)}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/** Redirects to the right sign-in page unless the signed-in user has one of the given roles. */
export function useRequireRole(roles: Role | Role[], signIn?: string) {
  const list = Array.isArray(roles) ? roles : [roles];
  const { user } = useStore();
  const router = useRouter();
  const allowed = !!user && list.includes(user.role);
  useEffect(() => {
    if (!user) router.replace(signIn ?? signInFor(list[0]));
    else if (!list.includes(user.role)) router.replace(homeForUser(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, list.join(), signIn]);
  return allowed ? user : null;
}

export function Empty({ icon: Icon = Clock3, title, text }: { icon?: typeof Clock3; title: string; text?: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <Icon className="size-8 text-ink/30" />
      <p className="mt-3 font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-ink/60">{text}</p>}
    </div>
  );
}
