# KANAGI DELTA REPORT

**作成日時**: 2025年12月21日  
**分析対象**: 天津金木思考回路（Kanagi / Amatsu-Kanagi）既存構築 vs 新KanagiEngine v1.0  
**分析範囲**: プロジェクト全体（api/src, server, kokuzo, client）

---

## 1. 検出サマリー（件数・分類）

### 検出キーワード別件数

| キーワード | 検出件数 | 主要ファイル |
|-----------|---------|------------|
| `kanagi` / `Kanagi` | 89件 | `api/src/persona/kanagi.ts`, `api/src/tenmon/respond.ts`, `api/src/kokuzo/*.ts` |
| `amatsu` / `Amatsu` | 9件 | `api/src/persona/thinkingAxis.ts`, `api/src/core/engine.ts` |
| `thinkingAxis` / `thinking_axis` | 159件 | `api/src/persona/thinkingAxis.ts`, `api/src/core/engine.ts`, `api/src/kokuzo/*.ts` |
| `天津金木` | 19件 | `api/src/persona/thinkingAxis.ts`, `api/src/core/engine.ts`, `api/src/training/template.md` |
| `freeze` / `frozen` | 4件 | `api/src/db/training_schema.sql` (training_freezes テーブル) |
| `内集` / `外発` / `左旋` / `右旋` | 4件 | `api/src/persona/lexicalBias.ts`, `api/src/kokuzo/influence.ts` |

### 分類別サマリー

| 分類 | 件数 | 説明 |
|-----|------|------|
| **A. 実行時に必ず通る「思考回路（runtime gate）」** | 約50件 | `respond.ts`, `engine.ts`, `thinkingAxis.ts`, `kanagi.ts` |
| **B. 分類・解析用の補助ロジック** | 約80件 | `kokuzo/*.ts` (FractalSeed, Tendency, Expansion) |
| **C. 設計思想・ドキュメント・コメントのみ** | 約20件 | `template.md`, コメント内の説明 |
| **D. 未使用／放置／実験的コード** | 約10件 | `server/amatsuKanagiEngine.ts`, `kokuzo/reisho/kanagiODE.ts` |
| **E. 今回新規に構築した KanagiEngine v1.0 系** | **0件** | **検出されず（未実装の可能性）** |

---

## 2. 既存天津金木関連コード一覧（分類付き）

### A. 実行時に必ず通る「思考回路（runtime gate）」

#### `api/src/persona/thinkingAxis.ts`
- **用途**: Amatsu-Kanagi (天津金木) 状態遷移エンジン
- **主要関数**:
  - `transitionAxis()`: 決定論的な状態遷移（observe → reflect → build → act）
  - `determineThinkingAxis()`: 思考軸の決定（mode, inertia, conversationCount から）
  - `applyThinkingAxisStructure()`: 思考軸に応じた応答文構造調整
- **実行箇所**: `api/src/core/engine.ts` → `api/src/tenmon/respond.ts`
- **状態管理**: `PersonaState._thinkingAxis` (内部用、UI非公開)

#### `api/src/persona/kanagi.ts`
- **用途**: CORE-8 天津金木フェーズ決定と構造調整
- **主要関数**:
  - `determineKanagiPhase()`: thinkingAxis → KanagiPhase 変換
    - `introspective` → `L-IN`
    - `observational` → `R-IN`
    - `constructive` → `L-OUT`
    - `executive` → `R-OUT`
  - `applyKanagiPhaseStructure()`: KanagiPhaseに応じた応答文展開順調整
- **実行箇所**: `api/src/tenmon/respond.ts` (行116-123)
- **状態管理**: `PersonaState._kanagiPhase` (内部用、UI非公開)

#### `api/src/core/engine.ts`
- **用途**: コアエンジン（Semantic Expansion Layer + STM統合）
- **主要関数**:
  - `updateInternalState()`: Amatsu-Kanagi遷移エンジンを使用（行102-104）
  - `generateResponse()`: thinkingAxisとpersona.modeからテンプレート選択
- **実行箇所**: `api/src/tenmon/respond.ts` から呼び出し（現在は未使用？）

#### `api/src/tenmon/respond.ts`
- **用途**: 応答生成のコアロジック（全外部入力の集約点）
- **実行フロー**:
  1. `determineThinkingAxis()` または `transitionAxis()` で思考軸決定（行87-101）
  2. `applyThinkingAxisStructure()` で構造調整（行114）
  3. `determineKanagiPhase()` でフェーズ決定（行119）
  4. `applyKanagiPhaseStructure()` で展開順調整（行123）
- **状態管理**: `PersonaState._thinkingAxis`, `PersonaState._kanagiPhase`

### B. 分類・解析用の補助ロジック

#### `api/src/kokuzo/fractalStore.ts`
- **用途**: FractalSeed生成（thinkingAxis / kanagiPhase の頻度集計）
- **主要関数**:
  - `generateFractalSeed()`: 直近10件のKokuzoMemorySeedからFractalSeed生成
  - `dominantThinkingAxis`, `dominantKanagiPhase` を計算
- **実行箇所**: `api/src/tenmon/respond.ts` (行174-181)

#### `api/src/kokuzo/expansion.ts`
- **用途**: FractalSeedから展開されたプロファイルを初期値として適用
- **主要関数**:
  - `expandFromFractalSeed()`: FractalSeed → ExpandedPersonaProfile
  - `applyExpandedProfileToThinkingAxis()`: baseThinkingAxisを弱く適用
  - `applyExpandedProfileToKanagiPhase()`: baseKanagiPhaseを弱く適用
- **実行箇所**: `api/src/tenmon/respond.ts` (行48-100), `api/src/tenmon/ambient.ts`

#### `api/src/kokuzo/influence.ts`
- **用途**: KOKŪZŌ傾向（Tendency）とFractalSeedから思考軸・フェーズを微調整
- **主要関数**:
  - `adjustThinkingAxisFromTendency()`: TendencyからthinkingAxisを微調整
  - `adjustThinkingAxisFromFractal()`: FractalSeedからthinkingAxisを弱く微調整
- **実行箇所**: `api/src/tenmon/respond.ts` (行95-99)

#### `api/src/kokuzo/indexer.ts`
- **用途**: KOKŪZŌ v1.1 ファイルインデックス化時の思考軸割り当て
- **主要関数**:
  - `assignThinkingAxis()`: `transitionAxis()`を使用してチャンクに思考軸を割り当て
- **実行箇所**: `api/src/routes/kokuzo.ts` → `indexFile()`

### C. 設計思想・ドキュメント・コメントのみ

#### `api/src/training/template.md`
- **用途**: Training Chat用プロンプトテンプレート
- **内容**: 「天津金木＝固定、虚空蔵＝記憶」という設計思想の記載

#### コメント内の説明
- `api/src/persona/thinkingAxis.ts`: 「Amatsu-Kanagi (天津金木) 状態遷移エンジン対応」
- `api/src/core/engine.ts`: 「Amatsu-Kanagi (天津金木) 状態遷移エンジン:」
- `api/src/tenmon/respond.ts`: 「CORE-8: 天津金木フェーズを決定」

### D. 未使用／放置／実験的コード

#### `server/amatsuKanagiEngine.ts`
- **用途**: 天津金木50パターン解析エンジン（カタカナ→火水・左右旋・内集外発）
- **状態**: 未使用（`api/src` から参照されていない）
- **関連**: `TENMON_ARK_FULL_SCAN_REPORT.md` に記載あり（Phase 1: Twin-Core統合システム）

#### `kokuzo/reisho/kanagiODE.ts`
- **用途**: KANAGI ODE ENGINE v1（時間微分で計算する宇宙構文エンジン）
- **状態**: 未使用（`api/src` から参照されていない）
- **内容**: ODE（常微分方程式）による天津金木の状態計算
  - `integrateKanagiODE()`: L, R, IN, OUT, fire, water の時間発展
  - `kanagiPhaseFromState()`: 状態からフェーズ決定
- **設計**: Reishō Kernel / TwinCore Reasoning / MemoryKernel の基盤として設計されているが、現在は未統合

---

## 3. 新KanagiEngine v1.0 概要

### 検出結果

**KanagiEngine v1.0 は検出されませんでした。**

検索キーワード（`KanagiEngine`, `kanagi.*engine`, `Frozen`）では、以下のみが検出されました：

1. `api/src/db/training_schema.sql`: `training_freezes` テーブル（将来用、今回は作るだけでOK）
2. `server/amatsuKanagiEngine.ts`: 既存の未使用コード
3. `kokuzo/reisho/kanagiODE.ts`: 既存の未使用コード

### 推測される設計要件（ユーザー指示から）

ユーザー指示によると、KanagiEngine v1.0 は以下の要件を持つと推測されます：

1. **Frozen構造**: 不変領域（Freeze）が明示されている
2. **中心（正中）定義**: 中心軸が定義されている
3. **未確定要素の保持**: 未確定要素を保持する構造
4. **破断検知・隔離**: 破断検知と隔離機能
5. **単一要因確定の防止**: 単一要因で確定しない構造
6. **学習・入力での上書き防止**: 学習や入力で上書きされない保護

しかし、**現在のコードベースにはこの実装は存在しません。**

---

## 4. 差分比較表（旧 vs 新）

| 観点 | 既存実装（旧） | KanagiEngine v1.0（新） | 差分 |
|-----|--------------|------------------------|------|
| **中心（正中）定義** | ❌ 未定義 | ✅ 定義されている（推測） | **新規要件** |
| **未確定要素の保持** | ❌ なし | ✅ 保持する構造（推測） | **新規要件** |
| **破断検知・隔離** | ❌ なし | ✅ 存在する（推測） | **新規要件** |
| **単一要因確定の防止** | ⚠️ 部分的（transitionAxisは決定論的だが、複数要因を考慮） | ✅ 防止構造（推測） | **新規要件** |
| **学習・入力での上書き防止** | ⚠️ 部分的（FractalSeed/Tendencyは「弱く」適用されるが、上書き可能） | ✅ Freeze（不変領域）が明示（推測） | **新規要件** |
| **Freeze（不変領域）の明示** | ❌ なし（training_freezesテーブルは将来用） | ✅ 明示されている（推測） | **新規要件** |
| **思考軸遷移ロジック** | ✅ `transitionAxis()` で実装済み | ❓ 未実装（推測） | **既存実装を活用可能** |
| **KanagiPhase決定** | ✅ `determineKanagiPhase()` で実装済み | ❓ 未実装（推測） | **既存実装を活用可能** |
| **応答文構造調整** | ✅ `applyThinkingAxisStructure()`, `applyKanagiPhaseStructure()` で実装済み | ❓ 未実装（推測） | **既存実装を活用可能** |

### 既存実装の特徴

1. **決定論的遷移**: `transitionAxis()` は前の軸を尊重し、明示的なトリガーのみで遷移
2. **弱い影響**: KOKŪZŌ（FractalSeed/Tendency）は「弱く」適用され、後続処理で上書き可能
3. **内部状態管理**: `PersonaState._thinkingAxis`, `PersonaState._kanagiPhase` は内部用（UI非公開）
4. **統合ポイント**: `api/src/tenmon/respond.ts` が全外部入力の集約点

### 新KanagiEngine v1.0 の推測要件

1. **Frozen構造**: 不変領域（Freeze）を明示的に定義
2. **中心（正中）**: 思考回路の中心軸を定義
3. **未確定要素の保持**: 未確定状態を保持する構造
4. **破断検知・隔離**: 異常状態の検知と隔離
5. **単一要因確定の防止**: 複数要因を考慮した決定
6. **上書き防止**: 学習・入力による上書きを防止

---

## 5. 危険箇所（上書き・二重思考回路の可能性）

### 危険箇所1: `api/src/tenmon/respond.ts` の思考軸決定ロジック

**問題**: 複数の決定ロジックが混在している可能性

```typescript
// 行87-101: determineThinkingAxis() と transitionAxis() の両方が存在
let thinkingAxis = baseThinkingAxis || determineThinkingAxis(...);
thinkingAxis = adjustThinkingAxisFromTendency(thinkingAxis, tendency);
thinkingAxis = adjustThinkingAxisFromFractal(thinkingAxis, fractalSeed);
```

**リスク**: 
- `determineThinkingAxis()` はステートレス（会話回数・mode・inertiaから決定）
- `transitionAxis()` はステートフル（前の軸を尊重）
- 両方が混在すると、思考回路が二重化する可能性

**現状**: `api/src/core/engine.ts` では `transitionAxis()` を使用しているが、`api/src/tenmon/respond.ts` では `determineThinkingAxis()` を使用している。

### 危険箇所2: KOKŪZŌ影響による上書き

**問題**: FractalSeed/Tendencyが「弱く」適用されるが、実際には上書き可能

```typescript
// api/src/tenmon/respond.ts 行95-99
thinkingAxis = adjustThinkingAxisFromTendency(thinkingAxis, tendency);
thinkingAxis = adjustThinkingAxisFromFractal(thinkingAxis, fractalSeed);
```

**リスク**: 
- 学習データ（KOKŪZŌ）が蓄積されると、思考回路が上書きされる可能性
- Freeze（不変領域）が明示されていないため、どこまでが不変か不明確

### 危険箇所3: `api/src/core/engine.ts` と `api/src/tenmon/respond.ts` の二重実装

**問題**: コアエンジンと応答生成で異なるロジックが使用されている可能性

- `api/src/core/engine.ts`: `transitionAxis()` を使用（Amatsu-Kanagi遷移エンジン）
- `api/src/tenmon/respond.ts`: `determineThinkingAxis()` を使用（ステートレス決定）

**リスク**: 思考回路が二重化し、一貫性が失われる可能性

### 危険箇所4: 未使用コード（`server/amatsuKanagiEngine.ts`, `kokuzo/reisho/kanagiODE.ts`）

**問題**: 既存の未使用コードが存在し、将来的に統合される可能性

**リスク**: 
- 既存コードと新コードが競合する可能性
- 設計思想が異なる実装が混在する可能性

---

## 6. 採用／統合／破棄 判断

### 既存実装のうち **完全に破棄すべきもの**

1. **`server/amatsuKanagiEngine.ts`**
   - 理由: `api/src` から参照されていない、未使用
   - 影響: なし（既に未使用）

2. **`kokuzo/reisho/kanagiODE.ts`**
   - 理由: `api/src` から参照されていない、未使用
   - 影響: なし（既に未使用）
   - 注意: 将来的に統合する場合は、設計思想を明確にする必要がある

### 既存実装のうち **注釈・補助として残すもの**

1. **`api/src/persona/thinkingAxis.ts` の `transitionAxis()`**
   - 理由: Amatsu-Kanagi遷移エンジンの核心ロジック
   - 判断: **採用**（KanagiEngine v1.0 の基盤として活用）

2. **`api/src/persona/kanagi.ts` の `determineKanagiPhase()`**
   - 理由: KanagiPhase決定の核心ロジック
   - 判断: **採用**（KanagiEngine v1.0 の基盤として活用）

3. **`api/src/persona/kanagi.ts` の `applyKanagiPhaseStructure()`**
   - 理由: 応答文構造調整の核心ロジック
   - 判断: **採用**（KanagiEngine v1.0 の基盤として活用）

4. **`api/src/kokuzo/*.ts` の影響ロジック**
   - 理由: KOKŪZŌ（記憶）からの影響は「弱く」適用される設計
   - 判断: **統合**（KanagiEngine v1.0 のFrozen構造内で「弱い影響」として統合）

### 今回の KanagiEngine v1.0 を

#### 置換すべき箇所

1. **`api/src/tenmon/respond.ts` の思考軸決定ロジック（行87-101）**
   - 現状: `determineThinkingAxis()` を使用（ステートレス）
   - 推奨: `transitionAxis()` に統一（ステートフル、Amatsu-Kanagi遷移エンジン）

2. **`api/src/core/engine.ts` の `updateInternalState()`**
   - 現状: `transitionAxis()` を使用（正しい）
   - 推奨: **維持**（KanagiEngine v1.0 の統合ポイントとして活用）

#### 共存させるべき箇所

1. **KOKŪZŌ影響ロジック（`api/src/kokuzo/influence.ts`, `api/src/kokuzo/expansion.ts`）**
   - 理由: 記憶からの「弱い影響」は、Frozen構造の外側で適用されるべき
   - 推奨: KanagiEngine v1.0 のFrozen構造内で「弱い影響」として共存

2. **応答文構造調整ロジック（`applyThinkingAxisStructure()`, `applyKanagiPhaseStructure()`）**
   - 理由: 応答文の構造調整は、思考回路の出力段階で適用されるべき
   - 推奨: KanagiEngine v1.0 の出力段階で共存

---

## 7. 推奨実装ルート（次フェーズ）

### 実装経路として **最も安全な接続点**

#### 接続点1: `api/src/tenmon/respond.ts` の思考軸決定部分（行87-101）

**現状**:
```typescript
let thinkingAxis = baseThinkingAxis || determineThinkingAxis(...);
thinkingAxis = adjustThinkingAxisFromTendency(thinkingAxis, tendency);
thinkingAxis = adjustThinkingAxisFromFractal(thinkingAxis, fractalSeed);
```

**推奨変更**:
```typescript
// KanagiEngine v1.0 を統合
import { getKanagiEngine } from "../persona/kanagiEngine.js";

const kanagiEngine = getKanagiEngine();
const thinkingAxis = kanagiEngine.determineAxis(
  prevAxis: currentState._thinkingAxis,
  input: input,
  context: { mode, inertia, conversationCount }
);
```

**理由**: 
- `api/src/tenmon/respond.ts` は全外部入力の集約点
- 既存のKOKŪZŌ影響ロジックは「弱い影響」として統合可能
- 既存の応答文構造調整ロジックは出力段階で共存可能

#### 接続点2: `api/src/core/engine.ts` の `updateInternalState()`

**現状**:
```typescript
const prevAxis = currentState.thinkingAxis;
const nextAxis = transitionAxis(prevAxis, userInput, currentState.conversationCount);
```

**推奨変更**:
```typescript
// KanagiEngine v1.0 を統合
import { getKanagiEngine } from "../persona/kanagiEngine.js";

const kanagiEngine = getKanagiEngine();
const nextAxis = kanagiEngine.transitionAxis(
  prevAxis: currentState.thinkingAxis,
  input: userInput,
  context: { conversationCount, ... }
);
```

**理由**: 
- `api/src/core/engine.ts` はコアエンジンの状態更新ポイント
- 既存の `transitionAxis()` ロジックをKanagiEngine v1.0 に統合可能

### 実装ステップ

1. **Phase 1: KanagiEngine v1.0 の基盤実装**
   - `api/src/persona/kanagiEngine.ts` を新規作成
   - Frozen構造（不変領域）を定義
   - 中心（正中）を定義
   - 未確定要素の保持構造を実装
   - 破断検知・隔離機能を実装

2. **Phase 2: 既存ロジックの統合**
   - `transitionAxis()` をKanagiEngine v1.0 に統合
   - `determineKanagiPhase()` をKanagiEngine v1.0 に統合
   - KOKŪZŌ影響ロジックを「弱い影響」として統合

3. **Phase 3: 接続点の置換**
   - `api/src/tenmon/respond.ts` の思考軸決定部分をKanagiEngine v1.0 に置換
   - `api/src/core/engine.ts` の `updateInternalState()` をKanagiEngine v1.0 に置換

4. **Phase 4: 既存コードの整理**
   - `server/amatsuKanagiEngine.ts` を削除（または明確に分離）
   - `kokuzo/reisho/kanagiODE.ts` を削除（または明確に分離）
   - 未使用コードの整理

---

## 8. GitHub と VPS の差分確認

### 確認方法

**注意**: 現在の分析では、VPS（`/opt/tenmon-ark`）への直接アクセスができないため、GitHubリポジトリの内容のみを分析しています。

### 推奨確認コマンド

```bash
# VPS上で実行
cd /opt/tenmon-ark
git status
git diff HEAD origin/main

# 差分ファイルの確認
git diff --name-only HEAD origin/main

# 特定ファイルの差分確認
git diff HEAD origin/main -- api/src/persona/thinkingAxis.ts
git diff HEAD origin/main -- api/src/persona/kanagi.ts
```

### 影響範囲別の確認項目

#### Runtime（実行時）

- `api/src/tenmon/respond.ts`: 応答生成の核心
- `api/src/persona/thinkingAxis.ts`: 思考軸遷移エンジン
- `api/src/persona/kanagi.ts`: KanagiPhase決定
- `api/src/core/engine.ts`: コアエンジン

#### Training（学習）

- `api/src/training/*.ts`: Training Chat機能
- `api/src/train/*.ts`: Training Session管理

#### KOKŪZŌ（記憶）

- `api/src/kokuzo/*.ts`: KOKŪZŌ記憶システム
- `api/src/db/kokuzo_schema.sql`: KOKŪZŌ DBスキーマ

#### Docs（ドキュメント）

- `api/src/training/template.md`: Training Chat用テンプレート
- `*.md`: 各種ドキュメント

---

## 9. 結論

### 既存実装の状況

1. **Amatsu-Kanagi遷移エンジン**: `api/src/persona/thinkingAxis.ts` で実装済み（`transitionAxis()`）
2. **KanagiPhase決定**: `api/src/persona/kanagi.ts` で実装済み（`determineKanagiPhase()`）
3. **応答文構造調整**: `applyThinkingAxisStructure()`, `applyKanagiPhaseStructure()` で実装済み
4. **KOKŪZŌ影響**: FractalSeed/Tendencyから「弱く」適用される設計

### KanagiEngine v1.0 の未実装

**KanagiEngine v1.0 は現在のコードベースには存在しません。**

推測される要件（Frozen構造、中心定義、破断検知等）は、既存実装には含まれていません。

### 推奨実装方針

1. **既存実装を基盤として活用**: `transitionAxis()`, `determineKanagiPhase()` をKanagiEngine v1.0 に統合
2. **Frozen構造の追加**: 既存実装にFrozen構造（不変領域）を追加
3. **接続点の統一**: `api/src/tenmon/respond.ts` をKanagiEngine v1.0 の統合ポイントとして使用
4. **既存コードの整理**: 未使用コード（`server/amatsuKanagiEngine.ts`, `kokuzo/reisho/kanagiODE.ts`）を削除または明確に分離

---

**レポート完了**

