# CHAT_SAFE_REFACTOR_BASELINE_V1

本番 `chat.ts` を凍結したうえで、外部再構成の安全な土台とするための基準面メモ。  
**このカードでは会話内容・live routing・routeReason は変更しない。**

---

## 1. 責務分類（コメントレベル）

現行 `api/src/routes/chat.ts` の責務を、おおよその行帯で分類したもの。  
（実装の移動や分割は行わず、参照用。）

| 分類 | おおよその範囲 | 内容 |
|------|----------------|------|
| **entry** | L254〜L720 前後 | `router.post("/chat", ...)`、body 解釈、HEART observe、answerProfile、explicit 文字数抽出、KHS_SCAN、`message`/`threadId` 確定、最初の `res.json` wrap（L797 `__origJson`） |
| **route preempt** | L861〜L2840 前後 | support/selfaware early、N1 naming/greeting、R3 concept preempt、worldview/truth gate、一音言霊、scripture local、continuity anchor、TRUTH_GATE_RETURN_V2、longform 変数定義、**CARD_EXPLICIT_GLOBAL_LATE_PREEMPT_V10**（explicit 早期 return）、`reply` 宣言前の各種 preempt |
| **define / scripture** | L4910〜L8200 前後 | N1 help menu、P0 safe guest、danshari/menu、RESEED_ROUTER、KATAKAMUNA detail、DEF/scripture/KHS 経路、abstract frame、DEF_FASTPATH_VERIFIED、book placeholder、**EXPLICIT_CHAR_PREEMPT_V1 後段ブロック**（longform 本文＋`__ku`）、feeling/impression 等 |
| **general** | L8410〜L10900 前後 | CARD_GROUNDING_SELECTOR_V1、general shrink、NATURAL_GENERAL_LLM_TOP、responseComposer、threadCore/threadCenter、define exit、kotodama one sound grounded、ABSTRACT_FRAME_VARIATION、DEF_FASTPATH_VERIFIED_V1、voice guard、Card1 seal、DET_NATURAL_*、相談テンプレ、hybrid 経路への分流 |
| **finalize** | L3232〜L3280、gate 内 | FREECHAT_SANITIZE_V2B、**第二の res.json wrap**（L3257 `__origJson` 再定義、R9_LEDGER_HITMAP、rewriteUsed/rewriteDelta）、`__tenmonGeneralGateResultMaybe` 経由の全 return、gate 内 FINAL_SURFACE_SINGLE_SOURCE_LOCK |
| **persistence side effects** | 分散 | `saveThreadCore`、`writeSynapseLogV1`、`insertKanagiGrowthLedgerEntry`、`writeScriptureLearningLedger`、`upsertThreadCenter`、`upsertBookContinuation`、**ARK_THREAD_SEED_SAVE_V1**（`ark_thread_seeds` INSERT）、synapse_log INSERT、khs_seeds_det_v1 / khs_concepts / khs_seed_clusters 等の DB 書込 |

※ 行番号は執筆時点の目安。変更でずれるため、検索コメント（CARD_* / N1_* / TRUTH_GATE 等）で locate すること。

---

## 2. 危険箇所一覧

以下は今後の安全化カードで「live 直改修なし」にしたい対象。本カードでは一覧化のみ。

### 2.1 res.json wrapper 重複

- **L796〜L798**: 初回 wrap。`const __origJson = (res as any).json.bind(res); (res as any).json = (obj: any) => __origJson(obj);`（実質パススルー）。
- **L3256〜L3280 付近**: 第二の wrap。`const __origJson` を再定義し、`res.json` を R9_LEDGER_HITMAP 等のロジック付きで上書き。
- **リスク**: 二重定義により、実際に効くのは後者。先行 wrap は「早い return」のみ通過。経路によってどちらの wrapper を通るかが分かれる。

### 2.2 duplicated __origJson

- **L356**: `__origJsonTop`（別名で res.json を bind）。
- **L797**: `__origJson`（handler 内で res.json を bind）。
- **L3257**: 同じスコープ内で `__origJson` を再定義し、res.json を差し替え。
- **リスク**: 同じリクエスト内で複数回 `res.json` の wrap が行われ、読み手が「どれが最終送信か」を追いにくい。

### 2.3 duplicated constant / 定数重複

- 長文用本文テンプレ（`__bodyLongL`、`__bodyFeelingImpressionL` 等）が **L2710 付近** と **L8130 付近** で類似定義されている可能性。explicit 経路が「早期 global preempt」と「後段 explicit ブロック」の二本立てのため。
- **リスク**: 片方だけ修正すると経路差で挙動が変わる。

### 2.4 broken SQL / 埋め込み SQL の脆弱性・ typo

- **L622〜L623、L640〜L641**: `instr(IFNULL(metaJson, ), ?)` のように第二引数が欠けている／不正な箇所の可能性（要ソース確認）。
- **L2180 付近**: `INSERT INTO synapse_log` 等、複数箇所で prepare/run が分散。
- **リスク**: スキーマ変更や typo でランタイムエラー・不整合。

### 2.5 if (false) によるデッドコード

- **L7381**: `if (false) { ... return res.json(...) }`（DEF_DICT_NEED_CONTEXT 周辺）。
- **L7404**: 同様の `if (false)` ブロック。
- **リスク**: 削除すると diff が大きくなるため手を入れづらいが、実走しない分岐が残る。

### 2.6 throw 0 legacy

- **L3677〜L3702 付近**: 条件不適合時に `throw 0` で脱出（意図的な control flow）。
- **L4509**: `throw 0; // X5B_SYNAPSE_DEDUP_V1: disable legacy S0_2 insert`。直下に legacy synapse INSERT のデッドコードが残る。
- **リスク**: 慣習に依存した制御で、可読性・保守性が低い。

### 2.7 seed / log / ledger 多重点

- **synapse_log**: `writeSynapseLogV1`（chat_parts/synapse_impl）のほか、L2180 付近の直 INSERT、L4510 以降の無効化された S0_2 等、複数経路で「書く意図」が存在。
- **ark_thread_seeds**: ARK_THREAD_SEED_SAVE_V1 が HYBRID 経路の payload 返却前とエラーフォールバック後で重複した try ブロック（L13606 付近と L13739 付近）に存在。
- **kanagi_growth_ledger / scripture_learning_ledger**: 複数 route から呼び出し。
- **リスク**: 単一責任化せずに変更すると二重書込・抜けが発生しやすい。

---

## 3. 外部再構成用ディレクトリ

- `api/src/routes/chat_refactor/` … 本番 `chat.ts` を直改修せずに差し替え可能なモジュールを置く土台。
- 想定ファイル（必要に応じて追加）:
  - `entry.ts` … entry 責務（body 解釈・message/threadId・answerProfile・explicit 抽出等）の切り出し先。
  - `finalize.ts` … finalize 責務（res.json 共通 wrap、gate 前の sanitize、FINAL_SURFACE_SINGLE_SOURCE_LOCK の呼び出し方）の切り出し先。
  - `general.ts` … general 責務（grounding 選択、general shrink、NATURAL_GENERAL_LLM_TOP 周辺）の切り出し先。
  - `define.ts` … define/scripture 責務（DEF fastpath、scripture、abstract frame、explicit longform 後段）の切り出し先。

本カードでは「土台の作成と一覧の固定化」まで。実際の関数移動・差し替えは後続カードで acceptance PASS を条件に行う。

---

## 4. ロールバック基準面

- 本番凍結: 上記の責務分類と危険箇所一覧は、**現行 live `chat.ts` の状態**を基準に記載している。
- 以後の安全化カードは、**live 直改修なしで設計できる**ことを目標とする（refactor 側の追加・差し替えで対応）。
- acceptance: build PASS、restart PASS、既存主要 probe に変化なし、本ファイルおよび stub の存在、危険箇所一覧の保存。

---

## 5. PATCH1_SQL_AND_WRAP_OBSERVE_V1

### 5.1 broken SQL 修正
- `instr(IFNULL(metaJson, ), ?)` は `instr(IFNULL(metaJson, ''), ?)` へ修正対象。
- 目的は runtime error の火種除去のみ。会話本文・routeReason 変更なし。

### 5.2 wrapper 単一点化の観測メモ
- live には少なくとも以下が存在:
  - `__TENMON_JSON_WRAP_V7` 系
  - `const __origJson = ...` 再定義系
- 現段階では削除しない。
- 次カードで行うこと:
  1. 最終送信点 wrapper の特定
  2. early return bypass 経路の整理
  3. wrapper 単一点化案の作成
- このカードでは観測メモの固定のみ。

---

## 6. CHAT_SAFE_REFACTOR_PATCH1_CLEAN_V1（観測メモ）

PATCH1 由来の会話仕様変更をすべて戻し、許可された最小差分のみ残した状態を固定する。

### 6.1 live chat.ts に残してよい差分（完了後）

1. **ファイル先頭コメント 1 行**  
   `// CHAT_SAFE_REFACTOR_BASELINE_V1: refactor baseline and danger list → chat_refactor/BASELINE_V1.md`

2. **broken SQL 修正 2 箇所**  
   `instr(IFNULL(metaJson, ), ?)` → `instr(IFNULL(metaJson, ''), ?)`  
   （該当箇所が既に `''` の場合は変更なし。L623・L641 等で確認。）

3. **本メモ（BASELINE_V1.md の本節）の追記**

### 6.2 必ず戻した差分（PATCH1_CLEAN で実施済み）

- WORLDVIEW_ROUTE_V1 の本文変更（魂分岐を元の __reply 短文に復元）
- THOUGHT_IDENTITY_PREEMPT_V1 の追加ブロック全体を削除
- LONGFORM_RESPONSEPLAN_FORENSIC_V1 の trace 3 箇所を削除
- __kuExplicitLongform を __ku に戻し、EXPLICIT_CHAR_PREEMPT_V1 後段の responsePlan を削除
- __kuExplicitGlobal への responsePlan 追加を削除
- R22_JUDGEMENT_PREEMPT_V1 の本文を「良し悪しは文脈で…」「見立ては一点で…」に戻し、responsePlan 付き ku をインライン ku に戻した
- R22_ESSENCE_ASK_V1 の本文を「要点を聞いています。いまの中心を一言で…」に戻し、responsePlan を削除
- general shrink の judgement / essence の __bodyShrink 文言を上記に合わせて復元
- HYBRID 経路の LONGFORM_RESPONSEPLAN_FORENSIC_V1 trace を削除

### 6.3 禁止事項（本カードで行っていないこと）

- route 順変更
- 文面の新規変更
- responsePlan の新規追加
- preempt 追加
- wrapper 統合
- finalize 改修

### 6.4 完了条件

- chat.ts の差分は「先頭コメント + SQL 2 箇所（要確認）」のみ
- BASELINE_V1.md の本節追記が残る
- build PASS / restart PASS / 既存 probe に変化なし
