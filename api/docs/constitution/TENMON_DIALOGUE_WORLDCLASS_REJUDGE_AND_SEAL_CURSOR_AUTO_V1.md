# TENMON_DIALOGUE_WORLDCLASS_REJUDGE_AND_SEAL_CURSOR_AUTO_V1

## 目的
ここまでの K1 / scripture / SUBCONCEPT / GENERAL / PWA continuity を再判定し、
会話品質主戦場の現在地を single-source に確定する。

## 実装（観測のみ）
### probes 再実行（最低限）
- K1
- GENERAL
- SUBCONCEPT
- continuity（thread / refresh / new chat）
- PWA lived proof
- technical route（必要なら）

### scorecard 再計算
- `worldclass_score`
- `must_fix_before_claim`
- `primary_gap`
- `next_best_card`
- 会話品質 blocker の再集約

### seal 条件
- seal は evidence ベースのみ（success 捏造禁止）
- stale/fixture 成功を completion 根拠にしない

## 非交渉条件
- product コード変更禁止（観測・再計算のみ）
- dist 直編集禁止
- score の捏造禁止
- meta leak/trace を出さない（必要な出力は summary のみ）

## 出力（単一ソース）
- 新しい single-source summary に以下を残す
  - current blockers
  - next best card
  - safe next cards
  - manual gate cards
  - dialogue quality band
  - worldclass score snapshot

*Version: 1*

