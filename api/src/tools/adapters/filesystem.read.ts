import fs from "node:fs";
import path from "node:path";
import type { ToolAdapter, ToolAdapterValidation } from "../toolTypes.js";

type FsReadArgs =
  | { op: "list"; path: string; limit?: number }
  | { op: "read"; path: string; maxBytes?: number };

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function withinBase(resolved: string, base: string): boolean {
  const rel = path.relative(base, resolved);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function validateArgs(args: unknown): ToolAdapterValidation<FsReadArgs> {
  const violations: string[] = [];
  if (!isPlainObject(args)) return { ok: false, violations: ["args must be an object"] };

  const opRaw = args.op;
  const pRaw = args.path;

  if (opRaw !== "list" && opRaw !== "read") violations.push("op must be 'list' or 'read'");
  if (typeof pRaw !== "string" || pRaw.trim().length === 0) violations.push("path must be a non-empty string");

  if (violations.length) return { ok: false, violations };

  const op = opRaw as "list" | "read";
  const p = pRaw as string;

  if (op === "list") {
    const limit = typeof args.limit === "number" ? args.limit : 200;
    return { ok: true, normalizedArgs: { op: "list", path: p, limit } };
  }

  const maxBytes = typeof args.maxBytes === "number" ? args.maxBytes : 64 * 1024;
  return { ok: true, normalizedArgs: { op: "read", path: p, maxBytes } };
}

async function dryRun(args: FsReadArgs): Promise<unknown> {
  const base = process.cwd();
  const resolved = path.resolve(base, args.path);
  if (!withinBase(resolved, base)) {
    return { ok: false, error: "path is outside workspace base (denied)", base };
  }

  if (args.op === "list") {
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const limited = entries.slice(0, Math.max(0, args.limit ?? 200));
    return {
      ok: true,
      op: "list",
      path: args.path,
      resolved,
      entries: limited.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "dir" : e.isFile() ? "file" : "other",
      })),
    };
  }

  const stat = fs.statSync(resolved);
  const maxBytes = args.maxBytes ?? 64 * 1024;
  const buf = fs.readFileSync(resolved);
  const sliced = buf.slice(0, maxBytes);

  return {
    ok: true,
    op: "read",
    path: args.path,
    resolved,
    size: stat.size,
    truncated: buf.length > maxBytes,
    content: sliced.toString("utf8"),
  };
}

export const filesystemReadAdapter: ToolAdapter<FsReadArgs> = {
  id: "filesystem.read",
  requires: ["read:filesystem"],
  validateArgs,
  riskOf: (args) => {
    const base = process.cwd();
    const resolved = path.resolve(base, args.path);
    return withinBase(resolved, base) ? "low" : "high";
  },
  dryRun,
};


