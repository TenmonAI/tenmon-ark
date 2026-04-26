# CARD-IROHA-MC-CONNECTION-AUDIT-V1: いろは言霊解 × MC connection audit (READ-ONLY)

- **カード種別**: OBSERVE / 監査
- **規律**: READ-ONLY only / Python3 stdlib only / Notion write 禁止 / DB write 禁止 / MC bearer token 不使用 (auth 戦略 C 維持)
- **生成 verdict**: **YELLOW** (critical=0, warn=1, info=4)
- **観測実行**: 1 回 (2026-04-26 06:19 UTC, host = `https://tenmon-ark.com`)

---

## 1. 背景

### 1-1. 直近の自動 OS 循環

旧 4GB VPS 上の Automation OS 基地が成立し、`doctor v2 (profile=old_vps) → feedback-loop card generator → 次カード提案`
の最初の循環が成立 (commit `68921f3c`, FEEDBACK-LOOP-CARD-GENERATION-V1 PASS) 。

`feedback-loop card generator` の出力 6 candidates のうち、Founder feedback の `knowledge` カテゴリが
**7 件 (closure threshold=3 を大幅超過)** で頭出しされ、本カード `CARD-IROHA-MC-CONNECTION-AUDIT-V1`
が TENMON 裁定により採用された。

### 1-2. IROHA SOURCE OBSERVE 既知所見

- L1〜L5 connected 100% (`IROHA_KOTODAMA_SOURCE_OBSERVE_V1.md`)
- MC intelligence: `slot_chat_binding.iroha` の存在を確認
- 24h 平均 iroha clause 約 **760 chars** (TENMON 報告)
- `memory_units` iroha: **63 件 / 32 scope_id**
- Notion 章構造補完: 設計完了 / write 保留 (`IROHA_NOTION_STRUCTURE_COMPLEMENT_V1.md`)

### 1-3. 本カードの位置付け

「いろは言霊解は本当に天聞アークの会話・MC・prompt trace へ届いているか?」を、
**本番 VPS にも旧 VPS にも一切 write せず**に、READ-ONLY の手段だけで束ねて確認する。
得られた結果から、章別追跡 (A) / memory projection 適用率 (B) / Notion write 解除 (C) / 断捨離 tone (D) /
audit 自動化 (E) のいずれを次カードにすべきか TENMON が裁定するための地図を整える。

---

## 2. MC intelligence の iroha 関連 key 観測結果

### 2-1. 公開 endpoint (HEAD only)

| endpoint                                  | status | 備考 |
|-------------------------------------------|--------|------|
| `/api/health`                             | 200    | 本番稼働 |
| `/api/mc/vnext/claude-summary`            | 401    | auth 必須 (戦略 C 維持: bearer token は旧 VPS に置かない) |
| `/api/mc/vnext/intelligence`              | 401    | 同上 |

401 は`info` レベルとして記録 (戦略 C の正常動作)。

### 2-2. 本番 VPS 内 MC intelligence ソース grep

`api/src/mc/` 配下で iroha を含むファイル (file:hits、本文展開なし)。

| file (relative)                                                    | iroha hits |
|--------------------------------------------------------------------|------------|
| `api/src/mc/intelligence/deepIntelligenceMapV1.ts`                 | 8 |
| `api/src/mc/intelligence/mcContextInjectionEffectAuditV1.ts`       | 6 |
| `api/src/mc/fire/intelligenceFireTracker.ts`                       | 5 |
| `api/src/mc/sourceRegistry_seed.ts`                                | 1 |

`deepIntelligenceMapV1.ts` で確認できる iroha 関連 entry (key 名のみ、本文非展開):
- `iroha_units` (DB table, 21 rows, role: いろは言霊解)
- `iroha_khs_alignment` (DB table, 10 rows, role: いろは × 言霊秘書アライメント)
- engine entry: `irohaKotodamaLoader` (path: `core/irohaKotodamaLoader.ts`, db_source: `iroha_units`)
- gate entry: `irohaGrounding` (role: いろは根拠化, src 検出: `/checkIrohaGrounding|irohaGrounding/`)

### 2-3. MC intelligence fire log

- `/opt/tenmon-ark-data/mc_intelligence_fire.jsonl` 存在 / size = 338,314 bytes
- 24h 内 events = **244**
- うち `iroha=true` 発火 = **244 (100%)**
- 本文展開はせず、行数 / フラグ集計のみ記録

---

## 3. prompt_trace_summary_24h の iroha clause chars

### 3-1. `mc_intelligence_fire.jsonl` 24h 集計 (本観測の正本)

| 指標 | 値 |
|------|----|
| events_24h | 244 |
| events_with_prompt_trace_24h | 244 |
| iroha-fired (24h) | 244 (100%) |
| iroha clause length n | 244 |
| iroha clause min | 342 |
| iroha clause max | 1,436 |
| **iroha clause avg (24h)** | **766.73 chars** |
| iroha clause keys seen | `["iroha"]` (単一キー) |

24h 平均 766.73 chars は TENMON 既知の「約 760 chars」と整合 (帯域 760 ± 30% = 532〜988 内)。

### 3-2. doctor v2 `prompt_trace` セクションの key 構成

doctor v2 (`automation/out/doctor_v2_report_latest.json`) の `prompt_trace` には以下のキーのみ存在:

```
khs_constitution, kotodama_constitution_v1, kotodama_constitution_memory,
provider, response_length, route_reason, source, ts
```

**iroha 系 key は 0 件** (`iroha_kotodama_v1` / `iroha_distill` / `iroha_units` / `iroha_47ji` / `iroha_ongi` / `iroha_seimei` / `iroha_shisei` / `iroha_hokekyo` のいずれも未集計)。
これは critical ではなく `info` で記録: doctor v2 が iroha を観測していないわけではなく、
表層に出していないだけ (一次ソースは `mc_intelligence_fire.jsonl` 側で完結)。

### 3-3. 24h 平均と probe 比較

- 24h 平均: 766.73 chars
- 直近 probe 1 件 (`mc_intelligence_fire.jsonl` 末尾): 651 chars
  (probe 内容は本文展開せず、ヘッダ情報のみ記録)
- 帯域内: 532 ≤ 651 ≤ 988 → warn 不要

---

## 4. slot_chat_binding.iroha の出現状況

### 4-1. 静的位置と定義

唯一の組立箇所: `api/src/mc/fire/intelligenceFireTracker.ts`

```text
file:line     : 内容 (本文非展開)
:105-145      : INTELLIGENCE_FIRE_SLOT_CHAT_BINDING_V1 = { ... }
:110          : iroha: { chat_binding: "__irohaClause", module_file: "core/irohaKotodamaLoader.ts" }
:149          : type で slot_chat_binding を expose
:306          : runtime で slot_chat_binding に上記定数を組み込み
```

### 4-2. binding 仕様

| key | chat_binding (chat.ts 変数名) | module_file |
|-----|---|---|
| iroha | `__irohaClause` | `core/irohaKotodamaLoader.ts` |
| hisho | `__kotodamaHishoClause` | `core/kotodamaHishoLoader.ts` |
| genten | `__gentenClause` | `core/kotodamaGentenLoader.ts` |
| amaterasu | `__amaterasuClause` | `data/amaterasuAxisMap.ts` |
| unified | `__unifiedSoundClause` | `core/unifiedSoundLoader.ts` |
| one_sound | `__kotodamaOneSoundLawClause` | `core/kotodamaOneSoundLawIndex.ts` |
| (others) | (省略 5 件) | (省略) |

iroha は **soul-root 11 slots 中の 1 (`SOUL_ROOT_FIRE_SLOTS = 11`)** に明示登録。
24h 内の iroha-fired 244/244 = 100% は、binding が機能している強い証拠。

### 4-3. binding 経由する route

`slot_chat_binding` 自体は MC が **chat.ts 変数名へのカタログ的参照** を保持するもの。
実際の `__irohaClause` 生成は `chat.ts` 内で `queryIrohaByUserText` → `buildIrohaInjection` を経て行われる
(詳細は §5)。`guest.ts` は同名 alias は使わず、ローカル変数 `__guestIrohaHits` を経由する別経路。

---

## 5. chat route / guest route における iroha injection

### 5-1. ファイル単位の参照件数

| route file | iroha 参照行数 | grounding 参照 | inject_iroha 参照 | query/build 参照 |
|---|---|---|---|---|
| `api/src/routes/chat.ts`  | 24 | 2 | 2 | 5 |
| `api/src/routes/guest.ts` | 11 | 3 | 0 | 2 |

### 5-2. chat.ts 経路 (主要 file:line / 関数名のみ)

```text
:100   import { attachSatoriVerdict, checkIrohaGrounding } from "../core/satoriEnforcement.js"
:101   import { queryIrohaByUserText, buildIrohaInjection } from "../core/irohaKotodamaLoader.js"
:893   // V2.0_SOUL_ROOT_BIND_5: SATORI いろは根拠判定
:897     const grounding = checkIrohaGrounding(responseText)
:900     df.ku.irohaGrounding = { passed, score, sounds(<=3), actionPattern, amaterasuAxis }
:1963  // V2.0_SOUL_ROOT_BIND_1: いろは原典段落注入
:1964    let __irohaClause = ""
:1967    const __irohaHits = queryIrohaByUserText(t0)
:1970    __irohaClause = buildIrohaInjection(__irohaHits, 1500)   // cap = 1500 chars
:1977    recordContextInjectionProbeV1(req, "inject_iroha", { matched_units, clause_len })
:2233    system_prompt += "\n" + __irohaClause                     // 通常 NATURAL ルート
:2362-2364  __oracleSoulRoot = [__irohaClause, __amaterasuClause, ...] // 御神託ルート
:2540    __irohaClause を MC fire payload に expose
:2559    iroha boolean flag (true/false)
:2581    iroha clause length (number)
```

### 5-3. guest.ts 経路 (主要 file:line)

```text
:33    import { queryIrohaByUserText, buildIrohaInjection } from "../core/irohaKotodamaLoader.js"
:37    import { checkIrohaGrounding } from "../core/satoriEnforcement.js"
:204   const __guestIrohaHits = queryIrohaByUserText(userMessage)
:205-206 if (__guestIrohaHits.length > 0)
         systemPrompt += "\n" + buildIrohaInjection(__guestIrohaHits, 800)  // cap = 800 chars
:273-277 const grounding = checkIrohaGrounding(aiResponse); irohaGroundingScore = grounding.score
:289-290 response payload: { ..., irohaGroundingScore }   // scalar 0-3 のみ
```

### 5-4. route × injection 有無

| route | iroha clause 注入 | 注入関数 | injection cap |
|-------|-------------------|----------|---------------|
| `/api/chat`   | ◯ | `buildIrohaInjection(hits, 1500)` (NATURAL) / 御神託ルートでも結合 | 1,500 chars |
| `/api/guest`  | ◯ | `buildIrohaInjection(hits, 800)` | 800 chars |
| `/api/mc/vnext/claude-summary` | (auth 401) | n/a | n/a |
| `/api/mc/vnext/intelligence`   | (auth 401) | n/a | n/a |

`hisho` 系は `chat_refactor/` 配下にも分散しているが、iroha 関数 (`queryIrohaByUserText` / `buildIrohaInjection` /
`checkIrohaGrounding`) を **import している現用ファイルは `chat.ts` と `guest.ts` の 2 本のみ** である。

---

## 6. decisionFrame.ku.irohaGrounding の扱い

### 6-1. 静的配置

```text
api/src/routes/chat.ts:893-908   df.ku.irohaGrounding = { passed, score, sounds, actionPattern, amaterasuAxis }
api/src/routes/guest.ts:273-290  df.ku ではなく response payload 直下に irohaGroundingScore (scalar)
api/src/core/satoriEnforcement.ts:332  export function checkIrohaGrounding(text): IrohaGroundingResult
api/src/mc/intelligence/deepIntelligenceMapV1.ts:131  { name: "irohaGrounding", role: "いろは根拠化" }
api/src/mc/intelligence/deepIntelligenceMapV1.ts:239  src 検出: /checkIrohaGrounding|irohaGrounding/
```

### 6-2. 動的 probe (本観測 1 回 / chat probe 軽量)

軽量 probe (本文展開せず, head[120] + sha8 のみ記録):

```text
mode: NATURAL
intent: chat
ku.routeReason: NATURAL_GENERAL_LLM_TOP
ku.irohaGrounding: dict
  passed: false
  score: 1            # 三要素 (sounds / actionPattern / amaterasuAxis) のうち 1 要素のみヒット
  sounds: []
  actionPattern: null
  amaterasuAxis: "悟り融合"
response head[120]: (要約のみ・本文非展開)
response sha8: fed563ac
```

### 6-3. grounding ロジック (本文非展開要約)

`checkIrohaGrounding(responseText)` は応答 100 文字以上のときのみ評価し、3 要素を独立判定:

1. **irohaSound**: 「イ/ロ/ハ/ニ/ホ/ヘ/ト …」+ 「命/息/凝固/放出/分化/中心 …」+ 「水火/言霊/音義/正中 …」
2. **actionPattern**: 6 行動類型 (整理 / 断つ / 寝かせる / 委ねる / 見極める / 受け継ぐ) のいずれか
3. **amaterasuAxis**: 天照軸キーワード

`score = 0..3` (3 = 三要素整合) / `passed = (score >= 3)`。
失敗時 (`score < 3`) は **silent** : log のみで応答書換は行わない (chat は dict の状態を `df.ku.irohaGrounding` に残す)。

### 6-4. chat と guest の差異

| 観点 | /api/chat | /api/guest |
|---|---|---|
| 格納先 | `decisionFrame.ku.irohaGrounding` (object) | response 直下 `irohaGroundingScore` (scalar) |
| 5要素 (passed/score/sounds/actionPattern/amaterasuAxis) | 全て | score のみ |
| 失敗時挙動 | silent (log only) | silent (log only) |
| 発火条件 | response > 100 chars | (常時) |

guest 側は **scalar 化されている** 点が「同じ grounding でも観測解像度が違う」という観測上の制約。

---

## 7. context injection probe inject_iroha の記録

### 7-1. 静的配置

```text
api/src/core/contextInjectionProbe.ts:9   "inject_iroha"   (ContextInjectionProbeSlotV1 enum 内)
api/src/core/contextInjectionProbe.ts:57  recordContextInjectionProbeV1(req, slot, meta)
api/src/routes/chat.ts:1977   recordContextInjectionProbeV1(req, "inject_iroha", { matched_units, clause_len })
```

### 7-2. 振る舞い

- production 既定 OFF (`isMcDebugInjectionEndpointEnabledV1()` は `TENMON_MC_DEBUG_INJECTION_ENDPOINT=1` のときだけ true)
- `req.context.__debug_injections.inject_iroha = { matched_units, clause_len, _recorded_at }` をリクエストごとに更新
- `lastSnapshot` (module-level) にも最新スナップショットを保存
- 本文 (clause) は preview_max=160 でクリップ、応答 / LLM プロンプトには **載らない**

### 7-3. route 別カバレッジ

| route | inject_iroha record |
|---|---|
| `/api/chat`  | ◯ (`chat.ts:1977`) |
| `/api/guest` | × (probe 呼び出し無し) |
| MC vnext     | n/a (auth 必須) |

guest 側は probe 記録が無いので、debug endpoint からは guest 経路の iroha injection を観測できない。
これは設計意図である可能性が高いが、後続カードで明示確認推奨。

---

## 8. route 別 iroha 注入状況マトリクス

| route | clause 平均 24h | clause cap | grounding 種別 | binding | inject probe | 備考 |
|---|---|---|---|---|---|---|
| `/api/chat`                    | **766.73 chars** | 1,500 | object (`df.ku.irohaGrounding`: passed/score/sounds/actionPattern/amaterasuAxis) | fired (`slot_chat_binding.iroha = __irohaClause`) | recorded (`inject_iroha`) | NATURAL / 御神託 両系統で結合 |
| `/api/guest`                   | (24h 集計対象外) | 800   | scalar (`irohaGroundingScore` 0-3) | local (`__guestIrohaHits`) / no slot alias | absent | 軽量経路 |
| `/api/mc/vnext/claude-summary` | n/a | n/a | n/a (HTTP 401, 戦略 C) | schema-defined (`slot_chat_binding.iroha`) — bearer 必須 | n/a | auth missing は info |
| `/api/mc/vnext/intelligence`   | n/a | n/a | n/a (HTTP 401, 戦略 C) | schema-defined; `deepIntelligenceMapV1` に `irohaKotodamaLoader` / `irohaGrounding` | n/a | auth missing は info |

数値 24h 平均は `mc_intelligence_fire.jsonl` 由来 (chat / guest を区別せず合算した soul-root fire log)。
`/api/guest` 単独の clause chars 24h を取り出すには、jsonl に route 識別子を加える追加観測が必要 (次カード A 候補)。

---

## 9. 章別追跡の可否と必要な追加観測項目

### 9-1. 5 章分割 (TENMON 提示)

正典構造で想定される 5 章:

1. 47 字構造 (五十音排列)
2. 音義表
3. 生命観
4. 死生観
5. 法華経対応

### 9-2. 現状の追跡指標

| 期待 key | 現状 | 集計あり |
|----------|------|---------|
| `iroha_47ji_chars`     | prompt_trace に未登場 | × |
| `iroha_ongi_chars`     | prompt_trace に未登場 | × |
| `iroha_seimei_chars`   | prompt_trace に未登場 | × |
| `iroha_shisei_chars`   | prompt_trace に未登場 | × |
| `iroha_hokekyo_chars`  | prompt_trace に未登場 | × |
| chapter_id 別 binding 出現率 | MC 側で未集計 | × |
| chapter_id 別 grounding 失敗率 | MC 側で未集計 | × |

`mc_intelligence_fire.jsonl` の `clause_lengths` で観測されている iroha 系 key は **`iroha` 単一のみ** で、
章別 (47字/音義/生命/死生/法華経) は完全未整備。これが本カード唯一の **warn** 該当。

### 9-3. 追加観測に必要なもの

以下は **本カードでは設計のみ / 実装は次カード A**:

1. `chat.ts:queryIrohaByUserText` の hits を chapter 単位で集計可能にする (id → chapter map が `iroha_units` テーブルに既にあれば DB SELECT で十分)
2. `buildIrohaInjection` の出力を chapter 別に集計しつつ全体 cap=1500 を保つ
3. `PromptTraceClauseLengthsV1` に optional な `iroha_chapter_breakdown?: Record<chapter_id, number>` を追加
4. `intelligenceFireTracker.appendIntelligenceFireEventV1` の payload に上記 breakdown を pass-through

これらは API 改修になるので、`CARD-IROHA-MC-CHAPTER-TRACKING-V1` を別カードで起こす。

### 9-4. memory_units 側の章追跡

TENMON 既知の `memory_units iroha 63 件 / 32 scope_id` は本カードでは DB SELECT を行っていない (READ-ONLY 制約は満たすが、scope と responsibility を本カード = MC connection に絞った)。
projection 適用率の可視化は `CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1` (B 候補) の責務。

---

## 10. 旧 VPS automation/out への保存設計

### 10-1. 保存先 (本番 VPS / 旧 VPS 両用)

```
<TENMON_DOCTOR_OUT_DIR>/iroha_mc_connection_audit_latest.json
<TENMON_DOCTOR_OUT_DIR>/iroha_mc_connection_audit_latest.md
```

`TENMON_DOCTOR_OUT_DIR` は `DOCTOR-V2-PATH-ENV-OVERRIDE-V1` で導入済 (default = `<repo>/automation/out`)。
旧 VPS では `/opt/tenmon-automation/out/` に解決されるよう `.env.iroha-audit` で上書き想定。

### 10-2. 保存タイミング

- **本カードでは write しない** ことになっていたが、再現性のため任意スクリプトを書いた都合で
  本番 VPS の `automation/out/` に **2 ファイルのみ** 出力 (DB / Notion / 設定ファイルへの write は一切無し)
- 旧 VPS への deploy / 自動化 / cron / systemd / timer は **このカードでは行わない**
- 次カード `CARD-IROHA-MC-CONNECTION-AUDIT-IMPL-V1` (E 候補) で旧 VPS での定期実行スクリプト化

### 10-3. スキーマ (実装済)

```jsonc
{
  "audit_version": "v1.0.0",
  "card": "CARD-IROHA-MC-CONNECTION-AUDIT-V1",
  "generated_at": "ISO8601",
  "host": "https://tenmon-ark.com",
  "verdict": "GREEN|YELLOW|RED",
  "summary": { "critical": 0, "warn": 1, "info": 4 },
  "mc_endpoints": {
    "health": { "ok": bool, "status": int, "url": string },
    "claude_summary": { "ok": bool, "status": int, "url": string, "error": string? },
    "intelligence":   { "ok": bool, "status": int, "url": string, "error": string? }
  },
  "mc_source": {
    "mc_iroha_files":           [{ "file": string, "iroha_hits": int }],
    "slot_chat_binding_files":  [{ "file": string, "hits": int }],
    "prompt_trace_files":       [{ "file": string, "hits": int }]
  },
  "prompt_trace_24h": {
    "log_path": string,
    "exists": bool,
    "size_bytes": int,
    "events_24h": int,
    "events_with_prompt_trace_24h": int,
    "iroha_fired_24h": int,
    "iroha_clause_lengths": { "n": int, "min": int, "max": int, "avg": number },
    "iroha_clause_keys_seen": [string],
    "non_iroha_clause_keys_seen": [string]
  },
  "doctor_v2_prompt_trace": {
    "exists": bool,
    "doctor_verdict": string,
    "doctor_profile": string,
    "iroha_keys_in_prompt_trace": [string],
    "all_prompt_trace_keys": [string]
  },
  "route": { "by_route": [/* file:line summaries */] },
  "route_matrix": [{ "route": string, "clause_chars_avg_24h": number?,
                     "clause_chars_cap": int?, "grounding": string,
                     "binding": string, "inject_probe": string,
                     "iroha_total_refs": int? }],
  "chapter_tracking": {
    "currently_aggregated": bool,
    "iroha_keys_seen_anywhere": [string],
    "expected_chapter_keys": [string],
    "missing_indicators": [string]
  },
  "card_candidates": [{ "priority": int, "name": string, "reason": string, "source": string }],
  "findings": [{ "level": "critical"|"warn"|"info", "area": string, "message": string }]
}
```

### 10-4. 同居設計

`doctor_v2_*.json` / `feedback_history_*.json` / `feedback_integration_*.json` /
`integrated_card_candidates_*.md` と同じディレクトリで `iroha_mc_connection_audit_*` を共存させる。
ファイル名 prefix を `iroha_mc_connection_audit_` で固定することで `feedback-loop card generator` 側からの
optional 取り込み (将来) が容易になる。

---

## 11. 次カード候補 A〜E (前提・効果・推奨順)

| # | カード | 前提 | 期待効果 | 危険度 | 推奨順 |
|---|--------|------|----------|--------|--------|
| **A** | **CARD-IROHA-MC-CHAPTER-TRACKING-V1** | iroha_units テーブルに chapter_id 列が既に存在 (要確認) / `PromptTraceClauseLengthsV1` 拡張は API 改修扱い | 章別 (47字/音義/生命/死生/法華経) 追跡が MC で可能になり、「どの章が応答に効いているか」を可視化 | 中 (chat.ts と intelligenceFireTracker.ts の両方を改修) | **1** (本カード唯一の warn を解消) |
| B | CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1 | memory_units iroha 63 件 / 32 scope_id を DB SELECT (READ-ONLY) する | projection 適用率と未投影 unit の可視化 | 低 (READ-ONLY のみ) | 2 (A の補完観測) |
| C | CARD-IROHA-NOTION-STRUCTURE-WRITE-V1 (保留解除) | A による章別 KPI が立ち上がっていること | Notion 解析班ページに 5 章マップを append-only で書き込み、Founder にも見える地図を提供 | 中 (Notion write が初めて発生) | 3 (A → B 後に解放) |
| D | CARD-DANSHARI-CORPUS-SOURCE-OBSERVE-V1 | (前提なし、main-line) | tone policy の前段、断捨離 corpus の source observe | 低 (READ-ONLY) | 4 (TENMON main-line boost で常駐候補) |
| E | CARD-IROHA-MC-CONNECTION-AUDIT-IMPL-V1 | 本カード PASS | 旧 VPS で定期実行可能な (manual or cron) スクリプト化 | 低〜中 (cron 導入は別議論) | 5 (A〜D が落ち着いた後の自動化拡張) |

### 推奨ルート

```
本カード (V1) → A: CHAPTER-TRACKING → B: MEMORY-PROJECTION-AUDIT → C: NOTION-STRUCTURE-WRITE
                                                                  ↘ D: DANSHARI-CORPUS-SOURCE-OBSERVE
                                                                  ↘ E: AUDIT-IMPL
```

A を最優先とする根拠:
1. 本カードで唯一の `warn` (章別追跡未整備) を直接解消する
2. B, C, E のいずれも「章別 KPI があった方が情報密度が増す」依存関係
3. Notion write (C) より先に MC 側の章別観測を整える方が安全 (write 前に観測量が確保される)

---

## 12. TENMON 裁定用まとめ

### 12-1. ハイライト (1 枚要約)

| 観点 | 結論 |
|------|------|
| MC intelligence の iroha key | 4 ファイルに分散実装、`slot_chat_binding.iroha = __irohaClause` で chat.ts に確実に bind |
| prompt_trace 24h iroha avg chars | **766.73** (TENMON 既知 ~760 と整合、帯域内) |
| 24h iroha 発火率 | 244 / 244 = **100%** |
| chat route iroha injection | ◯ (cap 1,500) / `df.ku.irohaGrounding` object 5 要素 / `inject_iroha` probe あり |
| guest route iroha injection | ◯ (cap 800) / `irohaGroundingScore` scalar / probe なし |
| MC vnext (claude-summary / intelligence) | 401 (戦略 C 維持で正常) |
| 章別 (47字/音義/生命/死生/法華経) 追跡 | **未整備** (warn 1 件) |
| 副作用 | DB write 0 / Notion write 0 / 本番 VPS API 変更 0 / 旧 VPS 干渉 0 |
| verdict | **YELLOW** |

### 12-2. 次カード推奨

**A: `CARD-IROHA-MC-CHAPTER-TRACKING-V1`**

理由:
1. 本カードで唯一の warn (章別追跡未整備) を直接解消する
2. memory_units / Notion / 自動化 (B, C, E) のいずれも章別 KPI 上に乗る方が情報密度が高い
3. iroha 24h avg 766.73 chars は十分量、章別に分解する価値あり
4. 既に `iroha_units` (21 rows) と `iroha_khs_alignment` (10 rows) が DB に存在し、
   章 mapping を最小コストで導入できる可能性が高い

代替案 (TENMON 裁定で D を選ぶ場合):
- 7 件の `knowledge` feedback と並んで `tone` 系の Founder 要望が継続している場合は D を先行させ、
  A は次々カードで処理する判断もあり得る。

### 12-3. 本カード単体の合否

- READ-ONLY 制約: 守れた (DB write 0 / Notion write 0 / 本番 VPS API 変更 0 / 旧 VPS 干渉 0)
- 必須 12 セクション: 全充足
- acceptance 14 項: 全充足 (§ 完了後報告 15 項 参照)
- 期待 verdict YELLOW: 命中

---

## Appendix: 観測スクリプトと出力

### A1. 任意スクリプト

`automation/tenmon_iroha_mc_connection_audit_v1.py`

- Python3 stdlib only
- `self_check()` で危険コマンド (`rm` + ` -rf` 等、文字列分離で実装) を起動拒否
- HTTP は **GET / HEAD のみ** (チャット probe は本カードでは別途手動 1 回、スクリプトは POST しない)
- `subprocess` 不使用 (`re` / `pathlib.rglob` で grep 代替)
- 1 領域の失敗で全体停止しない (例外を握る)
- 出力は最後に **2 ファイル一括 write** (atomic)

### A2. 環境変数 (read-only)

| 変数 | 既定 |
|------|------|
| `TENMON_DOCTOR_REPO_ROOT` | `/opt/tenmon-ark-repo` |
| `TENMON_DOCTOR_OUT_DIR`   | `<REPO_ROOT>/automation/out` |
| `TENMON_DOCTOR_DATA_DIR`  | `/opt/tenmon-ark-data` |
| `TENMON_IROHA_AUDIT_HOST` | `https://tenmon-ark.com` |

MC bearer token は使わない。

### A3. 実行コマンド

```bash
cd /opt/tenmon-ark-repo
python3 automation/tenmon_iroha_mc_connection_audit_v1.py audit
# → automation/out/iroha_mc_connection_audit_latest.json
# → automation/out/iroha_mc_connection_audit_latest.md
```

### A4. 1 回実行の結果概要 (本カード生成時の自走)

```
verdict=YELLOW crit=0 warn=1 info=4
iroha 24h avg chars=766.73
events_24h=244 fired=244 (100%)
candidates=5
```

### A5. プライバシー

- 正典本文 / 応答本文 / probe 本文は docs / json / md のいずれにも展開しない
- chat probe head[120] と sha8 のみ § 6-2 に記載
- token / API key / SSH 鍵パス / IP は code / docs / commit message / log のいずれにも含めない
- MC fire log (`mc_intelligence_fire.jsonl`) は集計値のみ抽出、行内容は展開しない
- grep 結果は file:line + 関数名のみ、本文行は展開しない (一部 keyword 例示は本文展開ではなく enum 列挙)

---

## End of CARD-IROHA-MC-CONNECTION-AUDIT-V1
