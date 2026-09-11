// Force-directed graph layout — a small, dependency-free physics simulation
// (Fruchterman-Reingold / spring-electrical style, similar in spirit to what
// Obsidian's graph view and d3-force use) so nodes repel each other, edges
// pull connected nodes together, and everything settles into readable
// clusters without needing the d3 package (registry unreachable).

export interface GraphNode {
  id: string;
  label: string;
  collection?: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  // fixed during drag
  fx?: number;
  fy?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: "tag" | "collection" | "parent";
  weight: number; // shared tags count, or 1 for structural links
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface SimOptions {
  width: number;
  height: number;
  repulsion: number;
  linkDistance: number;
  linkStrength: number;
  centerStrength: number;
  damping: number;
}

const DEFAULT_OPTIONS: SimOptions = {
  width: 800,
  height: 600,
  repulsion: 2200,
  linkDistance: 70,
  linkStrength: 0.06,
  centerStrength: 0.015,
  damping: 0.82,
};

/** Advance the simulation by one tick, mutating node positions/velocities in place. */
export function tick(
  nodes: GraphNode[],
  edges: GraphEdge[],
  opts: Partial<SimOptions> = {}
): void {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const cx = o.width / 2;
  const cy = o.height / 2;

  // Repulsion (all-pairs) — fine for the node counts a personal memory
  // library produces (hundreds, not tens of thousands).
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let distSq = dx * dx + dy * dy;
      if (distSq < 0.01) {
        dx = (Math.random() - 0.5) * 0.1;
        dy = (Math.random() - 0.5) * 0.1;
        distSq = 0.01;
      }
      const dist = Math.sqrt(distSq);
      const force = o.repulsion / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  // Link attraction (springs)
  for (const edge of edges) {
    const a = nodes.find((n) => n.id === edge.source);
    const b = nodes.find((n) => n.id === edge.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const targetDist = o.linkDistance / Math.max(1, Math.sqrt(edge.weight));
    const diff = dist - targetDist;
    const strength = o.linkStrength * diff;
    const fx = (dx / dist) * strength;
    const fy = (dy / dist) * strength;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  // Weak centering force so the whole graph doesn't drift off-canvas
  for (const n of nodes) {
    n.vx += (cx - n.x) * o.centerStrength;
    n.vy += (cy - n.y) * o.centerStrength;
  }

  // Integrate
  for (const n of nodes) {
    if (n.fx !== undefined && n.fy !== undefined) {
      n.x = n.fx;
      n.y = n.fy;
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx *= o.damping;
    n.vy *= o.damping;
    n.x += n.vx;
    n.y += n.vy;
  }
}

export function initializeNodePositions(nodes: GraphNode[], width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 3;
  nodes.forEach((n, i) => {
    const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
    n.x = cx + Math.cos(angle) * r + (Math.random() - 0.5) * 20;
    n.y = cy + Math.sin(angle) * r + (Math.random() - 0.5) * 20;
    n.vx = 0;
    n.vy = 0;
  });
}
