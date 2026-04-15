/**
 * MANUS-UI-04: 宿名チャット文脈表示バー
 * チャット上部に固定表示し、「いま何の鑑定の話か」を常に可視化する。
 * 宿名チャット時のみ表示。
 */
import React from "react";
import { formatShukuLabel } from "../../lib/shukuLabel";

export interface SukuyouContext {
  honmeiShuku: string;
  disasterType: string;
  reversalAxis: string;
}

interface Props {
  context: SukuyouContext | null;
}

export function SukuyouContextBar({ context }: Props) {
  if (!context || !context.honmeiShuku) return null;

  const shukuLabel = formatShukuLabel(context.honmeiShuku);
  const parts: string[] = [shukuLabel];
  if (context.disasterType) parts.push(context.disasterType);
  if (context.reversalAxis) parts.push(context.reversalAxis);

  return (
    <div className="sukuyou-context-bar">
      <span className="sukuyou-context-icon">☆</span>
      <span className="sukuyou-context-text">
        {parts.join("　｜　")}
      </span>
    </div>
  );
}
