import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAllMemories } from "../db/repository";
import type { Memory } from "../core/types";
import { buildGraphData, colorForCollection } from "../core/buildGraph";
import { initializeNodePositions, tick } from "../core/graph";
import type { GraphNode } from "../core/graph";
import { navigate } from "../components/Router";
import { ChevronRight } from "../components/Icons";

const DPR = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [filterCollection, setFilterCollection] = useState<string>("");

  // Camera / interaction state kept in refs so it doesn't trigger React
  // re-renders on every drag pixel — only the canvas repaints.
  const camera = useRef({ x: 0, y: 0, scale: 1 });
  const dragging = useRef<{ nodeId: string } | { pan: true; startX: number; startY: number; camX: number; camY: number } | null>(null);
  const sizeRef = useRef({ width: 800, height: 600 });

  useEffect(() => {
    getAllMemories().then((all) => {
      setMemories(all.filter((m) => !m.archived));
      setLoaded(true);
    });
  }, []);

  const allCollections = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => m.collection && set.add(m.collection));
    return Array.from(set).sort();
  }, [memories]);

  const filteredMemories = useMemo(() => {
    if (!filterCollection) return memories;
    return memories.filter((m) => m.collection === filterCollection);
  }, [memories, filterCollection]);

  const graphData = useMemo(() => buildGraphData(filteredMemories), [filteredMemories]);
  const memoryById = useMemo(() => {
    const map = new Map<string, Memory>();
    memories.forEach((m) => map.set(m.id, m));
    return map;
  }, [memories]);

  // Simulation + rendering loop
  useEffect(() => {
    if (!loaded) return;
    const canvasEl = canvasRef.current;
    const containerEl = containerRef.current;
    if (!canvasEl || !containerEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const container: HTMLDivElement = containerEl;

    const { nodes, edges } = graphData;
    const width = container.clientWidth;
    const height = container.clientHeight;
    sizeRef.current = { width, height };
    canvas.width = width * DPR;
    canvas.height = height * DPR;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(DPR, DPR);

    initializeNodePositions(nodes, width, height);
    camera.current = { x: 0, y: 0, scale: 1 };

    let raf = 0;
    let settleTicks = 0;
    const MAX_SETTLE_TICKS = 260;

    function draw() {
      const { width: w, height: h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      const cam = camera.current;
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.scale, cam.scale);

      const styles = getComputedStyle(document.documentElement);
      const separatorColor = styles.getPropertyValue("--separator").trim() || "rgba(120,120,120,0.3)";
      const labelColor = styles.getPropertyValue("--label").trim() || "#000";

      // Edges
      ctx.lineWidth = 1 / cam.scale;
      for (const edge of edges) {
        const a = nodes.find((n) => n.id === edge.source);
        const b = nodes.find((n) => n.id === edge.target);
        if (!a || !b) continue;
        ctx.strokeStyle = edge.kind === "parent" ? labelColor : separatorColor;
        ctx.globalAlpha = edge.kind === "parent" ? 0.5 : Math.min(0.5, 0.15 + edge.weight * 0.08);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Nodes
      for (const n of nodes) {
        const color = colorForCollection(n.collection, allCollections);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (selected?.id === n.id) {
          ctx.lineWidth = 2.5 / cam.scale;
          ctx.strokeStyle = labelColor;
          ctx.stroke();
        }
      }

      // Labels — only when zoomed in enough to avoid clutter
      if (cam.scale > 0.85) {
        ctx.fillStyle = labelColor;
        ctx.font = `${11 / cam.scale}px Inter, -apple-system, sans-serif`;
        ctx.textBaseline = "middle";
        for (const n of nodes) {
          const truncated = n.label.length > 28 ? n.label.slice(0, 28) + "…" : n.label;
          ctx.fillText(truncated, n.x + n.radius + 4 / cam.scale, n.y);
        }
      }

      ctx.restore();
    }

    function step() {
      if (settleTicks < MAX_SETTLE_TICKS) {
        tick(nodes, edges, { width: sizeRef.current.width, height: sizeRef.current.height });
        settleTicks++;
      } else if (dragging.current && "nodeId" in dragging.current) {
        // keep simulating gently while dragging so neighbors react
        tick(nodes, edges, { width: sizeRef.current.width, height: sizeRef.current.height });
      }
      draw();
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);

    function toWorld(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      const cam = camera.current;
      return {
        x: (clientX - rect.left - cam.x) / cam.scale,
        y: (clientY - rect.top - cam.y) / cam.scale,
      };
    }

    function findNodeAt(x: number, y: number): GraphNode | null {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = n.x - x;
        const dy = n.y - y;
        if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n;
      }
      return null;
    }

    let pointerDownAt: { x: number; y: number } | null = null;
    let draggedDistance = 0;

    function onPointerDown(e: PointerEvent) {
      const world = toWorld(e.clientX, e.clientY);
      const node = findNodeAt(world.x, world.y);
      pointerDownAt = { x: e.clientX, y: e.clientY };
      draggedDistance = 0;
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
        dragging.current = { nodeId: node.id };
        settleTicks = 0; // let it react
      } else {
        dragging.current = {
          pan: true,
          startX: e.clientX,
          startY: e.clientY,
          camX: camera.current.x,
          camY: camera.current.y,
        };
      }
      canvas.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging.current) return;
      if (pointerDownAt) {
        draggedDistance = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
      }
      if ("nodeId" in dragging.current) {
        const world = toWorld(e.clientX, e.clientY);
        const node = nodes.find((n) => n.id === (dragging.current as any).nodeId);
        if (node) {
          node.fx = world.x;
          node.fy = world.y;
        }
      } else {
        const d = dragging.current;
        camera.current.x = d.camX + (e.clientX - d.startX);
        camera.current.y = d.camY + (e.clientY - d.startY);
      }
    }

    function onPointerUp(e: PointerEvent) {
      // A "click" (open details) only counts if the pointer barely moved —
      // otherwise this was a drag (reposition a node, or pan the canvas) and
      // should not also open the sheet.
      const wasClick = draggedDistance < 4;
      if (dragging.current && "nodeId" in dragging.current) {
        const node = nodes.find((n) => n.id === (dragging.current as any).nodeId);
        if (node) {
          delete node.fx;
          delete node.fy;
          if (wasClick) setSelected(node);
        }
      }
      dragging.current = null;
      pointerDownAt = null;
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cam = camera.current;
      const zoomFactor = Math.exp(-e.deltaY * 0.001);
      const newScale = Math.min(4, Math.max(0.25, cam.scale * zoomFactor));
      // zoom toward pointer
      cam.x = mx - ((mx - cam.x) / cam.scale) * newScale;
      cam.y = my - ((my - cam.y) / cam.scale) * newScale;
      cam.scale = newScale;
    }

    function onResize() {
      if (!container || !canvas) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      sizeRef.current = { width: w, height: h };
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.scale(DPR, DPR);
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, graphData, allCollections]);

  const selectedMemory = selected ? memoryById.get(selected.id) : null;

  return (
    <div>
      <div className="nav-bar">
        <div className="nav-title-large">Graph</div>
      </div>

      {allCollections.length > 0 && (
        <div className="quick-add-field-row container-pad section-gap" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
          <button className={"chip" + (filterCollection === "" ? " active" : "")} onClick={() => setFilterCollection("")}>
            All
          </button>
          {allCollections.map((c) => (
            <button
              key={c}
              className={"chip" + (filterCollection === c ? " active" : "")}
              onClick={() => setFilterCollection(c)}
              style={filterCollection === c ? {} : { boxShadow: `inset 0 0 0 1.5px ${colorForCollection(c, allCollections)}` }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loaded && memories.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">Nothing to graph yet</div>
          <div>Add memories with shared tags or collections to see connections.</div>
        </div>
      )}

      {loaded && memories.length > 0 && (
        <div className="graph-container" ref={containerRef}>
          <canvas ref={canvasRef} className="graph-canvas" />
          {!selectedMemory && (
            <div className="graph-hint">Drag to pan · scroll to zoom · drag a node · tap for details</div>
          )}
        </div>
      )}

      {selectedMemory && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={(e: any) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div className="sheet-title">{selectedMemory.collection || "Memory"}</div>
              <button className="icon-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 8 }}>{selectedMemory.content}</div>
            {selectedMemory.tags.length > 0 && (
              <div className="memory-row-meta" style={{ marginBottom: 12 }}>
                {selectedMemory.tags.map((t) => (
                  <span className="badge" key={t}>{t}</span>
                ))}
              </div>
            )}
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate("/memory")}
              style={{ marginTop: 8 }}
            >
              View in Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
