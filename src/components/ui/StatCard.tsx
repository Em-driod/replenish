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
}

export default function StatCard({ icon, label, value, sub, tone = "accent", trend }: StatCardProps) {
  const t = TONE_VARS[tone];
  return (
    <div
      className="rp-stat-card"
      style={{ ["--rp-accent-bar" as string]: t.bar, ["--rp-accent-bar-soft" as string]: t.soft }}
    >
      <div className="rp-stat-card__label">
        <span className="rp-stat-card__icon" style={{ color: t.bar }}>
          <Icon source={icon} tone="inherit" />
        </span>
        {label}
      </div>
      <div className="rp-stat-card__value">{value}</div>
      <div className="rp-stat-card__foot">
        {sub && <span className="rp-stat-card__sub">{sub}</span>}
        {trend && trend.length > 1 && <Sparkline values={trend} color={t.line} />}
      </div>
    </div>
  );
}
