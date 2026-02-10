import React from "react";
import { useI18n } from "../../i18n/useI18n";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "TENMON-ARK 1.0" }: TopbarProps) {
  const { t } = useI18n();

  return (
    <header className="gpt-topbar">
      <div className="gpt-topbar-left">
        <img
          src="brand/tenmon-ark-mark.svg"
          alt="TENMON-ARK"
          className="gpt-brand-mark"
        />
        <span className="gpt-topbar-title">{title}</span>
      </div>
      <div>
        <span className="gpt-topbar-meta">{t("topbar.chatMeta")}</span>
      </div>
    </header>
  );
}
