import type { ToolAdapter, ToolId } from "./toolTypes.js";
import { calendarReadAdapter } from "./adapters/calendar.read.js";
import { filesystemReadAdapter } from "./adapters/filesystem.read.js";
import { githubReadAdapter } from "./adapters/github.read.js";
import { httpFetchAdapter } from "./adapters/http.fetch.js";

const registry: Record<ToolId, ToolAdapter<any>> = {
  "filesystem.read": filesystemReadAdapter,
  "http.fetch": httpFetchAdapter,
  "github.read": githubReadAdapter,
  "calendar.read": calendarReadAdapter,
};

export function getToolAdapter(id: ToolId): ToolAdapter<any> {
  return registry[id];
}

export function listToolIds(): ToolId[] {
  return Object.keys(registry) as ToolId[];
}


