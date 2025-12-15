# 🌕 TENMON-ARK OS v1.0 動作テストチェックリスト

**作成日時**: 2025年1月  
**バージョン**: PHASE FINAL A  
**目的**: TENMON-ARK OS v1.0 の全機能を破綻なく動作させること

---

## 📋 テスト概要

本チェックリストは、TENMON-ARK OS v1.0 のリリース前に行うべき全機能の動作テストを網羅的に定義します。

**テスト範囲**:
- Feature Test（機能テスト）
- Integration Test（統合テスト）
- Evolution Test（進化サイクルテスト）
- UX Test（Founder体験テスト）

**テスト優先度**: HIGH / MEDIUM / LOW  
**推定所要時間**: 2週間（全テスト完了まで）

---

## 1. Feature Test（機能テスト）

### 1.1 Atlas Chat API（推論核）

**優先度**: 🔴 HIGH  
**推定時間**: 2時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | Basic Chat: シンプルなメッセージ送信 | 正常にレスポンスが返る | HIGH |
| 2 | Persona指定: Architect Personaで送信 | Architect風の応答が返る | HIGH |
| 3 | Persona指定: Guardian Personaで送信 | Guardian風の応答が返る | HIGH |
| 4 | Persona指定: Companion Personaで送信 | Companion風の応答が返る | HIGH |
| 5 | Persona指定: Silent Personaで送信 | Silent風の応答が返る | HIGH |
| 6 | Memory統合: 過去の会話を参照 | 過去の会話内容が反映される | HIGH |
| 7 | Reasoning統合: 推論ステップが返る | reasoning.stepsが含まれる | HIGH |
| 8 | プランチェック: Freeプランでアクセス | 403 Forbiddenが返る | HIGH |
| 9 | プランチェック: Basicプランでアクセス | 正常にレスポンスが返る | HIGH |
| 10 | プランチェック: Proプランでアクセス | 正常にレスポンスが返る | HIGH |
| 11 | プランチェック: Founderプランでアクセス | 正常にレスポンスが返る | HIGH |
| 12 | 認証チェック: 未認証でアクセス | 401 Unauthorizedが返る | HIGH |
| 13 | エラーハンドリング: 無効なメッセージ | 適切なエラーメッセージが返る | MEDIUM |
| 14 | ストリーミング: レスポンスがストリーミングされる | トークンが順次返る | HIGH |
| 15 | 多言語対応: 英語で送信 | 英語で応答が返る | MEDIUM |
| 16 | 多言語対応: 韓国語で送信 | 韓国語で応答が返る | MEDIUM |
| 17 | 長文メッセージ: 1000文字のメッセージ | 正常に処理される | MEDIUM |
| 18 | 連続送信: 10回連続で送信 | すべて正常に処理される | MEDIUM |
| 19 | レスポンス形式: AtlasChatResponse形式 | 統一された形式で返る | HIGH |
| 20 | 型安全性: レスポンスの型チェック | TypeScript型エラーなし | HIGH |

**合格基準**: 18/20項目がPASS（HIGH優先度は100%必須）

---

### 1.2 Memory Kernel（記憶核）

**優先度**: 🔴 HIGH  
**推定時間**: 1.5時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | STM取得: 現在の会話文脈を取得 | STMが正しく返る | HIGH |
| 2 | MTM取得: 中期的な記憶を取得 | MTMが正しく返る | HIGH |
| 3 | LTM取得: 長期的な記憶を取得 | LTMが正しく返る | HIGH |
| 4 | MemoryContext取得: 三層記憶を統合取得 | すべての層が含まれる | HIGH |
| 5 | 記憶保存: super_fire重要度で保存 | MTMに即座に保存される | HIGH |
| 6 | 記憶保存: fire重要度で保存 | MTMに保存される | HIGH |
| 7 | 記憶保存: warm重要度で保存 | MTMに保存される | MEDIUM |
| 8 | 記憶保存: neutral重要度で保存 | MTMに保存される | MEDIUM |
| 9 | 記憶保存: cool重要度で保存 | STMのみに保存される | MEDIUM |
| 10 | 記憶保存: water重要度で保存 | 統合専用として処理される | MEDIUM |
| 11 | 五十音構文階層: ア行（STM）の検証 | ア行の記憶が正しく分類される | HIGH |
| 12 | 五十音構文階層: ウ行（MTM）の検証 | ウ行の記憶が正しく分類される | HIGH |
| 13 | 五十音構文階層: ン行（LTM）の検証 | ン行の記憶が正しく分類される | HIGH |
| 14 | Gojuon階層検索: ア行から検索 | ア行の記憶が検索される | HIGH |
| 15 | Gojuon階層検索: ウ行から検索 | ウ行の記憶が検索される | HIGH |
| 16 | Gojuon階層検索: ン行から検索 | ン行の記憶が検索される | HIGH |
| 17 | 記憶カテゴリー: worldviewカテゴリー | 正しく分類される | MEDIUM |
| 18 | 記憶カテゴリー: conversation_recentカテゴリー | 正しく分類される | MEDIUM |
| 19 | 記憶の有効期限: STMは24時間保持 | 24時間後に削除される | MEDIUM |
| 20 | 記憶の有効期限: MTMは7〜30日保持 | 有効期限内は保持される | MEDIUM |

**合格基準**: 16/20項目がPASS（HIGH優先度は100%必須）

---

### 1.3 Persona Engine

**優先度**: 🔴 HIGH  
**推定時間**: 1時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | Persona自動判定: Architectキーワード | Architectが判定される | HIGH |
| 2 | Persona自動判定: Guardianキーワード | Guardianが判定される | HIGH |
| 3 | Persona自動判定: Companionキーワード | Companionが判定される | HIGH |
| 4 | Persona自動判定: Silentキーワード | Silentが判定される | HIGH |
| 5 | Persona自動判定: キーワードなし | Companionがデフォルトで選択される | HIGH |
| 6 | Persona State: current Personaの保持 | 正しく保持される | HIGH |
| 7 | Persona State: prev Personaの保持 | 正しく保持される | MEDIUM |
| 8 | Persona切り替え: Architect → Guardian | 正常に切り替わる | HIGH |
| 9 | Persona切り替え: Guardian → Companion | 正常に切り替わる | HIGH |
| 10 | Persona Badge表示: Architect | 青いバッジが表示される | HIGH |
| 11 | Persona Badge表示: Guardian | 赤いバッジが表示される | HIGH |
| 12 | Persona Badge表示: Companion | 桃色のバッジが表示される | HIGH |
| 13 | Persona Badge表示: Silent | グレーのバッジが表示される | HIGH |
| 14 | ChatBubble色: Architect | 青系の背景色 | HIGH |
| 15 | ChatBubble色: Guardian | 赤系の背景色 | HIGH |
| 16 | ChatBubble色: Companion | 桃系の背景色 | HIGH |
| 17 | ChatBubble色: Silent | グレー系の背景色 | HIGH |
| 18 | ChatHeader背景色: Personaに応じて変化 | Personaに応じた色になる | HIGH |
| 19 | Persona切り替えアニメーション | fadeIn + scaleアニメーション | MEDIUM |
| 20 | Persona設定取得: getPersonaConfig | 正しい設定が返る | MEDIUM |

**合格基準**: 18/20項目がPASS（HIGH優先度は100%必須）

---

### 1.4 Whisper STT（音声入力）

**優先度**: 🔴 HIGH  
**推定時間**: 1.5時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | 録音開始: マイクボタンクリック | 録音が開始される | HIGH |
| 2 | 録音停止: マイクボタンクリック | 録音が停止される | HIGH |
| 3 | 録音キャンセル: キャンセルボタン | 録音がキャンセルされる | MEDIUM |
| 4 | 音声ファイルアップロード: WebM形式 | 正常にアップロードされる | HIGH |
| 5 | 音声ファイルアップロード: MP3形式 | 正常にアップロードされる | HIGH |
| 6 | 音声ファイルアップロード: WAV形式 | 正常にアップロードされる | HIGH |
| 7 | 音声ファイルサイズ: 16MB以下 | 正常に処理される | HIGH |
| 8 | 音声ファイルサイズ: 16MB超過 | エラーが返る | MEDIUM |
| 9 | 音声長: 10秒 | 正常に処理される | HIGH |
| 10 | 音声長: 60秒 | 正常に処理される | HIGH |
| 11 | 音声長: 60秒超過 | エラーが返る | MEDIUM |
| 12 | 多言語対応: 日本語 | 日本語で文字起こしされる | HIGH |
| 13 | 多言語対応: 英語 | 英語で文字起こしされる | MEDIUM |
| 14 | 文字起こし結果: テキストが返る | 正しいテキストが返る | HIGH |
| 15 | エラーハンドリング: 無効なファイル形式 | 適切なエラーメッセージ | MEDIUM |
| 16 | 認証チェック: 未認証でアクセス | 401 Unauthorized | HIGH |
| 17 | ChatRoom統合: 自動挿入 | テキストが自動挿入される | HIGH |
| 18 | ChatRoom統合: 自動送信オプション | 自動送信される | MEDIUM |
| 19 | UI状態: 録音中表示 | "音声入力中"が表示される | HIGH |
| 20 | UI状態: 変換中表示 | "変換中"が表示される | HIGH |

**合格基準**: 18/20項目がPASS（HIGH優先度は100%必須）

---

### 1.5 Semantic Search（Concierge）

**優先度**: 🟡 MEDIUM  
**推定時間**: 1時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | 検索実行: シンプルなクエリ | 検索結果が返る | HIGH |
| 2 | 検索結果: 関連度順にソート | 関連度の高い順に返る | HIGH |
| 3 | 検索結果数: limit=5 | 最大5件が返る | MEDIUM |
| 4 | 検索結果数: limit=10 | 最大10件が返る | MEDIUM |
| 5 | ドキュメント追加: addDocument | 正常に追加される | HIGH |
| 6 | ドキュメント追加: メタデータ付き | メタデータが保存される | MEDIUM |
| 7 | Embedding生成: テキストをベクトル化 | 正しいベクトルが生成される | HIGH |
| 8 | Cosine Similarity: 類似度計算 | 正しい類似度が計算される | HIGH |
| 9 | 空のインデックス: 検索結果なし | 空の配列が返る | MEDIUM |
| 10 | 大量ドキュメント: 100件追加 | 正常に処理される | MEDIUM |
| 11 | 検索精度: 類似したクエリ | 関連ドキュメントが返る | MEDIUM |
| 12 | 検索精度: 異なるクエリ | 関連性の低い結果が返る | MEDIUM |
| 13 | エラーハンドリング: 無効なクエリ | 適切なエラーメッセージ | MEDIUM |
| 14 | 認証チェック: 未認証でアクセス | 401 Unauthorized | HIGH |
| 15 | Dashboard統合: 検索バーから検索 | 検索結果が表示される | HIGH |
| 16 | Feedback統合: フィードバックをインデックスに追加 | 正常に追加される | HIGH |
| 17 | メタデータ検索: カテゴリでフィルター | カテゴリでフィルターされる | MEDIUM |
| 18 | メタデータ検索: ページでフィルター | ページでフィルターされる | MEDIUM |
| 19 | パフォーマンス: 1000件のインデックス | 1秒以内に検索完了 | MEDIUM |
| 20 | パフォーマンス: 10000件のインデックス | 3秒以内に検索完了 | LOW |

**合格基準**: 16/20項目がPASS（HIGH優先度は100%必須）

---

### 1.6 Visual Synapse（アニメ背景生成）

**優先度**: 🟡 MEDIUM  
**推定時間**: 1時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | 背景生成: ghibliスタイル | 正常に生成される | HIGH |
| 2 | 背景生成: mappaスタイル | 正常に生成される | HIGH |
| 3 | 背景生成: shinkaiスタイル | 正常に生成される | HIGH |
| 4 | タイプ選択: nature | 自然系の背景が生成される | HIGH |
| 5 | タイプ選択: urban | 都市系の背景が生成される | HIGH |
| 6 | タイプ選択: interior | 室内系の背景が生成される | HIGH |
| 7 | ムード選択: serene | 静かなムードの背景 | MEDIUM |
| 8 | ムード選択: energetic | エネルギッシュなムードの背景 | MEDIUM |
| 9 | 時間帯選択: dawn | 夜明けの背景 | MEDIUM |
| 10 | 時間帯選択: night | 夜の背景 | MEDIUM |
| 11 | 天候選択: clear | 晴れの背景 | MEDIUM |
| 12 | 天候選択: rainy | 雨の背景 | MEDIUM |
| 13 | カラーパレット: warm | 暖色系の背景 | MEDIUM |
| 14 | カラーパレット: cool | 寒色系の背景 | MEDIUM |
| 15 | サイズ選択: 1024x1024 | 正しいサイズで生成される | HIGH |
| 16 | サイズ選択: 1792x1024 | 正しいサイズで生成される | HIGH |
| 17 | 品質選択: standard | 標準品質で生成される | MEDIUM |
| 18 | 品質選択: hd | HD品質で生成される | MEDIUM |
| 19 | Kokuzo Storage保存: saveToKokuzo=true | Kokuzo URLが返る | MEDIUM |
| 20 | プランチェック: Proプラン以上 | 正常に生成される | HIGH |
| 21 | プランチェック: Basicプラン以下 | 403 Forbidden | HIGH |
| 22 | エラーハンドリング: APIキーなし | 適切なエラーメッセージ | HIGH |
| 23 | プロバイダー切り替え: OpenAI DALL-E 3 | 正常に生成される | HIGH |
| 24 | プロバイダー切り替え: Stability AI | 正常に生成される | MEDIUM |
| 25 | UI表示: 生成中のローディング | ローディングが表示される | HIGH |
| 26 | UI表示: プレビュー表示 | 画像が表示される | HIGH |
| 27 | UI表示: ダウンロード機能 | 画像がダウンロードされる | MEDIUM |

**合格基準**: 22/27項目がPASS（HIGH優先度は100%必須）

---

### 1.7 MobileOS（デバイス接続）

**優先度**: 🟡 MEDIUM  
**推定時間**: 1時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | デバイス接続: connect() | 正常に接続される | HIGH |
| 2 | デバイス切断: disconnect() | 正常に切断される | HIGH |
| 3 | デバイス情報取得: getStatus() | 正しい情報が返る | HIGH |
| 4 | GPS取得: getGPS() | 位置情報が返る | HIGH |
| 5 | GPS取得: 許可なし | nullが返る | MEDIUM |
| 6 | バッテリー情報: バッテリーレベル | 正しいレベルが返る | HIGH |
| 7 | バッテリー情報: 充電状態 | 正しい状態が返る | MEDIUM |
| 8 | ネットワーク情報: 接続状態 | 正しい状態が返る | HIGH |
| 9 | ネットワーク情報: 接続タイプ | 正しいタイプが返る | MEDIUM |
| 10 | センサー情報: 利用可能なセンサー | 正しい情報が返る | MEDIUM |
| 11 | エラーハンドリング: 接続エラー | 適切なエラーメッセージ | MEDIUM |
| 12 | UI表示: 接続状態表示 | 正しい状態が表示される | HIGH |
| 13 | UI表示: バッテリー表示 | バッテリーレベルが表示される | HIGH |
| 14 | UI表示: ネットワーク表示 | ネットワーク状態が表示される | HIGH |
| 15 | UI表示: GPS表示 | GPS状態が表示される | HIGH |
| 16 | Haptics統合: タップ振動 | 振動が発生する | MEDIUM |
| 17 | Gesture統合: スワイプ操作 | スワイプが検出される | MEDIUM |
| 18 | Alpha Flow統合: アニメーション | アニメーションが動作する | MEDIUM |
| 19 | プラットフォーム検出: Web環境 | WebDeviceAdapterが使用される | HIGH |
| 20 | プラットフォーム検出: Android環境 | AndroidDeviceAdapterが使用される | LOW |

**合格基準**: 16/20項目がPASS（HIGH優先度は100%必須）

---

### 1.8 LifeGuardian OS

**優先度**: 🟡 MEDIUM  
**推定時間**: 1時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | デバイススキャン: scanDevice() | 正常にスキャンされる | HIGH |
| 2 | デバイス保護状態: getDeviceProtectionStatus() | 正しい状態が返る | HIGH |
| 3 | 危険検知: detectScam() | 危険が検知される | HIGH |
| 4 | 危険検知: 安全なURL | 安全と判定される | HIGH |
| 5 | 危険検知: 詐欺URL | 危険と判定される | HIGH |
| 6 | 危険レベル: low | 低リスクと判定される | MEDIUM |
| 7 | 危険レベル: medium | 中リスクと判定される | MEDIUM |
| 8 | 危険レベル: high | 高リスクと判定される | MEDIUM |
| 9 | 包括的脅威検知: performComprehensiveThreatDetection() | 正常に検知される | HIGH |
| 10 | 緊急アラート: 緊急時のアラート | アラートが発動される | MEDIUM |
| 11 | UI表示: 保護状態表示 | 正しい状態が表示される | HIGH |
| 12 | UI表示: 再スキャンボタン | 再スキャンが実行される | HIGH |
| 13 | エラーハンドリング: スキャンエラー | 適切なエラーメッセージ | MEDIUM |
| 14 | 認証チェック: 未認証でアクセス | 401 Unauthorized | HIGH |
| 15 | プランチェック: Founder/Devプラン | 正常にアクセスできる | HIGH |
| 16 | プランチェック: Basicプラン以下 | 403 Forbidden | HIGH |
| 17 | 命名統一: lifeGuardian | 正しい命名が使用される | MEDIUM |
| 18 | 統合: Fractal Guardian Model | 正常に統合される | MEDIUM |
| 19 | 統合: Soul Sync | 正常に統合される | MEDIUM |
| 20 | ログ: 脅威検知ログ | ログが記録される | MEDIUM |

**合格基準**: 16/20項目がPASS（HIGH優先度は100%必須）

---

### 1.9 Feedback OS

**優先度**: 🟡 MEDIUM  
**推定時間**: 30分

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | フィードバック送信: 基本送信 | 正常に送信される | HIGH |
| 2 | フィードバック送信: message必須 | メッセージが必須 | HIGH |
| 3 | フィードバック送信: category必須 | カテゴリが必須 | HIGH |
| 4 | フィードバック送信: pageオプション | pageがオプション | MEDIUM |
| 5 | カテゴリ: feature_request | 正常に保存される | HIGH |
| 6 | カテゴリ: bug_report | 正常に保存される | HIGH |
| 7 | カテゴリ: improvement | 正常に保存される | HIGH |
| 8 | カテゴリ: other | 正常に保存される | HIGH |
| 9 | Semantic Index統合: フィードバック追加 | インデックスに追加される | HIGH |
| 10 | メタデータ: category保存 | メタデータに保存される | MEDIUM |
| 11 | メタデータ: page保存 | メタデータに保存される | MEDIUM |
| 12 | メタデータ: userId保存 | メタデータに保存される | MEDIUM |
| 13 | UI表示: Modal表示 | Modalが表示される | HIGH |
| 14 | UI表示: 入力項目 | すべての項目が表示される | HIGH |
| 15 | UI表示: 送信ボタン | 送信ボタンが動作する | HIGH |
| 16 | UI表示: ローディング状態 | ローディングが表示される | MEDIUM |
| 17 | UI表示: 成功メッセージ | 成功メッセージが表示される | MEDIUM |
| 18 | UI表示: エラーメッセージ | エラーメッセージが表示される | MEDIUM |
| 19 | 認証チェック: 未認証でアクセス | 401 Unauthorized | HIGH |
| 20 | Dashboard統合: "改善を提案"ボタン | ボタンが表示される | HIGH |
| 21 | ChatRoom統合: "改善を提案"ボタン | ボタンが表示される | HIGH |
| 22 | Founder専用: Founderのみ表示 | Founderのみ表示される | MEDIUM |

**合格基準**: 19/22項目がPASS（HIGH優先度は100%必須）

---

## 2. Integration Test（統合テスト）

### 2.1 Whisper → Persona → Atlas → Streaming の統合経路

**優先度**: 🔴 HIGH  
**推定時間**: 2時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | 音声入力 → 文字起こし | テキストが生成される | HIGH |
| 2 | 文字起こし → 自動挿入 | ChatRoomの入力欄に挿入される | HIGH |
| 3 | 自動挿入 → Persona自動判定 | Personaが自動判定される | HIGH |
| 4 | Persona判定 → Persona Badge更新 | Badgeが更新される | HIGH |
| 5 | Persona判定 → ChatHeader背景色更新 | 背景色が更新される | HIGH |
| 6 | 自動送信オプション: 有効 | 自動的に送信される | HIGH |
| 7 | 自動送信オプション: 無効 | 送信されない | MEDIUM |
| 8 | 送信 → Atlas Chat API | APIが呼び出される | HIGH |
| 9 | Atlas Chat API → Persona適用 | Personaが適用される | HIGH |
| 10 | Atlas Chat API → Memory統合 | Memoryが統合される | HIGH |
| 11 | Atlas Chat API → Reasoning統合 | Reasoningが実行される | HIGH |
| 12 | Reasoning → Streaming開始 | ストリーミングが開始される | HIGH |
| 13 | Streaming → トークン受信 | トークンが順次受信される | HIGH |
| 14 | Streaming → ChatBubble表示 | ChatBubbleが表示される | HIGH |
| 15 | ChatBubble → Persona色適用 | Persona色が適用される | HIGH |
| 16 | Streaming → Reasoning Steps表示 | Reasoning Stepsが表示される | MEDIUM |
| 17 | Streaming完了 → Memory保存 | Memoryが保存される | HIGH |
| 18 | エラーハンドリング: 音声入力エラー | 適切なエラーメッセージ | MEDIUM |
| 19 | エラーハンドリング: APIエラー | 適切なエラーメッセージ | HIGH |
| 20 | エラーハンドリング: ストリーミング切断 | 適切なエラーメッセージ | MEDIUM |
| 21 | UI状態: 録音中 → 変換中 → 送信中 | 状態が正しく遷移する | HIGH |
| 22 | パフォーマンス: 音声入力から応答まで | 5秒以内 | MEDIUM |

**合格基準**: 20/22項目がPASS（HIGH優先度は100%必須）

---

### 2.2 Feedback → Semantic → Self-Review → Genesis の統合経路

**優先度**: 🟡 MEDIUM  
**推定時間**: 1.5時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | フィードバック送信 → Semantic Index追加 | インデックスに追加される | HIGH |
| 2 | Semantic Index → メタデータ保存 | メタデータが保存される | HIGH |
| 3 | Self-Review実行 → フィードバック分析 | フィードバックが分析される | HIGH |
| 4 | フィードバック分析 → カテゴリ別集計 | カテゴリ別に集計される | HIGH |
| 5 | フィードバック分析 → センチメント分析 | センチメントが分析される | MEDIUM |
| 6 | フィードバック分析 → 頻出キーワード抽出 | キーワードが抽出される | MEDIUM |
| 7 | Self-Review → 頻出問題点検出 | 問題点が検出される | HIGH |
| 8 | 頻出問題点 → 重要度判定 | 重要度が判定される | HIGH |
| 9 | Self-Review → チャットログ評価 | チャットログが評価される | HIGH |
| 10 | チャットログ評価 → エラー率計算 | エラー率が計算される | MEDIUM |
| 11 | Self-Review → 改善提案生成 | 改善提案が生成される | HIGH |
| 12 | Self-Review → Issue Genesis | 改善タスクが生成される | HIGH |
| 13 | 改善タスク生成 → カテゴリ分類 | カテゴリが分類される | HIGH |
| 14 | 改善タスク生成 → 優先度スコアリング | 優先度がスコアリングされる | HIGH |
| 15 | 改善タスク → UI表示 | タスクが表示される | HIGH |
| 16 | エラーハンドリング: Semantic Indexエラー | 適切なエラーメッセージ | MEDIUM |
| 17 | エラーハンドリング: Self-Reviewエラー | 適切なエラーメッセージ | MEDIUM |
| 18 | エラーハンドリング: Issue Genesisエラー | 適切なエラーメッセージ | MEDIUM |
| 19 | パフォーマンス: フィードバック送信からタスク生成まで | 10秒以内 | MEDIUM |
| 20 | データ整合性: フィードバック → タスク | データが正しく伝播する | HIGH |

**合格基準**: 18/20項目がPASS（HIGH優先度は100%必須）

---

### 2.3 AutoFix → AutoApply → EvolutionLoop の統合経路

**優先度**: 🔴 HIGH  
**推定時間**: 2時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | 改善タスク → AutoFix可能判定 | 自動修正可能か判定される | HIGH |
| 2 | AutoFix可能 → パッチ生成 | パッチが生成される | HIGH |
| 3 | パッチ生成 → unified diff形式 | 正しい形式で生成される | HIGH |
| 4 | パッチ生成 → リスクレベル判定 | リスクレベルが判定される | HIGH |
| 5 | パッチ生成 → ファイルパス指定 | 正しいファイルパスが指定される | HIGH |
| 6 | パッチ選択 → UI表示 | 選択されたパッチが表示される | HIGH |
| 7 | パッチ承認 → AutoApply実行 | AutoApplyが実行される | HIGH |
| 8 | AutoApply → unified diff適用 | パッチが適用される | HIGH |
| 9 | パッチ適用 → ファイル更新 | ファイルが更新される | HIGH |
| 10 | パッチ適用 → git add | git addが実行される | HIGH |
| 11 | git add → git commit | git commitが実行される | HIGH |
| 12 | git commit → コミットメッセージ | 正しいメッセージでコミット | HIGH |
| 13 | git commit → コミットハッシュ取得 | コミットハッシュが取得される | MEDIUM |
| 14 | git commit → git push | git pushが実行される | HIGH |
| 15 | git push → リモート反映 | リモートに反映される | HIGH |
| 16 | Evolution Loop → 全パイプライン実行 | 全パイプラインが実行される | HIGH |
| 17 | Evolution Loop → サイクルログ保存 | ログが保存される | HIGH |
| 18 | サイクルログ → UI表示 | ログが表示される | HIGH |
| 19 | エラーハンドリング: パッチ適用エラー | 適切なエラーメッセージ | HIGH |
| 20 | エラーハンドリング: git操作エラー | 適切なエラーメッセージ | HIGH |
| 21 | エラーハンドリング: パイプライン中断 | 適切に中断される | HIGH |
| 22 | 安全停止: パッチ適用失敗時 | コミット・プッシュが実行されない | HIGH |
| 23 | 安全停止: git操作失敗時 | 後続処理が実行されない | HIGH |
| 24 | Founder承認: 自動適用オプション | Founderのみ有効 | HIGH |
| 25 | パフォーマンス: パッチ適用からプッシュまで | 30秒以内 | MEDIUM |

**合格基準**: 23/25項目がPASS（HIGH優先度は100%必須）

---

## 3. Evolution Test（進化サイクルテスト）

### 3.1 Self-Evolution Loop 連続実行テスト

**優先度**: 🔴 HIGH  
**推定時間**: 3時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | サイクル1回実行: 正常終了 | 正常に完了する | HIGH |
| 2 | サイクル1回実行: ログ保存 | ログが保存される | HIGH |
| 3 | サイクル1回実行: サマリー生成 | サマリーが生成される | HIGH |
| 4 | サイクル2回実行: 連続実行 | 正常に完了する | HIGH |
| 5 | サイクル3回実行: 連続実行 | 正常に完了する | HIGH |
| 6 | サイクル4回実行: 連続実行 | 正常に完了する | HIGH |
| 7 | サイクル5回実行: 連続実行 | 正常に完了する | HIGH |
| 8 | サイクル6回実行: 連続実行 | 正常に完了する | MEDIUM |
| 9 | サイクル7回実行: 連続実行 | 正常に完了する | MEDIUM |
| 10 | サイクル8回実行: 連続実行 | 正常に完了する | MEDIUM |
| 11 | サイクル9回実行: 連続実行 | 正常に完了する | MEDIUM |
| 12 | サイクル10回実行: 連続実行 | 正常に完了する | MEDIUM |
| 13 | サイクル履歴: 10件保持 | 10件の履歴が保持される | HIGH |
| 14 | サイクル履歴: 古いログ削除 | 100件超で古いログが削除される | MEDIUM |
| 15 | サイクル状態: running → completed | 状態が正しく遷移する | HIGH |
| 16 | サイクル状態: running → failed | エラー時にfailedになる | HIGH |
| 17 | エラーハンドリング: Self-Reviewエラー | サイクルがfailedになる | HIGH |
| 18 | エラーハンドリング: Issue Genesisエラー | サイクルがfailedになる | HIGH |
| 19 | エラーハンドリング: AutoFixエラー | サイクルがfailedになる | HIGH |
| 20 | エラーハンドリング: AutoApplyエラー | サイクルがfailedになる | HIGH |
| 21 | 安全停止: エラー時の中断 | 適切に中断される | HIGH |
| 22 | 安全停止: 部分成功の処理 | 成功部分は保持される | MEDIUM |
| 23 | ログ整合性: 開始時刻記録 | 開始時刻が記録される | HIGH |
| 24 | ログ整合性: 完了時刻記録 | 完了時刻が記録される | HIGH |
| 25 | ログ整合性: エラー記録 | エラーが記録される | HIGH |
| 26 | メモリ使用量: 10回連続実行 | メモリリークなし | MEDIUM |
| 27 | パフォーマンス: 1サイクル実行時間 | 30秒以内 | MEDIUM |
| 28 | パフォーマンス: 10回連続実行時間 | 5分以内 | MEDIUM |
| 29 | データ整合性: サイクル間のデータ | データが正しく伝播する | HIGH |
| 30 | 自動適用オプション: 有効時 | 自動適用が実行される | HIGH |
| 31 | 自動適用オプション: 無効時 | 自動適用が実行されない | HIGH |
| 32 | Founder承認: 自動適用はFounderのみ | Founderのみ有効 | HIGH |

**合格基準**: 28/32項目がPASS（HIGH優先度は100%必須）

---

## 4. UX Test（Founder体験テスト）

### 4.1 Dashboard導線テスト

**優先度**: 🟡 MEDIUM  
**推定時間**: 1時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | ホーム → Dashboard | 正常に遷移する | HIGH |
| 2 | Dashboard → ChatRoom | "チャットへ"ボタンで遷移 | HIGH |
| 3 | Dashboard → API Docs | "View API Docs"ボタンで遷移 | MEDIUM |
| 4 | Dashboard → LifeGuardian | "Open Life Guardian"ボタンで遷移 | MEDIUM |
| 5 | Dashboard → MobileOS | "Connect Device"ボタンで遷移 | MEDIUM |
| 6 | Dashboard → Self-Review | リンクで遷移（実装確認） | MEDIUM |
| 7 | Dashboard → Self-Evolution | リンクで遷移（実装確認） | MEDIUM |
| 8 | Dashboard → AutoFix | リンクで遷移（実装確認） | MEDIUM |
| 9 | Dashboard → Evolution Loop | リンクで遷移（実装確認） | MEDIUM |
| 10 | 音声入力ボタン: 表示 | Founderのみ表示される | HIGH |
| 11 | 音声入力ボタン: クリック | 音声入力が開始される | HIGH |
| 12 | Semantic Search: 検索バー表示 | 検索バーが表示される | HIGH |
| 13 | Semantic Search: 検索実行 | 検索結果が表示される | HIGH |
| 14 | "改善を提案"ボタン: 表示 | Founderのみ表示される | MEDIUM |
| 15 | "改善を提案"ボタン: クリック | Feedback Modalが開く | HIGH |
| 16 | ローディングUI: セッション復元中 | ローディングが表示される | HIGH |
| 17 | ローディングUI: プラン情報読み込み中 | ローディングが表示される | HIGH |
| 18 | レスポンシブ: モバイル表示 | モバイルで正しく表示される | MEDIUM |
| 19 | レスポンシブ: タブレット表示 | タブレットで正しく表示される | MEDIUM |
| 20 | レスポンシブ: デスクトップ表示 | デスクトップで正しく表示される | MEDIUM |

**合格基準**: 18/20項目がPASS（HIGH優先度は100%必須）

---

### 4.2 ChatRoom体験テスト

**優先度**: 🔴 HIGH  
**推定時間**: 2時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | メッセージ送信: 基本送信 | 正常に送信される | HIGH |
| 2 | ストリーミング: トークン受信 | トークンが順次表示される | HIGH |
| 3 | ストリーミング: 途中切断防止 | 途中で切断されない | HIGH |
| 4 | ストリーミング: フェードインアニメーション | アニメーションが動作する | MEDIUM |
| 5 | Persona Badge: 表示 | Badgeが表示される | HIGH |
| 6 | Persona Badge: 自動更新 | Persona切り替えで更新される | HIGH |
| 7 | Persona Badge: 色変化 | Personaに応じた色になる | HIGH |
| 8 | ChatHeader背景色: Persona同期 | Personaに応じて変化する | HIGH |
| 9 | ChatBubble色: Persona同期 | Personaに応じた色になる | HIGH |
| 10 | ChatBubbleアニメーション: 出現 | fadeIn + scaleアニメーション | MEDIUM |
| 11 | Reasoning Steps Viewer: 表示 | "Show Reasoning"ボタンが表示される | MEDIUM |
| 12 | Reasoning Steps Viewer: 展開 | ステップが表示される | MEDIUM |
| 13 | Reasoning Steps Viewer: 折り畳み | ステップが非表示になる | MEDIUM |
| 14 | 音声入力: 録音開始 | 録音が開始される | HIGH |
| 15 | 音声入力: 録音停止 | 録音が停止される | HIGH |
| 16 | 音声入力: 自動挿入 | テキストが自動挿入される | HIGH |
| 17 | 音声入力: 自動送信オプション | 自動送信される | MEDIUM |
| 18 | 音声入力: "音声入力中"表示 | 状態が表示される | HIGH |
| 19 | 音声入力: "変換中"表示 | 状態が表示される | HIGH |
| 20 | サイドバー: ルーム一覧表示 | ルームが表示される | HIGH |
| 21 | サイドバー: 新規ルーム作成 | 新規ルームが作成される | HIGH |
| 22 | サイドバー: ルーム削除 | ルームが削除される | MEDIUM |
| 23 | エラーメッセージ: 表示 | エラーが表示される | HIGH |
| 24 | エラーメッセージ: 再送信 | 再送信が可能 | MEDIUM |
| 25 | "改善を提案"ボタン: 表示 | Founderのみ表示される | MEDIUM |
| 26 | "改善を提案"ボタン: クリック | Feedback Modalが開く | HIGH |
| 27 | レスポンシブ: モバイル表示 | モバイルで正しく表示される | MEDIUM |
| 28 | レスポンシブ: タブレット表示 | タブレットで正しく表示される | MEDIUM |
| 29 | レスポンシブ: デスクトップ表示 | デスクトップで正しく表示される | MEDIUM |
| 30 | パフォーマンス: メッセージ表示速度 | スムーズに表示される | MEDIUM |

**合格基準**: 27/30項目がPASS（HIGH優先度は100%必須）

---

### 4.3 Evolutionページ体験テスト

**優先度**: 🟡 MEDIUM  
**推定時間**: 1時間

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | Self-Review Page: 表示 | ページが表示される | HIGH |
| 2 | Self-Review Page: レポート取得 | レポートが表示される | HIGH |
| 3 | Self-Review Page: サマリー表示 | サマリーが表示される | HIGH |
| 4 | Self-Review Page: フィードバック分析 | 分析結果が表示される | HIGH |
| 5 | Self-Review Page: 頻出問題点 | 問題点が表示される | HIGH |
| 6 | Self-Review Page: 改善提案 | 提案が表示される | HIGH |
| 7 | Self-Evolution Page: 表示 | ページが表示される | HIGH |
| 8 | Self-Evolution Page: タスク一覧 | タスクが表示される | HIGH |
| 9 | Self-Evolution Page: カテゴリタブ | タブが動作する | HIGH |
| 10 | Self-Evolution Page: 優先度バッジ | バッジが表示される | HIGH |
| 11 | AutoFix Page: 表示 | ページが表示される | HIGH |
| 12 | AutoFix Page: パッチ一覧 | パッチが表示される | HIGH |
| 13 | AutoFix Page: パッチ展開 | パッチ内容が表示される | HIGH |
| 14 | AutoFix Page: パッチ選択 | パッチが選択される | HIGH |
| 15 | AutoFix Page: "Approve and Apply" | ボタンが表示される | HIGH |
| 16 | AutoFix Page: 実行ログ表示 | ログが表示される | HIGH |
| 17 | Loop Status Page: 表示 | ページが表示される | HIGH |
| 18 | Loop Status Page: 最新サイクル | 最新サイクルが表示される | HIGH |
| 19 | Loop Status Page: サイクル履歴 | 履歴が表示される | HIGH |
| 20 | Loop Status Page: "進化サイクル開始" | ボタンが動作する | HIGH |
| 21 | Loop Status Page: 自動適用チェックボックス | Founderのみ表示される | HIGH |
| 22 | エラーハンドリング: データ取得エラー | エラーメッセージが表示される | MEDIUM |
| 23 | ローディング状態: データ取得中 | ローディングが表示される | MEDIUM |
| 24 | レスポンシブ: モバイル表示 | モバイルで正しく表示される | MEDIUM |
| 25 | レスポンシブ: タブレット表示 | タブレットで正しく表示される | MEDIUM |
| 26 | レスポンシブ: デスクトップ表示 | デスクトップで正しく表示される | MEDIUM |

**合格基準**: 23/26項目がPASS（HIGH優先度は100%必須）

---

### 4.4 Feedback導線テスト

**優先度**: 🟡 MEDIUM  
**推定時間**: 30分

#### テストケース

| # | テスト項目 | 期待結果 | 優先度 |
|---|-----------|----------|--------|
| 1 | Dashboard → Feedback Modal | Modalが開く | HIGH |
| 2 | ChatRoom → Feedback Modal | Modalが開く | HIGH |
| 3 | Feedback Modal: 入力項目 | すべての項目が表示される | HIGH |
| 4 | Feedback Modal: メッセージ入力 | 入力できる | HIGH |
| 5 | Feedback Modal: カテゴリ選択 | 選択できる | HIGH |
| 6 | Feedback Modal: ページ入力 | 入力できる | MEDIUM |
| 7 | Feedback Modal: 送信ボタン | 送信できる | HIGH |
| 8 | Feedback Modal: ローディング状態 | ローディングが表示される | MEDIUM |
| 9 | Feedback Modal: 成功メッセージ | 成功メッセージが表示される | MEDIUM |
| 10 | Feedback Modal: エラーメッセージ | エラーメッセージが表示される | MEDIUM |
| 11 | Feedback Modal: 閉じる | Modalが閉じる | HIGH |
| 12 | Founder専用: Founderのみ表示 | Founderのみ表示される | HIGH |

**合格基準**: 11/12項目がPASS（HIGH優先度は100%必須）

---

## 5. テスト優先度と順序

### 5.1 優先度分類

**🔴 HIGH（必須）**:
- Atlas Chat API
- Memory Kernel
- Persona Engine
- Whisper STT
- Integration Test（全経路）
- Evolution Test
- ChatRoom体験テスト

**🟡 MEDIUM（推奨）**:
- Semantic Search
- Visual Synapse
- MobileOS
- LifeGuardian OS
- Feedback OS
- Dashboard導線テスト
- Evolutionページ体験テスト
- Feedback導線テスト

**🟢 LOW（任意）**:
- パフォーマンステスト（大量データ）
- ストレステスト
- セキュリティテスト

---

### 5.2 最適な実施順序

#### A-1: コア機能テスト（第1週: 月〜水）

**Day 1（月）**:
1. Atlas Chat API（2時間）
2. Memory Kernel（1.5時間）
3. Persona Engine（1時間）

**Day 2（火）**:
4. Whisper STT（1.5時間）
5. Integration Test: Whisper → Persona → Atlas → Streaming（2時間）

**Day 3（水）**:
6. Integration Test: Feedback → Semantic → Self-Review → Genesis（1.5時間）
7. Integration Test: AutoFix → AutoApply → EvolutionLoop（2時間）

---

#### A-2: 統合・進化テスト（第1週: 木〜金）

**Day 4（木）**:
8. Evolution Test: Self-Evolution Loop 連続実行（3時間）

**Day 5（金）**:
9. ChatRoom体験テスト（2時間）
10. コア機能の再テスト（失敗項目のみ）（2時間）

---

#### A-3: 拡張機能テスト（第2週: 月〜水）

**Day 6（月）**:
11. Semantic Search（1時間）
12. Visual Synapse（1時間）
13. MobileOS（1時間）

**Day 7（火）**:
14. LifeGuardian OS（1時間）
15. Feedback OS（30分）
16. Dashboard導線テスト（1時間）

**Day 8（水）**:
17. Evolutionページ体験テスト（1時間）
18. Feedback導線テスト（30分）
19. 統合テストの再テスト（失敗項目のみ）（2時間）

---

#### A-4: 最終確認（第2週: 木〜金）

**Day 9（木）**:
20. 全テストの再実行（失敗項目のみ）（4時間）
21. パフォーマンステスト（1時間）

**Day 10（金）**:
22. 最終確認テスト（全項目のサンプリング）（2時間）
23. リリース判定（1時間）

---

## 6. リリース判定基準

### 6.1 必須条件（すべて満たす必要がある）

1. **HIGH優先度テスト**: 100% PASS
   - Atlas Chat API: 18/20項目PASS
   - Memory Kernel: 16/20項目PASS
   - Persona Engine: 18/20項目PASS
   - Whisper STT: 18/20項目PASS
   - Integration Test（全経路）: 各経路でHIGH優先度100% PASS
   - Evolution Test: 28/32項目PASS（HIGH優先度100%）
   - ChatRoom体験テスト: 27/30項目PASS（HIGH優先度100%）

2. **MEDIUM優先度テスト**: 80%以上PASS
   - Semantic Search: 16/20項目PASS
   - Visual Synapse: 22/27項目PASS
   - MobileOS: 16/20項目PASS
   - LifeGuardian OS: 16/20項目PASS
   - Feedback OS: 19/22項目PASS
   - Dashboard導線テスト: 18/20項目PASS
   - Evolutionページ体験テスト: 23/26項目PASS
   - Feedback導線テスト: 11/12項目PASS

3. **重大なバグ**: 0件
   - データ損失
   - セキュリティ脆弱性
   - システムクラッシュ
   - 認証・認可の不具合

4. **パフォーマンス**: 基準を満たす
   - 音声入力から応答まで: 5秒以内
   - パッチ適用からプッシュまで: 30秒以内
   - 1サイクル実行時間: 30秒以内
   - 10回連続実行時間: 5分以内

5. **エラーハンドリング**: 適切に動作
   - すべてのエラーが適切に処理される
   - エラーメッセージが表示される
   - システムがクラッシュしない

---

### 6.2 推奨条件（満たすことが望ましい）

1. **LOW優先度テスト**: 70%以上PASS
2. **UI/UX**: 直感的で使いやすい
3. **ドキュメント**: 主要機能のドキュメントが整備されている
4. **ログ**: 適切に記録されている

---

### 6.3 リリース判定フロー

1. **テスト実行**: 全テストを実行
2. **結果集計**: 各テストの結果を集計
3. **必須条件チェック**: 必須条件をすべて満たしているか確認
4. **推奨条件チェック**: 推奨条件を確認
5. **リリース判定**: 必須条件をすべて満たしていれば「リリース可能」

---

### 6.4 リリース判定結果

**✅ リリース可能**:
- 必須条件をすべて満たしている
- 重大なバグが0件
- パフォーマンス基準を満たしている

**⚠️ 条件付きリリース可能**:
- 必須条件をすべて満たしている
- 重大なバグが0件
- 一部の推奨条件を満たしていない（リリース後に対応）

**❌ リリース不可**:
- 必須条件を満たしていない
- 重大なバグが1件以上
- パフォーマンス基準を満たしていない

---

## 7. テスト実行ログテンプレート

### 7.1 テスト実行ログ

```
【テスト実行ログ】
日時: YYYY-MM-DD HH:MM:SS
テスト項目: [テスト項目名]
優先度: [HIGH/MEDIUM/LOW]
実行者: [名前]
結果: [PASS/FAIL/SKIP]
所要時間: [時間]
エラー詳細: [エラーがあれば記録]
```

---

### 7.2 テスト結果サマリー

```
【テスト結果サマリー】
テスト項目数: [総数]
PASS: [数]
FAIL: [数]
SKIP: [数]
合格率: [%]
必須条件: [満たしている/満たしていない]
リリース判定: [リリース可能/条件付きリリース可能/リリース不可]
```

---

## 8. 注意事項

1. **テスト環境**: 本番環境と同等の環境でテストを実行すること
2. **データバックアップ**: テスト前にデータバックアップを取得すること
3. **ロールバック計画**: テスト失敗時のロールバック計画を準備すること
4. **セキュリティ**: テスト中もセキュリティを維持すること
5. **パフォーマンス**: パフォーマンステストは本番環境と同等の負荷で実行すること

---

**チェックリスト作成日時**: 2025年1月  
**バージョン**: PHASE FINAL A  
**作成者**: Auto (Cursor AI Assistant)  
**承認者**: 天聞様

