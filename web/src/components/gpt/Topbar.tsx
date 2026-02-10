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
        <span className="gpt-mark-wrap" aria-hidden="true">
          <img className="gpt-mark-img gpt-mark-img-back" src="brand/tenmon-ark-mark-ui.png" alt="" />
          <img className="gpt-mark-img gpt-mark-img-front" src="brand/tenmon-ark-mark-ui.png" alt="TENMON-ARK" />
        </span>
        <span className="gpt-topbar-title">{title}</span>
      </div>
      <div>
        <span className="gpt-topbar-meta">{t("topbar.chatMeta")}</span>
      </div>
    </header>
  );
}
