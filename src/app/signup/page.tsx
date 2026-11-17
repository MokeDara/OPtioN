"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui";
import { ProfileFields } from "@/components/profile";
import { useStore } from "@/lib/store";
import { PrefsToggle } from "@/lib/prefs";
import type { User } from "@/lib/types";

const empty = (): User => ({ id: "", username: "", password: "", name: "", email: "", role: "student" });

export default function SignupPage() {
  const { register, school } = useStore();
  const router = useRouter();
  const [u, setU] = useState<User>(empty());
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const set = (patch: Partial<User>) => setU((x) => ({ ...x, ...patch }));
  const student = true;

  const submit = () => {
    setError("");
    if (u.password !== confirm) return setError("The two passwords don't match.");
    const { id: _id, ...input } = u;
    void _id;
    if (register(input)) router.push("/student");
  };

  return (
    <main className="relative min-h-screen bg-[radial-gradient(1200px_600px_at_80%_-10%,#f7d4d9_0%,transparent_60%),radial-gradient(900px_500px_at_-10%_110%,#fbe3cf_0%,transparent_60%)] px-5 py-10">
      <PrefsToggle className="absolute right-4 top-4" />
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <form
          className="card p-8"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Logo className="text-3xl" />
          <h1 className="mt-6 font-display text-2xl font-bold">Create your student account</h1>
          <p className="mt-1 text-sm text-ink/60">Your profile helps the course director know who you are when you request a seat. Staff accounts are created by the department.</p>

          <p className="mt-8 text-xs font-bold uppercase tracking-wider text-brand">Account</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="su-prog">Programme</label>
              <select id="su-prog" className="input" value={u.programmeId ?? ""} onChange={(e) => set({ programmeId: e.target.value || undefined })} required>
                <option value="" disabled>Choose your programme…</option>
                {school.programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short} — {p.name} ({p.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="su-id">{student ? "Student number" : "Username"}</label>
              <input id="su-id" className="input" value={u.username} onChange={(e) => set({ username: e.target.value.trim() })} placeholder={student ? "pg55000" : "jsilva"} required={student} autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="su-email">Email</label>
              <input id="su-email" type="email" className="input" value={u.email} onChange={(e) => set({ email: e.target.value.trim() })} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="su-pw">Password</label>
              <input id="su-pw" type="password" className="input" value={u.password} onChange={(e) => set({ password: e.target.value })} minLength={6} required autoComplete="new-password" />
            </div>
            <div>
              <label className="label" htmlFor="su-pw2">Repeat password</label>
              <input id="su-pw2" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
          </div>

          <p className="mb-3 mt-8 text-xs font-bold uppercase tracking-wider text-brand">Profile</p>
          <ProfileFields u={u} set={set} onError={setError} />

          {error && <p className="mt-6 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
          <button className="btn-brand mt-6 w-full py-3 text-base">Create account</button>
          <p className="mt-4 text-center text-sm text-ink/60">
            Already registered? <Link href="/login" className="font-semibold text-brand hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
