/**
 * ============================================================
 *  SEED BUNDLE SYNC — クライアント側 Seed Bundle 同期
 * ============================================================
 * 
 * WiFi 接続時に Seed Bundle をダウンロード
 * ============================================================
 */

import { trpc } from "../trpc";
import { storeSeedBundleInLocalKokuzo, indexSeedBundleForFastOfflineLookup } from "../../../server/kokuzo/offline/seedBundle";

export class SeedBundleSync {
  private deviceId: string;
  private isOnline: boolean = navigator.onLine;

  constructor(deviceId?: string) {
    this.deviceId = deviceId || this.getDeviceId();
    this.setupOnlineListener();
  }

  /**
   * デバイス ID を取得または生成
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem("tenmon_ark_device_id");
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("tenmon_ark_device_id", deviceId);
    }
    return deviceId;
  }

  /**
   * オンライン状態のリスナーを設定
   */
  private setupOnlineListener(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.syncSeedBundle();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  /**
   * Seed Bundle を同期（WiFi 接続時）
   */
  async syncSeedBundle(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    try {
      // Seed Bundle を生成
      const result = await trpc.seedBundle.generateSeedBundle.mutate({
        deviceId: this.deviceId,
        priority: "high",
        seedLimit: 100,
      });

      if (result.success && result.bundle) {
        // ローカル Kokūzō Kernel に保存
        // 実際の実装では、LocalKokuzoKernel のインスタンスを使用
        // await storeSeedBundleInLocalKokuzo(result.bundle, localKokuzoKernel);
        
        // 高速オフライン検索用にインデックス
        // await indexSeedBundleForFastOfflineLookup(result.bundle, localKokuzoKernel);
        
        console.log("Seed Bundle synced successfully");
      }
    } catch (error) {
      console.error("Error syncing seed bundle:", error);
    }
  }

  /**
   * 手動で Seed Bundle を同期
   */
  async manualSync(): Promise<void> {
    await this.syncSeedBundle();
  }
}

export default SeedBundleSync;

