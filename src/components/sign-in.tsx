"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo, homeForUser } from "@/components/ui";
import { useStore } from "@/lib/store";
import { PrefsToggle, useT } from "@/lib/prefs";
import type { Role } from "@/lib/types";

/** One sign-in screen per entry point: student link, course director link, DSI portal. */
export function SignInForm({
  roles,
  badge,
  title,
  subtitle,
  idLabel,
  idPlaceholder,
  footer,
  onSignedIn,
  extra,
  showHome = true,
}: {
  roles: Role[];
  badge: string;
  title: string;
  subtitle: string;
  idLabel: string;
  idPlaceholder: string;
  footer?: React.ReactNode;
  onSignedIn?: () => void;
  extra?: React.ReactNode;
  /** Staff and portal sign-in pages stand alone: no link back to the student site. */
  showHome?: boolean;
}) {
  const t = useT();
  return (
    <main className="relative grid min-h-screen place-items-center bg-[radial-gradient(1000px_600px_at_85%_-10%,#f7d4d9_0%,transparent_60%),radial-gradient(800px_500px_at_-10%_110%,#fbe3cf_0%,transparent_60%)] px-5 py-10">
      <PrefsToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md">
        {showHome ? (
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
            <ArrowLeft className="size-4" /> {t("Home")}
          </Link>
        ) : (
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">{badge} access</p>
        )}
        <SignInCard {...{ roles, badge, title, subtitle, idLabel, idPlaceholder, footer, onSignedIn, extra }} />
      </div>
    </main>
  );
}

/** The sign-in card on its own, for pages that put it under something else (e.g. the professor access page). */
export function SignInCard({
  roles,
  badge,
  title,
  subtitle,
  idLabel,
  idPlaceholder,
  footer,
  onSignedIn,
  showLogo = true,
  extra,
}: {
  roles: Role[];
  badge: string;
  title: string;
  subtitle: string;
  idLabel: string;
  idPlaceholder: string;
  footer?: React.ReactNode;
  onSignedIn?: () => void;
  showLogo?: boolean;
  /** Small links under the password field (e.g. "Forgot password?"). */
  extra?: React.ReactNode;
}) {
  const t = useT();
  const { login } = useStore();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    const r = await login(username, password, roles);
    setBusy(false);
    if (typeof r === "string") return setError(t(r));
    if (onSignedIn) onSignedIn();
    else router.push(homeForUser(r));
  };

  return (
    <div className="card p-8">
      {showLogo && (
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" aria-label={t("Home")} className="rounded-md transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-brand">
            <Logo className="text-3xl" />
          </Link>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">{t(badge)}</span>
        </div>
      )}
      <h1 className="font-display text-2xl font-bold">{t(title)}</h1>
      <p className="mt-1 text-sm text-ink/60">{t(subtitle)}</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label className="label" htmlFor="u">{t(idLabel)}</label>
          <input id="u" className="input" placeholder={idPlaceholder} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </div>
        <div>
          <label className="label" htmlFor="p">{t("Password")}</label>
          <input id="p" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {extra}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
        <button className="btn-primary w-full py-3 disabled:opacity-60" disabled={busy}>{busy ? t("Signing in…") : t("Sign in")}</button>
      </form>
      {footer && <div className="mt-4 text-center text-sm text-ink/60">{footer}</div>}

    </div>
  );
}
