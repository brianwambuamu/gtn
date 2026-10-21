const palettes: [string, string][] = [
  ["#f68220", "#1c74c2"],
  ["#56c8f5", "#0a0a0a"],
  ["#e40000", "#f68220"],
  ["#f68220", "#0a0a0a"],
  ["#1c74c2", "#f68220"],
  ["#0a0a0a", "#f68220"],
];

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

type Props = {
  seed: number;
  ratio?: string;
  className?: string;
};

export default function StoryImage({
  seed,
  ratio = "16 / 9",
  className = "",
}: Props) {
  const [from, to] = palettes[seed % palettes.length];
  const gid = `g${seed}`;
  const r1 = 30 + rand(seed) * 60;
  const r2 = 20 + rand(seed + 1) * 70;
  const cx = 40 + rand(seed + 2) * 320;
  const cy = 30 + rand(seed + 3) * 180;

  return (
    <svg
      className={`story-image ${className}`}
      viewBox="0 0 400 225"
      style={{ aspectRatio: ratio }}
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill={`url(#${gid})`} />
      <circle cx={cx} cy={cy} r={r1} fill="#ffffff" opacity="0.14" />
      <circle cx={400 - cx} cy={225 - cy} r={r2} fill="#ffffff" opacity="0.1" />
      <path
        d={`M0 ${170 - rand(seed + 4) * 60} L140 ${120 + rand(seed + 5) * 60} L260 ${90 + rand(seed + 6) * 80} L400 ${150 - rand(seed + 7) * 50} L400 225 L0 225 Z`}
        fill="#0a0a0a"
        opacity="0.22"
      />
      <rect width="400" height="225" fill="#0a0a0a" opacity="0.06" />
    </svg>
  );
}
