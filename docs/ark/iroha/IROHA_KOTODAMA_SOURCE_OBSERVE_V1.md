# IROHA-KOTODAMA-SOURCE-OBSERVE-V1

- generated_at: `2026-04-26T03:12:37.057774+00:00`
- observer_version: `v1.0.0-iroha-phase1`
- verdict: **GREEN**
- connection_rate: **100%**

## 1. VPS 内いろは関連ファイル一覧

- shared/kotodama/iroha_kotodama_hisho.json: exists=True size=275614 lines=1043 sha8=c5f18b9b4ffa
  - top-level keys (3): title, total_paragraphs, content
- shared/ 配下 iroha 関連: 1 件
  - `shared/kotodama/iroha_kotodama_hisho.json` size=275614 sha8=c5f18b9b4ffa
- docs/ 配下 iroha 関連: 3 件
  - `docs/ark/iroha/IROHA_KOTODAMA_SOURCE_OBSERVE_V1.md` size=6578
  - `docs/ark/map/iroha_amaterasu_axis_raw_hits_v1.txt` size=0
  - `docs/ark/map/iroha_amaterasu_axis_v1.md` size=6745

## 2. DB 内いろは関連テーブル・件数

- iroha 系テーブル: iroha_actionpacks, iroha_khs_alignment, iroha_units
  - **iroha_units**: row_count=21 cols=9
    - columns: unitId, doc, pdfPage, anchor, kw, quote, quoteHash, status
  - **iroha_actionpacks**: row_count=1 cols=5
    - columns: packId, kind, payloadJson, status, createdAt
  - **iroha_khs_alignment**: row_count=10 cols=7
    - columns: alignId, irohaUnitId, khsLawKey, relation, score, note, createdAt

## 3. memory_units / source_registry 接続状況

- memory_units iroha total: **63**
- scope_id 内訳 (top 10):
  - `iroha-specificity-postrestart-4-1775898812`: 2
  - `iroha-specificity-postrestart-3-1775898811`: 2
  - `iroha-specificity-postrestart-2-1775898811`: 2
  - `iroha-specificity-postrestart-1-1775898810`: 2
  - `iroha-specificity-pass-4-1775898939`: 2
  - `iroha-specificity-pass-3-1775898939`: 2
  - `iroha-specificity-pass-2-1775898938`: 2
  - `iroha-specificity-pass-1-1775898938`: 2
  - `iroha-specificity-finalpass-4-1775899190`: 2
  - `iroha-specificity-finalpass-3-1775899189`: 2
  - ... and 22 more scopes
- source_registry iroha total: **0**

## 4. chat.ts / guest.ts / route 接続状況

- chat.ts iroha refs: **26 行**
  - L100: import { attachSatoriVerdict, checkIrohaGrounding } from "../core/satoriEnforcem...
  - L101: import { queryIrohaByUserText, buildIrohaInjection } from "../core/irohaKotodama...
  - L893: // V2.0_SOUL_ROOT_BIND_5: SATORI いろは根拠判定（三要素整合チェック）
  - L897: const grounding = checkIrohaGrounding(responseText);
  - L900: df.ku.irohaGrounding = {
  - L903: sounds: grounding.irohaSound.sounds.slice(0, 3),
  - L1963: // V2.0_SOUL_ROOT_BIND_1: いろは言霊解 (irohaKotodamaLoader) → 原典段落注入
  - L1964: let __irohaClause = "";
- guest.ts iroha refs: **11 行**
  - L33: import { queryIrohaByUserText, buildIrohaInjection } from "../core/irohaKotodama...
  - L37: import { checkIrohaGrounding } from "../core/satoriEnforcement.js";
  - L204: const __guestIrohaHits = queryIrohaByUserText(userMessage);
  - L205: if (__guestIrohaHits.length > 0) {
  - L206: systemPrompt += "\n" + buildIrohaInjection(__guestIrohaHits, 800);
- 他 route ファイル: 1 件
  - sukuyou.ts: 9 hits

### engine / loader
- **irohaEngine_ts**: exists=True lines=30 exports=irohaInterpret
- **irohaActionPatterns_ts**: exists=True lines=192 exports=IrohaActionPattern, IrohaCounselClassificationResult, loadIrohaActionPatterns, classifyIrohaCounselInput, resolveIrohaActionPattern
- **irohaKotodamaLoader_ts**: exists=True lines=229 exports=IrohaParagraph, IrohaKotodamaCanon, loadIrohaKotodama, queryIrohaByUserText, buildIrohaInjection, irohaCanonStats

### chat probe
- response_length=343 provider=gemini model=None route_reason=chat
- prompt_trace iroha clauses:
  - iroha: 668

## 5. Notion 解析ページとの対応関係

- token_present: True
- iroha 解析班ページ (id_sha8=0fb109c9)
  - title: いろは言灵解｜天聞アーク思考根幹・徹底解析
  - root headings: 8
    - [heading_2] 目的
    - [heading_2] 1. 整理度の判定
    - [heading_3] 判定
    - [heading_2] 2. 『いろは言灵解』の根本構造
    - [heading_3] 2.1 表層：無常の認識
    - [heading_3] 2.2 内層：生成の理
    - [heading_3] 2.3 実践層：清濁を分け、理に戻す
    - [heading_2] 3. 天聞アークに入れるべき12原則
  - child_pages: 0
  - child_databases: 0
- structure_check:
  - iroha_47_chapters: False
  - ongi_table: False
  - lifeview: False
  - deathview: False
  - hokekyo_link: False
- konpon page found: True

## 6. 現在の接続率評価

| Layer | State |
|---|---|
| Layer 1: resource (shared/docs) | **connected** |
| Layer 2: db (iroha_units / memory_units / source_registry) | **connected** |
| Layer 3: loader (irohaKotodamaLoader.ts) | **connected** |
| Layer 4: engine (irohaEngine.ts / actionPatterns) | **connected** |
| Layer 5: chat (chat.ts refs + PromptTrace iroha chars) | **connected** |

**接続率 = 100%**

## 7. 未接続箇所

(none — 全層 connected)

## 8. 次の実装カード候補

1. `CARD-IROHA-NOTION-STRUCTURE-COMPLEMENT-V1`
   - reason: Notion 解析班ページに未整備の章節 (5/5): iroha_47_chapters, ongi_table, lifeview, deathview, hokekyo_link → 章構造の補強観測。
2. `CARD-IROHA-MC-CONNECTION-AUDIT-V1`
   - reason: MC intelligence の iroha 観測項目を細粒度化し、24h ledger に章別追跡を加える。
3. `CARD-IROHA-PROMPT-TRACE-OBSERVATION-V1`
   - reason: chat lane 別の iroha clause 出現を追跡し、断捨離応用へ繋げる。
4. `CARD-IROHA-NOTION-BRIDGE-V1`
   - reason: Notion 解析班ページと VPS 資料の双方向同期 (read-only) を整備する。

## 9. IROHA を天聞アーク根幹思考へ接続する最適ロードマップ

接続率 100% (connected=5/5)。 全層 connected。Notion 照合と MC 観測の追加段へ。

### 言霊憲法 V1 成功パターンの転用

- **PROMOTION-GATE (chat.ts へ直接 inject)**: `irohaKotodamaLoader.buildIrohaClause()` を実装し、chat.ts の system prompt に挿入する設計を `KOTODAMA-CONSTITUTION-PROMOTION-V1` のパターンで踏襲。
- **MEMORY-DISTILL (memory_units 蒸留)**: いろは正典 47 章の summary を `memory_units` (memory_scope='source', memory_type='scripture_distill', scope_id='iroha_kotodama_v1') に蒸留する。`CONSTITUTION-MEMORY-DISTILL-V1` の 12 条蒸留パターンを 47 章に拡張。
- **MEMORY-PROJECTION-CHAT-CLAUSE (記憶層から並列供給)**: chat.ts の `_irohaKotodamaMemoryClause` IIFE で memory_units summary を直接 SELECT し、PROMOTION-GATE と並列で system prompt に注入する。`CONSTITUTION-MEMORY-PROJECTION-CHAT-CLAUSE-V1` を直転用。

### 接続率上昇予想

- 各カード完了後の接続率は、対応 Layer が `connected` に昇格した分だけ加算される。最終的に全 5 層 connected で **100%**、Notion 照合・MC 観測で監視段に到達。

---

**注意**: いろは正典原文は本ドキュメントに全文展開されていない (要約 + sha8 + ファイル参照のみ)。実装段では `shared/kotodama/iroha_kotodama_hisho.json` を直接参照すること。

