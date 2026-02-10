import React, { useState } from "react";
import { SettingsPanel } from "../SettingsPanel";
import { useI18n } from "../../i18n/useI18n";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: "general", labelKey: "settings.section.general" },
  { id: "appearance", labelKey: "settings.section.appearance" },
  { id: "language", labelKey: "settings.section.language" },
  { id: "data", labelKey: "settings.section.data" },
  { id: "about", labelKey: "settings.section.about" },
] as const;

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [section, setSection] = useState<string>("general");
  const { t, lang, setLang, supportedLangs } = useI18n();

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
              {t(s.labelKey)}
            </button>
          ))}
        </nav>
        <div className="gpt-scroll gpt-settings-body">
          <div className="gpt-settings-header">
            <h2 className="gpt-settings-title">{t("settings.title")}</h2>
            <button type="button" className="gpt-btn" onClick={onClose}>
              {t("settings.close")}
            </button>
          </div>
          {section === "data" ? (
            <SettingsPanel open={true} onClose={onClose} onImported={() => window.location.reload()} />
          ) : section === "language" ? (
            <div className="gpt-page-card">
              <h3 className="gpt-page-card-title">{t("settings.language.title")}</h3>
              <p className="gpt-page-sub">{t("settings.language.subtitle")}</p>
              <label className="gpt-page-card">
                <span className="gpt-page-card-title">{t("settings.language.label")}</span>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  style={{ marginTop: 6, padding: "6px 10px", fontSize: "14px" }}
                >
                  {supportedLangs.map((code) => (
                    <option key={code} value={code}>
                      {t(`settings.language.option.${code}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <p className="gpt-page-sub">{t("settings.comingSoon")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
