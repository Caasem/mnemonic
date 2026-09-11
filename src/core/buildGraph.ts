import type { Memory } from "./types";
import type { GraphData, GraphEdge, GraphNode } from "./graph";

// A small fixed monochrome-friendly palette used to distinguish collections
// by node color (still black & white in spirit — grayscale shades plus one
// accent per collection, applied consistently) rather than route through the
// dataviz skill's full palette system for what is a lightweight visual aid.
const COLLECTION_COLORS = [
  "#0a84ff", // blue
  "#34c759", // green
  "#ff9500", // amber
  "#ff3b30", // red
  "#af52de", // purple
  "#5ac8fa", // light blue
  "#ffcc00", // yellow
  "#ff2d55", // pink
];

export function colorForCollection(name: string | undefined, allCollections: string[]): string {
  if (!name) return "#8e8e93"; // gray for uncategorized
  const idx = allCollections.indexOf(name);
  if (idx === -1) return "#8e8e93";
  return COLLECTION_COLORS[idx % COLLECTION_COLORS.length];
}

/**
 * Build graph nodes/edges from the memory library, Obsidian-style: every
 * memory is a node; edges connect memories that share a tag, share a
 * collection, or have a direct parent/child relationship. Edge weight for
 * tag/collection links is the number of things they share (more shared tags
 * = a stronger pull together), which is what gives the layout its
 * "clustering by topic" feel.
 */
export function buildGraphData(memories: Memory[]): GraphData {
  const nodes: GraphNode[] = memories.map((m) => ({
    id: m.id,
    label: m.content,
    collection: m.collection,
    radius: 6 + Math.min(6, (m.card.reps ?? 0) * 0.8),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  }));

  const edgeMap = new Map<string, GraphEdge>();
  function addEdge(a: string, b: string, kind: GraphEdge["kind"], weightDelta = 1) {
    if (a === b) return;
    const key = [a, b].sort().join("|") + "|" + kind;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight += weightDelta;
    } else {
      edgeMap.set(key, { source: a, target: b, kind, weight: weightDelta });
    }
  }

  // Tag-sharing edges
  const byTag = new Map<string, string[]>();
  for (const m of memories) {
    for (const tag of m.tags) {
      const list = byTag.get(tag) ?? [];
      list.push(m.id);
      byTag.set(tag, list);
    }
  }
  for (const ids of byTag.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addEdge(ids[i], ids[j], "tag");
      }
    }
  }

  // Collection-sharing edges (weaker pull — only added if no tag edge already
  // exists between the pair, to avoid over-densifying large collections)
  const byCollection = new Map<string, string[]>();
  for (const m of memories) {
    if (!m.collection) continue;
    const list = byCollection.get(m.collection) ?? [];
    list.push(m.id);
    byCollection.set(m.collection, list);
  }
  for (const ids of byCollection.values()) {
    if (ids.length > 40) continue; // avoid O(n^2) blowup on huge collections
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addEdge(ids[i], ids[j], "collection", 0.35);
      }
    }
  }

  // Parent/child structural edges
  for (const m of memories) {
    if (m.parentId) addEdge(m.id, m.parentId, "parent", 2);
  }

  return { nodes, edges: Array.from(edgeMap.values()) };
}
