"use client";

type StampTone = "good" | "warn" | "bad";

interface StampBadgeProps {
  tone: StampTone;
  children: React.ReactNode;
}

/** A rotated, bordered ink-stamp badge — the signature status indicator, replacing colored pill badges. */
export default function StampBadge({ tone, children }: StampBadgeProps) {
  return <span className={`rp-stamp rp-stamp--${tone}`}>{children}</span>;
}
