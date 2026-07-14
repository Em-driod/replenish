"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
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
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--glow-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--glow-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <motion.div
      ref={ref}
      className={`rp-hero${ok ? " rp-hero--ok" : ""}`}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.19, 0.91, 0.38, 1] }}
    >
      <div className="rp-hero__glow" />
      <div className="rp-hero__eyebrow">{eyebrow}</div>
      <div className="rp-hero__value">{String(shown).padStart(2, "0")}</div>
      <div className="rp-hero__sub">{sub}</div>
      {action && <div className="rp-hero__action">{action}</div>}
    </motion.div>
  );
}
