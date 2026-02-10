import React from "react";
import { useI18n } from "../../i18n/useI18n";

const MARK_UI = "brand/tenmon-ark-mark-ui.png";
const MARK_FALLBACK = "brand/tenmon-ark-mark.png";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "TENMON-ARK" }: TopbarProps) {
  const { t } = useI18n();

  return (
    <header className="gpt-topbar">
      <div className="gpt-topbar-left">
        <span className="gpt-mark-wrap" aria-hidden="true">
          <img
            className="gpt-mark-img gpt-mark-img-back"
            src={MARK_UI}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = MARK_FALLBACK;
            }}
          />
          <img
            className="gpt-mark-img gpt-mark-img-front"
            src={MARK_UI}
            alt="TENMON-ARK"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = MARK_FALLBACK;
            }}
          />
        </span>
        <span className="gpt-topbar-title">{title}</span>
      </div>
      <div>
        <span className="gpt-topbar-meta">{t("topbar.chatMeta")}</span>
      </div>
    </header>
  );
}
