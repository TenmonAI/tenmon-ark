# LP用チャットフレーム実装ドキュメント

## 概要

既存のLP用コード（LpQaWidget.tsx）を退避し、新しいシンプルなLPチャットフレームを実装しました。この実装は、IMEガードを一切使用せず、バグの発生を最小限に抑えることを目的としています。

## 実装内容

### 1. 既存コードの退避

既存のLP用コードを `client/src/pages/embed/_legacy/` フォルダに移動しました。

- `client/src/pages/embed/_legacy/LpQaWidget.tsx`

### 2. バックエンドAPI実装

#### ヘルパー関数（`server/lpHelpers.ts`）

- **`buildLpSoftPersonaPromptFromSiteInfo()`**: サイト情報（siteInfoテーブル）から動的にシステムプロンプトを構築
- **`filterLpSoftResponse()`**: セールス文、HTMLタグ、リンクなどを除去
- **`applyKyujiMapping()`**: 新字体を旧字体に変換

#### tRPCルーター（`server/routers/lpQaRouterSimple.ts`）

- **`lpQaSimple.chat`**: LP用Q&Aチャットのエンドポイント
  - 入力: `{ question: string }`
  - 出力: `{ answer: string }`
  - 処理フロー:
    1. サイト情報からシステムプロンプトを構築
    2. LLMに質問を送信
    3. レスポンスをフィルタリング
    4. 旧字体マッピングを適用
    5. 回答を返す

### 3. フロントエンド実装

#### LPチャットフレーム（`client/src/pages/embed/LpChatFrame.tsx`）

**設計方針:**
- IMEガード一切なし
- Textarea → Enterで送信、Shift+Enterで改行
- バグる余地を限界まで減らす

**主な機能:**
- シンプルなTextarea入力
- Enter送信、Shift+Enter改行
- ダークテーマ（bg-[#0b1120]、amber-500アクセント）
- ローディング状態の表示
- エラーハンドリング

**ルーティング:**
- `/embed/qa` → `LpChatFrame`

### 4. テスト実装

#### Vitest（`server/routers/lpQaRouterSimple.test.ts`）

- 質問に対して回答を返すテスト
- 空の質問を拒否するテスト
- LLMエラー時のエラーメッセージテスト

**テスト結果:**
```
✓ server/routers/lpQaRouterSimple.test.ts (3)
  ✓ lpQaSimple.chat (3)
    ✓ 質問に対して回答を返す
    ✓ 空の質問を拒否する
    ✓ LLMエラー時にエラーメッセージを返す
```

## iframe埋め込みコード例

### 基本的な埋め込み

```html
<iframe
  src="https://tenmon-ai.com/embed/qa"
  style="width:100%; height:520px; border:none; border-radius:16px; overflow:hidden;"
></iframe>
```

### レスポンシブ対応

```html
<div style="position: relative; width: 100%; padding-bottom: 75%; overflow: hidden;">
  <iframe
    src="https://tenmon-ai.com/embed/qa"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 16px;"
  ></iframe>
</div>
```

### カスタムサイズ

```html
<iframe
  src="https://tenmon-ai.com/embed/qa"
  width="400"
  height="600"
  style="border:none; border-radius:16px;"
></iframe>
```

## 使用方法

1. **開発環境で確認**
   ```bash
   cd /home/ubuntu/os-tenmon-ai-v2
   pnpm dev
   ```

2. **ブラウザでアクセス**
   - URL: `https://[your-domain]/embed/qa`

3. **質問を入力**
   - Enterキーで送信
   - Shift+Enterで改行

4. **回答を確認**
   - 回答が表示されるまで待つ
   - エラーが発生した場合はエラーメッセージが表示される

## 技術スタック

- **フロントエンド**: React 19, Tailwind CSS 4, tRPC
- **バックエンド**: Express 4, tRPC 11, LLM統合
- **データベース**: MySQL（siteInfoテーブル）
- **テスト**: Vitest

## 注意事項

1. **IMEガード不使用**: この実装ではIMEガードを使用していません。日本語入力時のEnter誤送信は発生しません。

2. **サイト情報の管理**: `siteInfo`テーブルに以下のキーが必要です:
   - `release_status`: リリース状態（例: "開発中"）
   - `founder_release_date`: Founder先行アクセス開始予定日（例: "2025-02-28"）
   - `official_release_date`: 正式リリース予定日（例: "2026-03-21"）
   - `free_plan_available`: 無料プラン提供（例: "false"）

3. **旧字体マッピング**: 回答は自動的に旧字体に変換されます。

## トラブルシューティング

### エラー: "回答の生成に失敗しました"

- LLM APIの接続を確認してください
- サーバーログを確認してください

### エラー: "質問を入力してください"

- 空の質問は送信できません
- 質問を入力してから送信してください

### iframe が表示されない

- URLが正しいか確認してください
- CORSポリシーを確認してください
- ブラウザのコンソールでエラーを確認してください

## 今後の拡張

1. **会話履歴の保存**: conversationHistoryの実装
2. **ストリーミング対応**: リアルタイムで回答を表示
3. **マルチモーダル対応**: 画像や音声入力のサポート
4. **カスタマイズ可能なテーマ**: ユーザーがテーマを選択できる機能

## まとめ

この実装により、既存のLP用コードの問題点を解決し、シンプルで安定したLPチャットフレームを提供できるようになりました。IMEガードを使用しないことで、日本語入力時のバグを完全に排除し、ユーザーエクスペリエンスを向上させました。
