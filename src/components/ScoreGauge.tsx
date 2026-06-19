// 総合スコアを計器的なリングで表示する。
interface Props {
  score: number;
  grade: string;
}

// 機能的なスコア配色（chrome は無彩色、色はデータにのみ使う）
function colorForScore(score: number): string {
  if (score >= 80) return "#059669"; // emerald-600
  if (score >= 65) return "#0284c7"; // sky-600
  if (score >= 50) return "#d97706"; // amber-600
  return "#e11d48"; // rose-600
}

export default function ScoreGauge({ score, grade }: Props) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = colorForScore(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="172" height="172" viewBox="0 0 172 172" className="-rotate-90">
        <circle cx="86" cy="86" r={radius} fill="none" strokeWidth="10" className="gauge-track" />
        <circle
          cx="86"
          cy="86"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-5xl font-semibold tabular-nums text-ink">{score}</span>
        <span className="label-mono mt-0.5">Score / 100</span>
        <span className="mt-2 flex items-center gap-1.5">
          <span className="label-mono">Grade</span>
          <span className="font-display text-sm font-bold" style={{ color }}>
            {grade}
          </span>
        </span>
      </div>
    </div>
  );
}
