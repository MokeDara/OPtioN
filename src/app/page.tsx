"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BellRing, Building2, Gauge, GraduationCap, KeyRound, ShieldCheck } from "lucide-react";
import { Countdown, Logo, RoundPill, homeFor } from "@/components/ui";
import { CoverFlow, type FlowItem } from "@/components/cover-flow";
import { CourseDetail } from "@/components/course-detail";
import { useStore } from "@/lib/store";
import { roundState } from "@/lib/logic";

export default function Home() {
  const { db, now, user } = useStore();
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  // Carousel: options of the open round first, then the other options — course names only.
  const openYears = db.rounds.filter((r) => roundState(r, now) === "open").map((r) => r.year);
  const options = db.courses
    .filter((c) => c.groupId && c.image)
    .sort((a, b) => Number(openYears.includes(b.year)) - Number(openYears.includes(a.year)));
  const items: FlowItem[] = [...options.slice(0, 2), ...options.slice(2).filter((_, i) => i % 2 === 0).slice(0, 10)].map((c) => ({
    id: c.id,
    image: c.image,
    title: c.name,
    onClick: () => setOpenCourse(c.id),
  }));
  const detail = db.courses.find((c) => c.id === openCourse);

  return (
    <main>
      <div className="relative overflow-hidden bg-[radial-gradient(900px_600px_at_85%_20%,#f6c9cf_0%,transparent_60%),radial-gradient(700px_500px_at_55%_95%,#fbdcc2_0%,transparent_60%),linear-gradient(180deg,#fbf3f1_0%,#f7eeea_100%)]">
        {/* soft blobs */}
        <div className="pointer-events-none absolute -right-32 -top-32 size-[520px] rounded-full bg-brand/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-[420px] rounded-full bg-[#f2a65a]/20 blur-3xl" />

        <nav className="relative mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-2">
            {user ? (
              <Link href={homeFor(user.role)} className="btn-primary">
                Open dashboard <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost hidden border-transparent bg-white/60 sm:inline-flex">
                  <GraduationCap className="size-4" /> Students
                </Link>
                <Link href="/staff" className="btn-primary">
                  <KeyRound className="size-4" /> Course director
                </Link>
              </>
            )}
          </div>
        </nav>

        <section className="relative mx-auto grid max-w-6xl items-center gap-6 px-5 pb-14 pt-6 lg:grid-cols-[1fr_1.15fr] lg:pt-12">
          <div>
            <p className="mb-5 inline-block rounded-full border border-brand/20 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand backdrop-blur">
              {db.school} · Option selection
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl">
              Pick your optionals.
              <br />
              <span className="relative">
                Skip the emails.
                <span className="absolute -bottom-1 left-0 -z-10 h-4 w-full -rotate-1 bg-brand/20" />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink/70">
              For the programmes of the {db.school}, starting with {db.programme.short}. When your selection window opens, every option is listed with its live seat count. Grab a seat, or
              request one from the course director — and get the answer here.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <Link href={user?.role === "student" ? "/student" : "/login"} className="group card flex items-center gap-3 border-brand/20 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className="grid size-11 place-items-center rounded-xl bg-brand text-white shadow-lg shadow-brand/25">
                  <GraduationCap className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">I&apos;m a student</span>
                  <span className="block text-xs text-ink/55">Choose options · new? sign up</span>
                </span>
                <ArrowRight className="size-4 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </Link>
              <Link href={user && user.role !== "student" ? homeFor(user.role) : "/staff"} className="group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className="grid size-11 place-items-center rounded-xl bg-ink text-white">
                  <KeyRound className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Course director</span>
                  <span className="block text-xs text-ink/55">Directors & assistants</span>
                </span>
                <ArrowRight className="size-4 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {db.rounds
                .slice()
                .sort((a, b) => a.year - b.year)
                .map((r) => {
                  const st = roundState(r, now);
                  return (
                    <div key={r.id} className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 py-1.5 pl-3 pr-1.5 text-sm backdrop-blur">
                      <span className="font-semibold">Year {r.year} options</span>
                      {st === "open" && (
                        <span className="text-ink/60">
                          · closes in <Countdown to={r.closesAt} />
                        </span>
                      )}
                      {st === "upcoming" && (
                        <span className="text-ink/60">
                          · opens in <Countdown to={r.opensAt} />
                        </span>
                      )}
                      <RoundPill round={r} />
                    </div>
                  );
                })}
            </div>
          </div>

          <CoverFlow items={items} />
        </section>
      </div>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-3">
          {[
            { icon: BellRing, t: "One email, one link", d: "Everyone in your year is notified the moment the window opens. Every later update lands in your OPtioN! inbox." },
            { icon: Gauge, t: "Live seats", d: "First come, first served. You see exactly how many students are admitted and how many seats are left." },
            { icon: ShieldCheck, t: "Director approval, tracked", d: "Dissertation, Project Work and some options need the course director's acceptance. Your request and the answer live in one place." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t}>
              <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm text-ink/65">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-ink/40">
        <span>© {new Date().getFullYear()} OPtioN!</span>
        <Link href="/portal" className="inline-flex items-center gap-1.5 hover:text-ink">
          <Building2 className="size-3.5" /> School of Engineering portal
        </Link>
      </footer>
      {detail && <CourseDetail course={detail} group={db.groups.find((g) => g.id === detail.groupId)} onClose={() => setOpenCourse(null)} />}
    </main>
  );
}
