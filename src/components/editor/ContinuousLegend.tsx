import React from "react";

type RGBA = [number, number, number, number];

interface VerticalLegendProps {
  buckets: number[]; // length = colours + 1
  colors: RGBA[];
  height?: number | string;
  barThickness?: number;
  labelGap?: number;
  labelMaxWidth?: number;
  maxDecimals?: number;
  isTimestamp?: boolean;
  fontSize?: number;
}

export function ContinuousLegend({
  buckets,
  colors,
  height = 120,
  barThickness = 12,
  labelGap = 6,
  labelMaxWidth = 400,
  maxDecimals = 2,
  isTimestamp = false,
  fontSize = 10,
}: VerticalLegendProps) {
  const bucketCount = buckets.length;

  const tickFormat = React.useMemo(() => {
    if (isTimestamp) return (v: number) => new Date(v).toISOString();
    return (v: number) => {
      const s = String(v);
      const [int, dec = ""] = s.split(".");
      return dec ? `${int}.${dec.slice(0, maxDecimals)}` : int;
    };
  }, [maxDecimals, isTimestamp]);

  const hStyle = typeof height === "number" ? `${height}px` : height;
  const totalWidth = barThickness + labelGap + labelMaxWidth;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        height: hStyle,
        width: `${totalWidth}px`,
        fontSize,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column-reverse",
          width: barThickness,
          height: "100%",
          border: "0.5px solid #000",
          boxSizing: "border-box",
        }}
      >
        {colors.map(([r, g, b, a], i) => (
          <div
            key={i}
            style={{
              flex: 1,
              backgroundColor: `rgba(${r},${g},${b},${a / 255})`,
            }}
          />
        ))}
      </div>

      {/* tick labels */}
      {buckets.map((v, i) => {
        const pct = (i / (bucketCount - 1)) * 100; // 0 → 100 bottom → top
        const top = `${100 - pct}%`; // invert so 0 is bottom
        return (
          <div
            key={i}
            className={`break-words font-mono text-sm leading-tight`}
            style={{
              position: "absolute",
              left: barThickness + labelGap,
              top,
              transform: "translateY(-50%)", // center on breakpoint
              maxWidth: labelMaxWidth,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              cursor: "default",
            }}
          >
            {tickFormat(v)}
          </div>
        );
      })}
    </div>
  );
}
