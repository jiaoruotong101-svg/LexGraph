import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, type Category, RELATION_LABELS, seedCategories } from '@/lib/db';

/* Premium monochrome palette with subtle steel-blue accents.
   Each color carries enough lightness variation to stay distinguishable
   while preserving the high-end grayscale aesthetic. */
const CAT_COLORS = [
  '#2a2f3a', // graphite
  '#4a5260', // dark slate
  '#6b7585', // mid slate
  '#8a94a4', // light slate
  '#5e81ac', // steel blue (subtle accent)
  '#7c92b3', // light steel blue
  '#9ca8b8', // silver
  '#b8c0cc', // pale silver
];

interface GraphNode {
  id: number;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
}

interface GraphEdge {
  source: number;
  target: number;
  type: string;
}

export function GraphPage() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const animRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      await seedCategories();
      const [kos, rels, categories] = await Promise.all([
        db.knowledgeObjects.toArray(),
        db.relations.toArray(),
        db.categories.toArray(),
      ]);
      setCats(categories);

      if (kos.length === 0) {
        setLoading(false);
        return;
      }

      const colorMap = new Map<number, string>();
      categories.forEach((c, i) => {
        if (c.id != null) colorMap.set(c.id, CAT_COLORS[i % CAT_COLORS.length]);
      });

      const cx = 400, cy = 300;
      const nodeArr: GraphNode[] = kos.map((k, i) => {
        const angle = (2 * Math.PI * i) / kos.length;
        const r = 150 + Math.random() * 50;
        return {
          id: k.id!,
          title: k.title,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          vx: 0,
          vy: 0,
          color: colorMap.get(k.categoryId ?? -1) ?? '#94a3b8',
          radius: Math.min(42, 18 + Math.log2(k.searchCount ?? 1) * 5),
        };
      });

      const nodeIds = new Set(nodeArr.map((n) => n.id));
      const edgeArr: GraphEdge[] = rels
        .filter((r) => nodeIds.has(r.sourceKoId) && nodeIds.has(r.targetKoId))
        .map((r) => ({
          source: r.sourceKoId,
          target: r.targetKoId,
          type: RELATION_LABELS[r.type],
        }));

      setNodes(nodeArr);
      setEdges(edgeArr);
      setLoading(false);
    })();
  }, []);

  const simulate = useCallback(() => {
    setNodes((prev) => {
      if (prev.length === 0) return prev;
      const ns = prev.map((n) => ({ ...n }));
      const width = 800, height = 600;
      const centerX = width / 2, centerY = height / 2;

      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 8000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          ns[i].vx -= fx;
          ns[i].vy -= fy;
          ns[j].vx += fx;
          ns[j].vy += fy;
        }
      }

      for (const e of edges) {
        const s = ns.find((n) => n.id === e.source);
        const t = ns.find((n) => n.id === e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.02;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      for (const n of ns) {
        n.vx += (centerX - n.x) * 0.001;
        n.vy += (centerY - n.y) * 0.001;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(30, Math.min(width - 30, n.x));
        n.y = Math.max(30, Math.min(height - 30, n.y));
      }

      return ns;
    });

    animRef.current = requestAnimationFrame(simulate);
  }, [edges]);

  useEffect(() => {
    if (nodes.length > 0) {
      animRef.current = requestAnimationFrame(simulate);
      return () => cancelAnimationFrame(animRef.current);
    }
  }, [nodes.length > 0, simulate]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="glass-card-darker inline-flex flex-col items-center p-12">
          <span className="text-5xl opacity-70">🔗</span>
          <p className="mt-3 text-sm text-muted-foreground">
            暂无知识条目可展示
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            在收件箱中将搜索记录转为 KO 后即可在此查看知识图谱
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1
        className="mb-4 text-xl font-bold tracking-tight"
        style={{
          background: 'linear-gradient(180deg, hsl(222 22% 12%) 0%, hsl(222 22% 22%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        知识图谱
      </h1>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-2">
        {cats.map((c, i) => (
          <span key={c.id} className="glass-chip">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor: CAT_COLORS[i % CAT_COLORS.length],
                boxShadow: `0 0 6px ${CAT_COLORS[i % CAT_COLORS.length]}88`,
              }}
            />
            {c.name}
          </span>
        ))}
      </div>

      {/* Graph container */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(245,247,252,0.5) 50%, rgba(238,241,247,0.55) 100%)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow:
            '0 10px 36px rgba(18,23,38,0.1), 0 2px 8px rgba(18,23,38,0.05), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.3)',
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 800 600"
          className="h-[500px] w-full"
        >
          {/* Defs for premium glow + radial gradient on nodes */}
          <defs>
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="node-shine" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const s = nodes.find((n) => n.id === e.source);
            const t = nodes.find((n) => n.id === e.target);
            if (!s || !t) return null;
            const mx = (s.x + t.x) / 2;
            const my = (s.y + t.y) / 2;
            return (
              <g key={i}>
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeOpacity={0.55}
                  strokeDasharray="0"
                />
                <text
                  x={mx}
                  y={my - 5}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize={9}
                  fontWeight={500}
                  style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.85)', strokeWidth: 2.5 }}
                >
                  {e.type}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => (
            <g
              key={n.id}
              className="cursor-pointer"
              onClick={() => navigate(`/ko/${n.id}`)}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius}
                fill={n.color}
                stroke="rgba(255,255,255,0.7)"
                strokeWidth={2.5}
                opacity={0.95}
                filter="url(#node-glow)"
              />
              {/* Glossy highlight overlay */}
              <circle
                cx={n.x}
                cy={n.y}
                r={n.radius}
                fill="url(#node-shine)"
                pointerEvents="none"
              />
              <text
                x={n.x}
                y={n.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={11}
                fontWeight={700}
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
              >
                {n.title.slice(0, 2).toUpperCase()}
              </text>
              <text
                x={n.x}
                y={n.y + n.radius + 14}
                textAnchor="middle"
                fill="#475569"
                fontSize={10}
                fontWeight={500}
                style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.8)', strokeWidth: 2.5 }}
              >
                {n.title.length > 16 ? n.title.slice(0, 16) + '…' : n.title}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
