import React from "react";
import { useI18n } from "../../i18n/useI18n";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "TENMON-ARK" }: TopbarProps) {
  const { t } = useI18n();

  return (
    <header className="gpt-topbar">
      <div className="gpt-topbar-left">
        <img
          src="brand/tenmon-ark-mark.png"
          alt="TENMON-ARK"
          className="gpt-topbar-logo"
        />
        <span className="gpt-topbar-title">{title}</span>
      </div>
      <div>
        <span className="gpt-topbar-meta">{t("topbar.chatMeta")}</span>
      </div>
    </header>
  );
}
