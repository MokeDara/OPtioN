"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, KeyRound, LogIn, Shield } from "lucide-react";
import { DEPARTMENT_LINE } from "@/components/ui";
import { useStore } from "@/lib/store";
import { PrefsToggle, useT } from "@/lib/prefs";
import { requestAccess } from "@/lib/logic";

/** Shell of the professor pages: department line, "Restricted area for teachers.", language/theme switch. */
export function StaffShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <main className="relative min-h-screen bg-[radial-gradient(1000px_600px_at_85%_-10%,#f7d4d9_0%,transparent_60%),radial-gradient(800px_500px_at_-10%_110%,#fbe3cf_0%,transparent_60%)] px-4 py-12">
      <PrefsToggle className="absolute right-4 top-4" />
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <Shield className="mx-auto size-10 text-ink" strokeWidth={1.75} aria-hidden />
          <h1 className="mt-4 text-balance font-display text-2xl font-bold leading-tight">{t(DEPARTMENT_LINE)}</h1>
          <p className="mt-2 text-sm text-ink/70">{t("Restricted area for teachers.")}</p>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

/** First-time professors: ask for access. The DSI team approves it in the portal and the login is emailed. */
export function RequestAccessForm() {
  const { school, act } = useStore();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // One professor ↔ one course; ticking "more than one" allows several.
  const [several, setSeveral] = useState(false);

  const units = school.courses
    .filter((c) => c.programmeId === programmeId)
    // one entry per unit, even when it appears in several Opção slots
    .filter((c, i, all) => all.findIndex((x) => x.name === c.name) === i)
    .sort((a, b) => a.year - b.year || a.semester.localeCompare(b.semester) || a.name.localeCompare(b.name));
  const sameName = (id: string) => {
    const n = school.courses.find((c) => c.id === id)?.name;
    return school.courses.filter((c) => c.programmeId === programmeId && c.name === n).map((c) => c.id);
  };
  const toggle = (id: string) => {
    const ids = sameName(id);
    if (!several) return setCourseIds(ids);
    setCourseIds((cur) => (cur.includes(id) ? cur.filter((x) => !ids.includes(x)) : [...cur, ...ids]));
  };

  if (sentTo)
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h2 className="mt-3 font-display text-xl font-bold">{t("Request sent")}</h2>
        <p className="mt-2 text-sm text-ink/65">
          {t("Your request is with the department. Once it's approved, your login is created and sent to")} <b className="text-ink">{sentTo}</b>.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="btn-ghost" onClick={() => setSentTo(null)}>
            {t("Send another request")}
          </button>
          <Link href="/staff" className="btn-primary">
            {t("Back to sign in")}
          </Link>
        </div>
      </div>
    );

  return (
    <form
      className="card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (act((d, n) => requestAccess(d, { name, email, programmeId, courseIds }, n))) {
          setSentTo(email.trim().toLowerCase());
          setName("");
          setEmail("");
          setProgrammeId("");
          setCourseIds([]);
        }
      }}
    >
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <LogIn className="size-5" /> {t("Access")}
      </h2>
      <p className="mt-1 text-sm text-ink/60">{t("Enter your institutional email address to request access to OPtioN!.")}</p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="ra-email">{t("Institutional Email")}</label>
          <input id="ra-email" type="email" className="input" placeholder="name@dsi.uminho.pt" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="ra-name">{t("Full name")}</label>
          <input id="ra-name" className="input" placeholder={t("First and last name")} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="ra-prog">{t("Which Master's do you teach in?")}</label>
          <select
            id="ra-prog"
            className="input"
            value={programmeId}
            onChange={(e) => {
              setProgrammeId(e.target.value);
              setCourseIds([]);
            }}
            required
          >
            <option value="" disabled>{t("Choose a Master's…")}</option>
            {school.programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.short} — {p.name}
              </option>
            ))}
          </select>
        </div>
        {programmeId && (
          <fieldset>
            <legend className="label">
              {t(several ? "Curricular units you teach" : "Curricular unit you teach")} <span className="font-normal text-ink/45">{t("(optional)")}</span>
            </legend>
            {units.length ? (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
                {units.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-paper">
                    <input type={several ? "checkbox" : "radio"} name="ra-unit" className="mt-0.5 accent-brand" checked={courseIds.includes(c.id)} onChange={() => toggle(c.id)} />
                    <span className="min-w-0 flex-1">
                      {c.name}
                      <span className="ml-1 text-xs text-ink/45">
                        Y{c.year} · {c.semester === "A" ? t("Annual") : c.semester}
                        {c.groupId ? ` · ${t("option")}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink/50">{t("No curricular units listed for this Master's yet.")}</p>
            )}
            {units.length > 1 && (
              <label className="mt-2 flex items-center gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={several}
                  onChange={(e) => {
                    setSeveral(e.target.checked);
                    if (!e.target.checked) setCourseIds((cur) => (cur.length ? sameName(cur[0]) : cur));
                  }}
                />
                {t("I teach more than one course")}
              </label>
            )}
          </fieldset>
        )}
      </div>

      <button className="btn-brand mt-5 w-full py-3">{t("Send Access Link")}</button>
      <p className="mt-4 text-center text-sm text-ink/60">{t("Only DSI professors have access to this area.")}</p>
      <p className="mt-4 border-t border-line pt-4 text-center text-sm text-ink/60">
        {t("Already have access?")}{" "}
        <Link href="/staff" className="font-semibold text-brand hover:underline">
          {t("Sign in")}
        </Link>
      </p>
    </form>
  );
}

/** "Forgot password?": sends a reset request to the DSI team. */
export function ForgotPasswordForm() {
  const { forgotPassword } = useStore();
  const t = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (sent)
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <p className="mt-3 text-sm text-ink/70">{t("If this email has a login, you'll get an email with a link to choose a new password. Check your spam folder too.")}</p>
        <Link href="/staff" className="btn-primary mt-5">
          {t("Back to sign in")}
        </Link>
      </div>
    );

  return (
    <form
      className="card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void forgotPassword(email).then((ok) => ok && setSent(true));
      }}
    >
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <KeyRound className="size-5" /> {t("Reset your password")}
      </h2>
      <p className="mt-1 text-sm text-ink/60">{t("Enter the email you use to sign in. We'll email you a link to choose a new password.")}</p>
      <div className="mt-5">
        <label className="label" htmlFor="fp-email">{t("Email")}</label>
        <input id="fp-email" type="email" className="input" placeholder="name@dsi.uminho.pt" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <button className="btn-brand mt-5 w-full py-3">{t("Send reset link")}</button>
      <p className="mt-4 text-center text-sm">
        <Link href="/staff" className="font-semibold text-brand hover:underline">
          {t("Back to sign in")}
        </Link>
      </p>
    </form>
  );
}
