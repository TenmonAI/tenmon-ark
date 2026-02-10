import React, { useState } from "react";
import { SettingsPanel } from "../SettingsPanel";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "data", label: "Data controls" },
  { id: "about", label: "About" },
] as const;

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [section, setSection] = useState<string>("general");

  if (!open) return null;

  return (
    <div className="gpt-settings-backdrop" onClick={onClose} role="presentation">
      <div className="gpt-settings-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Settings">
        <nav className="gpt-settings-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`gpt-settings-nav-item ${section === s.id ? "gpt-sidebar-item-active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="gpt-scroll gpt-settings-body">
          <div className="gpt-settings-header">
            <h2 className="gpt-settings-title">Settings</h2>
            <button type="button" className="gpt-btn" onClick={onClose}>
              Close
            </button>
          </div>
          {section === "data" ? (
            <SettingsPanel open={true} onClose={onClose} onImported={() => window.location.reload()} />
          ) : (
            <p className="gpt-page-sub">{section} — Coming soon</p>
          )}
        </div>
      </div>
    </div>
  );
}
