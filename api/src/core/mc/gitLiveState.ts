/**
 * CARD-MC-09D-GIT-DIRTY-FRESHNESS-FIX-V1:
 *   collector が 10 分周期で生成する git_state.json は、MC UI / analyzer が
 *   参照する時点で古くなっており、実際の HEAD / dirty 状態と乖離する。
 *   ここでは `git rev-parse HEAD` / `git status --porcelain` を
 *   プロセス内で同期実行し、短い TTL（10 秒）で多重呼び出しを抑える。
 *   失敗時は null を返し、呼出側は collector JSON にフォールバックする。
 */
import { execFileSync } from "node:child_process";
import { REPO_ROOT } from "./constants.js";

export type GitLiveStateV1 = {
  ok: boolean;
  branch: string;
  head_sha: string;
  head_sha_short: string;
  dirty: boolean | null;
  modified_count: number;
  untracked_count: number;
  checked_at: string;
  error?: string;
};

const TTL_MS = 10_000; // 10s
let __cache: { at: number; value: GitLiveStateV1 } | null = null;

function runGit(args: string[]): string {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    timeout: 3000,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function readGitLiveStateV1(): GitLiveStateV1 {
  if (__cache && Date.now() - __cache.at < TTL_MS) return __cache.value;
  const fallback: GitLiveStateV1 = {
    ok: false,
    branch: "",
    head_sha: "",
    head_sha_short: "",
    dirty: null,
    modified_count: 0,
    untracked_count: 0,
    checked_at: new Date().toISOString(),
  };
  try {
    const sha = runGit(["rev-parse", "HEAD"]).trim();
    const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    const status = runGit(["status", "--porcelain=v1"]);
    const lines = status.split("\n").filter((l) => l.length > 0);
    const untracked = lines.filter((l) => l.startsWith("??")).length;
    const modified = lines.length - untracked;
    const value: GitLiveStateV1 = {
      ok: true,
      branch,
      head_sha: sha,
      head_sha_short: sha.slice(0, 8),
      dirty: lines.length > 0,
      modified_count: modified,
      untracked_count: untracked,
      checked_at: new Date().toISOString(),
    };
    __cache = { at: Date.now(), value };
    return value;
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? "unknown");
    console.warn(`[MC_GIT_LIVE] probe failed: ${msg}`);
    const value: GitLiveStateV1 = { ...fallback, error: msg.slice(0, 200) };
    __cache = { at: Date.now(), value };
    return value;
  }
}

export function invalidateGitLiveStateCacheV1(): void {
  __cache = null;
}
