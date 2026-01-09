# TENMON-ARK 統合実装の検証・品質保証

## 概要

このディレクトリには、統合実装の検証と品質保証のためのテストスクリプトが含まれています。

## テストスクリプト

### 1. `smoke-test.sh` - スモークテスト（30分で可否判定）

**目的**: 基本的な動作確認と品質チェック

**実行方法**:
```bash
cd /opt/tenmon-ark/api
BASE_URL=https://tenmon-ark.com ./scripts/smoke-test.sh
```

**テスト項目**:
- API生存確認（`/api/corpus/docs`, `/api/settings`）
- NATURALモード（P6が混ざったら失格）
- GROUNDEDモード（#詳細でのみ内部根拠）
- LIVEモード（必ず取得時刻＋出典URL）
- 高リスクゲート（必ず止まる）

**合格条件**:
- NATURAL: 返答に「核心語」「水穂伝」「pdfPage=6」など資料導線が出ない
- GROUNDED: #詳細なしでdetail/decisionFrame/truthCheckが出ない、#詳細ありでLawCandidates/引用/画像URL/truthCheckが出る
- LIVE: 取得時刻（JST）と出典URL（最低1、推奨2）が含まれる
- 高リスク: risk=highで処理停止、安全案内に切り替わる

### 2. `failure-test.sh` - 失敗系テスト（暴走・誤答の芽を摘む）

**目的**: エッジケースと失敗時の動作確認

**実行方法**:
```bash
cd /opt/tenmon-ark/api
BASE_URL=https://tenmon-ark.com ./scripts/failure-test.sh
```

**テスト項目**:
- Bing APIが落ちた時（LIVEの劣化動作）
- ソース不一致（検証の効き）
- 高リスクゲート（必ず止まる）

**合格条件**:
- Bing API失敗時: 断定しない＋「取得できない理由」＋「代替手段」
- ソース不一致: 「不一致/確認中」と明示して断定しない
- 高リスク: risk=highで処理停止、安全案内に切り替わる

## 環境変数

テスト実行前に以下の環境変数を設定してください：

```bash
export BASE_URL=https://tenmon-ark.com  # または http://localhost:3000
export BING_SEARCH_API_KEY=your_key     # LIVEモードテスト用（オプション）
```

## 注意事項

1. **Bing APIキー**: LIVEモードのテストには `BING_SEARCH_API_KEY` が必要です。無効化してテストする場合は、環境変数を一時的に削除してください。

2. **レート制限**: 連続実行時はAPIのレート制限に注意してください。

3. **本番環境**: 本番環境でテストする場合は、既存のデータに影響を与えないよう注意してください。

## トラブルシューティング

### NATURALモードでP6が混ざる

- `systemNatural()` のプロンプトを確認
- `buildTruthSkeleton()` の `docMode` 判定を確認

### LIVEモードで取得時刻/出典URLが含まれない

- `fetchLiveEvidence()` の返り値を確認
- `livePrompt` の内容を確認

### 高リスクゲートが効かない

- `assessRisk()` のパターンマッチを確認
- `skeleton.risk === "high"` の判定を確認

## 継続的改善

テスト結果に基づいて、以下を継続的に改善してください：

1. **プロンプト改善**: LLMの出力品質向上
2. **エラーハンドリング**: 失敗時のユーザー体験向上
3. **検証ロジック**: ソース不一致時の処理精度向上
4. **リスク判定**: 危険な質問の検出精度向上

