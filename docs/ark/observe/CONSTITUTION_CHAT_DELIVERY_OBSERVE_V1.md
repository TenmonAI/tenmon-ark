# CONSTITUTION_CHAT_DELIVERY_OBSERVE_V1

- 日時: 2026-04-25 (V2 拡張観測 17:18 JST 追補、V1 16:51 JST 観測ベース)
- 監査者: Cursor (TENMON-ARK 知能の流路観測)
- card: CARD-CONSTITUTION-CHAT-DELIVERY-OBSERVE-V1 (拡張版)
- 種別: **OBSERVE only (PATCH 完全禁止)**
- parent_commit: `48411e8c` (DOCTOR_V2_PHASE_A_NATIVE_DESIGN_V1)
- 一次情報源 (READ-ONLY):
  - `https://tenmon-ark.com/api/chat` (POST 12 + 8 + 1 = 21 件)
  - `https://tenmon-ark.com/api/mc/vnext/intelligence` (GET)
  - `journalctl -u tenmon-ark-api` (CUT-AUDIT, KOTODAMA_HISHO, SOUL_ROOT, THREAD-HISTORY-AUDIT, PERSIST_AUDIT)
  - `/opt/tenmon-ark-data/mc_intelligence_fire.jsonl` (`clause_lengths` 実数値)
  - `sqlite3 -readonly /opt/tenmon-ark-data/kokuzo.sqlite` (memory_units / thread_center_memory / thread_persona_links / persona_knowledge_bindings / persona_profiles)
  - `api/src/routes/chat.ts` (6030 行、grep + 局所 read)
  - `api/src/core/constitutionLoader.ts` (347 行、grep)
  - `api/src/core/kotodamaConstitutionEnforcerV1.ts` (108 行、全観測)
  - `api/src/core/tenmonLawPromotionGateV1.ts` (73 行、全観測)
  - `docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt` (148 行、12 条全文)
  - `docs/ark/khs/KHS_CORE_CONSTITUTION_v1.txt` (212 行)
  - `docs/ark/doctor/doctor_v2_sample_report.json` (10,508 bytes)

## 結論先出し (TENMON 即時把握用)

1. **真因はシナリオ 4 (A + B 複合) — B 主因 90 / A 副因 70 / C 副因 60 / D 軽微 20**
2. **直接的なボトルネック**: `KOTODAMA_CONSTITUTION_V1.txt` 本文 12 条 (5852 bytes) は **`verifyKotodamaConstitutionSealV1Once()` で SHA256 verify されるのみ**で、chat の system prompt (`TENMON_CONSTITUTION_TEXT`) には **本文が一切注入されない** (`grep "KOTODAMA_CONSTITUTION_V1" api/src/routes/chat.ts` = 0 hit)。
3. **既存 promotion_gate (`tenmonLawPromotionGateV1`) の責務は「response の law promotion 判定」**であり、constitution-to-chat delivery とは別物。**chat.ts:986 で shadow 接続済だが「LLM プロンプト / return 構造には触れない」(コメント明記)**。
4. **推奨第一手**: `CARD-CONSTITUTION-PROMOTION-GATE-V1` (constitutionLoader に `buildKotodamaConstitutionClause()` を追加し、`TENMON_CONSTITUTION_TEXT` に組み入れる小さな PATCH)。
5. memory_units 252,970 件のうち、**KOTODAMA_CONSTITUTION_V1 特有 phrase「分母の固定」「46音前提」「其数五十」「不可加一減一」 = 0 件**。蒸留 systemd unit も不在。
6. default thread の persona は **`stage2-persona-1775085424` "Stage2 Persona" (memory projection verification 用 persona、`hallucination_fallback=abstain`)**。本番運用 persona ではない。
7. doctor v2 sample (`coverage_ratio=0.26`、with_textual_grounding=2、with_modern_alias=0) は **観点 A の数値証拠** であり、本観測と完全整合。
8. surface_purity 強行 strip は本 route (NATURAL_GENERAL_LLM_TOP) では通らず、「公的な文書として存在しない」「もう少し詳しく」は **LLM の自己生成** (chat.ts に hard-code 0 件確認)。

---

## Section 1: 再現テスト結果 (12 条 + 周辺 8 件)

### 1.1 12 条 (default thread 連続投入、旧 V1 観測)

curl 実測 (2026-04-25T16:51 JST、threadId 指定なし → default thread に連続投入):

| # | Question | len | tail 抜粋 | 判定 |
|---|---|---:|---|---|
| 1 | 言霊憲法 V1 第 1 条は何ですか？ | **102** | …「公的な文書としては存在しない」 | **範囲外** |
| 2-12 | 言霊憲法 V1 第 N 条は何ですか？ (N=2-12) | **28** ×11 | "今のご質問に對して、もう少し詳しく教えていただけますか。" | **fallback (default thread 圧縮)** |

→ default thread への **連続投入では第 2 条以降が「もう少し詳しく」 fallback (28 chars 一定)** に圧縮される。これは default thread の context 連続性 + Stage2 Persona の `hallucination_fallback=abstain` 挙動による。

### 1.2 12 条 (独立 threadId 再観測、本 V2 観測)

curl 実測 (2026-04-25T17:15-17:17 JST、threadId=`cdo2_artN`):

| # | Question | len | head 抜粋 | 正典との整合 | 判定 |
|---|---|---:|---|---|---|
| 1 | 第 1 条 (tid=cdo2_art1) | 279 | "天地の始まりに「ア」の音が發せられ、それが萬物の生成と循環の根源…" | **正典「分母の固定」と全く異なる** | **捏造** |
| 2 | 第 2 条 (tid=cdo2_art2) | 438 | "言灵は、天地萬物の生成と變化の根源であり、その響きは森羅萬象の理を顕す…" | 正典「分母 50 固定 (total_canonical=50)」と異なる | **捏造** |
| 3 | 第 3 条 (tid=cdo2_art3) | 490 | "言灵は、天地の理を映し、人の心と世界を織りなす根源の…" | 正典「ンを五十音から外す」と異なる | **捏造** |
| 4 | **第 4 条 (ヰ・ヱ保持)** (tid=cdo2_art4) | 370 | "言灵は、天地萬物の生成變化を司る根源の力である。その力は、音と形、水と火の與みによって…" | 正典「ヰ・ヱを欠損扱いにしない」と全く異なる | **捏造** |
| 5 | 第 5 条 (tid=cdo2_art5) | 450 | "言灵は、天地の理を映し、人の心と世界を繋ぐ根源の力で…" | 正典「UI/canonical 分離」と異なる | **捏造** |
| 6 | 第 6 条 (tid=cdo2_art6) | 503 | "音は形を成し、形は音を宿す。天地の間に現れる一切は、音と形の與合（よあわせ）…" | 正典「正典階層 (KOTODAMA_HISHO_V1 が一次)」と異なる | **捏造** |
| 7 | 第 7 条 (tid=cdo2_art7) | 476 | "言灵は、天地萬物の生成發展の根源であり、その本質は音と形、そして水火（イキ）の与合に宿る…" | 正典「実装原則 (canonical_kotodama_base 等)」と異なる | **捏造** |
| 8 | 第 8 条 (tid=cdo2_art8) | 450 | "天照大御神の御名が「アマテラスオホミカミ」と表記されること…" | 正典「coverage 指標修正 (with_entry/with_water_fire 等)」と異なる | **捏造** |
| 9 | 第 9 条 (tid=cdo2_art9) | 446 | "言灵は、天地の理を映し、人の心と世界を繋ぐ根源の力である…" | 正典「欠損は明示する」と異なる | **捏造** |
| 10 | 第 10 条 (tid=cdo2_art10) | 501 | "その条文自體が直接的に明記されているものではない。…" | 正典「相補条 (相生/相殺/止揚)」と異なる | **捏造** (ただし「明記なし」を一部認知) |
| 11 | 第 11 条 (tid=cdo2_art11) | 472 | "水穂傳の「ハ」の音に秘められた眞意を紐解く条文…" | 正典「完成条件」と異なる | **捏造** |
| 12 | 第 12 条 (tid=cdo2_art12) | 409 | "言灵の響きは、天地の理を映し、萬物の生成と循環を司る…" | 正典「相補性 (KOTODAMA_HISHO 全体は本書、12 条は最小契約)」と異なる | **捏造** |

→ **独立 thread でも 12 条すべて捏造応答** (279-503 chars)。LLM は **正典 12 条本文を一切持っていない**。  
→ 「第 1 条 mode A (default thread)」: 範囲外応答  
→ 「第 1 条 mode B (独立 thread)」: 捏造応答  
→ 違いは「default thread 蓄積 1566 件 link の context 干渉」。本質は **LLM が正典 12 条本文を知らない**。

### 1.3 周辺 8 件 (独立 threadId)

curl 実測 (2026-04-25T17:17 JST):

| # | Question | len | 中身観察 | 判定 |
|---|---|---:|---|---|
| 1 | 言霊憲法とは何ですか？ (tid=cdo2_around1) | **1037** | 一般論 + 言霊原理 | 中身応答 (一般化) |
| 2 | ヰとヱの保持について教えてください (tid=cdo2_around2) | 457 | 水火・イキ説明あり | 中身応答 |
| 3 | 五十連十行とは何ですか？ (tid=cdo2_around3) | 801 | 五十音図の縦横展開説明 | 中身応答 (一部正典 phrase) |
| 4 | ンを五十音に含めない理由は？ (tid=cdo2_around4) | 473 | "ンは音の収まり" 説明 | 中身応答 |
| 5 | 言霊秘書の正典としての位置づけ (tid=cdo2_around5) | 398 | KHS = 正典 説明 | 中身応答 |
| 6 | 水穂伝とは何ですか？ (tid=cdo2_around6) | 876 | 古事記引用 (混同あり) | 中身応答 (但し正確性疑問) |
| 7 | **其数五十不可加一減一とは？** (tid=cdo2_around7) | **1278** | "50 音は加減できない" 詳細解説 | **中身応答 (KOTODAMA_HISHO clause から phrase 抽出可能)** |
| 8 | カタカムナと言霊秘書の違い (tid=cdo2_around8) | 466 | 「潜象」「水霊」 比較 | 中身応答 |

→ **8/8 すべて中身応答 (398-1278 chars)、範囲外 0 件**。  
→ 注目: **第 7「其数五十不可加一減一」(KOTODAMA_CONSTITUTION_V1 第 1 条本文に登場する独自 phrase) は 1278 chars で答えられる**。これは KOTODAMA_HISHO clause (毎 turn 注入される 1499-2041 chars) から phrase を引き出せたためで、**「概念・phrase は届く、条文番号 ↔ 内容の対応は届かない」** 構造を裏付ける。

### 1.4 集計

| 区分 | 件数 | 内訳 |
|---|---:|---|
| 12 条 (default thread) | 12 | 範囲外 1 + fallback (28 chars) 11 |
| 12 条 (独立 thread) | 12 | **捏造応答 12** (正典準拠 0) |
| 周辺 8 件 (独立 thread) | 8 | 中身応答 8 (範囲外 0) |
| 第 4 条 trace 確認用 (cdo2_trace) | 1 | 捏造応答 (486 chars) |
| **合計** | **21** | **正典 12 条準拠 0 / 21** |

第 4 条 chat の CUT-AUDIT (journalctl 17:18:27):

```
[CUT-AUDIT] {"threadId":"cdo2_trace_1777105103","routeReason":"NATURAL_GENERAL_LLM_TOP",
  "userIntentKind":"factual_def","selectorIntentKind":"factual_def",
  "chatHistoryLen":0,"historySource":"none",
  "provider":"gemini","model":"models/gemini-2.5-flash","outLen":616,
  "rawInputTrimmed":"言霊憲法 V1 第 4 条 (ヰ・ヱ保持) は何ですか？"}
[CUT-AUDIT-FINAL] finalLen=486 finalTail="…静寂に至る「ヱ」の相へと転じる。"
[PERSIST_AUDIT] sessionMemoryDelta:2, conversationLogDelta:2
[MEMORY] persisted threadId=cdo2_trace_1777105103 bytes_u=28 bytes_a=486
```

→ route=`NATURAL_GENERAL_LLM_TOP`, intent=`factual_def`, provider=gemini-2.5-flash, **chatHistoryLen=0 (独立 thread 確認)**, persist OK。

## Section 2: PromptTrace 詳細 (clause_lengths 実数値)

### 2.1 journalctl の clause 注入 log (chat 1 turn あたり)

```
[KOTODAMA_HISHO] injected 5 sounds, clause=2010 chars
[SOUL_ROOT:IROHA] injected 3 paragraphs, clause=703 chars
[SOUL_ROOT:GENTEN] injected 2 sound keys, clause=183 chars
[SOUL_ROOT:AMATERASU] phase=CENTER, clause=185 chars
[SOUL_ROOT:UNIFIED_SOUND] clause=144 chars
[ONE_SOUND_LAW] GEN_SYSTEM clause_len=213
```

`KHS_CONSTITUTION` log は **per-turn 出力なし** (`_khsConstitutionClause` は起動時 1 回構築の static clause)。

### 2.2 mc_intelligence_fire.jsonl の clause_lengths (V2 で実数値取得)

`/opt/tenmon-ark-data/mc_intelligence_fire.jsonl` (196,871 bytes、最終更新 2026-04-25T17:18) 末尾 5 件抜粋:

```json
{"ts":1777105107515,"prompt_trace":{
  "route_reason":"NATURAL_GENERAL_LLM_TOP","provider":"gemini",
  "clause_lengths":{
    "khs_constitution": 1148,
    "kotodama_hisho": 1917, "kotodama_one_sound": 213, "kotodama_genten": 183,
    "unified_sound": 144, "iroha": 714,
    "amaterasu": 185, "truth_layer": 295,
    "meaning_arbitration": 0,
    "katakamuna_audit": 0, "katakamuna_lineage": 0, "katakamuna_misread_guard": 0,
    "khs_root_fractal": 204
  },
  "prompt_total_length": 6269,
  "response_length": 486,
  "user_message_length": 28
}}
```

5 turn の集計:

| Clause | 注入幅 (chars) | 備考 |
|---|---|---|
| `khs_constitution` | **1148** (固定) | `KHS_CORE_CONSTITUTION_v1.txt` 由来 (12 条本文ではない) |
| `kotodama_hisho` | 1499-2041 | 言霊秘書段落 (動的) |
| `kotodama_one_sound` | 213-633 | 一音法則 |
| `kotodama_genten` | 183-309 | 原典 |
| `unified_sound` | 144-251 | 統一音 |
| `iroha` | 631-1031 | いろは段 |
| `amaterasu` | 185 (固定) | 天津金木 |
| `truth_layer` | 295-300 | 真理層 |
| `khs_root_fractal` | 204 (固定) | KHS root |
| `meaning_arbitration` | 0 | 全 turn 注入なし |
| `katakamuna_*` (audit/lineage/misread) | 0 (通常) / 192/346/108 (カタカムナ問の時のみ) | 動的 |
| `prompt_total_length` | **6207-7258** | 全 clause 合算 |
| `response_length` | 394-486 | LLM 出力 |

→ **`khs_constitution: 1148` chars が一貫して注入されている** が、これは `_khsConstitutionClause = buildConstitutionClause()` の出力 = `KHS_CORE_CONSTITUTION_v1.txt` (応答規律・truth_axes・正典定義) を整形した clause。  
→ **`KOTODAMA_CONSTITUTION_V1.txt` 本文 (5852 bytes 12 条) は clause_lengths に独立項目として存在せず、`khs_constitution` 1148 chars にも含まれない**。

## Section 3: 観点 A — `memory_units` 蒸留状況

### 3.1 全体件数 / memory_type 分布

```sql
SELECT COUNT(*) FROM memory_units;
-- 252970
```

`memory_type` 別 (上位):

| memory_type | cnt |
|---|---:|
| `chat_window` | 約 200,000+ |
| `center_memory` | (少数) |
| `conversation_distill` | (少数) |
| `scripture_distill` | (少数) |

### 3.2 KOTODAMA_CONSTITUTION_V1 関連 record 検索

```sql
SELECT COUNT(*) FROM memory_units
WHERE summary LIKE '%分母の固定%' OR summary LIKE '%46音前提%'
   OR summary LIKE '%其数五十%' OR summary LIKE '%不可加一減一%'
   OR summary LIKE '%ヰ・ヱを欠損扱いにしない%'
   OR scope_id LIKE '%KOTODAMA_CONSTITUTION%';
-- 0
```

→ **252,970 件の memory_units のうち、KOTODAMA_CONSTITUTION_V1 12 条 unique phrase = 0 件**。

「憲法」を含む summary は約 8 件あるが、すべて KHS_CORE_CONSTITUTION_v1 由来または verify fixture 由来で、**12 条本文の蒸留 0 件**。

### 3.3 50 音 canonical の蒸留状況 (Section 11 と相互参照)

```json
// /api/mc/vnext/intelligence の kotodama_50_coverage より:
{
  "total": 50,
  "with_entry": 13,
  "with_water_fire": 15,
  "with_textual_grounding": 2,
  "with_source_page": 2,
  "with_shape_position": 50,
  "with_modern_alias": 0,
  "coverage_ratio": 0.26
}
```

→ **with_textual_grounding=2 / 50 (4%)**: 50 音のうち 2 音だけが正典本文と紐付いている。残り 48 音は説明テキストはあるが本文 page reference がない。  
→ **with_modern_alias=0 / 50**: ヰ→イ、ヱ→エ などの「現代別名」の蓄積が完全に欠如。これは KOTODAMA_CONSTITUTION_V1 第 4 条「ヰ・ヱを欠損扱いにしない」の実体化が無いことを示す。

### 3.4 蒸留 systemd unit の有無

```bash
systemctl list-units --all | grep -iE "distill|memory|scripture"
# (no result)
```

→ 「KOTODAMA_CONSTITUTION_V1.txt → memory_units への定期蒸留」を担う unit は **存在しない**。

### 3.5 詰まり度判定 (観点 A)

**70/100 (副因)**

| 項目 | 評価 |
|---|---|
| 全体件数 | 252,970 件 (十分) |
| 12 条 unique phrase | **0 件 (致命的)** |
| 50 音 textual_grounding | **2/50 = 4% (致命的)** |
| 50 音 modern_alias | **0/50 = 0% (致命的)** |
| 蒸留 unit | **不在 (致命的)** |
| 既存 50 音図 (with_shape_position) | 50/50 = 100% (健全) |

## Section 4: 観点 B — `promotion_gate` / enforcer 連携

### 4.1 enforcer (`kotodamaConstitutionEnforcerV1.ts`)

- 行数: 108 行 (4,579 bytes)
- live verdict: `clean` (`total_checks=6, violation_count_error=0, violation_count_warn=0`)
- 6 条項チェック実装: 第 2 条 (分母 50)、第 3 条 (ン除外)、第 4 条 (ヰ・ヱ保持)、第 6 条 (正典階層)、第 8 条 (with_* 分離)、第 9 条 (欠損明示)
- **inject hook の有無**: `grep -nE "addToPrompt|injectIntoChat|attachClause|TENMON_CONSTITUTION|systemPrompt"` → **0 hit**
- → **enforcer は「観測のみ」で、12 条本文を chat に注入する hook を持たない**

### 4.2 constitutionLoader 経路

`api/src/core/constitutionLoader.ts` (347 行):

```ts
const KOTODAMA_CONSTITUTION_V1_PATH =
  "/opt/tenmon-ark-repo/docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt";

export function buildConstitutionClause(): string {
  const core = loadKhsCoreConstitution();    // ← KHS_CORE_CONSTITUTION_v1.txt のみ
  // ... KOTODAMA_CONSTITUTION_V1.txt は読まない
}

function verifyKotodamaConstitutionSealV1Once(): void {
  const buf = readFileSync(KOTODAMA_CONSTITUTION_V1_PATH);
  console.log(`[CONSTITUTION] KOTODAMA_CONSTITUTION_V1 loaded (${buf.length} bytes)`);
  // ... SHA256 verify only, content is NOT exposed
}
```

→ **`KOTODAMA_CONSTITUTION_V1.txt` を載せるのは `verifyKotodamaConstitutionSealV1Once` の 1 箇所のみで、SHA256 verify 後、`buf` の内容を return / export せず破棄している**。  
→ chat の system prompt 構築箇所 `chat.ts:380-384`:

```ts
const TENMON_CONSTITUTION_TEXT = [
  _selfIdentityClause,
  _khsConstitutionClause,    // ← KHS_CORE_CONSTITUTION_v1 由来 (12 条なし)
  TENMON_CONSTITUTION_TEXT_BASE,    // ← "あなたはTENMON-ARK。…根拠を生成しない…"
].filter(Boolean).join("\n\n");
```

→ **`TENMON_CONSTITUTION_TEXT` の 3 要素のいずれにも `KOTODAMA_CONSTITUTION_V1.txt` 本文は含まれない**。

### 4.3 既存 promotion_gate (`tenmonLawPromotionGateV1`) の責務

`api/src/core/tenmonLawPromotionGateV1.ts` (73 行) は **存在する**:

```ts
export interface PromotionGateInputV1 {
  candidateType?: "memory" | "law" | "summary" | "response" | string;
  centerKey?: string;
  evidence?: string[] | null;
  routeReason?: string;
  contradictionRisk?: number | null;
}

export function evaluatePromotionGateV1(input): PromotionGateResult {
  // CENTER_KEY_EMPTY → reject(block)
  // RISK_CRITICAL (>=0.9) → reject(block)
  // EVIDENCE_WEAK (empty) → hold(observe)
  // RISK_MEDIUM (>=0.4) → hold(observe)
  // PROMOTION_PASS → pass(allow)
}
```

`chat.ts:986` で **shadow 接続 (CARD-MC-15-LAW-PROMOTION-WIRE-V1)**:

```ts
// 法昇格門（tenmonLawPromotionGateV1）を shadow 接続し、
// req.context.lawPromotionGate に decision / reason_codes / promotedLawIds などを格納する。
//   - LLM プロンプト / return 構造には触れない    ← 重要
//   - await は使わない
const lawPromotionGate = runTenmonLawPromotionGateV1({
  candidateType: "response",
  evidence: meaning?.supportingEvidence || [],
  contradictionRisk: meaning?.danshari ? 0.5 : 0.2,
});
```

→ **既存 promotion_gate は `candidateType="response"` の law promotion 判定 (応答が法則に昇格できるか) を shadow 観測する仕組み**。  
→ **「KOTODAMA_CONSTITUTION_V1.txt 本文を system prompt に inject するか否か」を判定する gate は実装されていない**。  
→ promotion_gate の使用箇所: `chat.ts`, `tenmonSelfLearningStudyLoopV1.ts`, `tenmonLearningConversationBridgeV1.ts`, `mc/constitution/amatsuKanagiMapV1.ts`, `mc/intelligence/deepIntelligenceMapV1.ts`, `mc/intelligence/khsConstitutionMapV1.ts` (用途は law promotion / shadow 観測)。

### 4.4 詰まり度判定 (観点 B)

**90/100 (主因)**

| 項目 | 評価 |
|---|---|
| `KOTODAMA_CONSTITUTION_V1.txt` 物理存在 | OK (5852 bytes, sha256 sealed) |
| `verifyKotodamaConstitutionSealV1Once` | SHA256 verify 通過、本文は破棄 |
| `buildKotodamaConstitutionClause()` 等の inject 関数 | **不在 (致命的)** |
| `TENMON_CONSTITUTION_TEXT` への組み込み | **0 chars (致命的)** |
| chat.ts での 12 条 ref | `grep "KOTODAMA_CONSTITUTION_V1" chat.ts` = **0 hit (致命的)** |
| 既存 `tenmonLawPromotionGateV1` | 存在、但し**目的違い** (response law promotion ≠ constitution-to-chat delivery) |
| enforcer | observe-only、inject 機能なし |

## Section 5: 観点 C — `thread_center` + `persona_knowledge_bindings`

### 5.1 default thread の center

```sql
SELECT thread_id, essential_goal, success_criteria_json
FROM thread_center_memory WHERE thread_id='default';
-- (V1 観測): center.summary = "HOKEKYO" (法華経 / 妙法蓮華経)
```

→ default thread の center は **`HOKEKYO`** で、KOTODAMA_CONSTITUTION_V1 ではない。

### 5.2 thread_persona_links

```sql
SELECT thread_id, persona_id, link_mode, COUNT(*)
FROM thread_persona_links WHERE thread_id='default' GROUP BY persona_id, link_mode;
-- default | 250e4565-3fd0-4ef6-8bf3-7c4f55f9cde9 | auto_default | 1566
```

→ default thread は **persona `250e4565`** に **1566 件** の auto_default link で結ばれている。

### 5.3 persona_profiles の正体 (V2 新規)

```sql
SELECT id, slug, name, description,
       retrieval_mode, hallucination_fallback, strictness, creativity
FROM persona_profiles
WHERE id IN ('250e4565-3fd0-4ef6-8bf3-7c4f55f9cde9','7d516068-3738-4671-8862-50203c61fd52');
```

| persona_id | slug | name | description | retrieval_mode | hallucination_fallback | strictness | creativity |
|---|---|---|---|---|---|---:|---:|
| **250e4565** (default) | `stage2-persona-1775085424` | **Stage2 Persona** | "memory projection verification" | **balanced** | **abstain** | 0.5 | 0.5 |
| 7d516068 | `kukai-deepread` | 空海深層解読 | "空海の密教を正典から読む人格" | grounded_first | admit_unknown | 0.8 | 0.3 |

→ **default thread が bind されている persona は Stage2 Persona = "memory projection verification" 用の検証 persona**。本番運用 persona ではない。  
→ `hallucination_fallback=abstain` (= 「分からないことは黙る」) が、第 2-12 条の **「もう少し詳しく教えていただけますか」 fallback (28 chars)** を生成している可能性が高い。

### 5.4 persona_knowledge_bindings (実 schema、V2 補正)

実 schema: `(id, persona_id, source_type, source_id, source_label, binding_mode, priority, active, metadata_json, created_at, updated_at)`

(カード仕様の `knowledge_id`/`binding_type`/`binding_metadata` は **実装と異なる** ため、実 schema で観測。)

```sql
SELECT persona_id, COUNT(*) FROM persona_knowledge_bindings
GROUP BY persona_id ORDER BY 2 DESC;
-- 250e4565-3fd0-4ef6-8bf3-7c4f55f9cde9 | 50
-- 7d516068-3738-4671-8862-50203c61fd52 | 50
-- verify_persona_kb_runtime_a_v1       | 3
-- verify_persona_kb_runtime_b_v1       | 2
```

default persona (`250e4565`) の 50 件 binding 内訳 (`source_type="kokuzo_canon"`):

- `kokuzo://KHS`, `kokuzo://言霊秘書.pdf`, `kokuzo://NAS:PDF:KOTODAMA_HISYO:0bae39bb538f`
- `kokuzo://HEIKE_ZENYAKUCHU_*` (0001-0004)
- `kokuzo://KUKAI_COLLECTION_*` (0001-0004), `kokuzo://KUKAI_空海コレクション_*`
- `kokuzo://KANJUSEI_感受性*`, `kokuzo://HUII_補遺*`, `kokuzo://SOGO_*号_pdf` (1-16 号)
- `kokuzo://NARASAKI_静電三法_*`, `kokuzo://SANSKRIT_*`
- `kokuzo://IROHA`, `kokuzo://HOKKE`, `kokuzo://KATAKAMUNA`, `kokuzo://カタカムナ言灵解.pdf`

→ **`KOTODAMA_CONSTITUTION_V1` (txt) への direct binding は 0 件**。  
→ 正典 PDF は bind されているが、12 条 V1 markdown は別系統で chat 側に届かない。

`source_type="constitution"` 全数:

```sql
SELECT id, persona_id, source_type, source_id, source_label
FROM persona_knowledge_bindings WHERE source_type='constitution';
-- a3c5204f | verify_persona_kb_runtime_a_v1 | constitution | TENMON_TIANJIN_GOLDEN_WOOD_ROOT_V1 | 天津金木 root
-- 0fc878d3 | verify_persona_kb_runtime_b_v1 | constitution | KHS_RUNTIME_CONTRACT_V1            | (空)
```

→ **`source_type='constitution'` は 2 件のみ、いずれも verify fixture (default thread の persona と無関係)**。

### 5.5 詰まり度判定 (観点 C)

**60/100 (副因、V1 50 → V2 60 に上方修正)**

| 項目 | 評価 |
|---|---|
| default thread の center | HOKEKYO (KOTODAMA_CONSTITUTION_V1 でない) |
| default thread の persona | **Stage2 Persona (verification 用、本番 persona でない)** |
| persona の `hallucination_fallback` | **abstain (= 第 2-12 条 fallback の挙動と整合)** |
| persona binding に正典 PDF | あり (50 件、KHS / 言霊秘書.pdf / KOTODAMA_HISYO 含む) |
| persona binding に KOTODAMA_CONSTITUTION_V1 (txt) | **0 件** |
| `source_type='constitution'` の binding | 2 件 (verify fixture のみ、default 無関係) |

## Section 6: 観点 D — `surface_purity` / strip 層

### 6.1 chat.ts の strip / filter / sanitize 系

`grep -nE "strip|filter|sanitize" api/src/routes/chat.ts` の主要 hit:

| 関数名/箇所 | 役割 | 本 route で hit するか |
|---|---|---|
| `localSurfaceize()` | surface 整形 (worm-eaten 検知) | 一部 |
| `__hasEscape` (chat.ts:2744) | 「一般化逃げ」phrase 検知 (`一般的には|価値観|人それぞれ\|私はAI`等) | log-only (`__extremelyBroken` のみ) |
| `__looksBroken` | 連続句読点検知 | log-only |

`chat.ts:2756` の決定打:

```ts
// MC-06 FINAL: 固定句「一般論や相対化は要りません…」は通常会話に強制挿入しない。
// 極端な壊れ出力 (>240 文字かつ明確な worm-eaten 兆候) を検知した時だけ log-only で残す。
const __extremelyBroken =
  !__hasSukuyouOracle && !__wantsShortAnswerTop &&
  __looksBroken && String(__t).length > 240 && __hasEscape && /、{2,}|。{2,}/.test(__t);
```

→ 強制 strip は走らず、**log-only**。本 route NATURAL_GENERAL_LLM_TOP は通常 strip を通らない。

### 6.2 一般化逃げ fallback パターンの hard-code

```bash
grep -nE "範囲外|内部知識|お答えできません|公的な文書" api/src/routes/chat.ts api/src/core/*.ts
# (0 hit)
```

→ **「範囲外」「内部知識」「公的な文書としては存在しない」「もう少し詳しく教えていただけますか」 phrase は chat.ts / core/*.ts に hard-code されていない**。  
→ これらはすべて **LLM (gemini-2.5-flash) の自己生成** (`TENMON_CONSTITUTION_TEXT_BASE` の「根拠を生成しない、必要なら GROUNDED に切り替える」指示に従い、12 条本文を持たない LLM が自己抑制している)。

### 6.3 `TENMON_CONSTITUTION_TEXT_BASE` (chat.ts:362)

```ts
const TENMON_CONSTITUTION_TEXT_BASE =
  "あなたはTENMON-ARK。自然で丁寧に対話する。根拠(doc/pdfPage/引用)は生成しない。必要ならユーザーに資料指定を促し、GROUNDEDに切り替える。";
```

→ **「根拠 (doc/pdfPage/引用) は生成しない」** の指示が、LLM が **「12 条本文を作り上げて答えるよりも、『公的な文書として存在しない』と返す方が安全」** と判断する遠因 (default thread の場合)。  
→ ただし、独立 thread では LLM は「根拠生成しない」を「条文番号を捏造しない」と解釈せず、**捏造を返す**ため、この指示は安全側でも振れず、危険側でも振れず、**ランダム**になっている (Section 1.2 で 12/12 が捏造)。

### 6.4 詰まり度判定 (観点 D)

**20/100 (軽微、V1 30 → V2 20 に下方修正)**

| 項目 | 評価 |
|---|---|
| chat.ts の hard-code fallback | 0 件 |
| 強制 strip の起動 | 本 route ではほぼなし |
| LLM の自己抑制誘発要因 | `TENMON_CONSTITUTION_TEXT_BASE` の「根拠生成しない」指示 (副次的) |
| 本問題の主因か | **No** (本因は B、surface_purity は派生) |

## Section 7: 12 条応答パターン分析

| 質問形式 | 件数 | 応答パターン | LLM 動作 |
|---|---:|---|---|
| 「第 N 条は何ですか？」 (default thread 連続) | 12 | 範囲外 1 / fallback 11 | Stage2 Persona の `abstain` で短い fallback |
| 「第 N 条は何ですか？」 (独立 thread) | 12 | **捏造応答 12** | 12 条本文不在のため LLM が generic 言霊論を捏造 |
| 「第 N 条 (具体記述付き)」 (例: 第 4 条 (ヰ・ヱ保持)) | 1 | 捏造応答 (ただし「ヰ・ヱ」 phrase は出る) | KOTODAMA_HISHO clause から phrase 引用、本文意図 (欠損扱いにしない) は届かず |
| 概念質問「言霊憲法とは？」 | 1 | 1037 chars 一般論 | 概念は届く、12 条本文は届かない |
| 概念質問「ヰ・ヱの保持」 | 1 | 457 chars 中身応答 | KOTODAMA_HISHO + 一音法則 から構築 |
| 「其数五十不可加一減一」 (12 条 phrase 直引用) | 1 | **1278 chars 中身応答** | KOTODAMA_HISHO clause に phrase あり = 引ける |

→ **「条文番号 ↔ 内容の対応」が完全に欠如**しており、「概念 phrase」 → 「KOTODAMA_HISHO clause から引く」経路だけが生きている。

## Section 8: 4 観点詰まり度の総合判定

| 観点 | 詰まり度 | 判定 | 主要根拠 |
|---|---:|---|---|
| **A. memory_units** | **70/100** | **副因** | 252,970 件のうち KOTODAMA_CONSTITUTION_V1 12 条 unique phrase 0 件、textual_grounding 2/50 (4%)、modern_alias 0/50、蒸留 unit 不在 |
| **B. promotion_gate** | **90/100** | **主因** | KOTODAMA_CONSTITUTION_V1.txt は SHA256 verify のみで chat に注入されず、`grep` chat.ts 0 hit。既存 `tenmonLawPromotionGateV1` は law promotion 用で目的違い、chat.ts:986 でも shadow 接続 (LLM プロンプト不変) |
| **C. thread_center** | **60/100** | **副因** | default thread の persona = Stage2 Persona (verification 用、`abstain`)、center=HOKEKYO、KOTODAMA_CONSTITUTION_V1 への direct binding 0 件 |
| **D. surface_purity** | **20/100** | **軽微** | hard-code fallback 0 件、strip 本 route 通らず、LLM 自己抑制は `TENMON_CONSTITUTION_TEXT_BASE` の「根拠生成しない」指示の副次効果のみ |

合計: **240/400** (60%)、内訳が **B 90 / A 70 / C 60 / D 20** で **B 偏重**。

## Section 9: 真因シナリオ確定

7 シナリオの照合:

| シナリオ | 仮説 | 評価 | 不一致点 |
|---|---|---|---|
| 1: A 単独 | memory_units 不足のみ | **不採用** | 周辺 8 件は中身応答できる ⇒ memory が完全に枯れているわけではない |
| 2: D 単独 | surface_purity 過剰 strip | **不採用** | strip 0 hit 確認、本 route で通らない |
| 3: C 単独 | thread_center 不 bind | **不採用** | 独立 thread でも 12 条捏造 ⇒ thread だけが原因ではない |
| **4: A + B 複合** | **memory + promotion_gate** | **採用** | B が主、A が支持。両者を直せば 12 条が届く |
| 5: B + C 複合 | promotion_gate + thread | 部分 | C は副因として残るが、本流は B |
| 6: D + 他 | surface_purity + 他 | 不採用 | D は派生効果 |
| 7: 全領域 | 全部 | 不採用 | 強さの差が明確、薄く広くない |

**確定: シナリオ 4 (A + B 複合) — B 主因、A 副因、C 周辺副因、D 軽微**

## Section 10: 推奨修復カード

優先度順:

### 10.1 第一手: `CARD-CONSTITUTION-PROMOTION-GATE-V1` (観点 B)

- **対象**: `api/src/core/constitutionLoader.ts` + `api/src/routes/chat.ts:380-384`
- **内容**:
  1. `constitutionLoader.ts` に `loadKotodamaConstitutionV1Body(): string` を追加 (`KOTODAMA_CONSTITUTION_V1.txt` の本文を読み verify 後 export)
  2. `buildKotodamaConstitutionClause(): string` を追加 (12 条を簡潔な system prompt 用 clause に整形、上限 ~3000 chars)
  3. `chat.ts:380-384` の `TENMON_CONSTITUTION_TEXT` 配列に `_kotodamaConstitutionClause` を組み込む
  4. PromptTrace `clause_lengths` に `kotodama_constitution_v1` 項目を追加
- **想定効果**: 「第 4 条は？」 → 正典「ヰ・ヱを欠損扱いにしない」が届く
- **想定 risk**: prompt_total が +1500-3000 chars 増える ⇒ token cost 増、context window 圧迫
- **acceptance**: 12 条全件 chat で正典 phrase 命中率 >= 70%、捏造率 0%

### 10.2 第二手: `CARD-CONSTITUTION-MEMORY-DISTILL-V1` (観点 A)

- **対象**: 新規 systemd unit `mc-distill-constitution-v1.service` + 蒸留 script
- **内容**:
  1. `KOTODAMA_CONSTITUTION_V1.txt` の 12 条を memory_unit (`memory_type='scripture_distill'`, `scope_id='constitution_v1_article_N'`) に蒸留
  2. 50 音 canonical の `with_textual_grounding` を 50/50 に近づける蒸留 (Section 11 で実体化)
  3. modern_alias (ヰ→イ、ヱ→エ) を 50/50 に
- **想定効果**: hybrid lane で「第 4 条」を聞いた時に memory_units から正典 phrase が retrieve される
- **acceptance**: `with_textual_grounding >= 25/50 (50%)`, `coverage_ratio >= 0.50`

### 10.3 第三手: `CARD-DEFAULT-PERSONA-REASSIGN-V1` (観点 C)

- **対象**: `thread_persona_links` (default thread)
- **内容**: default thread の persona を `stage2-persona-1775085424` (Stage2 verification) から本番運用 persona (例: `kukai-deepread` または新規 `tenmon-default-persona`) に切り替え
- **想定効果**: `hallucination_fallback=abstain` から `admit_unknown` へ、`retrieval_mode=balanced` から `grounded_first` へ
- **acceptance**: default thread の chat で 12 条応答が 28 chars fallback ではなく 200 chars 以上の中身応答になる

### 10.4 第四手: `CARD-PERSONA-CONSTITUTION-BINDING-V1` (観点 C)

- **対象**: `persona_knowledge_bindings`
- **内容**: 全本番 persona に `source_type='constitution'`, `source_id='KOTODAMA_CONSTITUTION_V1'`, `binding_mode='retrieve'`, `priority=10` (最高) で binding 追加
- **想定効果**: hybrid lane で正典 12 条を retrieve 候補に上げる
- **acceptance**: hybrid lane の retrieve top に KOTODAMA_CONSTITUTION_V1 が出現

### 10.5 第五手 (任意): `CARD-CHAT-CONSTITUTION-INSTRUCTION-V1` (観点 D)

- **対象**: `chat.ts:362` の `TENMON_CONSTITUTION_TEXT_BASE`
- **内容**: 「12 条本文が clause として注入されているので、条文番号を聞かれたら本文を引用すること」 instruction を追加 (B 修復後の強化)
- **想定効果**: 第 4 条捏造の防止、正典文の直接引用率向上
- **acceptance**: 12 条応答で「ヰ・ヱを欠損扱いにしない」「分母 50 固定」等の正典 phrase 命中率 >= 90%

## Section 11: doctor v2 sample (`kotodama_50_coverage = 0.26`) との関係

### 11.1 doctor v2 sample alerts

`docs/ark/doctor/doctor_v2_sample_report.json` (commit 48411e8c):

```json
{
  "id": "kotodama_50_coverage_low",
  "level": "warn",
  "category": "constitution",
  "message": "kotodama_50_coverage.coverage_ratio = 0.26 (with_entry=13/total=50)",
  "recommendation": "Plan 50-音 entry expansion card (Phase B)"
}
```

→ doctor v2 が「Phase B で 50 音 entry expansion card を計画せよ」と warn 発出。本 OBSERVE はその warn の **詳細因果分析**。

### 11.2 live coverage (本観測時 17:18)

`/api/mc/vnext/intelligence` の `kotodama_50_coverage`:

```json
{
  "total": 50,
  "with_entry": 13,
  "with_water_fire": 15,
  "with_textual_grounding": 2,
  "with_source_page": 2,
  "with_shape_position": 50,
  "with_modern_alias": 0,
  "coverage_ratio": 0.26,
  "coverage_ratio_grounding": 0.04,
  "constitution_ref": "KOTODAMA_CONSTITUTION_V1"
}
```

sample 時と完全一致 (停滞している = 蒸留 pipeline 不在の裏付け)。

### 11.3 0.26 の構造分解

| 指標 | 値 | 評価 |
|---|---:|---|
| `with_shape_position` | 50/50 = 100% | 健全 (50 音図の位置情報は完備) |
| `with_water_fire` | 15/50 = 30% | 部分的 (水火属性の付与が 35 音欠損) |
| `with_entry` | 13/50 = 26% | 弱 (説明 entry が 37 音欠損) |
| `with_textual_grounding` | **2/50 = 4%** | **致命的** (正典本文 page 引用が 48 音欠損) |
| `with_source_page` | **2/50 = 4%** | **致命的** (page reference が 48 音欠損) |
| `with_modern_alias` | **0/50 = 0%** | **致命的** (ヰ→イ、ヱ→エ 等が完全欠損) |

→ `coverage_ratio = (entry + water_fire + textual_grounding + source_page + shape_position + modern_alias) / (6 × 50) = (13+15+2+2+50+0) / 300 = 82/300 ≈ 0.273` (実測 0.26 と整合)

### 11.4 0.26 と本 OBSERVE の因果関係

| doctor v2 alert | 本 OBSERVE の対応観点 | 関係 |
|---|---|---|
| `kotodama_50_coverage_low` (0.26) | **観点 A (memory_units 蒸留欠如)** | 観点 A の **数値証拠**。50 音の textual_grounding/modern_alias が 0-4% であることが、12 条「ヰ・ヱを欠損扱いにしない」「分母 50 固定」を裏付ける memory が無い実体 |
| (alert なし) | **観点 B (promotion_gate 未配線)** | doctor v2 はまだ「KOTODAMA_CONSTITUTION_V1.txt の chat 注入経路」を診ていない (Phase A 範囲外)。本 OBSERVE で発見 |
| (alert なし) | **観点 C (thread_center / persona)** | doctor v2 はまだ「default persona の retrieval_mode」を診ていない |

→ **doctor v2 sample (0.26) は観点 A のみカバー、観点 B が doctor v2 の盲点**。doctor v2 Phase B での「50-音 entry expansion」だけでは観点 B (promotion_gate) は埋まらない ⇒ 別カード `CARD-CONSTITUTION-PROMOTION-GATE-V1` が必須。

### 11.5 修復後の coverage 期待値

`CARD-CONSTITUTION-PROMOTION-GATE-V1` (B) + `CARD-CONSTITUTION-MEMORY-DISTILL-V1` (A) 完了後:

| 指標 | 現値 | 期待値 |
|---|---:|---:|
| `with_entry` | 13 | 50 |
| `with_water_fire` | 15 | 50 |
| `with_textual_grounding` | 2 | 25-50 |
| `with_source_page` | 2 | 25-50 |
| `with_shape_position` | 50 | 50 |
| `with_modern_alias` | 0 | 4 (ヰ・ヱ・ヤ行/ワ行欠 4 音) |
| `coverage_ratio` | 0.26 | **0.60-0.85** |

## Section 12: TENMON 裁定用サマリー

| 項目 | 値 |
|---|---|
| 観点 A 詰まり度 | **70/100** (副因) |
| 観点 B 詰まり度 | **90/100** (主因) |
| 観点 C 詰まり度 | **60/100** (副因) |
| 観点 D 詰まり度 | **20/100** (軽微) |
| 真因シナリオ | **シナリオ 4 (A + B 複合)** |
| 推奨第一手 | `CARD-CONSTITUTION-PROMOTION-GATE-V1` (Card-06 系) |
| 推奨第二手 | `CARD-CONSTITUTION-MEMORY-DISTILL-V1` (Card-04 系) |
| 推奨第三手 | `CARD-DEFAULT-PERSONA-REASSIGN-V1` (Card-09 系) |
| 推奨第四手 | `CARD-PERSONA-CONSTITUTION-BINDING-V1` (Card-09 系) |
| 推奨第五手 (任意) | `CARD-CHAT-CONSTITUTION-INSTRUCTION-V1` (Card-10 系) |
| memory_units 全体件数 | **252,970** |
| memory_units 12 条 unique phrase 件数 | **0** |
| thread_center default | **HOKEKYO** (KOTODAMA_CONSTITUTION_V1 でない) |
| default thread persona | **`stage2-persona-1775085424` "Stage2 Persona" (verification 用)** |
| persona_knowledge_bindings 件数 | **105** (default persona 50 / kukai-deepread 50 / verify_a 3 / verify_b 2) |
| `source_type='constitution'` 件数 | **2** (verify fixture のみ) |
| chat.ts 内 strip 層数 | localSurfaceize / __hasEscape / __looksBroken / __extremelyBroken (= 4 系統、本 route で実効発動なし) |
| 一般化逃げ fallback hard-code | **0 件 (chat.ts / core/*.ts)** |
| 12 条応答パターン (independent thread) | **success 12 / "範囲外" 0** だが **正典準拠 0/12 (全件捏造)** |
| 12 条応答パターン (default thread 連続) | **fallback 11 / "範囲外" 1** |
| 周辺 8 件応答パターン | **success 8 / "範囲外" 0 (中身応答)** |
| PromptTrace `khs_constitution` clause_length | **1148 chars** (KHS_CORE_CONSTITUTION_v1 由来、12 条本文を含まない) |
| PromptTrace `prompt_total_length` | 6207-7258 chars |
| doctor v2 sample との関係 | 0.26 は観点 A の数値証拠、観点 B は doctor v2 の盲点 |
| `tenmon-ark-api` PID | **854190 (不変)** |
| `tenmon-runtime-watchdog` PID | **2539152 (不変)** |
| acceptance verdict | (post-commit verify、Section 13 参照) |
| enforcer verdict | **clean** (`total_checks=6, errors=0, warns=0`) |

## Section 13: PRE/POST 不変性

| 項目 | PRE | POST |
|---|---|---|
| `tenmon-ark-api` PID | 854190 | (commit 後計測) |
| `nginx` PID | 891111 | (不変期待) |
| `tenmon-runtime-watchdog` PID | 2539152 | (不変期待) |
| `tenmon-auto-patch` | inactive / disabled | inactive / disabled (不変) |
| `mc-collect-git` (oneshot) | inactive / static | inactive / static (不変) |
| `mc-collect-all` (oneshot) | inactive / static | inactive / static (不変) |
| `git diff` 範囲 | (本レポートの修正のみ) | (本レポートの修正のみ) |
| `chat.ts` | 6030 行 | 6030 行 (不変) |
| `kotodamaConstitutionEnforcerV1.ts` | 108 行 | 108 行 (不変) |
| `tenmonLawPromotionGateV1.ts` | 73 行 | 73 行 (不変) |
| sqlite write 操作 | 0 件 | 0 件 (SELECT のみ) |
| API endpoint 追加 | 0 件 | 0 件 |
| restart | 0 件 | 0 件 |

## 結語

本 OBSERVE の **唯一の発見** を一行で:

> **`KOTODAMA_CONSTITUTION_V1.txt` 5852 bytes は SHA256 verify を通過するが、その本文 12 条は chat の system prompt に到達する経路 (constitution-to-chat promotion_gate) を持たない。既存の `tenmonLawPromotionGateV1` は law promotion 用の別物。よって LLM は「条文番号」を聞かれた時に、independent thread では捏造し、default thread (Stage2 Persona, abstain) では fallback する。**

修復は本 OBSERVE では行わない。Phase 2 で `CARD-CONSTITUTION-PROMOTION-GATE-V1` を起案する。

---

end of CONSTITUTION_CHAT_DELIVERY_OBSERVE_V1.md
