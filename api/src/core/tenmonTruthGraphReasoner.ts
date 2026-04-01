import { getDb } from "../db/index.js";
import type {
  TruthGraphEdgeV1,
  TruthGraphNodeV1,
} from "./tenmonConstitutionV3.js";

type DbRow = Record<string, unknown>;

function safeText(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function hasTableV1(table: string): boolean {
  try {
    const db = getDb("kokuzo");
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1"
      )
      .get(table) as DbRow | undefined;
    return safeText(row?.name) === table;
  } catch {
    return false;
  }
}

function hasColumnV1(table: string, column: string): boolean {
  try {
    const db = getDb("kokuzo");
    const rows = db.prepare(`PRAGMA table_info('${table.replace(/'/g, "''")}')`).all() as DbRow[];
    return rows.some((r) => safeText(r.name) === column);
  } catch {
    return false;
  }
}

function mapLawRowToNodeV1(row: DbRow): TruthGraphNodeV1 {
  const nodeId =
    safeText(row.node_id) ||
    safeText(row.law_id) ||
    safeText(row.id) ||
    `law:${safeText(row.doc)}:${safeText(row.pdfPage)}`;
  const label = safeText(row.label) || safeText(row.name) || safeText(row.quote);
  return {
    node_id: nodeId,
    node_type: "law",
    label: label || "unknown_law",
    family: safeText(row.family, "KHS"),
    confidence: "verified",
    source_doc: safeText(row.source_doc) || safeText(row.doc, "KHS"),
    source_page: Number.isFinite(Number(row.source_page ?? row.pdfPage))
      ? safeNum(row.source_page ?? row.pdfPage)
      : undefined,
  };
}

function mapConceptRowToNodeV1(row: DbRow): TruthGraphNodeV1 {
  const nodeId = safeText(row.node_id) || safeText(row.id) || `concept:${safeText(row.name)}`;
  const label = safeText(row.label) || safeText(row.name) || "unknown_concept";
  return {
    node_id: nodeId,
    node_type: "concept",
    label,
    family: safeText(row.family, "KHS"),
    confidence: "probable",
    source_doc: safeText(row.source_doc) || safeText(row.doc, "KHS"),
    source_page: Number.isFinite(Number(row.source_page ?? row.pdfPage))
      ? safeNum(row.source_page ?? row.pdfPage)
      : undefined,
  };
}

function mapEdgeRowToEdgeV1(row: DbRow): TruthGraphEdgeV1 {
  const relationRaw = safeText(row.relation, "maps_to");
  const relation: TruthGraphEdgeV1["relation"] =
    relationRaw === "derives_from" ||
    relationRaw === "corresponds_to" ||
    relationRaw === "contrasts_with" ||
    relationRaw === "manifests_as" ||
    relationRaw === "prohibited_merge_with" ||
    relationRaw === "exemplified_by" ||
    relationRaw === "maps_to" ||
    relationRaw === "expands"
      ? relationRaw
      : "maps_to";
  return {
    edge_id:
      safeText(row.edge_id) ||
      safeText(row.id) ||
      `${safeText(row.from_node)}->${safeText(row.to_node)}:${relation}`,
    from_node: safeText(row.from_node),
    to_node: safeText(row.to_node),
    relation,
    confidence: Math.min(1, Math.max(0, safeNum(row.confidence, 0.7))),
  };
}

export class TenmonTruthGraphReasonerV1 {
  // DB から関連 node を取得（khs_laws を TruthGraphNodeV1 に変換）
  async getRelevantNodesV1(
    intent: string,
    family: string,
    limit: number
  ): Promise<TruthGraphNodeV1[]> {
    const cap = Math.max(1, Math.min(30, limit));
    const q = `%${String(intent ?? "").trim()}%`;
    try {
      const db = getDb("kokuzo");
      const out: TruthGraphNodeV1[] = [];

      if (hasTableV1("khs_laws")) {
        try {
          const rows = db
            .prepare(
              "SELECT * FROM khs_laws WHERE family = ? AND (name LIKE ? OR quote LIKE ?) LIMIT ?"
            )
            .all(family, q, q, cap) as DbRow[];
          out.push(...rows.map(mapLawRowToNodeV1));
        } catch {
          // fail-open
        }
      } else if (hasTableV1("kokuzo_laws")) {
        try {
          const hasName = hasColumnV1("kokuzo_laws", "name");
          const sql = hasName
            ? "SELECT id, doc, pdfPage, quote, name FROM kokuzo_laws WHERE (quote LIKE ? OR name LIKE ?) LIMIT ?"
            : "SELECT id, doc, pdfPage, quote FROM kokuzo_laws WHERE quote LIKE ? LIMIT ?";
          const rows = hasName
            ? (db.prepare(sql).all(q, q, cap) as DbRow[])
            : (db.prepare(sql).all(q, cap) as DbRow[]);
          out.push(...rows.map(mapLawRowToNodeV1));
        } catch {
          // fail-open
        }
      }

      if (out.length < cap && hasTableV1("khs_concepts")) {
        try {
          const remain = cap - out.length;
          const concepts = db
            .prepare(
              "SELECT * FROM khs_concepts WHERE family = ? AND (name LIKE ? OR label LIKE ?) LIMIT ?"
            )
            .all(family, q, q, remain) as DbRow[];
          out.push(...concepts.map(mapConceptRowToNodeV1));
        } catch {
          // fail-open
        }
      }

      if (out.length === 0) {
        // fail-open: DBに候補がない場合も最小ノードを返し、探索系呼び出しを継続可能にする
        out.push({
          node_id: `inferred:${String(intent || "unknown")}`,
          node_type: "law",
          label: String(intent || "unknown"),
          family: String(family || "KHS"),
          confidence: "inferred",
          source_doc: "fallback",
        });
      }
      return out.slice(0, cap);
    } catch {
      return [];
    }
  }

  // khs_edges を辿って law path を返す（最大深さ3）
  async traverseLawPathV1(
    startNodeId: string,
    maxDepth: number
  ): Promise<TruthGraphNodeV1[]> {
    const depth = Math.max(1, Math.min(3, maxDepth));
    try {
      const db = getDb("kokuzo");
      if (!hasTableV1("khs_edges")) return [];

      const visited = new Set<string>();
      const queue: Array<{ nodeId: string; d: number }> = [{ nodeId: startNodeId, d: 0 }];
      const collected: TruthGraphNodeV1[] = [];

      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (visited.has(cur.nodeId) || cur.d > depth) continue;
        visited.add(cur.nodeId);

        if (hasTableV1("khs_laws")) {
          const row = db
            .prepare("SELECT * FROM khs_laws WHERE node_id = ? OR id = ? LIMIT 1")
            .get(cur.nodeId, cur.nodeId) as DbRow | undefined;
          if (row) collected.push(mapLawRowToNodeV1(row));
        }

        const edges = db
          .prepare("SELECT from_node, to_node FROM khs_edges WHERE from_node = ? LIMIT 24")
          .all(cur.nodeId) as DbRow[];
        for (const e of edges) {
          const next = safeText(e.to_node);
          if (next && !visited.has(next)) queue.push({ nodeId: next, d: cur.d + 1 });
        }
      }

      return collected;
    } catch {
      return [];
    }
  }

  // 混線禁止チェック（prohibited_merge_with edge があるか）
  checkConflictV1(nodeIdA: string, nodeIdB: string): boolean {
    try {
      const db = getDb("kokuzo");
      if (!hasTableV1("khs_edges")) return false;

      const queryWithRelation = hasColumnV1("khs_edges", "relation")
        ? "SELECT 1 FROM khs_edges WHERE relation = 'prohibited_merge_with' AND ((from_node = ? AND to_node = ?) OR (from_node = ? AND to_node = ?)) LIMIT 1"
        : "SELECT 1 FROM khs_edges WHERE ((from_node = ? AND to_node = ?) OR (from_node = ? AND to_node = ?)) LIMIT 1";

      const hit = db.prepare(queryWithRelation).get(nodeIdA, nodeIdB, nodeIdB, nodeIdA);
      return Boolean(hit);
    } catch {
      return false;
    }
  }

  // コンテキスト制限対応のサブグラフ抽出（maxNodes で上限）
  async extractSubgraphV1(
    centerNodeId: string,
    maxNodes: number
  ): Promise<{ nodes: TruthGraphNodeV1[]; edges: TruthGraphEdgeV1[] }> {
    const cap = Math.max(1, Math.min(8, maxNodes));
    try {
      const db = getDb("kokuzo");
      const nodes: TruthGraphNodeV1[] = [];
      const edges: TruthGraphEdgeV1[] = [];
      const nodeSeen = new Set<string>();

      if (hasTableV1("khs_laws")) {
        const center = db
          .prepare("SELECT * FROM khs_laws WHERE node_id = ? OR id = ? LIMIT 1")
          .get(centerNodeId, centerNodeId) as DbRow | undefined;
        if (center) {
          const n = mapLawRowToNodeV1(center);
          nodes.push(n);
          nodeSeen.add(n.node_id);
        }
      }

      if (hasTableV1("khs_edges")) {
        const edgeRows = db
          .prepare("SELECT * FROM khs_edges WHERE from_node = ? OR to_node = ? LIMIT ?")
          .all(centerNodeId, centerNodeId, cap * 2) as DbRow[];
        for (const row of edgeRows) {
          const e = mapEdgeRowToEdgeV1(row);
          edges.push(e);
          if (nodes.length >= cap) continue;
          for (const nid of [e.from_node, e.to_node]) {
            if (nodeSeen.has(nid) || nodes.length >= cap) continue;
            if (hasTableV1("khs_laws")) {
              const law = db
                .prepare("SELECT * FROM khs_laws WHERE node_id = ? OR id = ? LIMIT 1")
                .get(nid, nid) as DbRow | undefined;
              if (law) {
                const n = mapLawRowToNodeV1(law);
                nodes.push(n);
                nodeSeen.add(n.node_id);
                continue;
              }
            }
            if (hasTableV1("khs_concepts")) {
              const concept = db
                .prepare("SELECT * FROM khs_concepts WHERE node_id = ? OR id = ? LIMIT 1")
                .get(nid, nid) as DbRow | undefined;
              if (concept) {
                const n = mapConceptRowToNodeV1(concept);
                nodes.push(n);
                nodeSeen.add(n.node_id);
              }
            }
          }
        }
      }

      if (hasTableV1("kokuzo_synapses")) {
        const syn = db
          .prepare(
            "SELECT * FROM kokuzo_synapses WHERE status = 'CANON' AND (from_node = ? OR to_node = ?) LIMIT ?"
          )
          .all(centerNodeId, centerNodeId, Math.max(1, cap)) as DbRow[];
        edges.push(...syn.map(mapEdgeRowToEdgeV1));
      }

      return { nodes: nodes.slice(0, cap), edges: edges.slice(0, cap * 2) };
    } catch {
      return { nodes: [], edges: [] };
    }
  }

  // サブグラフをプロンプトテキストに変換（最大300字）
  buildSubgraphPromptV1(
    subgraph: { nodes: TruthGraphNodeV1[]; edges: TruthGraphEdgeV1[] }
  ): string {
    const nodeLine = (subgraph.nodes || [])
      .slice(0, 6)
      .map((n) => `${n.label}(${n.node_type})`)
      .join(" / ");
    const edgeLine = (subgraph.edges || [])
      .slice(0, 6)
      .map((e) => `${e.from_node}-${e.relation}->${e.to_node}`)
      .join(" / ");
    const raw = `【TruthGraph】nodes:${nodeLine || "none"}; edges:${edgeLine || "none"}`;
    return raw.slice(0, 300);
  }
}
