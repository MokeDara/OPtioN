"use client";
// Data layer: Supabase. Signs people in with Supabase Auth, loads what row-level security lets them see,
// runs the rules from logic.ts for instant feedback and writes the changes back. The database checks
// everything again (roles, seats, rounds), and Realtime pushes other people's changes to every open screen.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as L from "./logic";
import { createClient } from "./supabase/client";
import { supabaseConfigured } from "./supabase/env";
import { NO_PROGRAMME, diff, emptyDB, friendly, loadDB, save, type LoginJob } from "./supabase/data";
import type { Course, DB, Role, Round, User } from "./types";

type Toast = { id: number; kind: "ok" | "error"; text: string };

export type SignUpResult = { ok: true; confirmEmail: boolean } | { ok: false; error: string };

interface Store {
  /** The data the signed-in person works with: their programme only (the DSI team picks one). */
  db: DB;
  /** Everything they may see, across programmes — for the DSI portal. */
  school: DB;
  viewProgramme: string;
  setViewProgramme: (id: string) => void;
  now: Date;
  user: User | null;
  ready: boolean;
  toasts: Toast[];
  /** Signs in with a username or an email; returns the user or an error message. */
  login: (login: string, password: string, roles: Role[]) => Promise<User | string>;
  /** Runs any rule from logic.ts against the latest data, saves it and shows a toast. */
  act: (fn: (db: DB, now: Date, me: User | null) => L.Result) => boolean;
  logout: () => Promise<void>;
  /** Student sign-up: creates the login and the profile. */
  register: (input: L.NewUser) => Promise<SignUpResult>;
  saveProfile: (user: User) => boolean;
  changePassword: (current: string, next: string) => Promise<boolean>;
  /** Emails a link to choose a new password. */
  forgotPassword: (email: string) => Promise<boolean>;
  pick: (courseId: string, motivation?: string) => boolean;
  drop: (selectionId: string) => boolean;
  decide: (selectionId: string, approve: boolean, note?: string) => boolean;
  saveRound: (round: Round) => boolean;
  saveCourse: (course: Course) => boolean;
  deleteCourse: (courseId: string) => boolean;
  /** Reloads everything from the database. */
  refresh: () => Promise<void>;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<Store | null>(null);

/** Round-opening notices, sent by the DSI team's or the course director's open screen for the rounds they run. */
function openingEmails(db: DB, me: User | null, now: Date): DB {
  if (!me) return db;
  if (me.role === "admin") return L.sendOpeningEmails(db, now);
  if ((me.role === "director" || me.role === "assistant") && me.programmeId) {
    const mine = db.rounds.filter((r) => r.programmeId === me.programmeId);
    const next = L.sendOpeningEmails({ ...db, rounds: mine }, now);
    if (next.rounds === mine) return db;
    const changed = new Map(next.rounds.map((r) => [r.id, r]));
    return { ...next, rounds: db.rounds.map((r) => changed.get(r.id) ?? r) };
  }
  return db;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl font-bold">OPtioN! isn&apos;t connected to its database</p>
          <p className="mt-2 text-sm text-ink/60">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (or in Vercel), then restart.</p>
        </div>
      </div>
    );
  }
  return <SupabaseStore>{children}</SupabaseStore>;
}

function SupabaseStore({ children }: { children: React.ReactNode }) {
  const sb = useMemo<SupabaseClient>(() => createClient(), []);
  const [db, setDb] = useState<DB | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dbRef = useRef<DB | null>(null);
  const userRef = useRef<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 4500);
  }, []);

  const setData = useCallback((next: DB) => {
    dbRef.current = next;
    setDb(next);
  }, []);

  /** Loads everything for the current session. Returns the signed-in profile (or null). */
  const reload = useCallback(async (): Promise<User | null> => {
    const { data: session } = await sb.auth.getSession();
    const authId = session.session?.user.id;
    try {
      const next = await loadDB(sb, !!authId);
      let me: User | null = null;
      if (authId) {
        const { data: row } = await sb.from("profiles").select("id").eq("auth_id", authId).maybeSingle();
        me = next.users.find((u) => u.id === row?.id) ?? null;
      }
      userRef.current = me?.id ?? null;
      setUserId(me?.id ?? null);
      setData(next);
      setLoadError("");
      return me;
    } catch (e) {
      setLoadError(friendly((e as Error).message));
      return null;
    }
  }, [sb, setData]);

  /** Reload soon, once local writes have finished (Realtime events arrive in bursts). */
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      if (pending.current > 0) return scheduleReload();
      void reload();
    }, 600);
  }, [reload]);

  // First load, and again whenever someone signs in or out.
  useEffect(() => {
    void reload();
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") scheduleReload();
    });
    return () => data.subscription.unsubscribe();
  }, [sb, reload, scheduleReload]);

  // Live updates: any change someone else makes (that this person may see) refreshes the data.
  useEffect(() => {
    const channel = sb
      .channel("option-live")
      .on("postgres_changes", { event: "*", schema: "public" }, () => scheduleReload())
      .subscribe();
    const onFocus = () => scheduleReload();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      void sb.removeChannel(channel);
    };
  }, [sb, userId, scheduleReload]);

  /** Writes the difference between two versions of the data, one change set at a time. */
  const persist = useCallback(
    (prev: DB, next: DB) => {
      const { ops, logins } = diff(prev, next);
      if (!ops.length && !logins.length) return;
      pending.current++;
      queue.current = queue.current.then(async () => {
        try {
          await save(sb, ops);
          for (const job of logins) await createLogin(job);
        } catch (e) {
          toast("error", (e as Error).message);
          scheduleReload();
        } finally {
          pending.current--;
        }
      });
    },
    [sb, toast, scheduleReload],
  );

  // Clock: drives countdowns and round opening/closing.
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNow(n);
      const cur = dbRef.current;
      if (!cur || pending.current > 0) return;
      const me = cur.users.find((u) => u.id === userRef.current) ?? null;
      const next = openingEmails(cur, me, n);
      if (next !== cur) {
        setData(next);
        persist(cur, next);
      }
    }, 15_000);
    return () => clearInterval(t);
  }, [persist, setData]);

  const run = useCallback(
    (fn: (db: DB, now: Date) => L.Result) => {
      const current = dbRef.current;
      if (!current) return false;
      const res = fn(current, new Date());
      if (!res.ok) {
        toast("error", res.error);
        return false;
      }
      setData(res.db);
      persist(current, res.db);
      if (res.message) toast("ok", res.message);
      return true;
    },
    [persist, setData, toast],
  );

  const [viewProgramme, setViewProgramme] = useState("");
  const user = useMemo(() => db?.users.find((u) => u.id === userId) ?? null, [db, userId]);
  const pid = user?.programmeId ?? (user?.role === "admin" ? viewProgramme || db?.programmes[0]?.id : undefined);
  const scoped = useMemo(() => {
    if (!db) return null;
    const s = L.scope(db, pid);
    return s.programme ? s : { ...s, programme: NO_PROGRAMME };
  }, [db, pid]);

  if (loadError && !db) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl font-bold">Can&apos;t reach the database</p>
          <p className="mt-2 text-sm text-ink/60">{loadError}</p>
          <button className="btn-primary mt-4" onClick={() => void reload()}>Try again</button>
        </div>
      </div>
    );
  }

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
        login: async (login, password, roles) => {
          const id = login.trim();
          if (!id || !password) return "Enter your username or email and your password.";
          const { data: email, error: lookupError } = await sb.rpc("login_email", { login: id });
          if (lookupError) return friendly(lookupError.message);
          if (!email) return "Wrong username or password.";
          const { error } = await sb.auth.signInWithPassword({ email: String(email), password });
          if (error) return /confirm/i.test(error.message) ? "Confirm your email first: open the link we sent you." : "Wrong username or password.";
          const me = await reload();
          const fail = async (msg: string) => {
            await sb.auth.signOut();
            await reload();
            return msg;
          };
          if (!me) return fail("This login has no OPtioN! account yet. Contact the DSI team.");
          if (me.active === false) return fail("This account has been disabled. Contact the department.");
          if (!roles.includes(me.role)) {
            const where = me.role === "student" ? "the student sign-in" : me.role === "admin" ? "the DSI portal (/portal)" : "the staff sign-in (/staff)";
            return fail(`This account signs in through ${where}.`);
          }
          return me;
        },
        act: (fn) => run((d, n) => fn(d, n, d.users.find((u) => u.id === userId) ?? null)),
        register: async (input) => {
          const username = input.username.trim().toLowerCase();
          if (input.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
          // The same checks as before, on what this visitor can see …
          const check = L.registerUser(db, { ...input, username }, new Date());
          if (!check.ok) return { ok: false, error: check.error };
          // … and the ones only the database can answer.
          const { data: taken } = await sb.rpc("login_email", { login: username });
          if (taken) return { ok: false, error: `${username} already has an account — sign in instead.` };
          const { data, error } = await sb.auth.signUp({
            email: input.email.trim().toLowerCase(),
            password: input.password,
            options: {
              emailRedirectTo: `${window.location.origin}/login`,
              data: {
                signup: "student", username, name: input.name.trim(), programme_id: input.programmeId, year: input.year,
                bio: input.bio ?? "", about: input.about ?? "", aspiration: input.aspiration ?? "", bachelor: input.bachelor ?? null, dob: input.dob ?? "",
              },
            },
          });
          if (error) {
            const msg = /already registered|already exists/i.test(error.message) ? "That email is already registered — sign in instead." : friendly(error.message);
            return { ok: false, error: msg };
          }
          if (!data.session) return { ok: true, confirmEmail: true };
          const me = await reload();
          if (me && input.photo) run((d) => L.updateProfile(d, { ...me, photo: input.photo }));
          if (me) {
            const welcome = { id: L.uid("mail"), to: [me.id], subject: "Welcome to OPtioN!", body: `Hi ${me.name.split(" ")[0]}, your account is ready. You'll get a message here as soon as your option selection opens.`, sentAt: new Date().toISOString() };
            await sb.from("emails").insert({ id: welcome.id, to_ids: welcome.to, subject: welcome.subject, body: welcome.body, sent_at: welcome.sentAt });
          }
          return { ok: true, confirmEmail: false };
        },
        saveProfile: (u) => run((d) => L.updateProfile(d, u)),
        changePassword: async (current, next) => {
          if (next.length < 6) {
            toast("error", "New password must be at least 6 characters.");
            return false;
          }
          const { data } = await sb.auth.getUser();
          const email = data.user?.email;
          if (!email) return false;
          const check = await sb.auth.signInWithPassword({ email, password: current });
          if (check.error) {
            toast("error", "Current password is wrong.");
            return false;
          }
          const { error } = await sb.auth.updateUser({ password: next });
          if (error) {
            toast("error", friendly(error.message));
            return false;
          }
          toast("ok", "Password changed.");
          return true;
        },
        forgotPassword: async (address) => {
          const email = address.trim().toLowerCase();
          if (!/^\S+@\S+\.\S+$/.test(email)) {
            toast("error", "Enter a valid email address.");
            return false;
          }
          const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
          if (error && !/rate|limit/i.test(error.message)) {
            toast("error", friendly(error.message));
            return false;
          }
          if (error) {
            toast("error", "Too many emails were sent just now. Try again in a few minutes.");
            return false;
          }
          return true;
        },
        logout: async () => {
          await sb.auth.signOut();
          userRef.current = null;
          setUserId(null);
          await reload();
        },
        pick: (courseId, motivation) => run((d, n) => L.pickCourse(d, userId!, courseId, n, motivation)),
        drop: (selectionId) => run((d, n) => L.dropCourse(d, userId!, selectionId, n)),
        decide: (selectionId, approve, note) => run((d, n) => L.decide(d, selectionId, approve, n, note)),
        saveRound: (round) =>
          run((d, n) => {
            const r = L.updateRound(d, round);
            return r.ok ? { ...r, db: openingEmails(r.db, d.users.find((u) => u.id === userId) ?? null, n) } : r;
          }),
        saveCourse: (course) => run((d) => L.saveCourse(d, course)),
        deleteCourse: (courseId) => run((d) => L.deleteCourse(d, courseId)),
        refresh: async () => {
          await reload();
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

/** DSI portal: the server creates the login (or sets the new password) for a staff profile. */
async function createLogin(job: LoginJob) {
  const res = await fetch("/api/admin/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: job.action, profileId: job.profileId, password: job.password }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "" }));
    throw new Error(`Login for ${job.name} not ${job.action === "create" ? "created" : "reset"}: ${error || res.statusText}`);
  }
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
