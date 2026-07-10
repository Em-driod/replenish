interface StockGaugeProps {
  current: number;
  reorderPoint: number | null;
}

export default function StockGauge({ current, reorderPoint }: StockGaugeProps) {
  const ceiling = reorderPoint && reorderPoint > 0 ? reorderPoint * 2 : Math.max(current, 1) * 1.5;
  const pct = Math.max(0, Math.min(100, (current / ceiling) * 100));

  const color =
    current === 0 ? "var(--rp-bad)" :
    reorderPoint != null && current <= reorderPoint ? "var(--rp-warn)" :
    "var(--rp-good)";

  return (
    <div className="rp-gauge">
      <div className="rp-gauge__track">
        <div className="rp-gauge__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="rp-gauge__reading" style={{ color }}>
        {current === 0 ? "0 units" : `${current} units`}
      </span>
    </div>
  );
}
