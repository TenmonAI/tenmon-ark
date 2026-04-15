import React, { useState, useEffect } from "react";

const PHASES = [
  "読み解いています",
  "流れを整えています",
  "ことばを結んでいます",
];

export function TypingIndicator() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => (p + 1) % PHASES.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="gpt-typing-wrap">
      <span
        className="gpt-typing-label"
        style={{
          fontSize: 12.5,
          letterSpacing: "0.02em",
          color: "var(--gpt-text-muted, #9ca3af)",
          transition: "opacity 0.4s ease",
        }}
      >
        {PHASES[phase]}
      </span>
      <span className="gpt-typing-dots">
        <span className="gpt-typing-dot" />
        <span className="gpt-typing-dot" />
        <span className="gpt-typing-dot" />
      </span>
    </div>
  );
}
