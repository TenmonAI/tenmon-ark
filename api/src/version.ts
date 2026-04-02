// TENMON-ARK Version (Phase 9)
// - 破壊的変更判定・運用時の識別のため固定値として管理する
export const TENMON_ARK_VERSION = "0.9.0";

import { execSync } from "child_process";
import { existsSync } from "fs";

/**
 * gitSha を取得（実行時に /opt/tenmon-ark-repo/api から取得）
 */
export function getGitSha(): string {
  const candidateRepoPaths = [
    process.env.TENMON_REPO_PATH,
    process.cwd(),
    "/opt/tenmon-ark-repo/api",
    "/workspace/api",
    "/workspace",
  ].filter((x): x is string => typeof x === "string" && x.trim().length > 0);

  for (const repoPath of candidateRepoPaths) {
    try {
      if (!existsSync(repoPath)) continue;
      const sha = execSync("git rev-parse --short HEAD", {
        cwd: repoPath,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (sha) return sha;
    } catch {
      // try next candidate
    }
  }

  return process.env.GIT_SHA || "unknown";
}


