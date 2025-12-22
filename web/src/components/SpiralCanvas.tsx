import React from "react";
import { KanagiTrace } from "../types/kanagi";

type Props = {
  trace: KanagiTrace;
};

export const SpiralCanvas: React.FC<Props> = ({ trace }) => {
  const depth = trace.meta.spiralDepth;

  // 半径と角度で螺旋を描く（SVG）
  const points = Array.from({ length: depth }, (_, i) => {
    const angle = i * 0.8;
    const radius = 10 + i * 6;
    return {
      x: 150 + radius * Math.cos(angle),
      y: 150 + radius * Math.sin(angle),
    };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg width={300} height={300}>
      <path
        d={path}
        fill="none"
        stroke="#7a5cff"
        strokeWidth={2}
      />
      {/* 正中 */}
      {trace.form === "WELL" && (
        <circle cx={150} cy={150} r={6} fill="#ffb703" />
      )}
    </svg>
  );
};

