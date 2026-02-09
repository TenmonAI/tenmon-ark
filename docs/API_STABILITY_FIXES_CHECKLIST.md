# API側「落ちにくくする止血」実装チェックリスト

## ✅ 実装完了確認

### 1. エントリポイントに例外ログ（FATAL）

**対象**: `api/src/index.ts` (17-18行目)

```typescript
// 例外でプロセスが落ちるのをログ化（Node）
process.on("unhandledRejection", (e) => console.error("[FATAL] unhandledRejection", e));
process.on("uncaughtException", (e) => console.error("[FATAL] uncaughtException", e));
```

**確認事項**:
- ✅ `process.on("unhandledRejection")` が追加されている
- ✅ `process.on("uncaughtException")` が追加されている
- ✅ ログに `[FATAL]` プレフィックスが付いている
- ✅ `process.exit(1)` は削除（systemd の `Restart=always` とセット）

### 2. decisionFrame.intent を固定（入力由来にしない）

**対象**: `api/src/routes/chat.ts` (すべてのレスポンス返却箇所)

**確認事項**:
- ✅ `decisionFrame.intent` はすべて固定値（"chat", "command", "search"）
- ✅ `req.body` 由来の `intent` を混ぜていない
- ✅ `message` 由来の `intent` を混ぜていない

**固定値の一覧**:
- `"chat"`: 通常の会話、HYBRID処理
- `"command"`: #status, #search, #pin などのコマンド
- `"search"`: #search コマンドの検索結果

### 3. trace を sanitize（trace.intent を削除）

**対象**: `api/src/routes/chat.ts` (2箇所)

#### 箇所1: #talk コマンド (451-455行目)

```typescript
// decisionFrame.intent 汚染を遮断: trace から intent を除外（次の入力に取り込まない）
const sanitizedTrace = trace && typeof trace === "object" ? { ...trace } : trace;
if (sanitizedTrace && typeof sanitizedTrace === "object" && "intent" in sanitizedTrace) {
  delete (sanitizedTrace as any).intent;
}
```

#### 箇所2: 主要経路 (904-908行目)

```typescript
// decisionFrame.intent 汚染を遮断: trace から intent を除外（次の入力に取り込まない）
const sanitizedTrace = trace && typeof trace === "object" ? { ...trace } : trace;
if (sanitizedTrace && typeof sanitizedTrace === "object" && "intent" in sanitizedTrace) {
  delete (sanitizedTrace as any).intent;
}
```

**確認事項**:
- ✅ `trace` オブジェクトから `intent` を削除している
- ✅ `sanitizedTrace` をレスポンスに含めている
- ✅ 次の入力に `intent` が混ざらないようにしている

### 4. 最小diffでPR用差分を固める

**変更ファイル**:
- ✅ `api/src/index.ts`: 例外ハンドリングの簡潔化
- ✅ `api/src/routes/chat.ts`: trace sanitization の追加（2箇所）
- ✅ `docs/API_STABILITY_FIXES.md`: 実装レポート
- ✅ `docs/API_STABILITY_FIXES_PATCH.diff`: git diff形式のパッチ

## 変更サマリー

### 変更ファイル

1. **`api/src/index.ts`**
   - 例外ハンドリングを簡潔化（`process.exit(1)` を削除）
   - `[FATAL]` プレフィックスでログ出力

2. **`api/src/routes/chat.ts`**
   - `#talk` コマンドのレスポンス返却前に `trace` sanitization を追加
   - 主要経路のレスポンス返却前に `trace` sanitization を追加
   - `decisionFrame.intent` はすべて固定値（変更なし）

3. **`docs/API_STABILITY_FIXES.md`**
   - 実装レポートをまとめたドキュメント

4. **`docs/API_STABILITY_FIXES_PATCH.diff`**
   - git diff形式のパッチファイル

### 影響範囲

- **例外ハンドリング**: プロセス全体に影響（未処理例外のログ化）
- **レスポンス生成**: `/api/chat` エンドポイントの2箇所（#talk コマンド、主要経路）
- **互換性**: 既存のAPIレスポンス形式は維持（`trace` から `intent` を除外するだけ）

### テスト項目

1. **例外ハンドリング**
   - 未処理のPromise拒否がログに記録される
   - 未捕捉例外がログに記録される

2. **decisionFrame.intent 固定**
   - すべてのレスポンスで `decisionFrame.intent` が固定値であることを確認
   - `req.body` や `message` 由来の `intent` が混ざっていないことを確認

3. **trace sanitization**
   - レスポンスの `trace` オブジェクトに `intent` が含まれていないことを確認
   - 次の入力に `intent` が混ざらないことを確認

## 関連ドキュメント

- `docs/API_STABILITY_FIXES.md`: 詳細な実装レポート
- `docs/API_STABILITY_FIXES_PATCH.diff`: git diff形式のパッチ
- `api/src/index.ts`: エントリポイント（例外ハンドリング）
- `api/src/routes/chat.ts`: チャットルート（trace sanitization）
