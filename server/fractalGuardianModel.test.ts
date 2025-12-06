import { describe, expect, it } from "vitest";
import * as fractalModel from "./fractalGuardianModel";

describe("Fractal Guardian Model", () => {
  describe("三層守護状態取得", () => {
    it("should get fractal guardian status", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      expect(status).toBeDefined();
      expect(status.personalLayer).toBeDefined();
      expect(status.deviceSocialLayer).toBeDefined();
      expect(status.globalLayer).toBeDefined();
      expect(status.overallProtectionLevel).toBeGreaterThanOrEqual(0);
      expect(status.overallProtectionLevel).toBeLessThanOrEqual(100);
    });

    it("should have valid personal layer status", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      expect(status.personalLayer.userId).toBe(userId);
      expect(status.personalLayer.protectionLevel).toBeGreaterThanOrEqual(0);
      expect(status.personalLayer.protectionLevel).toBeLessThanOrEqual(100);
      expect(status.personalLayer.deviceProtection).toBeDefined();
    });

    it("should have valid device/social layer status", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      expect(status.deviceSocialLayer.ethicScore).toBeGreaterThanOrEqual(0);
      expect(status.deviceSocialLayer.ethicScore).toBeLessThanOrEqual(100);
      expect(status.deviceSocialLayer.protectionLevel).toBeGreaterThanOrEqual(0);
      expect(status.deviceSocialLayer.protectionLevel).toBeLessThanOrEqual(100);
      expect(status.deviceSocialLayer.browserProtection).toBeDefined();
    });

    it("should have valid global layer status", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      expect(status.globalLayer.globalThreatLevel).toBeDefined();
      expect(status.globalLayer.protectionLevel).toBeGreaterThanOrEqual(0);
      expect(status.globalLayer.protectionLevel).toBeLessThanOrEqual(100);
      expect(status.globalLayer.neutralizationStrategies).toBeGreaterThanOrEqual(0);
    });
  });

  describe("階層間連携", () => {
    it("should have layer sync status", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      expect(status.layerSyncStatus).toBeDefined();
      expect(status.layerSyncStatus.personalToDevice).toBe(true);
      expect(status.layerSyncStatus.deviceToGlobal).toBe(true);
      expect(status.layerSyncStatus.globalToDevice).toBe(true);
      expect(status.layerSyncStatus.deviceToPersonal).toBe(true);
    });

    it("should propagate threat upward", async () => {
      const userId = 1;
      const threatType = "test_threat";
      const threatData = { message: "テスト脅威" };

      await expect(
        fractalModel.propagateThreatUpward(userId, threatType, threatData)
      ).resolves.not.toThrow();
    });

    it("should propagate warning downward", async () => {
      const warningType = "test_warning";
      const warningData = { message: "テスト警告" };

      await expect(
        fractalModel.propagateWarningDownward(warningType, warningData)
      ).resolves.not.toThrow();
    });
  });

  describe("統合リスク評価", () => {
    it("should have integrated risk assessment", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      expect(status.integratedRiskAssessment).toBeDefined();
      expect(status.integratedRiskAssessment.overallRiskLevel).toBeGreaterThanOrEqual(0);
      expect(status.integratedRiskAssessment.overallRiskLevel).toBeLessThanOrEqual(100);
      expect(status.integratedRiskAssessment.personalRisk).toBeGreaterThanOrEqual(0);
      expect(status.integratedRiskAssessment.deviceSocialRisk).toBeGreaterThanOrEqual(0);
      expect(status.integratedRiskAssessment.globalRisk).toBeGreaterThanOrEqual(0);
    });

    it("should have risk factors array", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      expect(Array.isArray(status.integratedRiskAssessment.riskFactors)).toBe(true);
    });

    it("should have recommended actions array", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      expect(Array.isArray(status.integratedRiskAssessment.recommendedActions)).toBe(true);
    });
  });

  describe("統合保護レポート", () => {
    it("should generate integrated protection report", async () => {
      const userId = 1;
      const report = await fractalModel.generateIntegratedProtectionReport(userId);

      expect(report).toBeDefined();
      expect(report.status).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(typeof report.summary).toBe("string");
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it("should have appropriate summary based on protection level", async () => {
      const userId = 1;
      const report = await fractalModel.generateIntegratedProtectionReport(userId);

      expect(report.summary.length).toBeGreaterThan(0);
      expect(report.summary).toMatch(/保護|セキュリティ|守護/);
    });

    it("should provide recommendations", async () => {
      const userId = 1;
      const report = await fractalModel.generateIntegratedProtectionReport(userId);

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe("保護レベル計算", () => {
    it("should calculate overall protection level correctly", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      // 重み付け平均の検証（個人40%、端末・社会30%、地球30%）
      const expectedLevel = Math.round(
        status.personalLayer.protectionLevel * 0.4 +
        status.deviceSocialLayer.protectionLevel * 0.3 +
        status.globalLayer.protectionLevel * 0.3
      );

      expect(status.overallProtectionLevel).toBe(expectedLevel);
    });

    it("should have protection levels in valid range", async () => {
      const userId = 1;
      const status = await fractalModel.getFractalGuardianStatus(userId);

      expect(status.personalLayer.protectionLevel).toBeGreaterThanOrEqual(0);
      expect(status.personalLayer.protectionLevel).toBeLessThanOrEqual(100);
      expect(status.deviceSocialLayer.protectionLevel).toBeGreaterThanOrEqual(0);
      expect(status.deviceSocialLayer.protectionLevel).toBeLessThanOrEqual(100);
      expect(status.globalLayer.protectionLevel).toBeGreaterThanOrEqual(0);
      expect(status.globalLayer.protectionLevel).toBeLessThanOrEqual(100);
    });
  });
});
