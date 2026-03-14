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
        <textarea
          className="gpt-input gpt-focus-ring gpt-composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("composer.placeholder")}
          disabled={loading}
          rows={2}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const composing = composingRef.current || (e.nativeEvent as unknown as { isComposing?: boolean }).isComposing;
            if (composing) return;
            if (e.shiftKey) return;
            e.preventDefault();
            submit();
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
