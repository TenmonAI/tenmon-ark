/**
 * MANUS-UI-05: 応答状態インジケータ
 * 4段階の状態表現で「精度落ちた？」「壊れた？」と感じさせない。
 *
 * mode:
 *   "normal"  — 通常応答生成中
 *   "deep"    — 深い解析中（Oracle系・宿名チャット）
 *   "simple"  — 簡易応答（failsoft後の再送時など）
 */
import React, { useState, useEffect } from "react";

const PHASE_SETS: Record<string, string[]> = {
  normal: [
    "読み解いています",
    "流れを整えています",
    "ことばを結んでいます",
  ],
  deep: [
    "深い層を読み解いています",
    "存在の構造を照らしています",
    "真相を言葉に結んでいます",
  ],
  simple: [
    "要点をまとめています",
  ],
};

interface Props {
  mode?: "normal" | "deep" | "simple";
}

export function TypingIndicator({ mode = "normal" }: Props) {
  const phases = PHASE_SETS[mode] || PHASE_SETS.normal;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);
  }, [mode]);

  useEffect(() => {
    if (phases.length <= 1) return;
    const id = setInterval(() => {
      setPhase((p) => (p + 1) % phases.length);
    }, mode === "deep" ? 4000 : 3200);
    return () => clearInterval(id);
  }, [phases, mode]);

  return (
    <div className={`gpt-typing-wrap ${mode === "deep" ? "gpt-typing-deep" : ""}`}>
      <span className="gpt-typing-label">
        {phases[phase % phases.length]}
      </span>
      <span className="gpt-typing-dots">
        <span className="gpt-typing-dot" />
        <span className="gpt-typing-dot" />
        <span className="gpt-typing-dot" />
      </span>
    </div>
  );
}
