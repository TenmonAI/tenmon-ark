import React from "react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "TENMON-ARK" }: TopbarProps) {
  return (
    <header className="gpt-topbar">
      <div>
        <span className="gpt-topbar-title">{title}</span>
      </div>
      <div>
        <span className="gpt-topbar-meta">/api/chat (same-origin)</span>
      </div>
    </header>
  );
}
