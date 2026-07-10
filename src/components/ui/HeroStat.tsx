"use client";

import { useCountUp } from "./useCountUp";

interface HeroStatProps {
  eyebrow: string;
  value: number;
  sub: string;
  ok?: boolean;
  action?: React.ReactNode;
}

export default function HeroStat({ eyebrow, value, sub, ok, action }: HeroStatProps) {
  const shown = useCountUp(value);
  return (
    <div className={`rp-hero${ok ? " rp-hero--ok" : ""}`}>
      <div className="rp-hero__eyebrow">{eyebrow}</div>
      <div className="rp-hero__value">{String(shown).padStart(2, "0")}</div>
      <div className="rp-hero__sub">{sub}</div>
      {action && <div className="rp-hero__action">{action}</div>}
    </div>
  );
}
