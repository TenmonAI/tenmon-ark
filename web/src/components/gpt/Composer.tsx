import React, { useState, useRef } from "react";
import { useI18n } from "../../i18n/useI18n";

interface ComposerProps {
  onSend: (text: string) => void;
  loading: boolean;
}

export function Composer({ onSend, loading }: ComposerProps) {
  const [text, setText] = useState("");
  const composingRef = useRef(false);
  const { t } = useI18n();

  const submit = () => {
    const v = text.trim();
    if (!v || loading) return;
    setText("");
    onSend(v);
  };

  return (
    <div className="gpt-composer-wrap">
      <div className="gpt-composer-inner">
        <input
          className="gpt-input gpt-focus-ring gpt-composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("composer.placeholder")}
          disabled={loading}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          onKeyDown={(e) => {
            const comp = composingRef.current || (e.nativeEvent as unknown as { isComposing?: boolean }).isComposing;
            if (e.key === "Enter" && !e.shiftKey && !comp) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className="gpt-btn gpt-btn-primary gpt-focus-ring gpt-composer-btn"
          onClick={submit}
          disabled={loading || !text.trim()}
          aria-label="Send"
        >
          {loading ? <span className="gpt-spinner" aria-hidden /> : <span>➤</span>}
        </button>
      </div>
    </div>
  );
}
