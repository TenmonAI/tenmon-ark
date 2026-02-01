// TENMON-ARK Version (Phase 9)
// - 破壊的変更判定・運用時の識別のため固定値として管理する
export const TENMON_ARK_VERSION = "0.9.0";

import { execSync } from "child_process";
import { existsSync } from "fs";

/**
 * gitSha を取得（実行時に /opt/tenmon-ark-repo/api から取得）
 */
export function getGitSha(): string {
  const repoPath = "/opt/tenmon-ark-repo/api";
  if (!existsSync(repoPath)) {
    throw new Error("Repository path not found: " + repoPath);
  }
  try {
    const sha = execSync("git rev-parse --short HEAD", {
      cwd: repoPath,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!sha || sha.length === 0) {
      throw new Error("gitSha is empty");
    }
    return sha;
  } catch (error) {
    throw new Error(`Failed to get gitSha: ${error instanceof Error ? error.message : String(error)}`);
  }
}


