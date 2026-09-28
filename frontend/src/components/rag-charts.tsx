import { useState } from "react";
import type { UsagePoint } from "@/lib/api";

interface AreaChartProps {
  data: UsagePoint[];
  height?: number;
}

export function RAGAreaChart({ data, height = 200 }: AreaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
        Aucune donnée d'utilisation disponible
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.queries), 10);
  const paddingX = 30;
  const paddingY = 20;
  const width = 600;

  // Calcul des coordonnées des points
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (d.queries / maxVal) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  // Générer le chemin SVG lissé (Bézier spline)
  const dPath = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = arr[i - 1];
    if (!prev) return acc;
    const cx = (prev.x + point.x) / 2;
    return `${acc} C ${cx},${prev.y} ${cx},${point.y} ${point.x},${point.y}`;
  }, "");

  const areaPath = `${dPath} L ${points[points.length - 1]?.x || width},${height - paddingY} L ${points[0]?.x || 0},${height - paddingY} Z`;

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ragAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#AA0033" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#959EC9" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#28264B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ragLineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#AA0033" />
            <stop offset="50%" stopColor="#959EC9" />
            <stop offset="100%" stopColor="#28264B" />
          </linearGradient>
        </defs>

        {/* Lignes de repère horizontales */}
        {[0, 0.5, 1].map((ratio) => {
          const y = height - paddingY - ratio * (height - 2 * paddingY);
          return (
            <line
              key={ratio}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="currentColor"
              strokeDasharray="3 3"
              className="text-border/60"
            />
          );
        })}

        {/* Surface dégradée */}
        <path d={areaPath} fill="url(#ragAreaGradient)" />

        {/* Courbe */}
        <path
          d={dPath}
          fill="none"
          stroke="url(#ragLineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Points interactifs */}
        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? 6 : 4}
              className="fill-background stroke-[#AA0033] stroke-2 transition-all"
            />
            {/* Zone invisible large pour faciliter le hover */}
            <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
          </g>
        ))}

        {/* Étiquettes X */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px] font-mono"
          >
            {p.date}
          </text>
        ))}
      </svg>

      {/* Tooltip flottant */}
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute -top-8 rounded-lg border border-[#4E5174]/40 bg-[#28264B] px-2.5 py-1 text-xs text-[#E8EAE7] shadow-lg transition-all transform -translate-x-1/2"
          style={{ left: `${(hoveredPoint.x / width) * 100}%` }}
        >
          <span className="font-semibold text-[#959EC9]">{hoveredPoint.queries} requêtes</span> ({hoveredPoint.date})
        </div>
      )}
    </div>
  );
}

interface RadialGaugeProps {
  score: number; // 0 to 1
  label: string;
  sublabel?: string;
  size?: number;
}

export function RAGRadialGauge({ score, label, sublabel, size = 90 }: RadialGaugeProps) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(Math.max(score, 0), 1);
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="size-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Cercle arrière plan */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-secondary"
            fill="none"
          />
          {/* Cercle de progression */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="stroke-[#AA0033] dark:stroke-[#959EC9] transition-all duration-700"
            fill="none"
          />
        </svg>
        <span className="absolute text-sm font-bold font-mono text-[#28264B] dark:text-[#E8EAE7]">
          {Math.round(percent * 100)}%
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-[#28264B] dark:text-[#E8EAE7]">{label}</p>
      {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
    </div>
  );
}
