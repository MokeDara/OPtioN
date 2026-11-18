"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { Logo } from "@/components/ui";
import { useStore } from "@/lib/store";
import { PrefsToggle, useT } from "@/lib/prefs";

/** Students (and anyone else): email a link to choose a new password. */
export default function ForgotPasswordPage() {
  const t = useT();
  const { forgotPassword } = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <PrefsToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
          <ArrowLeft className="size-4" /> {t("Back to sign in")}
        </Link>
        <div className="card p-8">
          <Logo className="text-3xl" />
          {sent ? (
            <div className="mt-6 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
              <p className="mt-3 text-sm text-ink/70">{t("If this email has a login, you'll get an email with a link to choose a new password. Check your spam folder too.")}</p>
            </div>
          ) : (
            <form
              className="mt-6"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                if (await forgotPassword(email)) setSent(true);
                setBusy(false);
              }}
            >
              <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
                <KeyRound className="size-5" /> {t("Reset your password")}
              </h1>
              <p className="mt-1 text-sm text-ink/60">{t("Enter the email you use to sign in. We'll email you a link to choose a new password.")}</p>
              <label className="label mt-5" htmlFor="fp">{t("Email")}</label>
              <input id="fp" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <button className="btn-brand mt-5 w-full py-3 disabled:opacity-60" disabled={busy}>{t("Send reset link")}</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
