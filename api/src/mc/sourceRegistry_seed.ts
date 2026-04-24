/**
 * CARD-MC-08A-SOURCE-MAP-REALDATA-V1
 *
 * Static seed for TENMON-ARK AI-HUB source map.
 *
 * The purpose of this file is to *guarantee* the minimum set of canonical /
 * backup / derived sources that GPT / Claude / TENMON need to see at a glance,
 * independent of whether the live collector JSON files
 * (`git_state.json`, `live_state.json`, `vps_assets.json`, `notion_sync.json`, ...)
 * have been populated yet.
 *
 * Runtime code (see `buildMcSourceRegistryV1` in `mcVnextSourceMapV1.ts`) will
 * *merge* these seed items with any live state it can observe, so the output
 * of `/api/mc/vnext/sources` is always non-empty and always explains the
 * source of truth.
 *
 * No secrets / tokens / private bodies are ever placed here — only human
 * readable locations and relations. Secrets (api_key / token / password) are
 * additionally scrubbed by `sanitize()` at the response boundary.
 */

import path from "node:path";
import { CANON_DIR, DATA_ROOT, REPO_ROOT } from "../core/mc/constants.js";

export type McSourceRoleV1 = "canonical" | "mirror" | "backup" | "derived";

export type McSourceKindV1 =
  | "notion"
  | "github"
  | "runtime"
  | "backup_vps"
  | "nas"
  | "sacred_corpus"
  | "persona"
  | "learning"
  | "core"
  | "constitution"
  | "mc_hub"
  | "mc_landing";

/**
 * 6-field seed spec mandated by CARD-MC-08A.
 */
export type McSourceSeedV1 = {
  id: string;
  source_kind: McSourceKindV1;
  source_name: string;
  source_uri: string;
  source_role: McSourceRoleV1;
  linked_to: string[];
  last_seen: string | null;
  note?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Canonical seed: the minimum set of sources `/mc/` must always expose.
 *
 * Identifiers are stable so that merge with live-derived entries
 * (GitHub HEAD, Notion DB id, runtime host, ...) keeps the same `id`.
 */
export function buildMcSourceRegistrySeedV1(): McSourceSeedV1[] {
  const ts = nowIso();
  return [
    // --- canonical ---
    {
      id: "notion:workspace",
      source_kind: "notion",
      source_name: "Notion workspace (TENMON-ARK 正本)",
      source_uri: "https://www.notion.so/tenmon-ark",
      source_role: "canonical",
      linked_to: [
        "github:main-repo",
        "corpus:sacred",
        "persona:state-db",
        "learning:scripture-ledger",
      ],
      last_seen: ts,
      note: "天聞アーク正本 Notion。正本ページとタスクベース DB はここから辿る。",
    },
    {
      id: "github:main-repo",
      source_kind: "github",
      source_name: "TenmonAI/tenmon-ark main repo",
      source_uri: "https://github.com/TenmonAI/tenmon-ark",
      source_role: "canonical",
      linked_to: [
        "runtime:primary-vps",
        "learning:scripture-ledger",
        "persona:state-db",
        "core:tenmon-kanagi",
      ],
      last_seen: ts,
      note: "main branch が canonical。feature branch は derived。",
    },
    {
      id: "corpus:sacred",
      source_kind: "sacred_corpus",
      source_name: "Sacred corpus registry",
      source_uri: `sqlite://${path.join(DATA_ROOT, "kokuzo.sqlite")}#sacred_corpus_registry`,
      source_role: "canonical",
      linked_to: [
        "nas:books-mirror",
        "persona:state-db",
        "learning:scripture-ledger",
        "constitution:soul-root",
      ],
      last_seen: ts,
      note: "古事記・日本書紀・先代旧事本紀・カタカムナ等の正典レジストリ。",
    },
    {
      id: "constitution:soul-root",
      source_kind: "constitution",
      source_name: "Soul-root constitutions (docs/ark)",
      source_uri: `file://${CANON_DIR}`,
      source_role: "canonical",
      linked_to: ["github:main-repo", "corpus:sacred", "core:tenmon-kanagi"],
      last_seen: ts,
      note: "天聞アーク魂の根幹。TENMON_ARK_SOUL_ROOT_CONSTITUTION_V1 系。",
    },
    {
      id: "persona:module",
      source_kind: "persona",
      source_name: "TENMON-ARK persona spec",
      source_uri: `file://${path.join(REPO_ROOT, "api/src/core/persona")}`,
      source_role: "canonical",
      linked_to: ["corpus:sacred", "learning:scripture-ledger", "persona:state-db"],
      last_seen: ts,
      note: "TENMON-ARK persona 定義・言霊秘書・いろは・五十連法則の規範。",
    },
    {
      id: "learning:ledger-spec",
      source_kind: "learning",
      source_name: "Scripture learning ledger (spec)",
      source_uri: `sqlite://${path.join(DATA_ROOT, "kokuzo.sqlite")}#scripture_learning_ledger`,
      source_role: "canonical",
      linked_to: ["persona:state-db", "corpus:sacred", "github:main-repo"],
      last_seen: ts,
      note: "学習イベントの正典。append-only。",
    },
    {
      id: "core:tenmon-kanagi",
      source_kind: "core",
      source_name: "Tenmon core (天津金木 / kanagi 回路)",
      source_uri: `file://${path.join(REPO_ROOT, "api/src/core/kanagi")}`,
      source_role: "canonical",
      linked_to: [
        "constitution:soul-root",
        "corpus:sacred",
        "persona:module",
        "github:main-repo",
      ],
      last_seen: ts,
      note: "天聞アークの推論根幹：天津金木・五相・四相フェーズ。",
    },
    {
      id: "core:amatsu-kanagi",
      source_kind: "core",
      source_name: "天津金木コア（TENMON-ARK 思考中枢）",
      source_uri: `file://${CANON_DIR}`,
      source_role: "canonical",
      linked_to: [
        "constitution:soul-root",
        "core:tenmon-kanagi",
        "github:main-repo",
        "corpus:sacred",
      ],
      last_seen: ts,
      note:
        "CARD-MC-11: 憲法コア（TENMON_ARK_COMPLETION_CONSTITUTION_V1 系）と天津金木の三層構造（構造裁定→参照→会話還元）。詳細は /api/mc/vnext/constitution で履行状況を取得。",
    },
    {
      id: "mc_hub:main",
      source_kind: "mc_hub",
      source_name: "TENMON-ARK Mission Control AI-HUB",
      source_uri: "https://tenmon-ark.com/mc/",
      source_role: "canonical",
      linked_to: ["github:main-repo", "constitution:soul-root", "notion:workspace"],
      last_seen: ts,
      note: "唯一の AI-HUB owner-only 入口。GPT/Claude/TENMON 共通参照点 (CARD-MC-16 正式運用)。",
    },
    {
      id: "mc_landing:vnext",
      source_kind: "mc_landing",
      source_name: "MC vNext landing page",
      source_uri: "https://tenmon-ark.com/mc/vnext/",
      source_role: "canonical",
      linked_to: ["mc_hub:main"],
      last_seen: ts,
      note: "vNext UI エントリ。",
    },
    // --- mirror ---
    {
      id: "runtime:primary-vps",
      source_kind: "runtime",
      source_name: "Primary runtime VPS (tenmon-ark.com)",
      source_uri: "https://tenmon-ark.com",
      source_role: "mirror",
      linked_to: [
        "github:main-repo",
        "nas:books-mirror",
        "backup:offsite-vps",
      ],
      last_seen: ts,
      note: "本番実行ノード。TENMON_DATA_ROOT=/opt/tenmon-ark-data。",
    },
    {
      id: "nas:books-mirror",
      source_kind: "nas",
      source_name: "NAS books / corpus mirror",
      source_uri: `file://${path.join(DATA_ROOT, "nas_mirror")}`,
      source_role: "mirror",
      linked_to: ["backup:offsite-vps", "corpus:sacred", "runtime:primary-vps"],
      last_seen: ts,
      note: "書籍・正典 PDF の NAS ミラー。read-only。",
    },
    // --- backup ---
    {
      id: "backup:offsite-vps",
      source_kind: "backup_vps",
      source_name: "Offsite backup VPS (mirror target)",
      source_uri: "ssh://tenmon-backup",
      source_role: "backup",
      linked_to: ["runtime:primary-vps", "nas:books-mirror"],
      last_seen: ts,
      note: "本番 VPS の定期ミラー先。kokuzo.sqlite + docs/ark を保持。",
    },
    // --- derived ---
    {
      id: "persona:state-db",
      source_kind: "persona",
      source_name: "Persona state DB",
      source_uri: `sqlite://${path.join(DATA_ROOT, "persona.sqlite")}`,
      source_role: "derived",
      linked_to: ["persona:module", "corpus:sacred", "github:main-repo"],
      last_seen: ts,
      note: "会話・学習から算出される persona runtime 状態。",
    },
    {
      id: "learning:scripture-ledger",
      source_kind: "learning",
      source_name: "Scripture learning ledger (runtime)",
      source_uri: `sqlite://${path.join(DATA_ROOT, "kokuzo.sqlite")}#scripture_learning_ledger`,
      source_role: "derived",
      linked_to: ["learning:ledger-spec", "persona:state-db", "corpus:sacred"],
      last_seen: ts,
      note: "runtime に積み上がる scripture_learning_ledger 実体。",
    },
  ];
}

/** Convenience helpers for grouping. */
export function groupSeedByRole(
  seed: McSourceSeedV1[] = buildMcSourceRegistrySeedV1(),
): Record<McSourceRoleV1, McSourceSeedV1[]> {
  const out: Record<McSourceRoleV1, McSourceSeedV1[]> = {
    canonical: [],
    mirror: [],
    backup: [],
    derived: [],
  };
  for (const it of seed) out[it.source_role].push(it);
  return out;
}
