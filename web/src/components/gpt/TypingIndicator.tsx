/**
 * MANUS-UI-05: 応答状態インジケータ（共通化済み）
 *
 * 主ラベル: 常に「TENMON-ARK 思考中」
 * 副文言: mode に応じて自然に切り替わる
 *
 * mode:
 *   "normal"  — 通常応答生成中
 *   "deep"    — 深い解析中（Oracle系・宿名チャット）
 *   "simple"  — 簡易応答（failsoft後の再送時など）
 */
import React, { useState, useEffect } from "react";

const SUB_PHASES: Record<string, string[]> = {
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
  const subs = SUB_PHASES[mode] || SUB_PHASES.normal;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);
  }, [mode]);

  useEffect(() => {
    if (subs.length <= 1) return;
    const id = setInterval(() => {
      setPhase((p) => (p + 1) % subs.length);
    }, mode === "deep" ? 4000 : 3200);
    return () => clearInterval(id);
  }, [subs, mode]);

  return (
    <div className={`gpt-typing-wrap ${mode === "deep" ? "gpt-typing-deep" : ""}`}>
      <div className="gpt-typing-content">
        <span className="gpt-typing-main">TENMON-ARK 思考中</span>
        <span className="gpt-typing-sub">
          {subs[phase % subs.length]}
        </span>
      </div>
      <span className="gpt-typing-dots">
        <span className="gpt-typing-dot" />
        <span className="gpt-typing-dot" />
        <span className="gpt-typing-dot" />
      </span>
    </div>
  );
}
