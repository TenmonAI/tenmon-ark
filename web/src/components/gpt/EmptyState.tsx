import React from "react";

interface EmptyStateProps {
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  { icon: "☽", label: "宿曜鑑定の結果を深掘りしたい" },
  { icon: "🔥", label: "最近の悩みを相談したい" },
  { icon: "✦", label: "天聞アークについて教えて" },
  { icon: "💫", label: "言霊の意味を知りたい" },
];

export function EmptyState({ onSuggestion }: EmptyStateProps) {
  return (
    <div className="gpt-empty-state">
      <div className="gpt-empty-state-inner">
        <img
          src="brand/tenmon-ark-mark.svg"
          alt=""
          className="gpt-empty-state-mark"
          aria-hidden="true"
        />
        <h2 className="gpt-empty-state-title">天聞アーク</h2>
        <p className="gpt-empty-state-sub">
          存在構造の総合解読AI
        </p>
        <p className="gpt-empty-state-desc">
          宿曜経・言霊学・五行思想を融合した独自の解析で、
          あなたの「いまここ」を読み解きます。
          何でもお気軽にお聞きください。
        </p>
        <div className="gpt-empty-state-suggestions">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              type="button"
              className="gpt-empty-state-chip"
              onClick={() => onSuggestion(s.label)}
            >
              <span className="gpt-empty-state-chip-icon" aria-hidden="true">
                {s.icon}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
