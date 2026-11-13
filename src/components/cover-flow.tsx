"use client";
import { useEffect, useState } from "react";

export interface FlowItem {
  id: string;
  image?: string;
  title: string;
  tag?: string; // chip on the card, e.g. "Opção 3"
  caption?: string; // label under the card
  onClick?: () => void;
}

/**
 * 3D cover-flow carousel: cards stand on a curve, the centre card faces you and
 * the others turn away into the distance. Auto-advances; pauses on hover; respects reduced motion.
 */
export function CoverFlow({ items, interval = 2800 }: { items: FlowItem[]; interval?: number }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (paused || reduced || n < 2) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), interval);
    return () => clearInterval(t);
  }, [paused, reduced, n, interval]);

  if (n === 0) return null;

  return (
    <div
      className="relative h-[420px] w-full overflow-hidden [perspective:1400px] [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)] sm:h-[470px] lg:-mr-10 lg:w-[calc(100%+2.5rem)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* floor shadow under the front card */}
      <div className="absolute left-1/2 top-[82%] h-8 w-64 -translate-x-1/2 rounded-[50%] bg-ink/25 blur-2xl" />

      <div className="absolute inset-0 [transform-style:preserve-3d]">
        {items.map((it, i) => {
          let off = i - active;
          if (off > n / 2) off -= n;
          if (off < -n / 2) off += n;
          const abs = Math.abs(off);
          const hidden = abs > 2.5;
          return (
            <button
              key={it.id}
              type="button"
              tabIndex={off === 0 ? 0 : -1}
              aria-hidden={off !== 0}
              onClick={() => (off === 0 ? it.onClick?.() : setActive(i))}
              className="absolute left-1/2 top-[44%] w-[190px] text-left outline-none sm:w-[230px]"
              style={{
                transform: `translate(-50%, -50%) translateX(calc(${off} * var(--flow-gap))) translateZ(${-abs * 170}px) rotateY(${-off * 34}deg)`,
                zIndex: 100 - Math.round(abs * 10),
                opacity: hidden ? 0 : 1 - abs * 0.12,
                pointerEvents: hidden ? "none" : "auto",
                transition: reduced ? "none" : "transform 900ms cubic-bezier(.22,.75,.2,1), opacity 600ms ease",
                ["--flow-gap" as string]: "clamp(120px, 17vw, 175px)",
              }}
            >
              <span
                className={`relative block aspect-[3/4] overflow-hidden rounded-[26px] bg-white shadow-[0_30px_60px_-20px_rgba(60,10,20,.45)] ring-1 ring-black/5 transition ${
                  off === 0 ? "ring-4 ring-white/80" : ""
                }`}
              >
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <span className="absolute inset-0 bg-[linear-gradient(135deg,#a6192e,#f2a65a)]" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                {it.tag && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-brand">{it.tag}</span>}
                <span className="absolute bottom-4 left-4 right-4 font-display text-base font-bold leading-tight text-white sm:text-lg">{it.title}</span>
                {off === 0 && it.onClick && <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-brand">View</span>}
              </span>
              {it.caption && (
                <span className={`mt-3 block text-center text-xs font-medium transition-opacity ${off === 0 ? "text-ink/70 opacity-100" : "text-ink/50 opacity-70"}`}>
                  {it.caption}
                </span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
