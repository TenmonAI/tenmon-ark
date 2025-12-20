import type { ToolAdapter, ToolAdapterValidation } from "../toolTypes.js";

type HttpFetchArgs = { url: string };

const allowHosts = new Set(["tenmon-ark.com", "www.tenmon-ark.com", "github.com", "api.github.com", "raw.githubusercontent.com"]);

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isIpLiteral(host: string): boolean {
  // IPv4 / IPv6 literal (very rough but sufficient to block direct IP SSRF)
  const v4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const v6 = /^\[?[0-9a-fA-F:]+\]?$/;
  return v4.test(host) || (host.includes(":") && v6.test(host));
}

function isLocalhostLike(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  );
}

function isMetadataHost(host: string): boolean {
  // Common cloud metadata hostnames
  const h = host.toLowerCase();
  return h === "169.254.169.254" || h.includes("metadata.google.internal") || h.includes("azure") && h.includes("metadata");
}

function validateArgs(args: unknown): ToolAdapterValidation<HttpFetchArgs> {
  if (!isPlainObject(args)) return { ok: false, violations: ["args must be an object"] };
  if (typeof args.url !== "string" || args.url.trim().length === 0) return { ok: false, violations: ["url must be a string"] };

  let url: URL;
  try {
    url = new URL(args.url);
  } catch {
    return { ok: false, violations: ["url is invalid"] };
  }

  if (url.username || url.password) return { ok: false, violations: ["basic auth in url is not allowed"] };
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, violations: ["only http/https allowed"] };

  const host = url.hostname;
  if (isIpLiteral(host)) return { ok: false, violations: ["ip literal host is denied (SSRF)"] };
  if (isLocalhostLike(host)) return { ok: false, violations: ["localhost-like host is denied (SSRF)"] };
  if (isMetadataHost(host)) return { ok: false, violations: ["metadata host is denied (SSRF)"] };

  // Phase7 allowlist
  if (!allowHosts.has(host)) return { ok: false, violations: [`host not in allowlist: ${host}`] };

  // GET only: we encode it in args model; executor never sends other methods.
  return { ok: true, normalizedArgs: { url: url.toString() } };
}

async function dryRun(args: HttpFetchArgs): Promise<unknown> {
  // Phase 7: NO external side effects. We DO NOT actually perform network requests.
  // This returns what would be fetched, after allowlist + SSRF validation passes.
  return {
    ok: true,
    method: "GET",
    url: args.url,
    note: "dry-run only (no network request performed in Phase 7)",
  };
}

export const httpFetchAdapter: ToolAdapter<HttpFetchArgs> = {
  id: "http.fetch",
  requires: ["read:http"],
  validateArgs,
  riskOf: (args) => {
    // allowlisted GET is treated as low; anything else would have been rejected by validateArgs
    void args;
    return "low";
  },
  dryRun,
};


