# TENMON-ARK Mobile QA Checklist v1.0

## Golden Flow

- [ ] 起動 → Sign-in → Founder Gate 判定（想定どおりの画面遷移になる）
- [ ] Drawer から `Chats` を開き、新規チャットを作成できる
- [ ] 新規スレッドでメッセージを送信できる
- [ ] 送信後、Loading → Typing → Evidence/Candidates カードが表示される
- [ ] Evidence モーダルから「Dive in」を押すと Composer に Doc指定プロンプトが挿入される
- [ ] Dive in 後のメッセージ送信が正常に動作する
- [ ] エラー発生時に Retry 導線で再送できる

## Scroll / List 挙動

- [ ] メッセージ送信時に、ユーザーが一番下にいるときのみ自動スクロールする
- [ ] スクロール中に自動で最下部へ「勝手に飛ぶ」挙動が無い
- [ ] 過去ログを見ている状態で新しいメッセージが届くと、`New messages` バナーが表示される
- [ ] `New messages` バナーをタップすると、自然なアニメーションで最下部へ移動する
- [ ] 画面右下の `Jump to latest` ボタンが、最下部にいないときのみ表示される

## Typing / Stop

- [ ] 短い応答でも、Typing 擬似ストリーミングが自然な速度で表示される
- [ ] 長文応答でも、待ち時間が過度に長くならない（全体で実用的な時間内に収束する）
- [ ] Typing 中に `Stop` をタップすると、直ちに全文が表示される
- [ ] Typing 中は、ユーザーが最下部にいる場合のみ自動フォローされる

## Evidence / Candidates カード

- [ ] Evidence カードが折りたたみ表示され、件数がヘッダーに表示される
- [ ] Candidates カードが折りたたみ表示され、件数がヘッダーに表示される
- [ ] 各 item に doc/pdfPage 情報と snippet/quote が表示される（3行クランプ）
- [ ] Evidence/Candidates item のタップでモーダルが開き、全文が閲覧できる
- [ ] モーダルの Copy ボタンでテキストがクリップボードにコピーされる
- [ ] Evidence モーダルの `Dive in` ボタンで、Composer に Doc指定プロンプトが挿入される
- [ ] Candidates の tags が Kotodama バッジとして表示される（存在する場合）

## Export / Delete / Prefs

- [ ] Settings 画面で `Export JSONL` を実行すると、JSONL形式のファイルが生成される
- [ ] Export 後に Share ダイアログが開き、ファイル共有が可能である
- [ ] Export 失敗時に Toast（"Export failed" 等）が表示される
- [ ] `Delete local data` を押すと確認ダイアログが表示される（Cancel/ Delete）
- [ ] Delete 実行後、threads/messages/artifacts が全て削除される
- [ ] Delete 失敗時に Toast が表示される
- [ ] Typing speed の Normal/Fast を切り替えたあと、アプリ再起動後も設定が保持されている

## Offline / Error Handling

- [ ] ネットワーク断（または API を停止）時にメッセージ送信すると、適切なエラー Toast が表示される
- [ ] エラー発生後、直近の user message に Retry 導線が表示される
- [ ] Retry 実行で同じテキストが再送され、復旧後は正常に送信できる

## Dark / Light Theme

- [ ] ダークテーマで主要画面（Chats / Chat / Dashboard / Settings）が読めるコントラストになっている
- [ ] ライトテーマ切り替え時（もし実装済みなら）も文字と背景のコントラストが十分である

## アクセシビリティ

- [ ] Send / Stop / Copy / Dive in / Retry / Jump to latest / New messages / Export / Delete などの主要ボタンに適切な `accessibilityLabel` が設定されている
- [ ] TalkBack / VoiceOver で、主要ボタンが意味のあるラベルで読み上げられる
- [ ] タップ領域が小さすぎるボタンが無い（hitSlop >= tokens.interaction.hitSlop）
- [ ] 長押し Copy など、キーボード操作・スクリーンリーダー利用時にも実行可能な経路が存在する

## パフォーマンス

- [ ] 長い会話履歴（数百メッセージ）でもスクロールがカクつかない
- [ ] Typing 擬似ストリーミング中も UI が固まらない
- [ ] Export/Import 実行時もアプリ全体がフリーズしない

## 出荷前の手順（Release Checklist）

- [ ] `npm install` / `pnpm install` / `yarn install` を実行し、依存関係が解決している
- [ ] 開発環境で `npx expo start` を実行し、`EXPO_PUBLIC_API_BASE_URL` を Dev API (`http://127.0.0.1:3000`) に向けて動作確認済み
- [ ] 実機（LAN経由）で `EXPO_PUBLIC_API_BASE_URL` を LAN IP に設定し、同じ Golden Flow が通ることを確認
- [ ] `eas build --platform ios --profile preview` / `eas build --platform android --profile preview` でプレビュー用ビルドを作成
- [ ] TestFlight / Internal testing トラックにアップロードし、少なくとも 1 回以上の実機テストフィードバックを回収
- [ ] 本番ビルド（`eas build --platform ios --profile production` 等）を作成し、最後に Golden Flow と主要チェックボックスを再確認してからリリースする

