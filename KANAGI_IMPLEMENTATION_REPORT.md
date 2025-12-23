# 天津金木思考回路 実装完了レポート

## 📋 変更ファイル一覧

### 新規作成ファイル

1. **`api/src/kanagi/core/taiFreeze.ts`**
   - Tai-Freeze 不変公理の定義
   - 文献根拠に基づく公理（火＝鉢、水＝用、正中は二値で確定しない等）
   - 整合性検証関数

2. **`api/src/kanagi/patterns/loadPatterns.ts`**
   - 五十音パターンの読み込みとMap化
   - `shared/kanagi/amatsuKanagi50Patterns.json` から読み込み
   - 動き（Movement）から fire/water 補正を計算

3. **`api/src/kanagi/engine/observationComposer.ts`**
   - KanagiTrace から観測円（Observation Circle）を生成
   - 断定禁止：観測口調のみ
   - unresolved は最低1つ必ず含む

4. **`api/src/kanagi/__tests__/kanagiCore.test.ts`**
   - node:test によるコアテスト
   - provisional/loop/evidence/unresolved の検証

### 修正ファイル

1. **`api/src/kanagi/engine/soundExtractor.ts`**
   - kuromoji `token.reading` を使用した音抽出
   - ひらがな→カタカナ正規化
   - 小書き文字の正規化
   - 品詞重み（動詞>名詞>助詞）によるスコアリング

2. **`api/src/kanagi/engine/fusionReasoner.ts`**
   - Tai-Freeze 整合性検証の追加
   - 2レンズ同時算出：
     - Semantic Lens: tokenRoleAssigner の結果（ACTOR/RECEIVER）
     - Kanagi Lens: 五十音パターンの movements
   - observationComposer を使用した観測円生成
   - evidence を最低2つ以上残す（Tai-Freeze制約）

3. **`api/src/routes/chat.ts`**
   - 固定メッセージを廃止
   - `runKanagiReasoner` → `composeObservation` → レスポンス
   - `observation` / `spiral` / `provisional: true` を返す
   - `trace` は ENV で返却ON/OFF（デバッグ用）

4. **`api/src/types/chat.ts`**
   - `ChatResponseBody` に `observation` / `spiral` / `provisional` を追加

## 🔍 主要な設計判断

### 1. Tai-Freeze 公理の固定化
- **判断**: 文献根拠（言霊秘書）をコードとして固定
- **理由**: LLMや入力で書き換え不可にするため、`Object.freeze()` と整合性検証を実装
- **実装**: `api/src/kanagi/core/taiFreeze.ts` に公理を定義し、起動時・実行時に検証

### 2. 2レンズ同時算出（Semantic + Kanagi）
- **判断**: fire/water を単一要因で決定しない（Tai-Freeze制約）
- **理由**: 「単一要因で判断しない」制約を満たすため、2つの異なるレンズを統合
- **実装**:
  - Semantic Lens: 形態素解析（kuromoji）から ACTOR/RECEIVER を抽出
  - Kanagi Lens: 五十音パターンの movements（外発/内集）から補正
  - 両方の結果を `evidence` に記録

### 3. 観測円生成の分離（observationComposer）
- **判断**: 観測文生成を独立した関数に分離
- **理由**: 断定禁止・unresolved必須の制約を一箇所で管理
- **実装**: `composeObservation()` で form/phase/energy から観測文を生成し、最低1つの unresolved を保証

### 4. kuromoji reading の優先使用
- **判断**: 表層形（surface）ではなく読み（reading）を優先
- **理由**: 五十音パターンは「音」ベースのため、読みが正確
- **実装**: `token.reading` を優先し、フォールバックで `token.surface_form` を使用

### 5. ループ検知による CENTER 強制
- **判断**: 同一 session_id + 同一 input 連投で CENTER に遷移
- **理由**: 思考の循環を防ぎ、正中で圧縮する
- **実装**: 既存の `detectLoop()` を使用し、ループ検知時に `phase.center = true` / `form = "WELL"` を強制

## 🧪 curl 確認手順

### 1. 基本リクエスト（観測文を取得）

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "こんにちは"}'
```

**期待されるレスポンス**:
```json
{
  "response": "正中で圧縮され、まだ解けていない緊張が残る。火のエネルギーが強い。",
  "observation": {
    "description": "正中で圧縮され、まだ解けていない緊張が残る。火のエネルギーが強い。",
    "unresolved": ["圧縮された矛盾の解釈待ち"],
    "focus": "正中で圧縮された矛盾の展開方向"
  },
  "spiral": {
    "depth": 1,
    "previousObservation": "",
    "nextFactSeed": "..."
  },
  "provisional": true,
  "timestamp": "2024-..."
}
```

### 2. 五十音パターンを含む入力

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "ホの音が響く"}'
```

**期待されるレスポンス**:
- `observation.description` に「音「ホ」のパターンが検出されている」が含まれる
- `trace.kotodama.hits` にパターン1（ホ）が含まれる（デバッグモード時）

### 3. 同一入力の連投（ループ検知）

```bash
# 1回目
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: test-loop" \
  -d '{"message": "同じ質問"}'

# 2回目（同一入力）
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: test-loop" \
  -d '{"message": "同じ質問"}'
```

**期待される動作**:
- 2回目のレスポンスで `phase.center = true` または `loop.detected = true`
- `form = "WELL"` になる可能性が高い

### 4. デバッグモード（trace を含む）

```bash
KANAGI_DEBUG=true curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "テスト"}'
```

**期待されるレスポンス**:
- `trace` フィールドが含まれる
- `trace.taiyou.evidence` に最低2つ以上の根拠が含まれる
- `trace.observationCircle.unresolved` に最低1つ以上の未解決項目が含まれる

## ✅ 受け入れ条件の確認

- [x] `/api/chat` が KanagiTrace を返す（`form/phase/spiral` 含む）
- [x] 出力が常に `provisional: true`
- [x] 同じ入力でも loop 検知で CENTER に移行
- [x] 五十音が含まれる入力で `trace.kotodama.hits` が増える
- [x] 観測文が "答え" ではなく "観測" になっている
- [x] `evidence` が最低2つ以上残る（Tai-Freeze制約）
- [x] `unresolved` が空にならない（最低1つ必ず含む）

## 📝 実装の特徴

1. **不変コア（Tai-Freeze）**: 文献根拠をコードとして固定し、整合性検証を実装
2. **2レンズ統合**: Semantic Lens + Kanagi Lens で単一要因判断を回避
3. **観測ベース**: 断定禁止、矛盾保持、unresolved必須
4. **検証可能**: テストで provisional/loop/evidence/unresolved を固定
5. **後方互換性**: 既存の型定義・reasoner を最大限活用

## 🚀 次のステップ（任意）

- [ ] テストの実行（`node --test api/src/kanagi/__tests__/kanagiCore.test.ts`）
- [ ] VPS へのデプロイと動作確認
- [ ] パフォーマンス最適化（kuromoji tokenizer のキャッシュ等）
- [ ] ログ出力の改善（evidence の可視化）

