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
        <span className="gpt-topbar-mark" aria-hidden="true" />
        <span className="gpt-topbar-title">{title}</span>
      </div>
      <div>
        <span className="gpt-topbar-meta">{t("topbar.chatMeta")}</span>
      </div>
    </header>
  );
}
