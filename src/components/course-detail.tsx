"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AREAS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/profile";
import type { Course, OptionGroup } from "@/lib/types";

const FALLBACKS = [
  "linear-gradient(135deg,#a6192e,#e2675b)",
  "linear-gradient(135deg,#7e1222,#c2425a)",
  "linear-gradient(135deg,#b23a48,#f2a65a)",
  "linear-gradient(135deg,#5b1020,#a6192e)",
];

/** Course photo, or a red gradient with the course initials if there's no photo or it fails to load. */
export function CourseImage({ course, className = "" }: { course: Pick<Course, "name" | "image">; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = course.name.split(/\s+/).filter((w) => w.length > 3 || /^[A-Z]/.test(w)).map((w) => w[0]).slice(0, 3).join("");
  if (course.image && !failed)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={course.image} alt="" loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
  const bg = FALLBACKS[[...course.name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % FALLBACKS.length];
  return (
    <span className={`grid place-items-center font-display font-bold text-white/90 ${className}`} style={{ background: bg }} aria-hidden>
      <span className="text-[clamp(0.8rem,2.2vw,2rem)]">{initials}</span>
    </span>
  );
}

const REGIME: Record<Course["semester"], string> = { S1: "Half-yearly (1st semester)", S2: "Half-yearly (2nd semester)", A: "Annual" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h3 className="mb-3 font-display text-lg font-bold text-ink/80">{title}</h3>
      {children}
    </section>
  );
}

function Field({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,180px)_1fr] gap-4 py-1 text-sm">
      <dt className="text-ink/60">{k}</dt>
      <dd className="font-medium">{v || <span className="text-ink/30">—</span>}</dd>
    </div>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink/80">
      {text.split("\n").map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** Floating course sheet, modelled on the university's course-unit pop-up. `children` = OPtioN! seat/actions block. */
export function CourseDetail({
  course,
  group,
  onClose,
  children,
}: {
  course: Course;
  group?: OptionGroup;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const { db } = useStore();
  const professor = db.professors.find((p) => p.id === course.professorId);
  const d = course.details;
  const hasSyllabus = !!(d.objectives || d.outcomes?.length || d.program?.length || d.bibliography?.length || d.teachingMethods || d.assessment);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[2px] sm:p-10" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        aria-labelledby="course-title"
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative flex h-48 shrink-0 items-end justify-between gap-4 overflow-hidden px-6 py-5 text-white">
          <CourseImage course={course} className="absolute inset-0 size-full" />
          <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              {group ? `${group.name} · optional` : "Mandatory"} · Year {course.year} · {course.semester === "A" ? "Annual" : course.semester}
            </p>
            <h2 id="course-title" className="mt-1 font-display text-2xl font-bold leading-tight">{course.name}</h2>
          </div>
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/90 p-1.5 text-ink hover:bg-white" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-6">
          {children && <div className="mb-8 rounded-xl border border-line bg-paper p-4">{children}</div>}

          <Section title="General information">
            <dl>
              <Field k="Code" v={course.code} />
              <Field k="Main scientific area" v={AREAS[course.area] ?? course.area} />
              <Field k="Regime" v={REGIME[course.semester]} />
              <Field k="ECTS" v={course.ects} />
              <Field k="Teaching type" v={d.teachingType} />
              <Field k="Language of instruction" v={d.language} />
            </dl>
          </Section>

          <Section title="Contacts">
            {professor ? (
              <div className="flex items-center gap-3">
                <Avatar user={professor} size={44} />
                <div className="text-sm">
                  <p className="font-semibold">{professor.title} {professor.name}</p>
                  <a href={`mailto:${professor.email}`} className="text-brand hover:underline">{professor.email}</a>
                  {professor.office && <p className="text-ink/50">{professor.office}</p>}
                </div>
              </div>
            ) : (
              <span className="text-sm text-ink/30">—</span>
            )}
            {course.requiresApproval && course.courseDirector && <p className="mt-3 text-sm text-ink/60">Seat requests are decided by: {course.courseDirector}</p>}
          </Section>

          {(d.classHours || d.autonomousHours) && (
            <Section title="Contact hours">
              <dl>
                <Field k="Autonomous work" v={d.autonomousHours ? `${d.autonomousHours} hours` : undefined} />
                <Field k="Classes" v={d.classHours ? `${d.classHours} hours${d.classType ? ` — ${d.classType}` : ""}` : undefined} />
              </dl>
            </Section>
          )}

          {!hasSyllabus && (
            <Section title="About this course">
              <p className="text-sm leading-relaxed text-ink/80">{course.description}</p>
              <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink/50">
                The full syllabus hasn&apos;t been added yet. The director can add it under Courses → Edit.
              </p>
            </Section>
          )}

          {d.objectives && (
            <Section title="Objectives of education">
              <Paragraphs text={d.objectives} />
            </Section>
          )}

          {!!d.outcomes?.length && (
            <Section title="Key learning outcomes">
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink/80">
                {d.outcomes.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </Section>
          )}

          {!!d.program?.length && (
            <Section title="Program summary">
              <ol className="space-y-3 text-sm">
                {d.program.map((p, i) => (
                  <li key={i}>
                    <p className="font-semibold">
                      {i + 1}. {p.title}
                    </p>
                    <p className="text-ink/75">{p.text}</p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {!!d.bibliography?.length && (
            <Section title="Essential bibliography">
              <ul className="space-y-1.5 text-sm text-ink/80">
                {d.bibliography.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </Section>
          )}

          {d.teachingMethods && (
            <Section title="Teaching methods">
              <Paragraphs text={d.teachingMethods} />
            </Section>
          )}

          {d.assessment && (
            <Section title="Assessment methods">
              <Paragraphs text={d.assessment} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
