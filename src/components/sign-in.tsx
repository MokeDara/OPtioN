"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo, homeFor } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

/** One sign-in screen per entry point: student link, course director link, School of Engineering portal. */
export function SignInForm({
  roles,
  badge,
  title,
  subtitle,
  idLabel,
  idPlaceholder,
  demo,
  footer,
  onSignedIn,
  showHome = true,
}: {
  roles: Role[];
  badge: string;
  title: string;
  subtitle: string;
  idLabel: string;
  idPlaceholder: string;
  demo: { label: string; username: string; icon?: React.ReactNode }[];
  footer?: React.ReactNode;
  onSignedIn?: () => void;
  /** Staff and portal sign-in pages stand alone: no link back to the student site. */
  showHome?: boolean;
}) {
  const { login } = useStore();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (u = username, p = password) => {
    const r = login(u, p, roles);
    if (typeof r === "string") return setError(r);
    if (onSignedIn) onSignedIn();
    else router.push(homeFor(r.role));
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(1000px_600px_at_85%_-10%,#f7d4d9_0%,transparent_60%),radial-gradient(800px_500px_at_-10%_110%,#fbe3cf_0%,transparent_60%)] px-5 py-10">
      <div className="w-full max-w-md">
        {showHome ? (
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
            <ArrowLeft className="size-4" /> Home
          </Link>
        ) : (
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">{badge} access</p>
        )}
        <div className="card p-8">
          <div className="flex items-center justify-between">
            <Logo className="text-3xl" />
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">{badge}</span>
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-ink/60">{subtitle}</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div>
              <label className="label" htmlFor="u">{idLabel}</label>
              <input id="u" className="input" placeholder={idPlaceholder} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="p">Password</label>
              <input id="p" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
            <button className="btn-primary w-full py-3">Sign in</button>
          </form>
          {footer && <div className="mt-4 text-center text-sm text-ink/60">{footer}</div>}

          <div className="mt-8 rounded-xl bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Demo · password “option”</p>
            <div className={`mt-3 grid gap-2 ${demo.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {demo.map((d) => (
                <button key={d.username} type="button" className="btn-ghost px-2" onClick={() => submit(d.username, "option")}>
                  {d.icon} {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
