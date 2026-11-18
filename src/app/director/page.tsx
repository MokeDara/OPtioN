"use client";
import { useState } from "react";
import { FileSpreadsheet, RotateCcw } from "lucide-react";
import { AppHeader, Countdown, RoundPill, useRequireRole } from "@/components/ui";
import { Courses, download } from "@/components/staff";
import { Requests, Rounds, Students } from "@/components/programme-admin";
import { useStore } from "@/lib/store";
import { currentRound, generalListCsv, incompleteStudents, roundState, seatsLeft, seatsTaken, students } from "@/lib/logic";
import type { Year } from "@/lib/types";

type Tab = "requests" | "courses" | "rounds" | "students";

export default function DirectorPage() {
  const user = useRequireRole(["director", "assistant"]);
  const { db, now, resetDemo } = useStore();
  const [tab, setTab] = useState<Tab>("requests");
  const [year, setYear] = useState<Year>(2);
  if (!user) return null;

  const pendingTotal = db.selections.filter((s) => s.status === "pending").length;
  const round = currentRound(db, year, now)!;
  const yearCourses = db.courses.filter((c) => c.year === year && c.groupId);
  const seatsUsed = yearCourses.reduce((n, c) => n + seatsTaken(db, c.id), 0);
  const seatsAll = yearCourses.reduce((n, c) => n + c.capacity, 0);
  const done = students(db, year).length - incompleteStudents(db, year).length;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "requests", label: "Approval requests", badge: pendingTotal },
    { id: "courses", label: "Courses" },
    { id: "rounds", label: "Selection rounds" },
    { id: "students", label: "Student list" },
  ];

  return (
    <>
      <AppHeader user={user}>
        <span className="hidden whitespace-nowrap rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold lg:inline">{db.programme.short}</span>
      </AppHeader>
      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* Year switch + stats */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-xl border border-line bg-white p-1 text-sm">
              {([1, 2] as Year[]).map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`rounded-lg px-3 py-1.5 font-semibold ${year === y ? "bg-brand text-white" : "text-ink/60 hover:text-ink"}`}
                >
                  Year {y}
                </button>
              ))}
            </div>
            <RoundPill round={round} />
            {roundState(round, now) === "open" && (
              <span className="text-sm text-ink/60">
                closes in <b><Countdown to={round.closesAt} /></b>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => download(`option-general-list-year${year}.csv`, generalListCsv(db, year))} title="ID, name and every Opção for each student">
              <FileSpreadsheet className="size-4" /> General list · Year {year}
            </button>
            <button className="btn-ghost" onClick={() => confirm("Reset all demo data?") && resetDemo()} title="Reset demo data">
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { k: "Students complete", v: `${done}/${students(db, year).length}` },
            { k: "Seats filled", v: `${seatsUsed}/${seatsAll}` },
            { k: "Full courses", v: `${yearCourses.filter((c) => seatsLeft(db, c) === 0).length}/${yearCourses.length}` },
            { k: "Pending requests", v: String(db.selections.filter((s) => s.status === "pending" && yearCourses.some((c) => c.id === s.courseId)).length) },
          ].map((s) => (
            <div key={s.k} className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{s.k}</p>
              <p className="mt-1 font-display text-3xl font-bold">{s.v}</p>
            </div>
          ))}
        </div>

        <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${
                tab === t.id ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {t.label}
              {!!t.badge && <span className="rounded-full bg-amber-400 px-1.5 text-xs text-ink">{t.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "requests" && <Requests />}
          {tab === "courses" && <Courses year={year} />}
          {tab === "rounds" && <Rounds />}
          {tab === "students" && <Students year={year} />}
        </div>
      </main>
    </>
  );
}

