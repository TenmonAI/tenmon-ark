import type { ToolAdapter, ToolAdapterValidation } from "../toolTypes.js";

type GithubReadArgs = { repo?: string; path?: string };

function validateArgs(args: unknown): ToolAdapterValidation<GithubReadArgs> {
  // Phase 7: stub only, accept empty object
  if (typeof args !== "object" || args === null) return { ok: true, normalizedArgs: {} };
  const a = args as any;
  return {
    ok: true,
    normalizedArgs: {
      repo: typeof a.repo === "string" ? a.repo : undefined,
      path: typeof a.path === "string" ? a.path : undefined,
    },
  };
}

export const githubReadAdapter: ToolAdapter<GithubReadArgs> = {
  id: "github.read",
  requires: ["read:github"],
  validateArgs,
  riskOf: () => "low",
  async dryRun(args) {
    return {
      ok: true,
      note: "dry-run only (Phase 7 stub; no external access)",
      requested: args,
    };
  },
};


