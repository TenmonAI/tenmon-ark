# CHAT_REFACTOR_SEALED_BASELINE_V1

- **chat refactor 文書上のコミット handoff 点:** **bf978c3**（P67 までを含む **git 上の最新コミット**）
- **封印列（bdb99e9 以降追記）:** … → 622dafb → **bdb99e9 (P65)** → a3165cf → 2be7fc6 → f354e18 → 6938adb → 3d943f0 → **bf978c3 (P67)**
- **P68 / P69:** `api/src/routes/chat.ts` の **未コミット差分**として到達済み（検証 PASS）。**SHA は P71 final seal コミットで確定**する。
- **no-touch 維持:** `api/src/db/kokuzo_schema.sql` および未追跡観測物は封印列に含めない。

## カード対応（P65〜P69）

| カード | 状態 |
|--------|------|
| P65 residual final sweep | コミット **bdb99e9** |
| P67 route preempt / system diagnosis balance | コミット **bf978c3** |
| P68 explicit content center lock | 作業ツリー（P71 seal 予定） |
| P69 worldview internal mapping | 作業ツリー（P71 seal 予定） |

以後の **コミット済み**作業の分岐点は **bf978c3**。P68/P69 を含む **実効 runtime** は P71 完了後の SHA を参照すること。
