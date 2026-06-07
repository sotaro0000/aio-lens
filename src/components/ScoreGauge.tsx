// 総合スコアを円形ゲージで表示する。
interface Props {
  score: number;
  grade: string;
}

function colorForScore(score: number): string {
  if (score >= 80) return "#16a34a"; // green-600
  if (score >= 65) return "#2563eb"; // blue-600
  if (score >= 50) return "#d97706"; // amber-600
  return "#dc2626"; // red-600
}

export default function ScoreGauge({ score, grade }: Props) {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = colorForScore(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
        <circle cx="90" cy="90" r={radius} fill="none" strokeWidth="14" className="gauge-track" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-xs font-medium text-slate-400">/ 100</span>
        <span className="mt-1 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: color }}>
          GRADE {grade}
        </span>
      </div>
    </div>
  );
}
