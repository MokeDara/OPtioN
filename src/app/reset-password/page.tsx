"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Logo, homeForUser } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/prefs";

/** Where the "reset your password" email lands: the link signs the person in, then they choose a new password. */
export default function ResetPasswordPage() {
  const t = useT();
  const router = useRouter();
  const { user, refresh } = useStore();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [pw, setPw] = useState({ next: "", again: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = createClient();
    // The link's code is exchanged for a session when the client starts; give it a moment.
    const check = () => sb.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setHasSession(true);
    });
    const timer = setTimeout(check, 1200);
    void check();
    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="card w-full max-w-md p-8">
        <Logo className="text-3xl" />
        <h1 className="mt-6 flex items-center gap-2 font-display text-2xl font-bold">
          <KeyRound className="size-5" /> {t("Choose a new password")}
        </h1>
        {hasSession === false ? (
          <p className="mt-3 text-sm text-ink/60">{t("This link has expired or was already used. Ask for a new one from the sign-in page.")}</p>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              if (pw.next.length < 6) return setError(t("New password must be at least 6 characters."));
              if (pw.next !== pw.again) return setError(t("The new passwords don't match."));
              setBusy(true);
              const { error: err } = await createClient().auth.updateUser({ password: pw.next });
              setBusy(false);
              if (err) return setError(err.message);
              await refresh();
              router.push(user ? homeForUser(user) : "/login");
            }}
          >
            <input type="password" className="input" placeholder={t("New password")} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" required />
            <input type="password" className="input" placeholder={t("Repeat new password")} value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} autoComplete="new-password" required />
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
            <button className="btn-brand w-full py-3 disabled:opacity-60" disabled={busy || !hasSession}>{t("Save new password")}</button>
          </form>
        )}
      </div>
    </main>
  );
}
