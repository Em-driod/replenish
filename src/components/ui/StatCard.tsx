import { Icon } from "@shopify/polaris";
import Sparkline from "./Sparkline";

type Tone = "accent" | "good" | "warn" | "bad";
type IconSource = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

const TONE_VARS: Record<Tone, { bar: string; soft: string; line: string }> = {
  accent: { bar: "var(--rp-accent)", soft: "var(--rp-accent-soft)", line: "var(--rp-accent-deep)" },
  good: { bar: "var(--rp-good)", soft: "var(--rp-good-soft)", line: "var(--rp-good)" },
  warn: { bar: "var(--rp-warn)", soft: "var(--rp-warn-soft)", line: "var(--rp-warn)" },
  bad: { bar: "var(--rp-bad)", soft: "var(--rp-bad-soft)", line: "var(--rp-bad)" },
};

interface StatCardProps {
  icon: IconSource;
  label: string;
  value: string | number;
  sub?: string;
  tone?: Tone;
  trend?: number[];
  /** 0-100: draws a progress ring around the icon bubble instead of a flat fill. */
  ringPercent?: number;
}

export default function StatCard({ icon, label, value, sub, tone = "accent", trend, ringPercent }: StatCardProps) {
  const t = TONE_VARS[tone];
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = ringPercent != null ? circumference - (ringPercent / 100) * circumference : 0;

  return (
    <div
      className="rp-stat-card"
      style={{ ["--rp-accent-bar" as string]: t.bar, ["--rp-accent-bar-soft" as string]: t.soft }}
    >
      <div className="rp-stat-card__icon-wrap">
        {ringPercent != null && (
          <svg className="rp-stat-card__ring" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--rp-line)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r={radius} fill="none" stroke={t.bar} strokeWidth="3"
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
              transform="rotate(-90 24 24)"
            />
          </svg>
        )}
        <span className="rp-stat-card__icon" style={{ background: t.bar, color: "#fff" }}>
          <Icon source={icon} tone="inherit" />
        </span>
      </div>
      <div className="rp-stat-card__label">{label}</div>
      <div className="rp-stat-card__value">{value}</div>
      <div className="rp-stat-card__foot">
        {sub && <span className="rp-stat-card__sub">{sub}</span>}
        {trend && trend.length > 1 && <Sparkline values={trend} color={t.line} />}
      </div>
    </div>
  );
}
