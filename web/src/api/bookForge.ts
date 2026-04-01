import { API_BASE_URL } from "../config/api";

async function postJson(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function getJson(path: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  return res.json();
}

export function createBookProject(body: {
  projectType: "book" | "paper";
  title: string;
  targetChars?: number | null;
  audience?: string;
  tone?: string;
  rhetoric?: string;
}) {
  return postJson("/api/book/project", body);
}

export function listBookProjects() {
  return getJson("/api/book/projects");
}

export function getBookProject(id: string) {
  return getJson(`/api/book/project/${encodeURIComponent(id)}`);
}

export function attachBookSource(
  projectId: string,
  body: {
    sourceKind: string;
    connectorType?: string;
    title?: string;
    url?: string;
    content?: string;
  }
) {
  return postJson(`/api/book/project/${encodeURIComponent(projectId)}/source`, body);
}

export function importDocSource(projectId: string, doc: string) {
  return postJson(`/api/book/project/${encodeURIComponent(projectId)}/source/import-doc`, { doc });
}

export function crawlSeed(projectId: string, seedUrl: string) {
  return postJson(`/api/book/project/${encodeURIComponent(projectId)}/crawl`, { seedUrl, depth: 2, maxPages: 20 });
}

export function generateOutline(
  projectId: string,
  body: {
    title?: string;
    synopsis?: string;
    audience?: string;
    tone?: string;
    rhetoric?: string;
  }
) {
  return postJson(`/api/book/project/${encodeURIComponent(projectId)}/outline`, body);
}

export function generateDraft(projectId: string) {
  return postJson(`/api/book/project/${encodeURIComponent(projectId)}/draft`, {});
}

export function runReview(projectId: string) {
  return postJson(`/api/book/project/${encodeURIComponent(projectId)}/review`, {});
}

export function exportMarkdown(projectId: string) {
  return getJson(`/api/book/project/${encodeURIComponent(projectId)}/export?format=markdown`);
}
