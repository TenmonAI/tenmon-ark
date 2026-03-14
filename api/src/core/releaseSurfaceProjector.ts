import type { ReleaseMode } from "./releaseModePolicy.js";

export interface ReleaseSurfaceInput {
  mode: ReleaseMode;
  text?: string | null;
  routeReason?: string | null;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripFixedPrefix(text: string): string {
  return text
    .replace(/^【天聞の所見】\s*/u, "")
    .replace(/^【所見】\s*/u, "")
    .replace(/^天聞としては、?\s*/u, "");
}

function softenQuestionTail(text: string): string {
  return text.replace(/具体的にどのような[^。！？]*[。！？]?$/u, "").trim();
}

export function projectReleaseSurface(input: ReleaseSurfaceInput): string {
  let text = normalizeText(String(input.text || ""));

  if (!text) return "";

  if (input.mode === "STRICT") {
    return text;
  }

  if (input.mode === "HYBRID") {
    text = stripFixedPrefix(text);
    return normalizeText(text);
  }

  text = stripFixedPrefix(text);
  text = softenQuestionTail(text);
  text = normalizeText(text);

  return text;
}
