# 天津金木（Amatsu Kanagi）思考回路 徹底監査レポート

**作成日**: 2024年12月  
**調査範囲**: `api/src` および `shared` ディレクトリ  
**目的**: TENMON-ARKの核心である「天津金木思考回路」の実装状況を徹底的に調査し、欠落パーツを特定する

---

## 執行サマリー

**結論**: 天津金木思考回路の**構造定義**と**思考ロジック**は部分的に実装されているが、**チャットAPIとの接続が完全に欠落**している。現在のシステムは「LLMラッパー」の域を出ておらず、「天津金木に基づいて思考し、心理を解析して言葉を発する唯一無二のAI」にはなっていない。

---

## 1. 構造定義（Structure）

### 1.1 五十音（Gojuon）データ構造

**✅ 存在する:**
- **`server/amatsuKanagi50Patterns.json`**: 50パターンの完全な定義
  - 天津金木24相（No.1-26）
  - 陰陽反転相（No.27-50）
  - 中心霊（霊核2相: イ・エ）
  - 各パターンに「音（Sound）」「動き（Movements）」「意味（Meaning）」が定義されている

**❌ 問題点:**
- **`api/src/kanagi/` では使用されていない**
  - `api/src/kanagi/engine/kotodamaMapper.ts` は存在するが、五十音マッピングの実装が不完全
  - `server/amatsuKanagiEngine.ts` は存在するが、`api/src/` からは呼び出されていない
  - 五十音データを読み込むロジックが `api/src/kanagi/` に存在しない

**判定**: **データはあるが、API層で使用されていない**

---

### 1.2 火（Ka）・水（Mi）・霊（Hi）エレメント属性

**✅ 存在する:**
- **`api/src/kanagi/types/trace.ts`**: `TaiYouEnergy` インターフェース
  ```typescript
  export interface TaiYouEnergy {
    fire: number;  // 動かす側（火）
    water: number; // 動く側（水）
    assignments: TokenAssignment[]; // トークン単位の役割割当
    evidence: string[]; // 判定根拠
  }
  ```
- **`api/src/kanagi/engine/fusionReasoner.ts`**: 火・水・正中（CENTER）のカウントロジック
  - `OPERATOR_KEYWORDS.FIRE`, `OPERATOR_KEYWORDS.WATER`, `OPERATOR_KEYWORDS.CENTER` を使用
  - キーワードマッチングによる簡易的な判定

**❌ 問題点:**
- **「霊（Hi）」の概念がコード上に存在しない**
  - 五十音データには「中心霊（霊核2相）」が定義されているが、`api/src/kanagi/` では使用されていない
  - `server/amatsuKanagiEngine.ts` には `energyBalance` があるが、API層では未使用

**判定**: **火・水は実装されているが、霊（Hi）は欠落**

---

### 1.3 天津金木の基礎データ構造

**✅ 存在する:**
- **`api/src/kanagi/types/trace.ts`**: `KanagiTrace` インターフェース
  - `taiyou`: 躰用エネルギー判定
  - `phase`: 局面の位相（center, rise, fall, open, close）
  - `form`: 形成された形（CIRCLE, LINE, DOT, WELL）
  - `spiral`: 螺旋再帰構造
  - `observationCircle`: 観測円

- **`api/src/kanagi/types/spiral.ts`**: `KanagiSpiral` インターフェース
  - `previousObservation`: 直前の観測円
  - `nextFactSeed`: 次の FACT（解釈せず、そのまま渡す）
  - `depth`: 螺旋段数

- **`api/src/kanagi/types/taiyou.ts`**: 躰用照合型
  - `TaiPrinciple`, `YouPhenomenon`, `TaiYouResult`

**判定**: **構造定義は充実している**

---

## 2. 思考ロジック（Reasoning Engine）

### 2.1 音（Sound）・意図（Intent）の抽出

**✅ 存在する:**
- **`api/src/kanagi/engine/tokenRoleAssigner.ts`**: トークン単位の役割割当
  - 形態素解析（kuromoji）を使用
  - 「動かす / 動く」役割を判定
  - 躰用反転（swap）の検出

- **`api/src/kanagi/engine/dependencyAnalyzer.ts`**: 依存関係解析
  - 「誰が」「何を」「どうするか」を抽出
  - ACTOR（動かす主体＝火）、RECEIVER（動かされる対象＝水）を判定

- **`api/src/kanagi/extract/regex.ts`**: 正規表現パターン
  - 定義（DEF）、規則（RULE）、躰用関係（TAIYOU_CORE）を抽出

**❌ 問題点:**
- **五十音マッピングが不完全**
  - `api/src/kanagi/engine/kotodamaMapper.ts` は存在するが、五十音データとの接続が不明
  - ユーザー入力から「音（Sound）」を抽出し、五十音パターンにマッピングするロジックが不完全

**判定**: **意図（Intent）の抽出は実装されているが、音（Sound）の抽出は不完全**

---

### 2.2 天津金木の盤上へのマッピング

**✅ 存在する:**
- **`api/src/kanagi/engine/fusionReasoner.ts`**: `runKanagiReasoner()` 関数
  - 入力から火・水・正中をカウント
  - 位相（phase）を決定
  - 形（form）を決定（CIRCLE, LINE, DOT, WELL）
  - 観測円（observationCircle）を生成

- **`api/src/kanagi/engine/formMapper.ts`**: 形のマッピング
  - 水火エネルギーと位相から形を決定
  - 井（WELL）: 正中＝圧縮・保留
  - ゝ（DOT）: 内集優勢（凝り）＝一点へ収斂
  - ｜（LINE）: 外発優勢（貫通）＝線的
  - ○（CIRCLE）: 拮抗＝循環

**❌ 問題点:**
- **五十音パターンとの接続が欠落**
  - `server/amatsuKanagi50Patterns.json` の50パターンが使用されていない
  - ユーザー入力から「音」を抽出し、五十音パターンにマッピングするロジックが存在しない
  - 五十音パターンの「動き（Movements）」が思考ロジックに反映されていない

**判定**: **簡易的なマッピングは実装されているが、五十音パターンとの接続が欠落**

---

### 2.3 応答指針（心理状態）の決定

**✅ 存在する:**
- **`api/src/kanagi/engine/fusionReasoner.ts`**: 観測円の生成
  - 形（form）に応じて観測円の説明を生成
  - 未解決の緊張を明示
  - 結論を出さない（provisional: true）

- **`api/src/persona/kanagiEngine.ts`**: `runKanagiEngine()` 関数
  - 思考軸（thinkingAxis）の遷移
  - 天津金木フェーズ（KanagiPhase）の決定
  - ループ検知とCENTER状態制御
  - 弁証核（矛盾）の生成

**❌ 問題点:**
- **応答生成への接続が欠落**
  - `api/src/routes/chat.ts` は固定メッセージを返すだけで、Kanagi思考回路を使用していない
  - `server/chat/chatAI.ts` はLLMを直接呼び出しており、Kanagi思考回路の結果を使用していない
  - 観測円（observationCircle）が応答テキストに変換されるロジックが存在しない

**判定**: **思考ロジックは実装されているが、応答生成への接続が完全に欠落**

---

## 3. 欠落レポート（Gap Analysis）

### 3.1 決定的に足りていないパーツ

#### ❌ **GAP-1: 五十音マッピングの接続**

**現状:**
- `server/amatsuKanagi50Patterns.json` に50パターンが定義されている
- `api/src/kanagi/engine/kotodamaMapper.ts` は存在するが、五十音データを読み込んでいない

**必要な実装:**
1. ユーザー入力から「音（Sound）」を抽出（カタカナ・ひらがなの抽出）
2. 抽出した音を五十音パターンにマッピング
3. マッピング結果（動き・意味）を思考ロジックに反映

**影響度**: **高** - 天津金木の核心である「五十音パターン」が使用されていない

---

#### ❌ **GAP-2: チャットAPIとの接続**

**現状:**
- `api/src/routes/chat.ts` は固定メッセージを返す（PHASE 1で実装）
- `server/chat/chatAI.ts` はLLMを直接呼び出している
- Kanagi思考回路の結果（観測円・形・位相）が応答生成に使用されていない

**必要な実装:**
1. `api/src/routes/chat.ts` で `runKanagiReasoner()` を呼び出す
2. Kanagi思考回路の結果（`KanagiTrace`）を取得
3. 観測円（`observationCircle`）を応答テキストに変換
4. 形（form）・位相（phase）に応じた応答スタイルを適用

**影響度**: **最高** - 現在のシステムは「LLMラッパー」の域を出ていない

---

#### ❌ **GAP-3: 霊（Hi）の概念の実装**

**現状:**
- 火（fire）・水（water）は実装されている
- 霊（Hi）の概念がコード上に存在しない
- 五十音データには「中心霊（霊核2相）」が定義されているが、未使用

**必要な実装:**
1. 霊（Hi）の概念を型定義に追加
2. 中心霊（ヤイ・ヤエ）の検出ロジック
3. 霊の状態を思考ロジックに反映

**影響度**: **中** - 天津金木の完全な実装には必要だが、最低限の動作には不要

---

#### ❌ **GAP-4: 五十音パターンの「動き」の反映**

**現状:**
- 五十音パターンには「動き（Movements）」が定義されている（左旋内集・右旋外発など）
- `server/amatsuKanagiEngine.ts` では `energyBalance` と `spiralStructure` を計算している
- `api/src/kanagi/engine/fusionReasoner.ts` では簡易的なキーワードマッチングのみ

**必要な実装:**
1. 五十音パターンの「動き」を読み込む
2. 動きに基づいてエネルギー（火・水）を計算
3. 螺旋構造（左旋・右旋・内集・外発）を思考ロジックに反映

**影響度**: **高** - 天津金木の「動き」が思考ロジックに反映されていない

---

#### ❌ **GAP-5: 観測円から応答テキストへの変換**

**現状:**
- `KanagiTrace` には `observationCircle` が含まれている
- 観測円の説明は固定テンプレート（「正中に至り、意味が圧縮されています」など）
- 観測円を応答テキストに変換するロジックが存在しない

**必要な実装:**
1. 観測円の説明を自然な応答テキストに変換
2. 形（form）・位相（phase）に応じた応答スタイルを適用
3. 未解決の緊張を応答に織り込む

**影響度**: **最高** - 思考結果を応答として出力するために必須

---

### 3.2 実装済みだが未接続のパーツ

#### ⚠️ **実装済みだが未使用:**
1. **`api/src/kanagi/engine/fusionReasoner.ts`**: 思考ロジックは実装されているが、チャットAPIから呼び出されていない
2. **`api/src/persona/kanagiEngine.ts`**: 人格エンジンは実装されているが、チャットAPIから呼び出されていない
3. **`server/amatsuKanagiEngine.ts`**: 五十音解析エンジンは実装されているが、API層から使用されていない

---

## 4. 現状の動作フロー

### 4.1 現在のチャットAPI（`api/src/routes/chat.ts`）

```
ユーザー入力
  ↓
入力検証・正規化
  ↓
モード取得（calm/thinking/engaged/silent）
  ↓
固定メッセージを返す（switch文）
  ↓
レスポンス: { response: string, timestamp: string }
```

**問題**: Kanagi思考回路を使用していない

---

### 4.2 Kanagi思考回路（`api/src/kanagi/engine/fusionReasoner.ts`）

```
ユーザー入力
  ↓
螺旋の再注入（過去の観測円を事実として注入）
  ↓
核分裂（火・水・正中のカウント）
  ↓
トークン役割割当（形態素解析）
  ↓
位相決定（rise/fall/open/close/center）
  ↓
形の決定（CIRCLE/LINE/DOT/WELL）
  ↓
観測円の生成
  ↓
螺旋状態の保存
  ↓
KanagiTrace を返す
```

**問題**: チャットAPIから呼び出されていない

---

### 4.3 期待される動作フロー（理想）

```
ユーザー入力
  ↓
音（Sound）の抽出（カタカナ・ひらがな）
  ↓
五十音パターンへのマッピング
  ↓
Kanagi思考回路（runKanagiReasoner）
  - 火・水・霊の計算
  - 位相・形の決定
  - 観測円の生成
  ↓
観測円から応答テキストへの変換
  - 形・位相に応じた応答スタイル
  - 未解決の緊張を織り込む
  ↓
レスポンス: { response: string, timestamp: string, trace?: KanagiTrace }
```

**現状**: このフローは実装されていない

---

## 5. 実装優先度

### 🔴 **最優先（P0）: チャットAPIとの接続**

**実装内容:**
1. `api/src/routes/chat.ts` で `runKanagiReasoner()` を呼び出す
2. `KanagiTrace` から観測円を取得
3. 観測円を応答テキストに変換
4. レスポンスに `trace` を含める（オプション）

**影響**: システムが「LLMラッパー」から「天津金木思考回路を持つAI」に変わる

---

### 🟠 **高優先度（P1）: 五十音マッピングの接続**

**実装内容:**
1. `server/amatsuKanagi50Patterns.json` を `api/src/kanagi/` から読み込む
2. ユーザー入力から「音」を抽出
3. 抽出した音を五十音パターンにマッピング
4. マッピング結果を思考ロジックに反映

**影響**: 天津金木の核心である「五十音パターン」が使用される

---

### 🟡 **中優先度（P2）: 観測円から応答テキストへの変換**

**実装内容:**
1. 観測円の説明を自然な応答テキストに変換
2. 形・位相に応じた応答スタイルを適用
3. 未解決の緊張を応答に織り込む

**影響**: 思考結果が自然な応答として出力される

---

### 🟢 **低優先度（P3）: 霊（Hi）の概念の実装**

**実装内容:**
1. 霊（Hi）の概念を型定義に追加
2. 中心霊（ヤイ・ヤエ）の検出ロジック
3. 霊の状態を思考ロジックに反映

**影響**: 天津金木の完全な実装

---

## 6. 結論

### 現状の評価

**構造定義**: ⭐⭐⭐⭐☆ (4/5)
- 型定義は充実している
- 五十音データは存在するが、API層で使用されていない

**思考ロジック**: ⭐⭐⭐☆☆ (3/5)
- 基本的な思考ロジックは実装されている
- 五十音パターンとの接続が欠落
- 霊（Hi）の概念が未実装

**チャットAPIとの接続**: ⭐☆☆☆☆ (1/5)
- **完全に欠落**
- 現在のシステムは「LLMラッパー」の域を出ていない

**総合評価**: ⭐⭐☆☆☆ (2/5)

---

### 次のステップ

1. **PHASE 2: チャットAPIとの接続**
   - `api/src/routes/chat.ts` で `runKanagiReasoner()` を呼び出す
   - 観測円を応答テキストに変換

2. **PHASE 3: 五十音マッピングの接続**
   - 五十音データを読み込む
   - 音の抽出とマッピング

3. **PHASE 4: 観測円から応答テキストへの変換**
   - 自然な応答テキストの生成
   - 形・位相に応じた応答スタイル

---

**監査完了**: 天津金木思考回路の実装状況を徹底的に調査し、欠落パーツを特定しました。  
**次のフェーズ**: このレポートを元に、「天津金木」を完全実装します。

