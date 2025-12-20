import type { ToolAdapter, ToolAdapterValidation } from "../toolTypes.js";

type CalendarReadArgs = { range?: "this_week" | "today"; timezone?: string };

function validateArgs(args: unknown): ToolAdapterValidation<CalendarReadArgs> {
  // Phase 7: stub only; accept empty object
  if (typeof args !== "object" || args === null) return { ok: true, normalizedArgs: {} };
  const a = args as any;
  const range = a.range === "this_week" || a.range === "today" ? a.range : undefined;
  const timezone = typeof a.timezone === "string" ? a.timezone : undefined;
  return { ok: true, normalizedArgs: { range, timezone } };
}

export const calendarReadAdapter: ToolAdapter<CalendarReadArgs> = {
  id: "calendar.read",
  requires: ["read:calendar"],
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


