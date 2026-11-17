"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BellRing, Gauge, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { Countdown, DEPARTMENT_LINE, Logo, RoundPill, homeForUser } from "@/components/ui";
import { CoverFlow, type FlowItem } from "@/components/cover-flow";
import { CourseDetail } from "@/components/course-detail";
import { SiteFooter } from "@/components/site-footer";
import { useStore } from "@/lib/store";
import { PrefsToggle, useT } from "@/lib/prefs";
import { roundState } from "@/lib/logic";

export default function Home() {
  const { db, now, user, school } = useStore();
  const t = useT();
  // One line per year: the signed-in student's programme, otherwise the first one (MEGSI).
  const rounds = db.rounds.filter((r) => r.programmeId === db.programme.id).sort((a, b) => a.year - b.year);
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  // Carousel: options of the open round first, then the other options — course names only.
  const openYears = rounds.filter((r) => roundState(r, now) === "open").map((r) => r.year);
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
            <PrefsToggle />
            {user ? (
              <Link href={homeForUser(user)} className="btn-primary">
                {t("Open dashboard")} <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn-ghost hidden border-transparent bg-white/60 sm:inline-flex">
                  {t("Create account")}
                </Link>
                <Link href="/login" className="btn-primary">
                  {t("Sign in")} <ArrowRight className="size-4" />
                </Link>
              </>
            )}
          </div>
        </nav>

        <section className="relative mx-auto grid max-w-6xl items-center gap-6 px-5 pb-14 pt-6 lg:grid-cols-[1fr_1.15fr] lg:pt-12">
          <div>
            <p className="mb-5 inline-block rounded-full border border-brand/20 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand backdrop-blur">
              {t(DEPARTMENT_LINE)}
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl">
              {t("Pick your optionals.")}
              <br />
              <span className="relative">
                {t("Design your degree.")}
                <span className="absolute -bottom-1 left-0 -z-10 h-4 w-full -rotate-1 bg-brand/20" />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink/70">
              {t("For the Master's of the Department of Information Systems")}
              <br />— {school.programmes.map((p) => p.short).join(", ")}.
              <br />
              {t("When your selection window opens, every option is listed with its live seat count. Grab a seat, or request one from the course director and get the answer here.")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link href={homeForUser(user)} className="btn-brand px-6 py-3 text-base shadow-lg shadow-brand/25">
                  {t(user.role === "student" ? "Choose my options" : "Open dashboard")} <ArrowRight className="size-4" />
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn-brand px-6 py-3 text-base shadow-lg shadow-brand/25">
                    <LogIn className="size-4" /> {t("Sign in with my student number")}
                  </Link>
                  <Link href="/signup" className="btn-ghost px-6 py-3 text-base">
                    <UserPlus className="size-4" /> {t("First time? Create account")}
                  </Link>
                </>
              )}
            </div>

            <div className="mt-10 flex flex-col gap-2 sm:max-w-md">
              {rounds.map((r) => {
                const st = roundState(r, now);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
                    <span className="text-sm">
                      <span className="font-semibold">{t(`Year ${r.year} options`)}</span>
                      {st === "open" && (
                        <span className="text-ink/60">
                          {" "}· {t("closes in")} <Countdown to={r.closesAt} />
                        </span>
                      )}
                      {st === "upcoming" && (
                        <span className="text-ink/60">
                          {" "}· {t("opens in")} <Countdown to={r.opensAt} />
                        </span>
                      )}
                    </span>
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
            { icon: BellRing, title: "One email, one link", d: "Everyone in your year is notified the moment the window opens. Every later update lands in your OPtioN! inbox." },
            { icon: Gauge, title: "Live seats", d: "First come, first served. You see exactly how many students are admitted and how many seats are left." },
            { icon: ShieldCheck, title: "Director approval, tracked", d: "Dissertation, Project Work and some options need the course director's acceptance. Your request and the answer live in one place." },
          ].map(({ icon: Icon, title, d }) => (
            <div key={title}>
              <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{t(title)}</h3>
              <p className="mt-1 text-sm text-ink/65">{t(d)}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
      {detail && <CourseDetail course={detail} group={db.groups.find((g) => g.id === detail.groupId)} onClose={() => setOpenCourse(null)} />}
    </main>
  );
}
