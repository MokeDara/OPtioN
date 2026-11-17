"use client";
import Link from "next/link";
import { BookOpen, Building2, Calendar, ExternalLink, FileText, GraduationCap, Mail, MapPin, Newspaper, Users } from "lucide-react";
import { useT } from "@/lib/prefs";

type FooterLink = { label: string; href: string; icon?: typeof Users; external?: boolean };

const QUICK: FooterLink[] = [
  { label: "People", href: "https://www.dsi.uminho.pt/people", icon: Users },
  { label: "Courses", href: "https://www.dsi.uminho.pt/estudar", icon: BookOpen },
  { label: "News", href: "https://www.dsi.uminho.pt/noticias", icon: Newspaper },
];
const ACADEMIC: FooterLink[] = [
  { label: "Documentation", href: "https://www.dsi.uminho.pt/documentacao", icon: FileText },
  { label: "Calendar", href: "https://www.dsi.uminho.pt/calendario", icon: Calendar },
  { label: "University of Minho", href: "https://www.uminho.pt/", external: true },
  { label: "School of Engineering", href: "https://www.eng.uminho.pt/", external: true },
];
const ACCESS: FooterLink[] = [
  { label: "Professor login", href: "/staff", icon: GraduationCap },
  { label: "Admin portal", href: "/portal", icon: Building2 },
];

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  const t = useT();
  return (
    <div>
      <h3 className="font-display text-base font-bold text-white">{t(title)}</h3>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map(({ label, href, icon: Icon, external }) => {
          const inner = (
            <>
              {Icon && <Icon className="size-4 shrink-0" />}
              {t(label)}
              {external && <ExternalLink className="size-3" />}
            </>
          );
          const cls = "inline-flex items-center gap-2 text-white/75 transition hover:text-white";
          return (
            <li key={href}>
              {href.startsWith("/") ? (
                <Link href={href} className={cls}>{inner}</Link>
              ) : (
                <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Site footer: DSI identity, links to the department's site, contact and the staff entry points. */
export function SiteFooter() {
  const t = useT();
  return (
    <footer className="bg-brand-dark text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr_1fr]">
        <div>
          <a href="https://www.dsi.uminho.pt/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-brand font-display text-lg font-bold">DSI</span>
            <span>
              <span className="block font-display text-lg font-bold leading-tight">DSI UMinho</span>
              <span className="block text-sm text-white/75">{t("Department of Information Systems")}</span>
            </span>
          </a>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/75">
            {t("Training tomorrow's digital leaders through innovative courses and cutting-edge research in information technologies.")}
          </p>
        </div>
        <Column title="Quick Links" links={QUICK} />
        <Column title="Academic" links={ACADEMIC} />
        <div>
          <h3 className="font-display text-base font-bold">{t("Contact")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>
                Campus de Azurém
                <br />
                4804-533 Guimarães
                <br />
                Portugal
              </span>
            </li>
            <li>
              <a href="mailto:dara@option.pt" className="inline-flex items-center gap-2 transition hover:text-white">
                <Mail className="size-4 shrink-0" /> dara@option.pt
              </a>
            </li>
          </ul>
        </div>
        <Column title="Access" links={ACCESS} />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-white/55">
          <span>© {new Date().getFullYear()} OPtioN!</span>
          <a href="https://www.dsi.uminho.pt/" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">
            {t("Department of Information Systems | University of Minho")}
          </a>
        </div>
      </div>
    </footer>
  );
}
