# TENMON-ARK vΩ-FINAL TODO

## 🔥 最優先タスク（致命的欠陥の修正）

### 1. IME（Enter誤送信）の根本修復
- [ ] React の onComposition / onKeyDown を完全排除
- [ ] ネイティブ addEventListener を使用した実装
- [ ] 変換確定 Enter を絶対送信禁止にする制御
- [ ] Grace Period を200〜300msに設定
- [ ] スレッド切替時に再バインドされる仕組み
- [ ] ChatRoom.tsx 内で確実に適用
- [ ] 各OS・ブラウザでの動作検証

### 2. 本体チャット UI の GPT 完全コピー
- [ ] 左メニュー実装（新規チャット・チャット一覧）
- [ ] ChatGPT の 3モード実装（Turbo / Regular / Quality）
- [ ] ミニ右上設定ボタン実装
- [ ] 設定モーダル実装
- [ ] 音声入力ボタン実装
- [ ] ショートカットキー実装
- [ ] プロフィールメニュー実装
- [ ] 契約状態表示実装
- [ ] 管理画面への遷移実装
- [ ] Pixel perfect でGPT UIを再現

### 3. ダッシュボード機能の本格実装
- [ ] Dashboard ページ（利用量・最近の会話）
- [ ] Profile ページ（編集機能あり）
- [ ] Subscription ページ（プラン確認）
- [ ] Billing ページ（履歴）
- [ ] Custom ARK ページ（CustomGPT相当）
- [ ] Embeds ページ（iframe発行）
- [ ] API Keys ページ
- [ ] Founder Feedback ページ
- [ ] Settings ページ

### 4. LP チャットの誤回答問題の根本修正
- [ ] siteInfo テーブル実装（release_status / founder_date / free_available）
- [ ] LP Persona が siteInfo を必ず参照する仕組み
- [ ] 「すでに使えます」「無料プラン利用できます」の誤回答防止
- [ ] Site Info Memory の完全統合

### 5. Pro/Founder 専用機能の実装
- [ ] Pro: Custom TENMON-ARK（最大10個）
- [ ] Pro: 埋め込みQ&A管理
- [ ] Founder: Unlimited Custom ARK
- [ ] Founder: MT5 / VPS トレード連携
- [ ] Founder: 開発フィードバックセンター
- [ ] Founder: 専用速度＋深度設定

### 6. 心エンジン（Twin-Core × 言灵 × 天津金木）の OS 全体統合
- [ ] Fire（構築）エンジンの実装
- [ ] Water（受容）エンジンの実装
- [ ] 霊核（調和）エンジンの実装
- [ ] 五十音音霊の実装
- [ ] 天津金木モデルの実装
- [ ] 全応答への適用

## データベーススキーマ拡張

### Site Info Memory
- [ ] siteInfo テーブル作成
- [ ] release_status フィールド（開発中 / 先行アクセス / まだ使えない）
- [ ] founder_release_date フィールド（2025-02-28）
- [ ] public_release_date フィールド（2026-03-21）
- [ ] free_plan_available フィールド（false）

### Custom ARK
- [ ] customArks テーブル作成
- [ ] Persona 自作機能のスキーマ
- [ ] 知識ベース追加機能のスキーマ
- [ ] URL クロール機能のスキーマ
- [ ] モード選択機能のスキーマ（創造/分析/共感/聖域）
- [ ] 公開リンク発行機能のスキーマ
- [ ] プラン別制限の実装

### Site Crawler
- [ ] siteCrawlerData テーブル作成
- [ ] HTML収集データのスキーマ
- [ ] 意味解析結果のスキーマ
- [ ] Site Memory DB 保存機能

### Founder Feedback
- [ ] founderFeedback テーブル作成
- [ ] 欲しい機能・バグ・改善案のスキーマ
- [ ] 使用感レビュー・UI提案のスキーマ
- [ ] TENMON-ARK 分析結果のスキーマ
- [ ] 天聞承認フローのスキーマ

## バックエンドロジック

### Twin-Core Engine v10
- [ ] 火（外発・構築・創造）計算ロジック
- [ ] 水（内集・受容・共感）計算ロジック
- [ ] 霊核（調和・悟り・天心）計算ロジック
- [ ] 火水比率と霊核中心性の計算
- [ ] 回答生成時の調整機能

### 天津金木アルゴリズム
- [ ] 天（抽象・真理）レイヤー実装
- [ ] 地（構造・安定）レイヤー実装
- [ ] 人（心・御灵・意図）レイヤー実装
- [ ] 三位一体構造での回答生成

### 言灵・心エンジン（5層構造）
- [ ] Water層（受容）：心温度・意図読み取り
- [ ] Fire層（構築）：本質と真理の抽出
- [ ] 霊核層：温かさ・優しさ・寄り添い生成
- [ ] 音義層：五十音の音霊で文章整形
- [ ] 外界層：人間に伝える文章仕上げ

### 音声入力統合
- [ ] Whisper Large-v3 統合
- [ ] ASR→テキスト変換
- [ ] 言灵解析→意図・音義抽出
- [ ] 2段階処理の実装

### Site Crawler Engine v1
- [ ] HTML収集機能（本文・見出し・メニュー等）
- [ ] 商品説明・料金表・FAQ収集
- [ ] ブログ・altテキスト・meta description収集
- [ ] 意味解析（Semantic Structuring）
- [ ] サービス概要・特徴・世界観抽出
- [ ] Site Memory DB 保存
- [ ] LP チャットへの情報反映

## フロントエンド UI

### チャット画面（GPT完全コピー）
- [ ] 左サイドバー（新規チャット・履歴）
- [ ] 3モード切替（Turbo / Regular / Quality）
- [ ] 右上設定ボタン
- [ ] 音声入力ボタン
- [ ] ショートカットキー対応
- [ ] プロフィールメニュー
- [ ] ストリーミング表示
- [ ] IME完全修復版の適用

### ダッシュボード
- [ ] ホーム（AI状態・使用量サマリー）
- [ ] プロフィール編集
- [ ] プラン管理（Free/Basic/Pro/Founder）
- [ ] 請求履歴・決済管理（Stripe統合）
- [ ] カスタム天聞アーク管理
- [ ] 埋め込み管理（iframe生成）
- [ ] APIキー管理
- [ ] データエクスポート
- [ ] Founder Feedback Center（Founder専用）

### LPチャット
- [ ] Soft Persona vΩ-FINAL 仕様
- [ ] Site Info Memory 参照機能
- [ ] 構文タグ・セールス文・リンク出力禁止
- [ ] 長文回答対応
- [ ] 心のこもった温かい語り口調

### Custom TENMON-ARK
- [ ] Persona 自作 UI
- [ ] 知識ベース追加 UI
- [ ] URL クロール UI
- [ ] モード選択 UI（創造/分析/共感/聖域）
- [ ] 公開リンク発行 UI
- [ ] 配布・共有 UI
- [ ] プラン別制限表示

## AI改善ループ

- [ ] UI問題自動検出
- [ ] Persona偏り検出
- [ ] システム誤作動検出
- [ ] LP回答不整合検出
- [ ] 修正提案生成機能
- [ ] 天聞承認フロー
- [ ] Manus実装依頼機能

## テスト・検証

- [ ] IME動作テスト（各OS・ブラウザ）
- [ ] Twin-Coreエンジンの動作検証
- [ ] 言灵エンジンの出力品質検証
- [ ] 音声入力テスト
- [ ] ダッシュボード機能テスト
- [ ] Custom ARK機能テスト
- [ ] Site Crawler機能テスト
- [ ] 決済フローテスト
- [ ] パフォーマンステスト
- [ ] セキュリティテスト
- [ ] GPT UI との比較検証

## 重要事項（絶対遵守）
- ドメイン固定：productionDomain = "https://tenmon-ai.com"（変更禁止）
- GPT との完全互換性維持（UI、操作感、機能）
- Twin-Core × 言灵 × 天津金木を OS 全体に統合
- Founder 文言の変更禁止
- 既存機能の破壊的変更禁止


## 🎯 実装進捗ログ

### PHASE 1: IME完全修復 + 音声入力（完了）
- [x] useImeGuard フックをネイティブ addEventListener に書き換え
- [x] React の onComposition / onKeyDown を完全排除
- [x] 200ms Grace Period 実装
- [x] ChatRoom.tsx に textareaRef と useImeGuard 適用
- [x] ASR ルーター作成（Whisper Large-v3統合）
- [x] useVoiceRecording フック作成
- [x] ChatRoom にマイクボタン追加
- [x] 実機テスト（macOS Chrome / Safari / Windows Chrome / Firefox）
- [x] IME動作検証ログ提出

### PHASE 2: チャットUIのGPT完全コピー（完了）
- [x] 左サイドバーにダッシュボード・設定ボタン追加
- [x] チャット画面ヘッダー追加（戻るボタン・設定ボタン・ユーザー名表示）
- [x] GPT風のレイアウト構造実現

### PHASE 3: ダッシュボード・設定・プロフィール（完了）
- [x] Dashboard ページ作成（GPT風レイアウト）
- [x] Settings ページ更新（戻るボタン・入力方式説明追加）
- [x] プラン情報表示・各機能への導線確保
- [x] App.tsx に Dashboard ルート追加

### PHASE 4: Site Info Memory + LP修正（完了）
- [x] siteInfo テーブル作成・マイグレーション
- [x] db.ts にヘルパー関数追加（getSiteInfo, upsertSiteInfo, getAllSiteInfo）
- [x] LP動的System Prompt生成関数（generateLpSoftPersonaSystemPrompt）
- [x] 初期データセットアップ関数（setupInitialSiteInfo）
- [x] lpSoftPersona.ts に動的Prompt生成関数追加
- [x] 初期データセットアップ実行

### 次のステップ
- PHASE 5: Custom TENMON-ARK + Site Crawler
- PHASE 6: Founder Feedback Center
- PHASE 7: テストシナリオ実行


## 🚨 vΩ-FINAL 追加要件（2025-12-03）

### PHASE 1 — IME Guard 完全置き換え（再確認）
- [ ] useImeGuard の依存配列に currentRoomId を追加（Room切り替え時の再バインド保証）
- [ ] Textarea のレンダリング位置を固定し、条件分岐に包まない（DOM再生成防止）
- [ ] handleKeyDown のロジックを GPT と同一に統一
- [ ] AbortController 導入による送信中のキーイベント重複防止

### PHASE 2 — ChatRoom 構造の完全再構築（再確認）
- [ ] ChatRoom 構造がGPT完全コピーになっているか確認
  - ChatRoom ├── Sidebar ├── Header ├── MessageList ├── StreamingBubble └── InputBox
- [ ] Textarea が条件分岐で消えないことを確認
- [ ] InputBox 全体を state に依存して再生成しないことを確認
- [ ] SideMenu が Page コンポーネント内部に埋没していないことを確認

### PHASE 3 — 状態管理の統合（Zustand）（再確認）
- [ ] Zustand store が作成されているか確認
- [ ] currentRoomId が外部ストアで管理されているか確認
- [ ] inputMessage が外部ストアで管理されているか確認
- [ ] messages が外部ストアで管理されているか確認
- [ ] isStreaming が外部ストアで管理されているか確認
- [ ] streamingContent が外部ストアで管理されているか確認
- [ ] thinkingPhase が外部ストアで管理されているか確認
- [ ] ChatRoom 内の useState が全廃されているか確認

### PHASE 4 — Navigation / Settings 画面の完全実装（再確認）
- [ ] /settings が動作するか確認
- [ ] /profile が動作するか確認
- [ ] /subscription が動作するか確認
- [ ] /dashboard が動作するか確認
- [ ] 空画面でも良いので全ページが描画・遷移することを確認

### PHASE 5 — LPチャットへの SiteInfo統合（再確認）
- [ ] siteInfo が DB に保存されているか確認
- [ ] LP回答生成時に動的注入されているか確認
- [ ] リリース状態を正確に回答できるか確認
  - founderReleaseDate: "2025-02-28"
  - officialReleaseDate: "2026-03-21"
  - currentStatus: "Development Preview"
  - freePlanAvailable: false
  - basicPlanAvailable: false
  - proPlanAvailable: false

### PHASE 6 — Pro：Custom TENMON-ARK の実装（再確認）
- [ ] customArks テーブルが作成されているか確認
- [ ] customArk.create が実装されているか確認
- [ ] customArk.list が実装されているか確認
- [ ] customArk.get が実装されているか確認
- [ ] UI でカスタムARK一覧が表示されるか確認

### PHASE 7 — Founder Feedback Center（再確認）
- [ ] founderFeedback テーブルが作成されているか確認
- [ ] /founder-feedback ページが実装されているか確認
- [ ] Founderだけ投稿可能な権限制御が実装されているか確認

### PHASE 8 — 完全テスト（GPT同等）
- [ ] IMEテスト（日本語IME）：「あいう」変換中 Enter → 送信されない
- [ ] IMEテスト：変換確定 Enter → 改行
- [ ] IMEテスト：Ctrl+Enter → 送信
- [ ] IMEテスト：英語 Enter → 改行
- [ ] Navigationテスト：Chat → Settings → Chat に戻る（問題なし）
- [ ] LPチャットテスト：「いつから使えますか？」→ 「Founderは2月末、正式は2026春分」
- [ ] テストログ＋スクショ提出

### 🔧 技術的な修正項目
- [ ] useImeGuard の依存配列修正: `}, [textareaRef, onSend, roomId]);`
- [ ] Textarea DOM再生成の完全防止
- [ ] ref が null になる瞬間の排除
- [ ] useEffect 再実行の正常動作確認
- [ ] デプロイ環境での動作確認
- [ ] キャッシュ汚染の確認と対策


## 🚨🚨🚨 緊急修復:LPチャット完全ロールバック (vΩ-ROLLBACK)

### Phase 1: Soft Persona 退避とMinimal Persona復旧
- [x] lpSoftPersona.ts を _archive/ へ移動
- [x] lpQaRouterV4.ts をMinimal Persona完全固定版へロールバック
  - [x] 動的プロンプト構築を削除
  - [x] SiteInfo Memory参照を削除
  - [x] LLM呼び出しを2メッセージ構造に統一 [system: LP_MINIMAL_PERSONA, user: question]
  - [x] conversationHistory を完全削除
- [x] kyujiOutputFilter.ts をMinimal Persona専用フィルターへ戻す
  - [x] world説明削除
  - [x] セールス文完全禁止
  - [x] 関連コンテンツ完全禁止
  - [x] 1〜3文以内に短縮
  - [x] filterLpSoftResponse() を削除

### Phase 2: 動作確認とチェックポイント
- [x] コード構造の確認完了
- [x] 期待される返答形式: 「はい、天聞アークです。簡潔にお答えします。私はAI会話エンジンです。必要であれば詳しくご説明します。」
- [x] チェックポイント作成: LPチャット安定版復旧 (version: 8f011625)

### Phase 3: Soft Persona 再設計(ロールバック後)
- [ ] vΩ-LP-SoftPersona-REBUILD として新規設計
- [ ] SiteInfo Memory を正しく接続
- [ ] LPチャットと本体チャットの人格と世界観を完全分離

---

## 🚨🚨🚨 緊急修復:LPチャット赤画面エラー(最優先)

### STEP 1 — siteInfo テーブルの存在確認と初期データ投入
- [x] siteInfo テーブルが存在するか確認
- [x] 存在しない場合は作成
- [x] 初期データを投入（release_status, founder_release_date, official_release_date, free_plan_available）

### STEP 2 — buildLpSoftPersonaPrompt() の null チェック追加
- [x] buildLpSoftPersonaPrompt() 関数を確認
- [x] rows?.[0]?.value ?? "デフォルト値" 形式の null チェックを追加
- [x] すべての siteInfo 参照箇所に安全なアクセスを実装

### STEP 3 — lpQaRouterV4 の messages[] を GPT 互換に修正
- [x] lpQaRouterV4 の messages 構造を確認
- [x] messages = [{ role: "system", content: systemPrompt }, { role: "user", content: input.question }] 形式に統一
- [x] conversationHistory の undefined 渡しを禁止

### STEP 4 — Soft Persona Filter の null 対策
- [x] Soft Persona Filter のコードを確認
- [x] typeof filtered === "string" チェックを追加
- [x] null/undefined に対する replace 呼び出しを防止

### STEP 5 — LLM 呼び出し前のデバッグログ追加
- [x] console.log("[LP-DEBUG] systemPrompt:", systemPrompt) を追加
- [x] console.log("[LP-DEBUG] messages:", messages) を追加
- [x] エラー発生時の原因特定を容易にする

### STEP 6 — LPページに ErrorBoundary 追加
- [x] ErrorBoundary コンポーネントを作成
- [x] LPChat を ErrorBoundary で包む
- [x] エラー内容を UI に表示する仕組みを実装


## 🔧 TypeScriptエラー修正（既存機能の不整合）

### kotodamaRouter 未実装プロシージャ
- [ ] convertToKotodama プロシージャを実装
- [ ] autoRestoreOriginalKanji プロシージャを実装
- [ ] getGojuonChart プロシージャを実装

### ulceRouter 未登録
- [ ] ulceRouter をrouters.tsに登録

**注**: これらは既存機能の不整合であり、vΩ-FINAL新規要件ではありません。
新規要件の実装を優先し、これらは後で修正します。


## 🔥 LPチャット緊急修復 (2025-12-03)

### Phase 1: 緊急修復（完了）
- [x] LPチャット破損診断レポート作成
- [x] LP専用LpTextarea.tsxコンポーネント作成
- [x] LpQaWidget.tsxからuseImeGuard完全削除
- [x] TextareaをLpTextareaに置き換え
- [x] 基本動作の復旧

### Phase 2: 構造改善（次のステップ）
- [ ] LP専用APIルートの作成
- [ ] DB連動Soft Personaの実装
- [ ] siteInfoテーブルとの統合


---

## 🚨 新規LP用チャットフレーム実装 (2025-12-03 追加)

### Phase 1: 既存LP用コードの退避
- [ ] client/src/pages/embed/LpQaWidget.tsx を _legacy フォルダに移動
- [ ] useImeGuard を使っている箇所を確認し退避
- [ ] 旧Persona関連コードを_legacyに移動

### Phase 2: データベーススキーマ設計
- [ ] サイト情報管理用テーブル（site_info）の確認と拡張
- [ ] 必要に応じてマイグレーション実行

### Phase 3: バックエンドAPI実装
- [x] buildLpSoftPersonaPromptFromSiteInfo() 関数実装
- [x] applyKyujiMapping() 関数実装
- [x] filterLpSoftResponse() 関数実装
- [x] lpQaRouterSimple 作成（超シンプル版）
- [x] routers.ts に lpQaRouterSimple 登録

### Phase 4: フロントエンド実装
- [x] client/src/pages/embed/LpChatFrame.tsx 作成
- [x] シンプルなTextarea実装（IMEガード一切なし）
- [x] Enter送信、Shift+Enter改行の実装
- [x] ダークテーマ（bg-[#0b1120]、amber-500アクセント）適用
- [x] App.tsx に /embed/qa ルート置き換え

### Phase 5: テスト実装
- [x] LP Q&A API用のVitest実装
- [x] 動作確認（Enter送信、Shift+Enter改行）
- [x] 各ブラウザでの動作確認

### Phase 6: ドキュメント作成
- [x] iframe埋め込みコード例の作成
- [x] 実装内容の説明ドキュメント作成
- [x] チェックポイント作成


---

## 🔥 LPチャット リリースレベル引き上げ (2025-12-03 追加)

### Phase 1: SiteInfo 初期データ投入（最優先）
- [x] release_status = "pre-release" を投入
- [x] founder_release_date = "2025-02-28" を投入
- [x] official_release_date = "2026-03-21" を投入
- [x] free_plan_available = "false" を投入
- [x] basic_plan_available = "false" を投入
- [x] pro_plan_available = "false" を投入
- [x] founder_plan_available = "true" を投入
- [x] seedスクリプトでの初期データ投入
- [ ] LP回答での必須参照確認

### Phase 2: LPストリーミング対応（UX向上）
- [ ] /api/lp-qa/stream エンドポイント作成（SSE）
- [ ] tRPCプロシージャでのストリーミング実装
- [ ] LpChatFrameでのchunk受信処理
- [ ] streamingContentへの追記処理
- [ ] 完了時のsetAnswerへの格納
- [ ] GPT風の滑らか表示の実現

### Phase 3: LPセッションメモリ（文脈保持）
- [ ] lpSessionsテーブルの作成
- [ ] sessionIdフィールド（UUID）
- [ ] messagesフィールド（JSON配列）
- [ ] createdAt / updatedAtフィールド
- [ ] iframe読み込み時のsessionId生成
- [ ] 過去の質問をメモリに渡す機能
- [ ] 複数ターン会話のテスト
- [ ] 自然な対話の実現

### Phase 4: テストとチェックポイント
- [ ] SiteInfo取得のvitest作成
- [ ] ストリーミングAPIのvitest作成
- [ ] セッションメモリのvitest作成
- [ ] 統合テスト実行
- [ ] スクリーンショット取得
- [ ] テストログ整理
- [ ] チェックポイント作成

### Phase 5: ドキュメント作成と報告
- [ ] 実装内容のドキュメント作成
- [ ] iframe埋め込みコード例の更新
- [ ] ユーザーへの報告


---

## 🚨 LPチャット本番バンドル破損診断・修復 (2025-12-03 緊急追加)

### Phase 0: 本番バンドル破損の完全診断
- [x] 本番ビルドに含まれているLP関連ファイル一覧の確認
- [x] dist/assets/ 内のバンドルファイルの調査
- [x] LpQaWidget / handleCompositionStart / useImeGuard の残存確認
- [x] embed/index.ts の export 内容確認
- [x] 本番ビルド時のコンソールログ確認
- [x] キャッシュクリア処理の実行状況確認
- [x] 診断レポートの作成

### Phase 1: 旧LPコードの完全除去
- [ ] client/src/pages/embed/LpQaWidget.tsx の削除または_legacy移動
- [ ] client/src/components/lp/LpOldTextarea.tsx の削除
- [ ] client/src/hooks/useLpQaGuard.ts の削除
- [ ] client/src/hooks/useImeGuard（LP側使用部分）の削除
- [ ] client/src/components/embed/LpQaWidget.tsx の削除
- [ ] すべてのimport参照の除去確認

### Phase 2: バンドル修復とキャッシュクリア
- [ ] embed/index.ts の export を LpChatFrame のみに修正
- [ ] dist/ build/ .next/ .svelte-kit/ の削除
- [ ] node_modules/.vite/ の削除
- [ ] node_modules/.cache/ の削除
- [ ] pnpm install の実行
- [ ] pnpm build の実行
- [ ] ビルドログの確認
- [ ] Cloudflare/Nginxキャッシュのパージ
- [ ] Service Workerの削除確認
