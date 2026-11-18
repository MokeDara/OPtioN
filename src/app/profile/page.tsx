"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Pencil } from "lucide-react";
import { AppHeader, homeForUser } from "@/components/ui";
import { ProfileCard, ProfileFields } from "@/components/profile";
import { ProgrammeInfo } from "@/components/programme-info";
import { useStore } from "@/lib/store";
import { directorOf } from "@/lib/logic";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const { db, user, saveProfile, changePassword } = useStore();
  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const [pwError, setPwError] = useState("");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);
  if (!user) return null;

  const home = homeForUser(user);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-5 flex items-center justify-between">
          <Link href={home} className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
            <ArrowLeft className="size-4" /> {user.role === "student" ? "My options" : "Dashboard"}
          </Link>
          {!editing && (
            <button
              className="btn-ghost"
              onClick={() => {
                setDraft(user);
                setEditing(true);
              }}
            >
              <Pencil className="size-4" /> Edit profile
            </button>
          )}
        </div>

        {editing && draft ? (
          <form
            className="card p-6"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (saveProfile(draft)) setEditing(false);
            }}
          >
            <h1 className="mb-5 font-display text-2xl font-bold">Edit profile</h1>
            <ProfileFields u={draft} set={(p) => setDraft({ ...draft, ...p })} onError={setError} />
            {error && <p className="mt-4 text-sm font-medium text-rose-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn-brand">Save profile</button>
            </div>
          </form>
        ) : (
          <ProfileCard db={db} user={user} showPrivate />
        )}

        {user.programmeId && (
          <div className="mt-6">
            <ProgrammeInfo p={db.programme} schoolContact={db.schoolContact} director={directorOf(db, db.programme.id)} />
          </div>
        )}

        <form
          className="card mt-6 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setPwError("");
            if (pw.next !== pw.again) return setPwError("The new passwords don't match.");
            void changePassword(pw.current, pw.next).then((ok) => ok && setPw({ current: "", next: "", again: "" }));
          }}
        >
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <KeyRound className="size-5 text-brand" /> Change password
          </h2>
          {user.role !== "student" && <p className="mt-1 text-sm text-ink/60">If the department sent you a temporary password, change it here.</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <input type="password" className="input" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required />
            <input type="password" className="input" placeholder="New password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" minLength={6} required />
            <input type="password" className="input" placeholder="Repeat new password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} autoComplete="new-password" required />
          </div>
          {pwError && <p className="mt-3 text-sm font-medium text-rose-700">{pwError}</p>}
          <div className="mt-4 flex justify-end">
            <button className="btn-ghost">Update password</button>
          </div>
        </form>
      </main>
    </>
  );
}
