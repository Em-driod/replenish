const PALETTE = ["#5b5bf0", "#c62e3d", "#14804a", "#a05a00", "#0f7c8c", "#8a3fc7"];

function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
  return (
    <div className="rp-avatar" style={{ background: hashColor(name) }}>
      {initials || "?"}
    </div>
  );
}
