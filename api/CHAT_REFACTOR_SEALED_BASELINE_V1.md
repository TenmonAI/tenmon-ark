# CHAT_REFACTOR_SEALED_BASELINE_V1

- **chat refactor sealed baseline:** HEAD = **5ace077**
- **封印列:** dc74b17 → be3f7ff → 4615619 → 09824dc → 7be4039 → 259b979 → 6a29b55 → b4fe15a → d9bf4d9 → d7e0a52 → 9eebfb1 → dde73bc → 5ace077
- **no-touch 維持:** `api/src/db/kokuzo_schema.sql` および未追跡観測物は封印列に含めない。
- **general 実装バッチ封印:** P53/P54/P55 で selectGroundingModeV1・getGeneralKind を general.ts へ、grounding unresolved/grounded_required exit を majorRoutes へ移管済み。現在地は 5ace077。

以後の作業はこの封印点（5ace077）から分岐して進める。
