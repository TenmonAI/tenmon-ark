# CARD: <card_id> <short_title>

## OBSERVE（read-only / 変更禁止）
- 現象（1行）:
- 再現手順（固定プローブ）:
- 同定（/api/audit local+public）:
- systemd/ss（:3000）:
- logs（journal_focus / nginx_access）:
- 追加観測（必要なら）:

## DIAGNOSE（事実→推論→結論）
- 事実（ログ/レスポンス断片）:
- 推論（その事実が意味すること）:
- 結論（原因の層と箇所を断定）:
- 影響範囲（破壊リスク/契約影響）:

## PATCH（最小diff / 1責務）
- 変更方針（1文）:
- 変更ファイル:
- unified diff（ここに貼る）:
- ロールバック手順:

## VERIFY（同条件プローブ＋acceptance）
- 固定プローブ再実行:
- /api/audit 同定（gitSha一致）:
- acceptance_test.sh:
- PASS/FAIL判定（根拠）:

## SEAL（封印）
- レポート保存先:
- commit message:
- 追加/更新したゲート（ある場合）:
- 未追跡ゼロ確認:
