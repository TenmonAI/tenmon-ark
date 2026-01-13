// TENMON-ARK Version (Phase 9)
// - 破壊的変更判定・運用時の識別のため固定値として管理する
export const TENMON_ARK_VERSION = "0.9.0";

// Phase 1: ビルド識別子（反映確認のため）
// 起動時に gitSha を取得、builtAt はビルド時または起動時のISO時刻
import { execSync } from "child_process";

function getGitSha(): string {
  // 環境変数があれば優先
  if (process.env.TENMON_ARK_GIT_SHA || process.env.GIT_SHA) {
    return process.env.TENMON_ARK_GIT_SHA || process.env.GIT_SHA || "unknown";
  }
  
  try {
    // 起動時に git rev-parse --short HEAD を実行
    const sha = execSync("git rev-parse --short HEAD", { 
      encoding: "utf-8", 
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return sha || "unknown";
  } catch (e) {
    // git コマンドが失敗した場合（.git がない、git がインストールされていない等）
    console.warn("[VERSION] Failed to get git SHA:", e);
    return "unknown";
  }
}

function getBuiltAt(): string {
  // 環境変数があれば優先（ビルド時に注入された値）
  if (process.env.TENMON_ARK_BUILT_AT) {
    return process.env.TENMON_ARK_BUILT_AT;
  }
  
  // 起動時のISO時刻を返す
  return new Date().toISOString();
}

export const TENMON_ARK_BUILT_AT = getBuiltAt();
export const TENMON_ARK_GIT_SHA = getGitSha();


