import path from "node:path";

export const DATA_DIR =
  process.env.TENMON_DATA_DIR || path.join(process.cwd(), "data");

export const RESEARCH_DIR = path.join(DATA_DIR, "research");
export const UPLOAD_DIR = path.join(RESEARCH_DIR, "uploads");
export const TEXT_DIR = path.join(RESEARCH_DIR, "text");
export const RULES_DIR = path.join(RESEARCH_DIR, "rules");
export const INDEX_PATH = path.join(RESEARCH_DIR, "files.json");

