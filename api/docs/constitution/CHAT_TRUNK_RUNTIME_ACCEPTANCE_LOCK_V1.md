# CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1

## 目的

主線 trunk 分割後の **runtime acceptance** を固定する（build / supervisor / replay audit / execution gate / trunk map / exit contract の収束）。

## PASS 条件（運用）

- `cd api && npm run build` が PASS
- `python3 api/automation/supervisor_v1.py --repo-root . --validate-only` が ok
- 対象カードで `replay_audit_v1.py --emit-report --check-json` を実行し、`acceptance.ok` を確認
- `chatts_trunk_domain_map_v1` / `chatts_exit_contract_lock_v1` で **許容 drift**

## 既知

- カタログに本カードが無い場合、`replay_audit` の `scopedCard.catalogFound` が `false` になり得る。主線完了判定は **ビルド + supervisor + 手動スコープ確認** を併用すること。

## 参照

- `CHAT_TRUNK_MAINLINE_CAMPAIGN_V1.md`
