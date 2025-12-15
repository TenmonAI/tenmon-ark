# 🔱 TENMON-ARK MegaScheduler v∞ - PHASE 5 実行計画

**生成日時**: 2024年12月  
**目的**: PHASE 5（WorldLaunch OS）を安全に小分割し、Cursorがフリーズせず最速で構築できるようにする

---

## 📋 MegaScheduler 原則

1. **全タスクは「Atomic（原子的）タスク」へ自動分割**
2. **一度に作業するファイル数は最大 3 個**
3. **Review → Apply の流れのみ許可**
4. **次のタスクへ進む前に "成果物の存在チェック" を必須化**
5. **メモリ負荷が上がった場合は Scheduler が自動停止（保護）**
6. **破綻しやすい DeviceCluster / ネイティブ / 大量 API 修正 は逐次化**

---

## 🗺️ PHASE 5 全体構成

### フェーズ 1: WorldLaunch OS（世界展開フェーズ）
- **WL_I18N_CORE**: i18n Core（EN/JP/KR/ZH/FR）基盤作成
- **WL_I18N_ROUTER**: LanguageRouter API追加 + UserProfile連動
- **WL_I18N_PERSONA**: Personaの多言語化（名称/トーン/文体）
- **WL_COUNTRY_PLANS**: Country-based Pricing（税率・決済通貨）
- **WL_COUNTRY_GATEWAY**: Stripe多通貨ゲートウェイ統合
- **WL_REGION_ROUTING**: Region-based API Routing（US/JP/EU/SG）
- **WL_GEO_FAILOVER**: Geo Failover Logic（エッジ選択）

### フェーズ 2: Founder Onboarding OS
- **ONB_BOOT_WIZARD**: Boot Setup Wizard（初回起動ガイド強化）
- **ONB_FIRST_MESSAGE**: Founder初回メッセージ生成（Persona別）
- **ONB_DEVICE_LINK**: 初回の DeviceCluster 自動リンクガイド
- **ONB_TENMON_TUTOR**: TENMON Tutor（学習ガイドAI）構築

### フェーズ 3: DeviceCluster v3.5（Native Hybrid）
- **DC35_DISCOVERY_MDNS**: mDNS / LAN Discovery 実装
- **DC35_DISCOVERY_BLUETOOTH**: Bluetooth LE Discovery（macOS/iOS）
- **DC35_SECURELINK_DTLS**: DTLS Handshake（本物の安全層）
- **DC35_CURSOR_HOST**: CursorBridge Host（robotjs連携）
- **DC35_CURSOR_CLIENT**: CursorBridge Client（WebRTC DataChannel）
- **DC35_TELEPORT_QUIC**: ArkQuic（QUIC over UDP）実装
- **DC35_DISPLAY_EDGE**: Edge Transition（モニタ境界を跨ぐカーソル移動）

---

## 📝 詳細タスク計画

### PHASE 5.1: WorldLaunch OS

#### TASK: WL_I18N_CORE
**ID**: `WL_I18N_CORE`  
**説明**: i18n Core（EN/JP/KR/ZH/FR）基盤作成  
**ファイル制限**: 2個  
**優先度**: HIGH

**実装手順**:
1. `server/i18n/core.ts` を作成
   - `getSupportedLanguages()`: サポート言語リスト取得
   - `detectUserLanguage(req)`: リクエストから言語検出
   - `getTranslation(key, lang, namespace)`: 翻訳取得
   - `formatDate(date, lang)`: 日付フォーマット
   - `formatCurrency(amount, currency, lang)`: 通貨フォーマット

2. `client/src/i18n/core.ts` を作成
   - `useI18n()`: React Hook for i18n
   - `translate(key, params)`: 翻訳関数
   - `formatDate(date)`: 日付フォーマット
   - `formatCurrency(amount, currency)`: 通貨フォーマット

**成果物チェック**:
- [ ] `server/i18n/core.ts` が存在する
- [ ] `client/src/i18n/core.ts` が存在する
- [ ] TypeScriptエラーがない

---

#### TASK: WL_I18N_ROUTER
**ID**: `WL_I18N_ROUTER`  
**説明**: LanguageRouter API追加 + UserProfile連動  
**ファイル制限**: 2個  
**優先度**: HIGH

**実装手順**:
1. `server/routers/i18nRouter.ts` を作成
   - `setLanguage`: ユーザーの言語設定を保存
   - `getLanguage`: ユーザーの言語設定を取得
   - `getTranslations`: 翻訳データを取得

2. `drizzle/schema.ts` を更新
   - `userProfiles` テーブルに `preferredLanguage` カラムを追加（既存の場合は確認のみ）

**成果物チェック**:
- [ ] `server/routers/i18nRouter.ts` が存在する
- [ ] `drizzle/schema.ts` に `preferredLanguage` カラムがある
- [ ] `server/routers.ts` に `i18nRouter` が登録されている

---

#### TASK: WL_I18N_PERSONA
**ID**: `WL_I18N_PERSONA`  
**説明**: Personaの多言語化（名称/トーン/文体）  
**ファイル制限**: 3個  
**優先度**: MEDIUM

**実装手順**:
1. `server/persona/i18n.ts` を作成
   - `getPersonaName(persona, lang)`: Persona名称の多言語化
   - `getPersonaTone(persona, lang)`: Personaトーンの多言語化
   - `getPersonaStyle(persona, lang)`: Persona文体の多言語化

2. `client/src/lib/persona/i18n.ts` を作成
   - `usePersonaI18n()`: Persona多言語化Hook
   - `getPersonaDisplayName(persona, lang)`: 表示名取得

3. `server/persona/personaEngine.ts` を更新
   - Persona生成時に言語を考慮

**成果物チェック**:
- [ ] `server/persona/i18n.ts` が存在する
- [ ] `client/src/lib/persona/i18n.ts` が存在する
- [ ] `server/persona/personaEngine.ts` が更新されている

---

#### TASK: WL_COUNTRY_PLANS
**ID**: `WL_COUNTRY_PLANS`  
**説明**: Country-based Pricing（税率・決済通貨）  
**ファイル制限**: 3個  
**優先度**: HIGH

**実装手順**:
1. `server/pricing/countryPlans.ts` を作成
   - `getCountryCode(ip)`: IPアドレスから国コード取得
   - `getTaxRate(countryCode)`: 税率取得
   - `getCurrency(countryCode)`: 通貨取得
   - `getLocalizedPrice(planId, countryCode)`: ローカライズされた価格取得

2. `shared/products.ts` を更新
   - 国別価格設定を追加

3. `server/routers/planManagementRouter.ts` を更新
   - 国別価格を考慮したプラン取得

**成果物チェック**:
- [ ] `server/pricing/countryPlans.ts` が存在する
- [ ] `shared/products.ts` が更新されている
- [ ] `server/routers/planManagementRouter.ts` が更新されている

---

#### TASK: WL_COUNTRY_GATEWAY
**ID**: `WL_COUNTRY_GATEWAY`  
**説明**: Stripe多通貨ゲートウェイ統合  
**ファイル制限**: 1個  
**優先度**: HIGH

**実装手順**:
1. `server/stripe.ts` を更新
   - `createCheckoutSession` に `currency` パラメータを追加
   - 多通貨対応のStripe Checkout Session作成

**成果物チェック**:
- [ ] `server/stripe.ts` が更新されている
- [ ] 多通貨対応のStripe Checkout Sessionが作成できる

---

#### TASK: WL_REGION_ROUTING
**ID**: `WL_REGION_ROUTING`  
**説明**: Region-based API Routing（US/JP/EU/SG）  
**ファイル制限**: 2個  
**優先度**: MEDIUM

**実装手順**:
1. `server/routing/regionRouter.ts` を作成
   - `detectRegion(ip)`: IPアドレスからリージョン検出
   - `getRegionEndpoint(region)`: リージョン別エンドポイント取得
   - `routeRequest(req, region)`: リージョン別ルーティング

2. `server/_core/index.ts` を更新
   - リージョンルーティングミドルウェアを追加

**成果物チェック**:
- [ ] `server/routing/regionRouter.ts` が存在する
- [ ] `server/_core/index.ts` が更新されている

---

#### TASK: WL_GEO_FAILOVER
**ID**: `WL_GEO_FAILOVER`  
**説明**: Geo Failover Logic（エッジ選択）  
**ファイル制限**: 1個  
**優先度**: LOW

**実装手順**:
1. `server/routing/geoFailover.ts` を作成
   - `selectBestEdge(region, latency)`: 最適なエッジサーバー選択
   - `checkEdgeHealth(edgeId)`: エッジサーバーのヘルスチェック
   - `failover(region)`: フェイルオーバー処理

**成果物チェック**:
- [ ] `server/routing/geoFailover.ts` が存在する

---

### PHASE 5.2: Founder Onboarding OS

#### TASK: ONB_BOOT_WIZARD
**ID**: `ONB_BOOT_WIZARD`  
**説明**: Boot Setup Wizard（初回起動ガイド強化）  
**ファイル制限**: 2個  
**優先度**: HIGH

**実装手順**:
1. `client/src/onboarding/bootSetupWizard.tsx` を更新
   - 多言語対応の強化
   - ステップ追加（言語選択、デバイスリンク、初期設定）

2. `server/api/onboarding.ts` を作成
   - `completeOnboardingStep`: オンボーディングステップ完了
   - `getOnboardingProgress`: オンボーディング進捗取得

**成果物チェック**:
- [ ] `client/src/onboarding/bootSetupWizard.tsx` が更新されている
- [ ] `server/api/onboarding.ts` が存在する

---

#### TASK: ONB_FIRST_MESSAGE
**ID**: `ONB_FIRST_MESSAGE`  
**説明**: Founder初回メッセージ生成（Persona別）  
**ファイル制限**: 1個  
**優先度**: MEDIUM

**実装手順**:
1. `server/onboarding/firstMessage.ts` を作成
   - `generateFirstMessage(userId, persona, lang)`: 初回メッセージ生成
   - Persona別の初回メッセージテンプレート

**成果物チェック**:
- [ ] `server/onboarding/firstMessage.ts` が存在する

---

#### TASK: ONB_DEVICE_LINK
**ID**: `ONB_DEVICE_LINK`  
**説明**: 初回の DeviceCluster 自動リンクガイド  
**ファイル制限**: 2個  
**優先度**: MEDIUM

**実装手順**:
1. `client/src/onboarding/deviceLinkGuide.tsx` を作成
   - DeviceCluster初回リンクガイドUI

2. `server/api/deviceCluster/onboarding.ts` を作成
   - `startDeviceLinkOnboarding`: デバイスリンクオンボーディング開始
   - `completeDeviceLink`: デバイスリンク完了

**成果物チェック**:
- [ ] `client/src/onboarding/deviceLinkGuide.tsx` が存在する
- [ ] `server/api/deviceCluster/onboarding.ts` が存在する

---

#### TASK: ONB_TENMON_TUTOR
**ID**: `ONB_TENMON_TUTOR`  
**説明**: TENMON Tutor（学習ガイドAI）構築  
**ファイル制限**: 3個  
**優先度**: LOW

**実装手順**:
1. `server/tutor/tutorEngine.ts` を作成
   - `generateTutorialStep(userId, step)`: チュートリアルステップ生成
   - `checkTutorialProgress(userId)`: チュートリアル進捗チェック

2. `client/src/pages/tutor/TenmonTutor.tsx` を作成
   - TENMON Tutor UI

3. `server/routers/tutorRouter.ts` を作成
   - Tutor APIルーター

**成果物チェック**:
- [ ] `server/tutor/tutorEngine.ts` が存在する
- [ ] `client/src/pages/tutor/TenmonTutor.tsx` が存在する
- [ ] `server/routers/tutorRouter.ts` が存在する

---

### PHASE 5.3: DeviceCluster v3.5（Native Hybrid）

#### TASK: DC35_DISCOVERY_MDNS
**ID**: `DC35_DISCOVERY_MDNS`  
**説明**: mDNS / LAN Discovery 実装  
**ファイル制限**: 2個  
**優先度**: HIGH

**実装手順**:
1. `server/deviceCluster-v3/discovery/mdnsScanner.ts` を作成
   - `startMDNSDiscovery()`: mDNS Discovery開始
   - `stopMDNSDiscovery()`: mDNS Discovery停止
   - `onDeviceFound(callback)`: デバイス発見コールバック

2. `client/src/deviceCluster-v3/discovery/mdnsClient.ts` を作成
   - `discoverDevices()`: デバイス発見
   - `connectToDevice(deviceId)`: デバイス接続

**成果物チェック**:
- [ ] `server/deviceCluster-v3/discovery/mdnsScanner.ts` が存在する
- [ ] `client/src/deviceCluster-v3/discovery/mdnsClient.ts` が存在する

---

#### TASK: DC35_DISCOVERY_BLUETOOTH
**ID**: `DC35_DISCOVERY_BLUETOOTH`  
**説明**: Bluetooth LE Discovery（macOS/iOS）  
**ファイル制限**: 3個  
**優先度**: MEDIUM

**実装手順**:
1. `native/macos/bluetoothDiscovery.swift` を作成
   - Bluetooth LE Discovery実装（stub）

2. `native/ios/bluetoothDiscovery.swift` を作成
   - Bluetooth LE Discovery実装（stub）

3. `client/src/deviceCluster-v3/discovery/bluetoothClient.ts` を作成
   - Bluetooth Discoveryクライアント

**成果物チェック**:
- [ ] `native/macos/bluetoothDiscovery.swift` が存在する
- [ ] `native/ios/bluetoothDiscovery.swift` が存在する
- [ ] `client/src/deviceCluster-v3/discovery/bluetoothClient.ts` が存在する

---

#### TASK: DC35_SECURELINK_DTLS
**ID**: `DC35_SECURELINK_DTLS`  
**説明**: DTLS Handshake（本物の安全層）  
**ファイル制限**: 1個  
**優先度**: HIGH

**実装手順**:
1. `client/src/deviceCluster-v3/native/secureLink.ts` を更新
   - `establishDTLSHandshake()`: DTLS Handshake実装（stub → 実装）
   - `performECDHKeyExchange()`: ECDH鍵交換実装（stub → 実装）

**成果物チェック**:
- [ ] `client/src/deviceCluster-v3/native/secureLink.ts` が更新されている

---

#### TASK: DC35_CURSOR_HOST
**ID**: `DC35_CURSOR_HOST`  
**説明**: CursorBridge Host（robotjs連携）  
**ファイル制限**: 2個  
**優先度**: MEDIUM

**実装手順**:
1. `server/deviceCluster-v3/cursor/cursorHost.ts` を更新
   - `moveCursor(x, y)`: カーソル移動（robotjs実装）
   - `click(x, y)`: クリック（robotjs実装）
   - `typeText(text)`: テキスト入力（robotjs実装）

2. `server/deviceCluster-v3/cursor/cursorRouter.ts` を更新
   - Cursor操作API実装

**成果物チェック**:
- [ ] `server/deviceCluster-v3/cursor/cursorHost.ts` が更新されている
- [ ] `server/deviceCluster-v3/cursor/cursorRouter.ts` が更新されている

---

#### TASK: DC35_CURSOR_CLIENT
**ID**: `DC35_CURSOR_CLIENT`  
**説明**: CursorBridge Client（WebRTC DataChannel）  
**ファイル制限**: 2個  
**優先度**: MEDIUM

**実装手順**:
1. `client/src/deviceCluster-v3/cursor/cursorClient.ts` を更新
   - `connectToHost(deviceId)`: ホスト接続（WebRTC実装）
   - `sendCursorCommand(command)`: カーソルコマンド送信

2. `client/src/deviceCluster-v3/cursor/cursorBridge.ts` を作成
   - CursorBridge統合コンポーネント

**成果物チェック**:
- [ ] `client/src/deviceCluster-v3/cursor/cursorClient.ts` が更新されている
- [ ] `client/src/deviceCluster-v3/cursor/cursorBridge.ts` が存在する

---

#### TASK: DC35_TELEPORT_QUIC
**ID**: `DC35_TELEPORT_QUIC`  
**説明**: ArkQuic（QUIC over UDP）実装  
**ファイル制限**: 1個  
**優先度**: LOW

**実装手順**:
1. `server/deviceCluster-v3/fastlane/arkQuicServer.ts` を更新
   - QUIC over UDP実装（stub → 実装）

**成果物チェック**:
- [ ] `server/deviceCluster-v3/fastlane/arkQuicServer.ts` が更新されている

---

#### TASK: DC35_DISPLAY_EDGE
**ID**: `DC35_DISPLAY_EDGE`  
**説明**: Edge Transition（モニタ境界を跨ぐカーソル移動）  
**ファイル制限**: 2個  
**優先度**: LOW

**実装手順**:
1. `server/deviceCluster-v3/display/edgeTransition.ts` を更新
   - `detectEdgeTransition(x, y)`: エッジ遷移検出
   - `transferToDevice(deviceId, x, y)`: デバイス間転送

2. `client/src/deviceCluster-v3/display/edgeTransitionClient.ts` を作成
   - エッジ遷移クライアント

**成果物チェック**:
- [ ] `server/deviceCluster-v3/display/edgeTransition.ts` が更新されている
- [ ] `client/src/deviceCluster-v3/display/edgeTransitionClient.ts` が存在する

---

## 🚀 実行順序

### Phase 5.1: WorldLaunch OS（優先度順）
1. WL_I18N_CORE
2. WL_I18N_ROUTER
3. WL_COUNTRY_PLANS
4. WL_COUNTRY_GATEWAY
5. WL_I18N_PERSONA
6. WL_REGION_ROUTING
7. WL_GEO_FAILOVER

### Phase 5.2: Founder Onboarding OS（優先度順）
1. ONB_BOOT_WIZARD
2. ONB_FIRST_MESSAGE
3. ONB_DEVICE_LINK
4. ONB_TENMON_TUTOR

### Phase 5.3: DeviceCluster v3.5（優先度順）
1. DC35_DISCOVERY_MDNS
2. DC35_SECURELINK_DTLS
3. DC35_CURSOR_HOST
4. DC35_CURSOR_CLIENT
5. DC35_DISCOVERY_BLUETOOTH
6. DC35_TELEPORT_QUIC
7. DC35_DISPLAY_EDGE

---

## 📊 進捗トラッキング

各タスク完了時に以下をチェック：
- [ ] ファイルが存在する
- [ ] TypeScriptエラーがない
- [ ] インポートパスが正しい
- [ ] 既存機能に影響がない

---

## 🔄 Scheduler 実行コマンド

### 次のタスクを開始
```
MEGA_SCHEDULER.NEXT()
```

### タスク完了
```
MEGA_SCHEDULER.COMPLETE(taskId)
```

### 最終レポート生成
```
MEGA_SCHEDULER.REPORT()
```

---

**次のステップ**: `MEGA_SCHEDULER.NEXT()` を実行して最初のタスク（WL_I18N_CORE）を開始してください。

