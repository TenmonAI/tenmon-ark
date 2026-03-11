CARD: R8_KANAGI_SELF_KERNEL_V1

目的:
- 天聞の意志層と intent kernel を self kernel として統合する最小実装を作る
- まだ大規模 bind はしない
- まず api/src/core/kanagiSelfKernel.ts を追加し、build が通る状態にする

対象:
- /opt/tenmon-ark-repo/api/src/core/kanagiSelfKernel.ts

利用してよい既存:
- api/src/core/intentionConstitution.ts
- api/src/core/intentKernel.ts

最低要件:
1. 型定義
   - KanagiPhase = "CENTER" | "L-IN" | "R-IN" | "L-OUT" | "R-OUT"
   - SelfKernelInput
   - SelfKernelOutput
2. 関数
   - runKanagiSelfKernel(input)
3. 挙動
   - intention constitution を読めるなら読む
   - intent kernel を読めるなら読む
   - routeReason から route_phase_hints を参照
   - default_phase は CENTER
   - unresolved は CENTER または L-IN に寄せる
   - selection_principles / response_intent_hints の先頭要素を summary に反映
4. 出力
   - selfPhase
   - intentPhase
   - judgementAxis
   - stabilityScore
   - driftRisk
   - shouldPersist
   - shouldRecombine
   - summary

厳守:
- chat.ts を触らない
- api/src/routes/chat_parts/gates_impl.ts を触らない
- responseComposer.ts を触らない
- DB を触らない
- build error を出さない
- 1変更=1検証
- まだ wire-only でよい

完了条件:
- api/src/core/kanagiSelfKernel.ts が生成される
- npm -s run build 成功
