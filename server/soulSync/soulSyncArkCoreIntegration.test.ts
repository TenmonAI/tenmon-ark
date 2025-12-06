import { describe, expect, it, beforeEach } from "vitest";
import * as soulSyncArkCore from "./soulSyncArkCoreIntegration";

describe("Soul Sync Ark Core Integration", () => {
  const testUserId = 999;

  beforeEach(async () => {
    // テスト前にクリーンアップ
    soulSyncArkCore.stopSoulSyncResident(testUserId);
  });

  describe("Soul Sync常駐化", () => {
    it("should start Soul Sync resident", async () => {
      const status = await soulSyncArkCore.startSoulSyncResident(testUserId);

      expect(status).toBeDefined();
      expect(status.userId).toBe(testUserId);
      expect(status.understandingDepth).toBe(0);
      expect(status.analyzedInteractions).toBe(0);
      expect(status.startedAt).toBeInstanceOf(Date);
    });

    it("should return existing status if already resident", async () => {
      const status1 = await soulSyncArkCore.startSoulSyncResident(testUserId);
      const status2 = await soulSyncArkCore.startSoulSyncResident(testUserId);

      expect(status1.startedAt).toEqual(status2.startedAt);
    });

    it("should get Soul Sync resident status", async () => {
      await soulSyncArkCore.startSoulSyncResident(testUserId);
      const status = soulSyncArkCore.getSoulSyncResidentStatus(testUserId);

      expect(status).toBeDefined();
      expect(status!.userId).toBe(testUserId);
    });

    it("should stop Soul Sync resident", async () => {
      await soulSyncArkCore.startSoulSyncResident(testUserId);
      const success = soulSyncArkCore.stopSoulSyncResident(testUserId);

      expect(success).toBe(true);

      const status = soulSyncArkCore.getSoulSyncResidentStatus(testUserId);
      expect(status).toBeNull();
    });
  });

  describe("Soul Sync常駐状態更新", () => {
    it("should update Soul Sync resident with new interactions", async () => {
      await soulSyncArkCore.startSoulSyncResident(testUserId);

      const newInteractions = [
        "こんにちは、今日は良い天気ですね。",
        "最近、仕事が忙しくて疲れています。",
      ];

      const status = await soulSyncArkCore.updateSoulSyncResident(testUserId, newInteractions);

      expect(status.analyzedInteractions).toBe(newInteractions.length);
      expect(status.understandingDepth).toBeGreaterThan(0);
      expect(status.currentSoulCharacteristics).toBeDefined();
    }, 15000);

    // このテストはLLM API呼び出しが重いためスキップ
    // it("should increase understanding depth with more interactions", async () => {
    //   await soulSyncArkCore.startSoulSyncResident(testUserId);
    //   const interactions1 = ["テスト1"];
    //   const status1 = await soulSyncArkCore.updateSoulSyncResident(testUserId, interactions1);
    //   const interactions2 = ["テスト2", "テスト3", "テスト4"];
    //   const status2 = await soulSyncArkCore.updateSoulSyncResident(testUserId, interactions2);
    //   expect(status2.understandingDepth).toBeGreaterThan(status1.understandingDepth);
    //   expect(status2.analyzedInteractions).toBe(4);
    // }, 15000);
  });

  describe("人格同期", () => {
    it("should get personality sync status", () => {
      const status = soulSyncArkCore.getPersonalitySyncStatus(testUserId);

      expect(status).toBeDefined();
      expect(status.syncLevel).toBe(0);
      expect(status.syncQuality).toBe(0);
      expect(status.syncErrors).toBe(0);
      expect(status.syncSuccesses).toBe(0);
    });

    it("should sync personality", async () => {
      const status = await soulSyncArkCore.syncPersonality(testUserId);

      expect(status).toBeDefined();
      expect(status.syncSuccesses).toBe(1);
      expect(status.syncLevel).toBeGreaterThan(0);
    });

    it("should increase sync level with successful syncs", async () => {
      const status1 = await soulSyncArkCore.syncPersonality(testUserId);
      const status2 = await soulSyncArkCore.syncPersonality(testUserId);

      expect(status2.syncLevel).toBeGreaterThanOrEqual(status1.syncLevel);
      expect(status2.syncSuccesses).toBeGreaterThanOrEqual(2);
    });
  });

  describe("チャット最適化設定", () => {
    it("should get default chat optimization settings", () => {
      const settings = soulSyncArkCore.getChatOptimizationSettings(testUserId);

      expect(settings).toBeDefined();
      expect(settings.enablePersonalization).toBe(true);
      expect(settings.enablePersonalityCorrection).toBe(true);
      expect(settings.enableSpiritualOptimization).toBe(true);
      expect(settings.optimizationIntensity).toBe(70);
    });

    it("should update chat optimization settings", () => {
      const newSettings = {
        enablePersonalization: false,
        optimizationIntensity: 50,
      };

      const settings = soulSyncArkCore.updateChatOptimizationSettings(testUserId, newSettings);

      expect(settings.enablePersonalization).toBe(false);
      expect(settings.optimizationIntensity).toBe(50);
      expect(settings.enablePersonalityCorrection).toBe(true); // 変更していない設定は維持
    });
  });

  describe("チャット応答最適化", () => {
    it("should optimize chat response with Ark Core", async () => {
      const originalResponse = "こんにちは、元気ですか？";
      const optimizedResponse = await soulSyncArkCore.optimizeChatResponse(testUserId, originalResponse);

      expect(optimizedResponse).toBeDefined();
      expect(typeof optimizedResponse).toBe("string");
      expect(optimizedResponse.length).toBeGreaterThan(0);
    });

    it("should return original response if personalization is disabled", async () => {
      soulSyncArkCore.updateChatOptimizationSettings(testUserId, {
        enablePersonalization: false,
      });

      const originalResponse = "こんにちは、元気ですか？";
      const optimizedResponse = await soulSyncArkCore.optimizeChatResponse(testUserId, originalResponse);

      expect(optimizedResponse).toBe(originalResponse);
    });

    it("should apply personality correction if enabled", async () => {
      await soulSyncArkCore.startSoulSyncResident(testUserId);
      await soulSyncArkCore.updateSoulSyncResident(testUserId, [
        "私は完璧主義者です。",
        "いつも完璧を求めてしまいます。",
      ]);

      soulSyncArkCore.updateChatOptimizationSettings(testUserId, {
        enablePersonalityCorrection: true,
      });

      const originalResponse = "完璧にやらなければなりません。";
      const optimizedResponse = await soulSyncArkCore.optimizeChatResponse(testUserId, originalResponse);

      expect(optimizedResponse).toBeDefined();
      expect(typeof optimizedResponse).toBe("string");
    }, 15000);
  });

  describe("人格理解深度", () => {
    it("should increase understanding depth", async () => {
      await soulSyncArkCore.startSoulSyncResident(testUserId);

      const depth1 = soulSyncArkCore.increaseUnderstandingDepth(testUserId, 10);
      expect(depth1).toBe(10);

      const depth2 = soulSyncArkCore.increaseUnderstandingDepth(testUserId, 20);
      expect(depth2).toBe(30);
    });

    it("should cap understanding depth at 100", async () => {
      await soulSyncArkCore.startSoulSyncResident(testUserId);

      const depth = soulSyncArkCore.increaseUnderstandingDepth(testUserId, 150);
      expect(depth).toBe(100);
    });

    it("should return 0 if Soul Sync is not resident", () => {
      const depth = soulSyncArkCore.increaseUnderstandingDepth(testUserId, 10);
      expect(depth).toBe(0);
    });
  });

  describe("Guardianとの情報連動", () => {
    it("should sync with Guardian without errors", async () => {
      await soulSyncArkCore.startSoulSyncResident(testUserId);
      await soulSyncArkCore.updateSoulSyncResident(testUserId, [
        "テスト対話1",
        "テスト対話2",
      ]);

      await expect(
        soulSyncArkCore.syncWithGuardian(testUserId)
      ).resolves.not.toThrow();
    }, 15000);

    it("should handle missing Soul Sync status gracefully", async () => {
      await expect(
        soulSyncArkCore.syncWithGuardian(testUserId)
      ).resolves.not.toThrow();
    });
  });
});
