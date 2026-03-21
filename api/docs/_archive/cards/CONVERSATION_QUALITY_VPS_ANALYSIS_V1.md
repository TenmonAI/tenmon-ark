# 会話品質専用 VPS 解析 設計（CONVERSATION_QUALITY_VPS_ANALYSIS_V1）

## 目的

- **どの route が何を返し、どこで generic 化し、どこで continuity が失われるか**を把握する。
- point fix を足す前に、会話品質の主因をデータで切り分ける。
- 次に作るべき「会話主幹レイヤー」の候補を出す。

**本ドキュメントは解析手順と観測項目のみ。修正コードは出さない。**

---

## 1. 対象 route と観測の枠

| 観点 | routeReason（実測対象） | 備考 |
|------|-------------------------|------|
| NATURAL_GENERAL_LLM_TOP | `NATURAL_GENERAL_LLM_TOP` | 汎用 LLM 応答。responseComposer / clamp 経由。 |
| FEELING / IMPRESSION | `FEELING_SELF_STATE_V1`, `IMPRESSION_ARK_V1`, `IMPRESSION_TENMON_V1` | 気分・感想の deterministic preempt。 |
| EXPLICIT_CHAR | `EXPLICIT_CHAR_PREEMPT_V1` | 「N 文字で」の deterministic preempt。 |
| CONTINUITY | `CONTINUITY_ANCHOR_V1` | 直前の center を土台にした短い返し。 |

上記 4 観点について、**実測**で次を比較する。

- 返却 `response` の内容・長さ
- `decisionFrame.ku.routeReason`
- `decisionFrame.ku` の answer profile（`answerLength`, `answerMode`, `answerFrame`）
- 会話の「つながり」が弱くなる箇所の有無

---

## 2. 解析手順

### 2.1 データ取得方法（いずれか 1 つを選ぶ）

- **A. 実機サンプリング**  
  - 本番またはステージングの `/chat` に対して、一定期間または N 件、レスポンス body をそのまま保存する。  
  - 保存するのは `response`, `decisionFrame.ku`（少なくとも `routeReason`, `answerLength`, `answerMode`, `answerFrame`）、任意で `response` の文字数。  
  - 同一 thread の連続 2 ターン以上が含まれると、continuity の切れ目を観測しやすい。

- **B. synapse_log 補完クエリ**  
  - 既存 `synapse_log` には `routeReason` があるが、`response` 本文・文字数・answer profile は入っていない。  
  - 解析用に「レスポンス保存用の一時テーブル or ファイル」を用意し、解析期間だけ `reply()` 内で payload の一部を書き出す。解析終了後に削除する前提。

- **C. 再生スクリプト**  
  - 固定の入力セット（例: 気分質問 1、感想 1、300 文字で 1、続き 1、一般 1）を順に送り、各応答の `routeReason` / `response` / answer profile を記録。  
  - どの route がどの入力で発火するか・返りがどう違うかを再現可能にできる。

**推奨**: まず **A（実機サンプリング）** で実測し、不足があれば **C（再生スクリプト）** で特定 route を重点観測する。

### 2.2 解析の流れ（ステップ）

1. **サンプル収集**  
   - 上記 A/B/C のいずれかで、対象 4 route が少なくとも各 10 件以上（可能なら 30 件以上）になるように収集する。  
   - 同一 thread で「general → feeling」「general → continuity」など、隣接ターンのペアも含めるとよい。

2. **route 別集計**  
   - `routeReason` ごとに、次の観測項目（後述）を集計する。  
   - NATURAL_GENERAL_LLM_TOP については、直前ターンの `routeReason` も付与して「どの route の次に general に落ちたか」を分ける。

3. **比較**  
   - 4 観点（NATURAL_GENERAL_LLM_TOP / FEELING・IMPRESSION / EXPLICIT_CHAR / CONTINUITY）間で、response 長・answer profile・文言のパターンを比較する。  
   - 「受け取っています。そのまま続けてください」など、generic 化のフレーズを検出し、どの route の直後に多いかを記録する。

4. **continuity の切れ目**  
   - 同一 thread で「直前が CONTINUITY_ANCHOR_V1 または scripture/concept → 直後が NATURAL_GENERAL_LLM_TOP」のとき、2 ターン目の response が「直前の中心」を参照しているか、儀式文だけで終わっていないかを目視またはキーワードでチェックする。  
   - thread_center が保存されているのに、general 側で参照されず generic 応答になるケースを「continuity が失われた」としてカウントする。

5. **主因の整理**  
   - 「会話が弱くなる」を次のように定義して集計する。  
     - 違和感: ユーザーが「続き」を期待しているのに、汎用・定型文だけが返る。  
     - generic 化: response が「受け取っています」「中心を一つ置いて」など、文脈非依存の定型に偏る。  
     - continuity 喪失: 直前の center / 話題が response に反映されていない。  
   - 上記が、どの route の「返し」または「general に渡した直後の general の返し」で多いかを表にまとめる。

6. **会話主幹レイヤー候補の抽出**  
   - 主因が「general に落ちたあとの generic 応答」「continuity を読まない general」に集中している場合は、**general の手前で continuity を効かせるレイヤー**を候補にする。  
   - 主因が「FEELING/IMPRESSION/EXPLICIT の固定文が硬い」場合は、**短文テンプレートの多様化**または**LLM の短文専用経路**を候補にする。  
   - 結果を「次に作るべき会話主幹レイヤー候補」として 1 セクションにまとめる。

---

## 3. 観測項目（必須）

各応答 1 件あたり、少なくとも以下を記録する。

| 項目 | 内容 | 用途 |
|------|------|------|
| `routeReason` | `decisionFrame.ku.routeReason` | どの route で返したか |
| `responseLength` | `response` の文字数（length） | route 間の長さ比較 |
| `answerLength` | `decisionFrame.ku.answerLength` | short / medium / long |
| `answerMode` | `decisionFrame.ku.answerMode` | support / analysis / continuity 等 |
| `answerFrame` | `decisionFrame.ku.answerFrame` | one_step / statement_plus_one_question 等 |
| `responseHead` | `response` の先頭 100〜200 字（任意） | generic フレーズ検出 |
| `threadId` | スレッド ID | 連続ターン・continuity 判定 |
| `prevRouteReason` | 同一 thread の直前ターンの routeReason（あれば） | 「何の次に general になったか」 |

**追加で有用な項目（任意）**

- `continuityHint` / `threadCenterKey`: 直前の中心が ku に載っているか。  
- `response` 全文: 違和感のラベリングやキーワード検索用。  
- 入力メッセージの先頭 50 字: 何に対してその route が選ばれたか。

---

## 4. 比較観点（4 route の実測で見るもの）

### 4.1 NATURAL_GENERAL_LLM_TOP の実測

- **観測**: 実サンプルにおける `response` 長の分布、`answerLength` / `answerMode` / `answerFrame` の出現率。  
- **generic 化**: 先頭が「受け取っています」「中心を一つ置いて」「そのまま続けてください」などの定型で始まる割合。  
- **continuity**: 直前ターンが CONTINUITY_ANCHOR や scripture/concept であるとき、当該 general の response に「直前の center / 話題」が含まれる割合。  
- **出力**: 「general が返す内容の傾向」「generic 化しやすい条件」「continuity を引き継いでいないケースの多さ」を 3 行で要約。

### 4.2 FEELING / IMPRESSION route の実測

- **観測**: `FEELING_SELF_STATE_V1`, `IMPRESSION_ARK_V1`, `IMPRESSION_TENMON_V1` それぞれの response は固定文のため、文字数・先頭 50 字で同一かどうかを確認。  
- **比較**: 3 種とも `answerLength: "short"`, `answerFrame: "one_step"` で揃っているか。  
- **違和感**: ユーザーが「もう少し詳しく」と続けたときに、次ターンが general に流れ、そこで generic になっていないか（サンプルがあれば記録）。  
- **出力**: 「FEELING/IMPRESSION は短文固定であること」「その次のターンで generic になりやすいか」を 1〜2 行で要約。

### 4.3 EXPLICIT_CHAR route の実測

- **観測**: `EXPLICIT_CHAR_PREEMPT_V1` の `response` 長と、`explicitLengthRequested`（指定文字数）との差。  
- **比較**: 指定 300/500/1000 字などで、実際の response 長がどの範囲に収まっているか。  
- **answer profile**: `answerLength` が short/medium/long のどれに振られているか（指定字数に応じた tier と一致するか）。  
- **出力**: 「指定字数と実長の対応」「EXPLICIT_CHAR の返しが会話の流れを止めていないか」を 1〜2 行で要約。

### 4.4 CONTINUITY route の実測

- **観測**: `CONTINUITY_ANCHOR_V1` の response に「（center_key）を土台に」が含まれる割合。  
- **比較**: 直前の thread center が取れているケースで、返却文が center を明示しているか。  
- **continuity 喪失**: ユーザーが「さっきの話の続き」と言ったのに CONTINUITY_ANCHOR ではなく general に流れ、かつ general の response に「さっきの中心」が出てこないケースの有無・件数。  
- **出力**: 「CONTINUITY は center を土台にした短文を返しているか」「continuity 表現なのに general に落ちて generic になる割合」を 1〜2 行で要約。

---

## 5. どこで会話が弱くなるかの主因（切り分け表）

解析結果を次のように整理する。

| 主因の候補 | 判定方法 | 記録する値 |
|------------|----------|------------|
| general の generic 応答 | NATURAL_GENERAL_LLM_TOP の response が定型句で始まる | 件数 / 全 general 件数 |
| general が continuity を無視 | 直前が continuity 系なのに、general の response に center が出ない | 件数 / 該当ターン数 |
| FEELING/IMPRESSION の固定文の硬さ | ユーザーが「もっと」と続けた次の general が generic | 該当スレッド数 |
| EXPLICIT_CHAR の長さだけ返す | 指定字数は満たすが、会話の「問い」に答えていない | 目視またはキーワード件数 |
| CONTINUITY に乗らない | 「続き」発話なのに CONTINUITY_ANCHOR ではなく general に流れる | 件数 / 「続き」系発話数 |

「会話が弱くなる」の優先度は、上記の件数・割合が高い順に並べ、**主因 1〜3** を明示する。

---

## 6. 次に作るべき「会話主幹レイヤー」の候補（テンプレート）

解析結果を踏まえ、次のいずれか（または複数）を候補として記載する。**コードは書かず、名前と役割だけ**にする。

- **候補 A: continuity 優先レイヤー**  
  - general の手前で、thread center / 直前の route を必ず見る。continuity 表現かつ center がある場合は、general に流さず「center を土台にした短文」を返すか、general に center を強く渡す。  
  - 主因が「general が continuity を無視」のときに採用を検討。

- **候補 B: general 応答の脱 generic レイヤー**  
  - NATURAL_GENERAL_LLM_TOP に至る前または直後に、「受け取っています。そのまま続けてください」等の定型を検出し、差し替えまたはプロンプト補強で文脈依存の一文に寄せる。  
  - 主因が「general の generic 応答」のときに採用を検討。

- **候補 C: FEELING/IMPRESSION の次ターン接続**  
  - 気分・感想の次に「もっと聞いて」と続いたとき、固定文の繰り返しではなく、短文 LLM または多様なテンプレートで返す経路を用意する。  
  - 主因が「FEELING/IMPRESSION の次の generic」のときに採用を検討。

- **候補 D: 明示文字数と会話の両立**  
  - EXPLICIT_CHAR で指定字数を満たしつつ、ユーザーの「問い」に答えるよう、プロンプトまたはテンプレートを分ける。  
  - 主因が「EXPLICIT_CHAR が会話を止める」のときに採用を検討。

- **その他**  
  - 上記以外の主因が出た場合（例: 特定 route の順序で continuity が消える等）、「〇〇を解消するレイヤー」として 1 行で記載する。

---

## 7. 成果物（解析完了時に揃えるもの）

- **観測データ**: routeReason 別の件数、response 長の分布、answer profile の集計。  
- **比較メモ**: 4 route の「response / routeReason / answer profile / response length」の比較表。  
- **主因サマリ**: 「どこで会話が弱くなるかの主因」1〜3 と、その根拠となる件数・割合。  
- **会話主幹レイヤー候補**: 上記テンプレートに沿った候補 A〜D およびその他（採用順位は任意）。  
- **再現用**: 再生スクリプトを使った場合は、入力セットと期待 routeReason の対応表。

---

## 8. 注意（修正コードは出さない）

- 本設計は**解析手順と観測項目の定義のみ**とする。  
- ログ追加・一時テーブル・再生スクリプトの**実装**は別タスクとし、本ドキュメントでは「何を記録し、どう比較し、主因とレイヤー候補をどうまとめるか」に限定する。
