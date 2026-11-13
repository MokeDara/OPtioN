"use client";
import { AppHeader, useRequireRole } from "@/components/ui";
import { Professors } from "@/components/professors";

export default function ProfessorsPage() {
  const user = useRequireRole(["director", "assistant"]);
  if (!user) return null;
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-display text-3xl font-bold">Professors</h1>
        <p className="mb-6 mt-1 text-ink/60">
          The SchoolThe department&apos;s professorsapos;s professors and the courses they teach. Send each professor their student list in one click. Professors are added by the School of Engineering.
        </p>
        <Professors canEdit={false} />
      </main>
    </>
  );
}
