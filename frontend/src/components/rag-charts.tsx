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
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ragLineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#0ea5e9" />
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
              className="text-slate-200"
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
          <g
            key={i}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? 6 : 4}
              className="fill-white stroke-indigo-600 stroke-2 transition-all shadow-sm"
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
            className="fill-slate-400 text-[10px] font-mono"
          >
            {p.date}
          </text>
        ))}
      </svg>

      {/* Tooltip flottant */}
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute -top-8 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white shadow-lg transition-all transform -translate-x-1/2"
          style={{ left: `${(hoveredPoint.x / width) * 100}%` }}
        >
          <span className="font-semibold text-indigo-300">{hoveredPoint.queries} questions</span> (
          {hoveredPoint.date})
        </div>
      )}
    </div>
  );
}

interface RadialGaugeProps {
  score: number | null;
  label: string;
  sublabel?: string;
  size?: number;
}

export function RAGRadialGauge({ score, label, sublabel, size = 90 }: RadialGaugeProps) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = score == null ? 0 : Math.min(Math.max(score, 0), 1);
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg className="size-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Cercle arrière plan */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-slate-100"
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
            className={
              score == null ? "stroke-slate-200" : "stroke-indigo-600 transition-all duration-700"
            }
            fill="none"
          />
        </svg>
        <span className="absolute text-sm font-bold font-mono text-slate-900">
          {score == null ? "—" : `${Math.round(percent * 100)}%`}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-800">{label}</p>
      {sublabel && <p className="text-[10px] text-slate-500">{sublabel}</p>}
    </div>
  );
}
