"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check } from "lucide-react";
import { AppHeader, RoundPill, useRequireRole } from "@/components/ui";
import { useStore } from "@/lib/store";
import { ruleSummary, staffProgrammes } from "@/lib/logic";

/** Step 1 for directors and assistants: pick the Master's to work on. Everything after shows only that programme. */
export default function ChooseProgrammePage() {
  const user = useRequireRole(["director", "assistant"]);
  const { school, viewProgramme, programmeChosen, setViewProgramme } = useStore();
  const router = useRouter();
  if (!user) return null;

  const list = staffProgrammes(school, user);
  const open = (id: string) => {
    setViewProgramme(id);
    router.push("/director");
  };

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">{school.school}</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Which Master&apos;s are you working on?</h1>
        <p className="mt-1 text-ink/60">
          Each Master&apos;s has its own dashboard, courses and option rules. You can switch at any time from the top bar.
        </p>

        {list.length === 0 && (
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-amber-900">
            You don&apos;t have access to any Master&apos;s yet. Use the help button to ask the School of Engineering.
          </p>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {list.map((p) => {
            const role =
              user.programmeId === p.id ? (user.role === "director" ? "Course director" : "Assistant") : "Access granted by the School";
            const students = school.users.filter((u) => u.role === "student" && u.programmeId === p.id).length;
            const courseIds = new Set(school.courses.filter((c) => c.programmeId === p.id).map((c) => c.id));
            const pending = school.selections.filter((s) => s.status === "pending" && courseIds.has(s.courseId)).length;
            const rules = ruleSummary(school, p.id);
            const current = programmeChosen && viewProgramme === p.id;
            return (
              <button
                key={p.id}
                onClick={() => open(p.id)}
                className={`group card flex flex-col p-6 text-left transition hover:-translate-y-0.5 hover:shadow-xl ${current ? "ring-2 ring-brand" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-bold text-brand">{p.short}</p>
                    <p className="font-semibold leading-snug">{p.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/50">
                      <Building2 className="size-3.5" /> {p.department}
                      {p.academicYear && ` · ${p.academicYear}`}
                    </p>
                  </div>
                  {current ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-white">
                      <Check className="size-3.5" /> Current
                    </span>
                  ) : (
                    <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/60">{role}</span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    { k: "students", v: students },
                    { k: "options", v: school.courses.filter((c) => c.programmeId === p.id && c.groupId).length },
                    { k: "pending", v: pending },
                  ].map((x) => (
                    <div key={x.k} className="rounded-xl bg-paper py-2">
                      <p className="font-display text-xl font-bold">{x.v}</p>
                      <p className="text-[11px] text-ink/50">{x.k}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-2">
                  {rules.map((y) => {
                    const round = school.rounds.find((r) => r.programmeId === p.id && r.year === y.year);
                    return (
                      <div key={y.year} className="flex items-center justify-between gap-3 text-sm">
                        <span>
                          <b>Year {y.year}:</b>{" "}
                          {y.slots.length ? (
                            <span className="text-ink/70">
                              {y.courses} option{y.courses === 1 ? "" : "s"} · {y.ects} ECTS ({y.slots.map((s) => s.name).join(", ")})
                            </span>
                          ) : (
                            <span className="text-ink/40">no option rules yet</span>
                          )}
                        </span>
                        {round && <RoundPill round={round} />}
                      </div>
                    );
                  })}
                </div>

                <span className="mt-6 inline-flex items-center gap-1.5 self-end text-sm font-semibold text-brand">
                  Open {p.short} dashboard <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </>
  );
}
