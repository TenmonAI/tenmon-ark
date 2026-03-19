# CHAT_REFACTOR_SEALED_BASELINE_V1

- **chat refactor sealed baseline:** HEAD = **299da6c**
- **封印列:** dc74b17 → be3f7ff → 4615619 → 09824dc → 7be4039 → 259b979 → 6a29b55 → b4fe15a → d9bf4d9 → d7e0a52 → 9eebfb1 → dde73bc → 5ace077 → cb47aac → 89cbdb1 → 299da6c
- **no-touch 維持:** `api/src/db/kokuzo_schema.sql` および未追跡観測物は封印列に含めない。
- **define 実装バッチ封印:** P58/P59/P60 で define fastpath 判定・verified/proposed payload builder を define.ts へ移管済み。現在地は 299da6c。

以後の作業はこの封印点（299da6c）から分岐して進める。
