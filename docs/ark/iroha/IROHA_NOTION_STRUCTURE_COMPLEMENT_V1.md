# IROHA-NOTION-STRUCTURE-COMPLEMENT-V1

OBSERVE / 設計のみ。Notion write を含まない (= 本カードでの実書き込みは別カード裁定後)。

- 関連 commit (IROHA SOURCE OBSERVE): `b2cedcfd`
- evidence JSON: `automation/out/iroha_notion_structure_observer_latest.json`
- observer script: `automation/tenmon_iroha_notion_structure_observer_v1.py` (READ-ONLY)
- verdict (structure observer): **YELLOW** / structures_posted=**0/5** / structures_missing=**5/5**
- danger: **low (append-only proposal)**

---

## 1. 背景 (IROHA SOURCE OBSERVE 結果サマリー)

`CARD-IROHA-KOTODAMA-SOURCE-OBSERVE-V1` (commit `b2cedcfd`) は、いろは言霊解の天聞アーク根幹接続を 5 層で評価し **GREEN / 接続率 100% / 5/5 connected** を確証した。

要点:

- **Layer 1 resource**: `shared/kotodama/iroha_kotodama_hisho.json` (title=「いろは言霊解 天道仁聞」, total_paragraphs=**1037**, content=List[str] 1037 段落) が存在。`shared/` 内 1 件、`docs/` 内 2 件、`api/src/` 内 7 件の iroha 関連ファイルあり。
- **Layer 2 db**: `iroha_units` (21 件)、`iroha_actionpacks` (1 件)、`iroha_khs_alignment` (10 件、iroha_unit ↔ 法華経 law_key の relation 表)、`memory_units` の iroha 関連 63 件 / 32 scope_id (主に `iroha-specificity-*`)。
- **Layer 3 loader**: `api/src/core/irohaKotodamaLoader.ts` 229 行、6 exports (`loadIrohaKotodama` / `queryIrohaByUserText` / `buildIrohaInjection` / `irohaCanonStats` + 2 type)。
- **Layer 4 engine**: `api/src/engines/kotodama/irohaEngine.ts` (`irohaInterpret`)、`api/src/core/irohaActionPatterns.ts` (5 patterns 分類器: `loadIrohaActionPatterns` / `classifyIrohaCounselInput` / `resolveIrohaActionPattern` + 2 type)。
- **Layer 5 chat**: `chat.ts` で 26 行の iroha 参照 (L101 import / L1963-1971 SOUL_ROOT_BIND / L2233 system prompt 結合 / L2363 oracleSoulRoot / L2540-L2581 response meta)。chat probe で `iroha: 668 chars` 注入実績、MC intelligence の 24h 平均 **760 chars**。

**つまり「言霊解は既に動いている」**。問題は次元が違う：**「動いている言霊解の地図 (人間が見る Notion ページ) が、その動作を記述していない」**。

---

## 2. Notion 解析班ページの現見出し一覧

実観測 (本カード observer / depth 1〜3 / 2026-04-26 に取得):

- page_title: **「いろは言灵解｜天聞アーク思考根幹・徹底解析」** (page_id_sha8=`0fb109c9`)
- 総見出し: **25** (heading_1=0 / heading_2=**5** / heading_3=**20** / child_page=0 / child_database=0)

現章構成 (depth=1 のヘッディングを順序通り):

| # | type | heading text |
|---|---|---|
| 1 | h2 | 目的 |
| 2 | h2 | 1. 整理度の判定 |
| 3 | h3 | 判定 |
| 4 | h2 | 2. 『いろは言灵解』の根本構造 |
| 5 | h3 | 2.1 表層：無常の認識 |
| 6 | h3 | 2.2 内層：生成の理 |
| 7 | h3 | 2.3 実践層：清濁を分け、理に戻す |
| 8 | h2 | 3. 天聞アークに入れるべき12原則 |
| 9 | h3 | IROHA-01：無常前提 |
| 10 | h3 | IROHA-02：因縁生成 |
| 11 | h3 | IROHA-03：清濁分離 |
| 12 | h3 | IROHA-04：火水調和 |
| 13 | h3 | IROHA-05：中道判定 |
| 14 | h3 | IROHA-06：習慣転換 |
| 15 | h3 | IROHA-07：臍・中心帰還 |
| 16 | h3 | IROHA-08：慈悲と智恵の双運 |
| 17 | h3 | IROHA-09：盲信拒否 |
| 18 | h3 | IROHA-10：言葉責任 |
| 19 | h3 | IROHA-11：普遍ヤマト原則 |
| 20 | h3 | IROHA-12：聖典の実装制御 |

(以下 5 件は 21〜25 番目、本ドキュメントでは見出しのみ集計し本文は転載しない。詳細は evidence JSON 参照)

**観察**: 現ページは「**12 原則 (IROHA-01〜12)**」を中心に「**思考の枠組み**」として整備されている。一方、VPS runtime / DB は「**言語学的構造 (47字 / 音義 / 法華経対応)**」として実装済。**2 つの観点を結ぶ章が現ページに存在しない**。

---

## 3. 未掲示 5 構造の照合結果

evidence JSON `structure_check` 抜粋:

| chapter_key | label | posted | hits | 検索パターン |
|---|---|---|---|---|
| `47ji_structure` | 47字構造 | **False** | 0 | `47字\|四十七字\|47音\|47文字\|47音節\|いろは47\|四七字\|四十七音` |
| `ongi_table` | 音義表 | **False** | 0 | `音義表\|音義\|音の意味\|音象\|音相` |
| `lifeview` | 生命観 | **False** | 0 | `生命観\|生命の見方\|いのち観\|命観` |
| `deathview` | 死生観 | **False** | 0 | `死生観\|死と生\|別離観\|別れ観` |
| `hokekyo_link` | 法華経対応 | **False** | 0 | `法華経対応\|法華経\|法華\|妙法蓮華経` |

**結果: 5/5 全て未掲示** (verdict=YELLOW、warn=1)。

ただし注意：「未掲示」は単に Notion 見出しテキストにキーワードが現れない事実であり、現 12 原則のいずれかが意味的に同じ機能を担っている可能性はある (例: IROHA-04「火水調和」は生命観と関連)。本カードでは**観点軸が異なる**ことを問題視し、独立章として明示することを提案する。

---

## 4. VPS 側資産との対応マッピング (5 章 × 4 項目)

各章について input / output / runtime / MC 観測点を確定。`build_chapter_map` の出力をテーブル化:

### 4.1 47字構造

| 項目 | 値 |
|---|---|
| 目的 | いろは47字を正典に基づき定義し、各字 (paragraph) と meta を一覧で示す |
| VPS 資産 | `shared/kotodama/iroha_kotodama_hisho.json` (1037 段落) |
| DB | `iroha_units` (21 件) — 各 unit は元 PDF doc の `pdfPage` / `anchor` から `quote` を保持 |
| runtime | `queryIrohaByUserText` / `buildIrohaInjection` / `irohaCanonStats` |
| 入力元 | user message text (chat.ts L1967) |
| 出力先 | system prompt clause (`__irohaClause`、L2233 で結合) |
| MC 観測 (現) | `fire_24h.prompt_trace_summary_24h.avg_clause_lengths.iroha` (= **760 chars 24h avg**) |
| MC 観測 (将来) | `iroha_47ji_chars` / 24h average |

### 4.2 音義表

| 項目 | 値 |
|---|---|
| 目的 | 各音 (い・ろ・は…) の意味と位相を一覧で示す |
| VPS 資産 | `shared/kotodama/iroha_kotodama_hisho.json` (音義部分) / `api/src/core/irohaActionPatterns.ts` (5 patterns) |
| DB | `iroha_units.kw` / `iroha_units.anchor` (keyword と anchor で音単位の引用) |
| runtime | `irohaInterpret(word)` (engine) / `classifyIrohaCounselInput` / `df.ku.irohaGrounding.irohaSound.sounds` (chat.ts L900-903) |
| 入力元 | single word / sound |
| 出力先 | `df.ku.irohaGrounding` (sounds[0..3] が response meta に出る) |
| MC 観測 (現) | `df.ku.irohaGrounding` 出現率 (chat probe) |
| MC 観測 (将来) | `iroha_ongi_chars` / 24h average |

### 4.3 生命観

| 項目 | 値 |
|---|---|
| 目的 | いろは言霊解における生命の見方を整理する |
| VPS 資産 | `shared/kotodama/iroha_kotodama_hisho.json` (関連段落、1037 中) |
| DB | `memory_units iroha-specificity-*` scope (63 件 / top 10 scope) |
| runtime | `buildIrohaInjection` (現) / projection 経由は将来 `CHAT-CLAUSE-V1` で接続 |
| 入力元 | user message + memory_units summary |
| 出力先 | system prompt clause + projection log |
| MC 観測 (現) | memory_units iroha total (63) |
| MC 観測 (将来) | `iroha_seimei_chars` / 24h average |

### 4.4 死生観

| 項目 | 値 |
|---|---|
| 目的 | 死と生のつながり、別れの捉え方を整理する |
| VPS 資産 | `shared/kotodama/iroha_kotodama_hisho.json` (関連段落) |
| DB | `memory_units iroha-specificity-*` scope (生命観と共有) |
| runtime | `buildIrohaInjection` (lifeview と同経路) / future: `irohaThemeRouter` (未実装) |
| 入力元 | user message (death/parting context) |
| 出力先 | system prompt clause |
| MC 観測 (現) | memory_units iroha total (sub-thematic) |
| MC 観測 (将来) | `iroha_shisei_chars` / 24h average |

### 4.5 法華経対応

| 項目 | 値 |
|---|---|
| 目的 | いろは言霊解と法華経の対応関係を整理する |
| VPS 資産 | `shared/kotodama/iroha_kotodama_hisho.json` |
| DB | **`iroha_khs_alignment` (10 件)** ← iroha_unit ↔ khs_law_key の relation + score を直接持つ。例: `KHSL:LAW:KHSU:41c0bff9cfb8:p0:q043f16b3a0e8` (count=3) 他 |
| runtime | `checkIrohaGrounding` (df.ku.irohaGrounding) / future: `buildHokekyoCrossRefClause` |
| 入力元 | iroha_unit_id (alignment lookup) |
| 出力先 | khs_law_key + relation + score |
| MC 観測 (現) | iroha_khs_alignment count |
| MC 観測 (将来) | `iroha_hokekyo_chars` / 24h average |

**法華経対応は DB 直接対応物 (iroha_khs_alignment 10 件) があるため、5 章の中で最も実装側との接続点が太い。**

---

## 5. Notion 追記用の章立て案 (5 章分の最小ブロック構成)

各章の最小ブロック構成 (10 ブロック / 章)。正典本文の大量転載を禁止し、要約と参照のみ。

### 5.1 共通テンプレート

```
heading_2          : <章タイトル>
paragraph          : 目的: <2-3 行要約>
heading_3          : VPS 側対応資産
bulleted_list_item : <ファイル / DB テーブル / runtime 関数>
bulleted_list_item : DB: <テーブル名 + 件数>
bulleted_list_item : runtime: <関数名カンマ区切り>
heading_3          : 内容要約
paragraph          : (参照: shared/kotodama/iroha_kotodama_hisho.json) input=… / output=…
heading_3          : MC 観測点
bulleted_list_item : 現: <metric> / 将来: <future_metric>
```

### 5.2 章別具体案

#### 5.2.1 47字構造

- h2: 「47字構造」
- p: 「目的: いろは47字を正典に基づき定義し、各字 (paragraph) と meta を一覧で示す。」
- h3: 「VPS 側対応資産」
- ul: 「`shared/kotodama/iroha_kotodama_hisho.json` (1037 段落)」
- ul: 「DB: `iroha_units` (21 件)」
- ul: 「runtime: `queryIrohaByUserText`, `buildIrohaInjection`, `irohaCanonStats`」
- h3: 「内容要約」
- p: 「(参照: iroha_kotodama_hisho.json) input=user message text / output=system prompt clause (24h avg 760 chars)」
- h3: 「MC 観測点」
- ul: 「現: `fire_24h.prompt_trace_summary_24h.avg_clause_lengths.iroha` / 将来: `iroha_47ji_chars` / 24h average」

#### 5.2.2 音義表

- h2: 「音義表」
- p: 「目的: 各音 (い・ろ・は…) の意味と位相を一覧で示す。」
- h3: 「VPS 側対応資産」
- ul: 「`shared/kotodama/iroha_kotodama_hisho.json` (音義部分) / `api/src/core/irohaActionPatterns.ts` (5 patterns)」
- ul: 「DB: `iroha_units.kw` / `iroha_units.anchor`」
- ul: 「runtime: `irohaInterpret`, `classifyIrohaCounselInput`, `df.ku.irohaGrounding.irohaSound.sounds`」
- h3: 「内容要約」
- p: 「(参照: iroha_kotodama_hisho.json) input=single word / output=df.ku.irohaGrounding (sounds[0..3])」
- h3: 「MC 観測点」
- ul: 「現: `df.ku.irohaGrounding` 出現率 (chat probe) / 将来: `iroha_ongi_chars` / 24h average」

#### 5.2.3 生命観

- h2: 「生命観」
- p: 「目的: いろは言霊解における生命の見方を整理する。」
- h3: 「VPS 側対応資産」
- ul: 「`shared/kotodama/iroha_kotodama_hisho.json` (関連段落)」
- ul: 「DB: `memory_units iroha-specificity-*` scope (63 件 / top 10 scope)」
- ul: 「runtime: `buildIrohaInjection` (将来 `CHAT-CLAUSE-V1` で projection 接続)」
- h3: 「内容要約」
- p: 「(参照: iroha_kotodama_hisho.json) input=user message + memory_units summary / output=system prompt clause + projection log」
- h3: 「MC 観測点」
- ul: 「現: memory_units iroha total (63) / 将来: `iroha_seimei_chars` / 24h average」

#### 5.2.4 死生観

- h2: 「死生観」
- p: 「目的: 死と生のつながり、別れの捉え方を整理する。」
- h3: 「VPS 側対応資産」
- ul: 「`shared/kotodama/iroha_kotodama_hisho.json` (関連段落)」
- ul: 「DB: `memory_units iroha-specificity-*` scope (生命観と共有)」
- ul: 「runtime: `buildIrohaInjection` (lifeview と同経路) / future: `irohaThemeRouter`」
- h3: 「内容要約」
- p: 「(参照: iroha_kotodama_hisho.json) input=user message (death/parting context) / output=system prompt clause」
- h3: 「MC 観測点」
- ul: 「現: memory_units iroha total (sub-thematic) / 将来: `iroha_shisei_chars` / 24h average」

#### 5.2.5 法華経対応

- h2: 「法華経対応」
- p: 「目的: いろは言霊解と法華経の対応関係を整理する。`iroha_khs_alignment` テーブルが iroha_unit ↔ khs_law_key の relation + score を直接保持しており、5 章中もっとも DB 接続が太い。」
- h3: 「VPS 側対応資産」
- ul: 「`shared/kotodama/iroha_kotodama_hisho.json`」
- ul: 「DB: `iroha_khs_alignment` (10 件、law_key 例: `KHSL:LAW:KHSU:…`)」
- ul: 「runtime: `checkIrohaGrounding` (df.ku.irohaGrounding) / future: `buildHokekyoCrossRefClause`」
- h3: 「内容要約」
- p: 「(参照: iroha_kotodama_hisho.json + iroha_khs_alignment) input=iroha_unit_id / output=khs_law_key + relation + score」
- h3: 「MC 観測点」
- ul: 「現: iroha_khs_alignment count / 将来: `iroha_hokekyo_chars` / 24h average」

---

## 6. 各章の入力元・出力先・runtime 経路 (一括ビュー)

| 章 | 入力元 | 主 runtime 関数 | 出力先 | chat.ts 関連行 |
|---|---|---|---|---|
| 47字構造 | user message text | `queryIrohaByUserText` → `buildIrohaInjection` | `__irohaClause` | L1967 / L1970 / L2233 |
| 音義表 | single word / sound | `irohaInterpret` / `classifyIrohaCounselInput` | `df.ku.irohaGrounding.irohaSound.sounds` | L900-903 |
| 生命観 | user message + memory_units | `buildIrohaInjection` (+ 将来 projection) | `__irohaClause` + projection log | L1970 / L2363 |
| 死生観 | user message (death context) | `buildIrohaInjection` (lifeview と同経路) | `__irohaClause` | L1970 / L2363 |
| 法華経対応 | iroha_unit_id | `checkIrohaGrounding` (+ 将来 crossref) | `khs_law_key` + relation + score | L900 (irohaGrounding) |

5 章すべて、最終的には `__irohaClause` または `df.ku.irohaGrounding` に集約され、`oracleSoulRoot` (chat.ts L2363) で `[__irohaClause, __amaterasuClause, __kotodamaOneSoundLawClause]` に並列合流する。

---

## 7. Notion write カードの起案準備 (候補 A / B / C)

### 候補 A: `CARD-IROHA-NOTION-STRUCTURE-WRITE-V1`

| 項目 | 値 |
|---|---|
| 目的 | 本カードで設計した 5 章を Notion 解析班ページへ追記 (append のみ) |
| 必要権限 | Notion write (`pages.update` 系または `blocks.children` への append) |
| 想定操作 | append のみ。既存ブロックの patch / delete はしない |
| scope | Notion ページ構造変更のみ。VPS / DB / chat に副作用なし |
| 危険度 | low (append-only、既存ブロック不変) |
| 検証 | append 後に blocks read で再取得し、5 章の見出し一致を確認 |
| 推奨実行順 | 1 (5/5 missing で最も急務) |
| 前提条件 | 本カード設計が TENMON 裁定で承認されること |

### 候補 B: `CARD-IROHA-MC-CONNECTION-AUDIT-V1`

| 項目 | 値 |
|---|---|
| 目的 | MC 側で iroha の章別 / route 別 / 24h 注入を追跡 |
| 必要権限 | MC intelligence read のみ |
| 想定操作 | claude-summary / intelligence の章別キーパス追加観測 (READ-ONLY) |
| scope | observer 拡張のみ。runtime には触らない |
| 危険度 | none (READ-ONLY) |
| 検証 | observer JSON に章別 metric が追加されていること |
| 推奨実行順 | 2 (Notion 整備後の監視段) |
| 前提条件 | A 完了 (章別 metric の対応点が見えてから観測) |

### 候補 C: `CARD-IROHA-MEMORY-PROJECTION-AUDIT-V1`

| 項目 | 値 |
|---|---|
| 目的 | iroha memory_units 63 件が projection / conversation へどう還元されているか詳細観測 |
| 必要権限 | DB read / chat probe のみ |
| 想定操作 | memory_units 63 件の projection 適用率計測 |
| scope | observer 拡張のみ |
| 危険度 | none (READ-ONLY) |
| 検証 | projection 適用率レポートが生成されること |
| 推奨実行順 | 3 (生命観 / 死生観の memory 経路を強化する前段の観測) |
| 前提条件 | なし (本カードと並行可能) |

### 推奨順 (本観測結果に基づく)

1. **A** (Notion write、5/5 missing で最急務) → `CARD-IROHA-NOTION-STRUCTURE-WRITE-V1`
2. B (MC audit、A 後の章別追跡) → `CARD-IROHA-MC-CONNECTION-AUDIT-V1`
3. C (memory projection audit、生命観 / 死生観強化前段)

---

## 8. MC audit との接続点

将来 `CARD-IROHA-MC-CONNECTION-AUDIT-V1` で MC intelligence に追加すべき章別 metric 候補:

```
fire_24h.prompt_trace_summary_24h.avg_clause_lengths.iroha_47ji
fire_24h.prompt_trace_summary_24h.avg_clause_lengths.iroha_ongi
fire_24h.prompt_trace_summary_24h.avg_clause_lengths.iroha_seimei
fire_24h.prompt_trace_summary_24h.avg_clause_lengths.iroha_shisei
fire_24h.prompt_trace_summary_24h.avg_clause_lengths.iroha_hokekyo
fire_24h.slot_chat_binding.iroha_47ji
fire_24h.slot_chat_binding.iroha_ongi
fire_24h.slot_chat_binding.iroha_seimei
fire_24h.slot_chat_binding.iroha_shisei
fire_24h.slot_chat_binding.iroha_hokekyo
fire_24h.grounding_failure_rate.iroha_*  (各章の grounding 失敗率)
```

これらは将来追加候補であり、**本カードでは MC 側に変更を加えない**。MC intelligence は現在 `slot_chat_binding.iroha = {chat_binding: __irohaClause, module_file: core/irohaKotodamaLoader.ts}` と `avg_clause_lengths.iroha = 760` を一括値で観測中。章別追跡には observer 拡張 + chat.ts 側で `__irohaClause_47ji` 等を分離する必要があり、これは別カード裁定後に検討。

---

## 9. 残課題と注意事項

### 残課題

1. **観点軸の二重性**: 現 Notion ページは「12 原則」観点 (思考枠組み)、提案 5 章は「言語学的構造」観点。両者は補完的だが、**重複する内容** (例: IROHA-04「火水調和」⇄ 生命観) が出る可能性。append 時は「重複ではなく観点の追加」と明記する。
2. **正典本文の取り扱い**: `iroha_kotodama_hisho.json` の content は List[str] 1037 段落。Notion 章内で**段落番号と最初の数十字 + 出典参照のみ**にとどめる。全段落転載は禁止。
3. **法華経 law_key の形式**: `KHSL:LAW:KHSU:41c0bff9cfb8:p0:q043f16b3a0e8` のような不透明 ID。Notion 章では人間可読な対応表 (例: 「法華経 譬喩品 → IROHA Unit X」) に変換する別作業が必要。これは A の作業範囲を超えるため、A では「DB 直接対応あり (10 件)」のみ記述し、可読化は別カード。
4. **生命観 / 死生観の memory_units 経路は将来接続予定**: 現在 chat.ts で memory_units の iroha scope を直接 SELECT する `_irohaKotodamaMemoryClause` は存在しない (`_kotodamaConstitutionMemoryClause` の iroha 版相当)。これは `CARD-IROHA-MEMORY-PROJECTION-CHAT-CLAUSE-V1` (将来) として別カード化候補。

### 注意事項 (本カード遵守事項)

- ✅ Notion write ゼロ (本カードでは設計のみ)
- ✅ VPS コード変更ゼロ
- ✅ DB write ゼロ
- ✅ token / API key を docs / commit に出さない
- ✅ 正典本文の大量展開なし (要約 + 段落数 + sha8 ハッシュのみ)
- ✅ Notion ページ本文 (paragraph / quote 等) を docs に転載しない (見出し構造のみ記録)
- ✅ DB sensitive column 除外 (本カードはカウントと law_key のみ取得)
- ✅ self-check denylist で `pages.update` / `databases.create` / `databases.update` 等の Notion write API を全 token 連結記述で deny

### 副作用ゼロ確認 (本カード時点)

- DB write: 0 (sqlite3 mode=ro)
- Notion write: 0 (HTTP method=POST は `/v1/pages/{id}` retrieve と `/v1/blocks/{id}/children` list と `/v1/search` のみ、いずれも read 用途)
- systemctl restart/stop/disable/enable: 0
- nginx 操作: 0
- chat probe: 本カードでは送らない (前カードで 1 回送信済、本カードは独立 observe のみ)

---

## 10. TENMON 裁定向けサマリー (次カード推奨)

**結論**:

> いろは言霊解は **VPS / DB / runtime / chat / MC で 100% 接続済み**だが、**Notion 解析班ページがその実装を写像していない**。現ページは「12 原則」観点で整備されており、「**言語学的構造 (47字 / 音義 / 生命観 / 死生観 / 法華経対応)**」5 章が Notion 上に未掲示。
>
> これは「**動いている言霊解の地図が、人間に見える形で整理されていない**」状態であり、解消には Notion ページに 5 章を append する `CARD-IROHA-NOTION-STRUCTURE-WRITE-V1` (候補 A) が最優先。

**推奨次カード**: **A** (`CARD-IROHA-NOTION-STRUCTURE-WRITE-V1`)

**推奨理由**:

1. structure observer evidence: 5/5 missing (verdict YELLOW)
2. danger 低 (append-only、既存ブロック不変)
3. VPS / DB / runtime に副作用なし (Notion ページ構造のみ)
4. 完了後すぐ B (MC 章別 audit) と C (memory projection audit) の前提条件が揃う
5. 5 章はすべて VPS 側資産・DB テーブル・runtime 関数と既に対応関係が確定している (本カード § 4 / § 6 で立証済)

**前提**: TENMON が本カードの設計 (5 章 × 10 ブロック / 章) を承認し、Notion write 専用カードの作成を裁定すること。

**TENMON 裁定をお待ちします。**

---

### Appendix: evidence pointers

- structure observer JSON: `automation/out/iroha_notion_structure_observer_latest.json` (本 commit に同梱、observer_version=`v1.0.0-iroha-notion-structure`)
- IROHA SOURCE OBSERVE JSON: `automation/out/iroha_observer_report_latest.json` (commit `b2cedcfd`)
- VPS 正典: `shared/kotodama/iroha_kotodama_hisho.json` (size=275614 bytes / sha8=`c5f18b9b4ffa` / 1037 段落)
- 主要 runtime: `api/src/core/irohaKotodamaLoader.ts` (229 行 / 6 exports) / `api/src/core/irohaActionPatterns.ts` (192 行 / 5 exports) / `api/src/engines/kotodama/irohaEngine.ts` (30 行 / 1 export)
- chat 注入実績: 24h 平均 **760 chars** (MC intelligence)
