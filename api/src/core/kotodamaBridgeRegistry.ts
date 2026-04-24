/**
 * KOTODAMA_BRIDGE_REGISTRY_V1
 *
 * TENMON の設計した「言灵→天聞アーク橋渡し」経路を runtime に固定化する。
 *
 * 背景:
 *   - Notion 言灵秘書データベースには原典が格納されている
 *   - 原典はそのまま開発側に渡さず、橋渡しページ経由で
 *     要約・原則・判断フローへ変換される
 *   - 分離完成メモは言灵DBと開発DBの分離方針を固定する
 *
 * 参照:
 *   - KOTODAMA_CONSTITUTION_V1 第 6 条 (正典階層)
 *   - KOTODAMA_SOURCE_LINK_AUDIT_V1_20260424 (橋渡し未接続指摘)
 *
 * 本レジストリは **静的定数のみ**。Notion MCP 実取得は別カード。
 */

export type KotodamaBridgeRole =
  | "primary_bridge"
  | "separation_policy"
  | "database_entry"
  | "category_index"
  | "operation_rule"
  | "completion_memo"
  | "maintenance_todo";

export type KotodamaBridgeEntry = {
  id: string;
  pageId: string;
  pageIdNoHyphen: string;
  title: string;
  role: KotodamaBridgeRole;
  authority: "single_entry_point" | "policy_fixed" | "reference";
  constitutionRef: string;
  notes: string;
};

/**
 * TENMON 裁定で既知の橋渡し・運用ページ群（本カードでは上記 2 件のみ固定）。
 */
export const KOTODAMA_BRIDGE_REGISTRY_V1: readonly KotodamaBridgeEntry[] = [
  {
    id: "kotodama_bridge_primary_v1",
    pageId: "33d65146-58e6-8187-b8dd-d7638fdddaa5",
    pageIdNoHyphen: "33d6514658e68187b8ddd7638fdddaa5",
    title: "言灵→天聞アーク橋渡し",
    role: "primary_bridge",
    authority: "single_entry_point",
    constitutionRef: "KOTODAMA_CONSTITUTION_V1 #6 (正典階層)",
    notes:
      "原典を直接 runtime に渡さず、要約・原則・判断フローへ変換する中間ページ。" +
      "開発側への唯一の正規入口。",
  },
  {
    id: "kotodama_separation_policy_v1",
    pageId: "33d65146-58e6-8124-85f9-fab4c366cc5a",
    pageIdNoHyphen: "33d6514658e6812485f9fab4c366cc5a",
    title: "言灵DB・開発DB 分離完成メモ",
    role: "separation_policy",
    authority: "policy_fixed",
    constitutionRef: "KOTODAMA_CONSTITUTION_V1 #5 (UI/canonical分離), #6 (階層)",
    notes:
      "言灵DB (研究) と 開発DB (runtime) の分離方針を固定。" +
      "canonical 本体を UI 都合で書き換えない原則の根拠。",
  },
] as const;

export function findKotodamaBridge(role: KotodamaBridgeRole): KotodamaBridgeEntry | null {
  return KOTODAMA_BRIDGE_REGISTRY_V1.find((b) => b.role === role) ?? null;
}

export function findBridgeByPageId(pageId: string): KotodamaBridgeEntry | null {
  const normalized = String(pageId ?? "")
    .replace(/-/g, "")
    .toLowerCase();
  if (!normalized) return null;
  return (
    KOTODAMA_BRIDGE_REGISTRY_V1.find(
      (b) =>
        b.pageIdNoHyphen.toLowerCase() === normalized ||
        b.pageId.replace(/-/g, "").toLowerCase() === normalized,
    ) ?? null
  );
}

export function listAllKotodamaBridges(): readonly KotodamaBridgeEntry[] {
  return KOTODAMA_BRIDGE_REGISTRY_V1;
}

export type KotodamaBridgeHealth = {
  total: number;
  hasPrimaryBridge: boolean;
  hasSeparationPolicy: boolean;
  entries: Array<{
    id: string;
    pageId: string;
    title: string;
    role: KotodamaBridgeRole;
    authority: string;
  }>;
};

export function kotodamaBridgeHealth(): KotodamaBridgeHealth {
  return {
    total: KOTODAMA_BRIDGE_REGISTRY_V1.length,
    hasPrimaryBridge: KOTODAMA_BRIDGE_REGISTRY_V1.some((b) => b.role === "primary_bridge"),
    hasSeparationPolicy: KOTODAMA_BRIDGE_REGISTRY_V1.some((b) => b.role === "separation_policy"),
    entries: KOTODAMA_BRIDGE_REGISTRY_V1.map((b) => ({
      id: b.id,
      pageId: b.pageId,
      title: b.title,
      role: b.role,
      authority: b.authority,
    })),
  };
}
