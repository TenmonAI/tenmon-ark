/**
 * TENMON_REMOTE_CURSOR_COMMAND_CENTER — カード本文・メタのガード（管理者専用パイプライン）
 * DO NOT TOUCH: chat 契約・一般ユーザー route には使わない
 */

export type RemoteRiskTier = "low" | "medium" | "high";

export type RemoteGuardOutcome = {
  rejected: boolean;
  reject_reasons: string[];
  risk_tier: RemoteRiskTier;
  dry_run_only: boolean;
  approval_required: boolean;
  matched_rules: string[];
};

const BLACKLIST_AUTO_REJECT: { id: string; re: RegExp; note: string }[] = [
  { id: "dist", re: /\bdist\/|\bdist\b.*\*\*|\/dist\//i, note: "dist/** 触禁止" },
  { id: "schema", re: /ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE|migration|マイグレーション|DB\s*schema/i, note: "DB schema 変更" },
  { id: "kokuzo_body", re: /kokuzo_pages.*正文|経典\s*本文|kokuzo_pages[^\n]{0,80}改変/i, note: "kokuzo_pages 正文" },
  { id: "systemd", re: /\bsystemd\b|\.service\b|unit\s*file/i, note: "system env / systemd" },
  { id: "chat_contract", re: /\/api\/chat[^\n]*破壊|chat\s*契約\s*破壊/i, note: "/api/chat 契約破壊明示" },
];

const HIGH_RISK_HINTS: { id: string; re: RegExp }[] = [
  { id: "payment", re: /決済|PCI|payment\s*gateway|カード番号/i },
  { id: "chat_ts_body", re: /chat\.ts\s*本体|rewrite\s+chat\.ts|chat\.ts[^\n]{0,40}全面/i },
  { id: "raw_shell", re: /rm\s+-rf\s+\/|curl\s+[^|\n]+\|\s*bash/i },
];

export function guardRemoteCursorPayload(cardName: string, cardBodyMd: string): RemoteGuardOutcome {
  const text = `${cardName}\n${cardBodyMd || ""}`;
  const matched: string[] = [];
  const reject: string[] = [];

  for (const r of BLACKLIST_AUTO_REJECT) {
    if (r.re.test(text)) {
      matched.push(r.id);
      reject.push(`${r.id}: ${r.note}`);
    }
  }

  let tier: RemoteRiskTier = "low";
  for (const h of HIGH_RISK_HINTS) {
    if (h.re.test(text)) {
      matched.push(h.id);
      tier = "high";
    }
  }

  if (/\bapi\/src\/routes\/chat\.ts\b|chat\.ts\s*契約/i.test(text) && tier === "low") {
    tier = "medium";
    matched.push("chat_ts_mention");
  }

  const rejected = reject.length > 0;
  const dry_run_only = tier === "high" && !rejected;
  const approval_required = true;

  return {
    rejected,
    reject_reasons: reject,
    risk_tier: tier,
    dry_run_only,
    approval_required,
    matched_rules: matched,
  };
}

export function guardTouchedFiles(paths: string[]): { ok: boolean; blocked: string[] } {
  const blocked: string[] = [];
  const rules: { id: string; test: (p: string) => boolean }[] = [
    { id: "dist", test: (p) => /(^|\/)dist(\/|$)/i.test(p.replace(/\\/g, "/")) },
    { id: "schema", test: (p) => /migration|schema|\.sql$/i.test(p) },
    { id: "kokuzo_pages", test: (p) => /kokuzo_pages/i.test(p) && /\.(md|txt)$/i.test(p) },
    { id: "chat_ts", test: (p) => /routes\/chat\.ts$/i.test(p.replace(/\\/g, "/")) },
  ];
  for (const rel of paths) {
    const n = String(rel || "").trim();
    if (!n) continue;
    for (const r of rules) {
      if (r.test(n)) blocked.push(`${r.id}:${n}`);
    }
  }
  return { ok: blocked.length === 0, blocked };
}
