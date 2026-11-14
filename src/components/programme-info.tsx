"use client";
import { Briefcase, Building2, ChevronDown, GraduationCap, Mail, MapPin, Phone, Target } from "lucide-react";
import type { Programme } from "@/lib/types";

function Section({ icon: Icon, title, children, open = false }: { icon: typeof Target; title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-t border-line" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 font-display font-bold hover:bg-paper/60 [&::-webkit-details-marker]:hidden">
        <Icon className="size-5 text-brand" />
        <span className="flex-1">{title}</span>
        <ChevronDown className="size-4 text-ink/40 transition group-open:rotate-180" />
      </summary>
      <div className="px-6 pb-5 text-sm leading-relaxed text-ink/80">{children}</div>
    </details>
  );
}

/** The official page of a Master's degree, as students see it on their profile. */
export function ProgrammeInfo({ p, schoolContact }: { p: Programme; schoolContact?: string }) {
  const facts: [string, string | number | undefined][] = [
    ["Academic degree", p.degree],
    ["ECTS", p.ects],
    ["Duration", p.duration],
    ["Regime", p.regime],
    ["Location", p.location],
    ["Scientific area", p.scientificArea],
  ];
  return (
    <section id="programme" className="card scroll-mt-24 overflow-hidden">
      <div className="bg-[linear-gradient(120deg,#7e1222_0%,#a6192e_45%,#e2675b_100%)] px-6 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
          My Master&apos;s{p.academicYear && ` · ${p.academicYear}`}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold leading-tight">{p.name}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
          <Building2 className="size-4" /> {p.short} · {p.department}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
        {facts
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => (
            <div key={k} className="bg-white px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{k}</p>
              <p className="font-medium">{v}</p>
            </div>
          ))}
      </div>

      {!!p.contacts?.length && (
        <div className="grid gap-3 border-t border-line p-6 sm:grid-cols-2">
          {p.contacts.map((c) => (
            <div key={c.role + c.name} className="rounded-xl bg-paper p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">{c.role}</p>
              <p className="mt-0.5 font-semibold">{c.name}</p>
              {c.email && (
                <a href={`mailto:${c.email}`} className="mt-1 flex items-center gap-1.5 text-sm text-brand hover:underline">
                  <Mail className="size-3.5" /> {c.email}
                </a>
              )}
              {c.phone && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink/60">
                  <Phone className="size-3.5" /> {c.phone}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {p.description && (
        <Section icon={GraduationCap} title="Description" open>
          <div className="space-y-2">
            {p.description.split("\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </Section>
      )}
      {!!p.learningOutcomes?.length && (
        <Section icon={Target} title="Learning outcomes">
          <ol className="list-decimal space-y-1 pl-5">
            {p.learningOutcomes.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ol>
        </Section>
      )}
      {p.higherEducation && (
        <Section icon={GraduationCap} title="Access to higher education">
          <p>{p.higherEducation}</p>
        </Section>
      )}
      {!!p.careers?.length && (
        <Section icon={Briefcase} title="Career opportunities">
          <ul className="list-disc space-y-1 pl-5">
            {p.careers.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Section>
      )}
      {schoolContact && (
        <p className="flex items-start gap-2 border-t border-line px-6 py-4 text-xs text-ink/50">
          <MapPin className="mt-0.5 size-3.5 shrink-0" /> {schoolContact}
        </p>
      )}
    </section>
  );
}
