"use client";
// Demo data layer: keeps the whole database in localStorage and syncs it across tabs,
// so you can be a student in one tab and the director in another and watch seats update live.
// When we move to Supabase, only this file changes — pages call the same actions.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as L from "./logic";
import { createSeed } from "./seed";
import type { Course, DB, Role, Round, User } from "./types";


const DB_KEY = "option-demo-db-v10";
const DB_VERSION = 10;
const SESSION_KEY = "option-session";

type Toast = { id: number; kind: "ok" | "error"; text: string };

interface Store {
  /** The data the signed-in person works with: their programme only (the DSI team picks one). */
  db: DB;
  /** Everything, across programmes — for the DSI portal. */
  school: DB;
  viewProgramme: string;
  setViewProgramme: (id: string) => void;
  now: Date;
  user: User | null;
  ready: boolean;
  toasts: Toast[];
  /** Signs in through one entry point; returns the user or an error message. */
  login: (username: string, password: string, roles: Role[]) => User | string;
  /** Runs any rule from logic.ts against the latest data, saves it and shows a toast. */
  act: (fn: (db: DB, now: Date, me: User | null) => L.Result) => boolean;
  logout: () => void;
  register: (input: L.NewUser) => boolean;
  saveProfile: (user: User) => boolean;
  pick: (courseId: string, motivation?: string) => boolean;
  drop: (selectionId: string) => boolean;
  decide: (selectionId: string, approve: boolean, note?: string) => boolean;
  saveRound: (round: Round) => boolean;
  saveCourse: (course: Course) => boolean;
  deleteCourse: (courseId: string) => boolean;
  resetDemo: () => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<Store | null>(null);

function load(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === DB_VERSION) return parsed;
    }
  } catch {}
  return createSeed();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dbRef = useRef<DB | null>(null);

  const commit = useCallback((next: DB) => {
    dbRef.current = next;
    setDb(next);
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  // Initial load + opening emails.
  useEffect(() => {
    const initial = L.sendOpeningEmails(load(), new Date());
    commit(initial);
    try {
      setUserId(sessionStorage.getItem(SESSION_KEY));
    } catch {}
  }, [commit]);

  // Clock: drives countdowns and round opening/closing.
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNow(n);
      if (dbRef.current) {
        const next = L.sendOpeningEmails(dbRef.current, n);
        if (next !== dbRef.current) commit(next);
      }
    }, 15_000);
    return () => clearInterval(t);
  }, [commit]);

  // Live sync between tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DB_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as DB;
        dbRef.current = next;
        setDb(next);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const run = useCallback(
    (fn: (db: DB, now: Date) => L.Result) => {
      // Always act on the latest stored copy, so two tabs can't oversell a seat.
      let current = dbRef.current!;
      try {
        const raw = localStorage.getItem(DB_KEY);
        if (raw) current = JSON.parse(raw);
      } catch {}
      const res = fn(current, new Date());
      if (!res.ok) {
        toast("error", res.error);
        return false;
      }
      commit(res.db);
      if (res.message) toast("ok", res.message);
      return true;
    },
    [commit, toast],
  );

  const [viewProgramme, setViewProgramme] = useState("");
  const user = useMemo(() => db?.users.find((u) => u.id === userId) ?? null, [db, userId]);
  const pid = user?.programmeId ?? (user?.role === "admin" ? viewProgramme || db?.programmes[0]?.id : undefined);
  const scoped = useMemo(() => (db ? L.scope(db, pid) : null), [db, pid]);

  const value: Store | null = db && scoped
    ? {
        db: scoped,
        school: db,
        viewProgramme: pid ?? db.programmes[0]?.id ?? "",
        setViewProgramme,
        now,
        user,
        ready: true,
        toasts,
        login: (username, password, roles) => {
          const r = L.authenticate(db, username, password, roles);
          if (!r.ok) return r.error;
          setUserId(r.user.id);
          try {
            sessionStorage.setItem(SESSION_KEY, r.user.id);
          } catch {}
          return r.user;
        },
        act: (fn) => run((d, n) => fn(d, n, d.users.find((u) => u.id === userId) ?? null)),
        register: (input) => {
          let newId: string | undefined;
          const ok = run((d, n) => {
            const r = L.registerUser(d, input, n);
            if (r.ok) newId = r.userId;
            return r;
          });
          if (ok && newId) {
            setUserId(newId);
            try {
              sessionStorage.setItem(SESSION_KEY, newId);
            } catch {}
          }
          return ok;
        },
        saveProfile: (u) => run((d) => L.updateProfile(d, u)),
        logout: () => {
          setUserId(null);
          try {
            sessionStorage.removeItem(SESSION_KEY);
          } catch {}
        },
        pick: (courseId, motivation) => run((d, n) => L.pickCourse(d, userId!, courseId, n, motivation)),
        drop: (selectionId) => run((d, n) => L.dropCourse(d, userId!, selectionId, n)),
        decide: (selectionId, approve, note) => run((d, n) => L.decide(d, selectionId, approve, n, note)),
        saveRound: (round) =>
          run((d, n) => {
            const r = L.updateRound(d, round);
            return r.ok ? { ...r, db: L.sendOpeningEmails(r.db, n) } : r;
          }),
        saveCourse: (course) => run((d) => L.saveCourse(d, course)),
        deleteCourse: (courseId) => run((d) => L.deleteCourse(d, courseId)),
        resetDemo: () => {
          commit(L.sendOpeningEmails(createSeed(), new Date()));
          toast("ok", "Demo data reset.");
        },
        dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
      }
    : null;

  if (!value) {
    return (
      <div className="grid min-h-screen place-items-center text-ink/50">
        <span className="animate-pulse font-display text-2xl">OPtioN!</span>
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
