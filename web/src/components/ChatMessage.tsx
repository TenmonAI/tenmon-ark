import type { Message } from "../types/chat";

// PWA_CHAT_RELEASE_BRIDGE_V1: debug 時のみ route/self/intention 要約を表示（?debug=1 or TENMON_PWA_DEBUG=1）
function DebugBridgeBlock({ payload }: { payload: any }) {
  if (!payload?.decisionFrame?.ku) return null;
  const ku = payload.decisionFrame.ku;
  const mf = ku.meaningFrame ?? {};
  const ks = ku.kanagiSelf ?? {};
  const line = [
    `rr=${String(ku.routeReason ?? "")}`,
    `topicClass=${String(mf.topicClass ?? "")}`,
    `scriptureKey=${String(ku.scriptureKey ?? "")}`,
    `selfPhase=${String(ks.selfPhase ?? "")}`,
    `intentPhase=${String(ks.intentPhase ?? "")}`,
    `driftRisk=${ks.driftRisk ?? ""}`,
    `shouldPersist=${ks.shouldPersist ?? ""}`,
    `shouldRecombine=${ks.shouldRecombine ?? ""}`,
  ].join(" ");
  return (
    <pre
      style={{
        margin: "6px 0 0",
        padding: 6,
        fontSize: 10,
        lineHeight: 1.3,
        opacity: 0.85,
        background: "rgba(0,0,0,0.2)",
        borderRadius: 4,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {line}
    </pre>
  );
}

export function ChatMessage({ message, debugBridgeOn = false }: { message: Message; debugBridgeOn?: boolean }) {
  const isUser = message.role === "user";
  const payload = (message as { _payload?: any })._payload;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        margin: "6px 0"
      }}
    >
      <div
        style={{
          maxWidth: 760,
          padding: "10px 12px",
          borderRadius: 10,
          background: isUser ? "#1f2937" : "#111827",
          color: "#e5e7eb",
          border: "1px solid #374151",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word"
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{isUser ? "user" : "assistant"}</div>
        <div>{message.content}</div>
        {debugBridgeOn && !isUser && payload ? <DebugBridgeBlock payload={payload} /> : null}
      </div>
    </div>
  );
}
