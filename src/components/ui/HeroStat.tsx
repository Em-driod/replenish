"use client";

import { useCountUp } from "./useCountUp";
import StampBadge from "./StampBadge";

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
    <div className="rp-hero">
      <div>
        <div className="rp-hero__eyebrow">{eyebrow}</div>
        <div className="rp-hero__value">{String(shown).padStart(2, "0")}</div>
        <div className="rp-hero__sub">{sub}</div>
        {action && <div className="rp-hero__action">{action}</div>}
      </div>
      <div className="rp-hero__stamp-slot">
        <StampBadge tone={ok ? "good" : "bad"}>{ok ? "All Clear" : "Reorder Now"}</StampBadge>
      </div>
    </div>
  );
}
