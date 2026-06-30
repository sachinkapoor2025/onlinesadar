"use client";

import { useState } from "react";

interface BarChartProps {
  data: { label: string; value: number; secondary?: number }[];
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
  showSecondary?: boolean;
}

export function BarChart({
  data,
  primaryColor = "#183a68",
  secondaryColor = "#16a34a",
  height = 160,
  showSecondary = false,
}: BarChartProps) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  const max = Math.max(1, ...data.flatMap((d) => [d.value, d.secondary ?? 0]));

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end group min-w-0">
            <div className="w-full flex items-end justify-center gap-0.5" style={{ height: "100%" }}>
              <div
                className="flex-1 rounded-t transition-all opacity-90 group-hover:opacity-100"
                style={{
                  backgroundColor: primaryColor,
                  height: `${(d.value / max) * 100}%`,
                  minHeight: d.value > 0 ? 4 : 0,
                }}
                title={`${d.label}: ${d.value.toLocaleString()}${showSecondary && d.secondary != null ? ` / ${d.secondary} purchases` : ""}`}
              />
              {showSecondary && (
                <div
                  className="flex-1 rounded-t transition-all opacity-90 group-hover:opacity-100"
                  style={{
                    backgroundColor: secondaryColor,
                    height: `${((d.secondary ?? 0) / max) * 100}%`,
                    minHeight: (d.secondary ?? 0) > 0 ? 4 : 0,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 text-[10px] text-slate-400">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center truncate" title={d.label}>
            {i === 0 || i === data.length - 1 || data.length <= 7
              ? d.label.slice(5)
              : i % Math.ceil(data.length / 6) === 0
                ? d.label.slice(5)
                : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

interface HorizontalBarProps {
  items: { label: string; value: number; sub?: string }[];
  color?: string;
  maxItems?: number;
}

export function HorizontalBarChart({
  items,
  color = "#183a68",
  maxItems = 10,
}: HorizontalBarProps) {
  const slice = items.slice(0, maxItems);
  if (!slice.length) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }
  const max = Math.max(1, ...slice.map((i) => i.value));

  return (
    <div className="space-y-3">
      {slice.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-1 gap-2">
            <span className="truncate text-slate-700" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-slate-500">
              {item.value.toLocaleString()}
              {item.sub ? ` · ${item.sub}` : ""}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface AreaChartProps {
  data: { label: string; value: number; secondary?: number }[];
  color?: string;
  secondaryColor?: string;
  height?: number;
  showSecondary?: boolean;
  valueLabel?: string;
  secondaryLabel?: string;
}

export function AreaChart({
  data,
  color = "#183a68",
  secondaryColor = "#16a34a",
  height = 140,
  showSecondary = false,
  valueLabel = "Value",
  secondaryLabel = "Orders",
}: AreaChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data.length) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.value, showSecondary ? (d.secondary ?? 0) : 0])
  );
  const width = 100;
  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
    const y = height - (d.value / max) * (height - 8);
    return { x, y, d };
  });
  const areaPath = `M0,${height} L${points.map((p) => `${p.x},${p.y}`).join(" L")} L${width},${height} Z`;
  const linePath = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;

  const hovered = hoverIdx != null ? data[hoverIdx] : null;

  return (
    <div className="relative">
      {hovered && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap">
          <div className="font-semibold">{hovered.label}</div>
          <div>
            {valueLabel}: {hovered.value.toLocaleString()}
            {showSecondary && hovered.secondary != null && (
              <> · {secondaryLabel}: {hovered.secondary.toLocaleString()}</>
            )}
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <rect
            key={p.d.label}
            x={i === 0 ? 0 : (points[i - 1]!.x + p.x) / 2}
            y={0}
            width={
              i === 0
                ? data.length === 1
                  ? width
                  : (points[1]!.x + p.x) / 2
                : i === data.length - 1
                  ? width - (points[i - 1]!.x + p.x) / 2
                  : (p.x - points[i - 1]!.x) / 2 + (points[i + 1]!.x - p.x) / 2
            }
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
        {points.map((p, i) => (
          <circle
            key={`dot-${p.d.label}`}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 2.5 : 1.5}
            fill={color}
            className="pointer-events-none"
          />
        ))}
        {showSecondary &&
          data.map((d, i) => {
            const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
            const y = height - ((d.secondary ?? 0) / max) * (height - 8);
            return (
              <circle
                key={`sec-${d.label}`}
                cx={x}
                cy={y}
                r={1.5}
                fill={secondaryColor}
                className="pointer-events-none"
              />
            );
          })}
      </svg>
      <div className="flex gap-1 text-[10px] text-slate-400 mt-1">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center truncate" title={d.label}>
            {i === 0 || i === data.length - 1 || data.length <= 7
              ? d.label.slice(-5)
              : i % Math.ceil(data.length / 6) === 0
                ? d.label.slice(-5)
                : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
