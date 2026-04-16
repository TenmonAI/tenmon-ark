import { describe, expect, it } from "vitest";
import {
  RECENT_TURNS_LIMIT,
  SEED_MAX_BYTES,
  SUMMARY_MAX_CHARS,
  validateSyncPayloadSize,
} from "../../api/src/core/userDeviceSyncPolicy";

describe("userDeviceMemorySync policy contract", () => {
  it("recent / summary / seed の固定値を保持", () => {
    expect(RECENT_TURNS_LIMIT).toBe(8);
    expect(SUMMARY_MAX_CHARS).toBe(500);
    expect(SEED_MAX_BYTES).toBe(2048);
  });

  it("summary 上限超過を拒否", () => {
    const payload = "x".repeat(600);
    expect(validateSyncPayloadSize("summary", payload).ok).toBe(false);
  });

  it("seed 上限超過を拒否", () => {
    const payload = "x".repeat(2100);
    expect(validateSyncPayloadSize("seedRef", payload).ok).toBe(false);
  });
});
