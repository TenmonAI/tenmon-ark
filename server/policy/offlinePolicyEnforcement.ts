/**
 * ============================================================
 *  OFFLINE POLICY ENFORCEMENT — オフラインポリシー厳格化
 * ============================================================
 * 
 * オフライン時の厳格なポリシー適用
 * ============================================================
 */

export interface OfflinePolicyState {
  isOffline: boolean;
  allowNewPersonaCreation: boolean;
  allowGlobalLawChanges: boolean;
  allowMutations: boolean;
  allowedMutationTypes: string[];
}

export class OfflinePolicyEnforcement {
  private isOffline: boolean = false;
  private policyState: OfflinePolicyState = {
    isOffline: false,
    allowNewPersonaCreation: true,
    allowGlobalLawChanges: true,
    allowMutations: true,
    allowedMutationTypes: ["all"],
  };

  /**
   * オフラインモードを設定
   */
  setOfflineMode(offline: boolean): void {
    this.isOffline = offline;
    this.updatePolicyState();
  }

  /**
   * ポリシーステートを更新
   */
  private updatePolicyState(): void {
    if (this.isOffline) {
      this.policyState = {
        isOffline: true,
        allowNewPersonaCreation: false, // オフライン時は禁止
        allowGlobalLawChanges: false, // オフライン時は禁止
        allowMutations: true,
        allowedMutationTypes: ["innerReflectionLog"], // 内部反省ログのみ許可
      };
    } else {
      this.policyState = {
        isOffline: false,
        allowNewPersonaCreation: true,
        allowGlobalLawChanges: true,
        allowMutations: true,
        allowedMutationTypes: ["all"],
      };
    }
  }

  /**
   * 新しい Persona の作成を許可するかチェック
   */
  canCreateNewPersona(): boolean {
    return this.policyState.allowNewPersonaCreation;
  }

  /**
   * グローバル Law の変更を許可するかチェック
   */
  canChangeGlobalLaw(): boolean {
    return this.policyState.allowGlobalLawChanges;
  }

  /**
   * ミューテーションを許可するかチェック
   */
  canMutate(mutationType: string): boolean {
    if (!this.policyState.allowMutations) {
      return false;
    }

    if (this.policyState.allowedMutationTypes.includes("all")) {
      return true;
    }

    return this.policyState.allowedMutationTypes.includes(mutationType);
  }

  /**
   * ポリシーステートを取得
   */
  getPolicyState(): OfflinePolicyState {
    return { ...this.policyState };
  }

  /**
   * ポリシー違反をチェックして例外をスロー
   */
  enforcePolicy(action: "createPersona" | "changeGlobalLaw" | "mutate", mutationType?: string): void {
    if (action === "createPersona" && !this.canCreateNewPersona()) {
      throw new Error("Cannot create new persona in offline mode");
    }

    if (action === "changeGlobalLaw" && !this.canChangeGlobalLaw()) {
      throw new Error("Cannot change global law in offline mode");
    }

    if (action === "mutate" && mutationType && !this.canMutate(mutationType)) {
      throw new Error(`Mutation type "${mutationType}" is not allowed in offline mode`);
    }
  }
}

export default OfflinePolicyEnforcement;

