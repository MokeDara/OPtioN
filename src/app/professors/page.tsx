"use client";
import { AppHeader, useRequireRole } from "@/components/ui";
import { Professors } from "@/components/professors";
import { useStore } from "@/lib/store";

/** Director view: the professors teaching in this Master's. */
export default function ProfessorsPage() {
  const user = useRequireRole(["director", "assistant"]);
  const { db } = useStore();
  if (!user) return null;
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-display text-3xl font-bold">Professors · {db.programme.short}</h1>
        <p className="mb-6 mt-1 text-ink/60">The professors teaching in your Master&apos;s and their courses. Send each one their student list in one click.</p>
        <Professors canEdit={false} onlyProgramme />
      </main>
    </>
  );
}
