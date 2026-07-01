import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  db,
  sm2,
  type KnowledgeObject,
  type KORelation,
  RELATION_LABELS,
} from '@/lib/db';

const RATING_LABELS = ['完全忘记', '困难', '吃力', '正常', '轻松', '太简单'] as const;
const RATING_EMOJIS = ['😰', '😟', '🤔', '🙂', '😊', '✨'];

export function ReviewPage() {
  const [queue, setQueue] = useState<KnowledgeObject[]>([]);
  const [index, setIndex] = useState(0);
  const [relations, setRelations] = useState<KORelation[]>([]);
  const [koMap, setKOMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  const loadQueue = async () => {
    const now = Date.now();
    const all = await db.knowledgeObjects.orderBy('createdAt').toArray();
    const due = all.filter((k) => (k.nextReviewAt ?? 0) <= now);
    setQueue(due);
    setIndex(0);
    setDone(false);
    setLoading(false);

    const map = new Map<number, string>();
    for (const k of all) {
      if (k.id != null) map.set(k.id, k.title);
    }
    setKOMap(map);
  };

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    const ko = queue[index];
    if (!ko?.id) {
      setRelations([]);
      return;
    }
    db.relations
      .where('sourceKoId')
      .equals(ko.id)
      .or('targetKoId')
      .equals(ko.id)
      .toArray()
      .then(setRelations);
  }, [index, queue]);

  const rate = async (quality: number) => {
    const ko = queue[index];
    if (!ko?.id) return;

    const result = sm2(quality, {
      ef: ko.ef,
      interval: ko.interval,
      repetitions: ko.repetitions,
    });

    await db.knowledgeObjects.update(ko.id, {
      ef: result.ef,
      interval: result.interval,
      repetitions: result.repetitions,
      nextReviewAt: result.nextReviewAt,
      lastReviewAt: Date.now(),
    });

    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    );
  }

  if (queue.length === 0 || done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="glass-card inline-flex flex-col items-center p-12">
          <span className="text-5xl">🎉</span>
          <h2
            className="mt-4 text-lg font-bold"
            style={{
              background: 'linear-gradient(180deg, hsl(222 22% 12%) 0%, hsl(222 22% 22%) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            全部完成！
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            没有待复习的知识条目
          </p>
          <button
            onClick={loadQueue}
            className="glass-btn-primary mt-6"
          >
            刷新
          </button>
        </div>
      </div>
    );
  }

  const ko = queue[index];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Progress */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(245,247,252,0.7))',
            border: '1px solid rgba(255,255,255,0.55)',
            boxShadow: 'inset 0 1px 2px rgba(18,23,38,0.05)',
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((index + 1) / queue.length) * 100}%`,
              background: 'linear-gradient(90deg, hsl(222 22% 28%) 0%, hsl(215 28% 52%) 100%)',
              boxShadow: '0 0 8px hsl(215 28% 52% / 0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
          {index + 1}/{queue.length}
        </span>
      </div>

      {/* Review Card */}
      <div className="glass-card-darker p-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground/90">
          {ko.title}
        </h1>

        {/* Meanings */}
        {ko.meanings && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            {ko.meanings}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5 text-xs text-muted-foreground/70">
          <span className="glass-chip">{ko.type}</span>
          <span className="truncate">{ko.source}</span>
        </div>

        {/* Relations */}
        {relations.length > 0 && (
          <div
            className="mt-5 pt-4"
            style={{
              borderTop: '1px solid',
              borderImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 50%, transparent) 1',
            }}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              关联
            </p>
            <ul className="space-y-1">
              {relations.map((r) => {
                const isSource = r.sourceKoId === ko.id;
                const linkedId = isSource ? r.targetKoId : r.sourceKoId;
                return (
                  <li key={r.id} className="text-xs text-muted-foreground">
                    {isSource ? '→' : '←'}{' '}
                    <span className="font-medium">{RELATION_LABELS[r.type]}</span>{' '}
                    <Link
                      to={`/ko/${linkedId}`}
                      className="text-accent hover:underline"
                    >
                      {koMap.get(linkedId) ?? `#${linkedId}`}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Rating buttons */}
        <div className="mt-8 grid grid-cols-6 gap-2">
          {RATING_LABELS.map((label, q) => (
            <button
              key={q}
              onClick={() => rate(q)}
              className="glass-card flex flex-col items-center py-3 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="text-lg transition-transform duration-150 group-hover:scale-110">{RATING_EMOJIS[q]}</span>
              <span className="mt-1 text-[11px] font-semibold text-foreground/75">
                {q}
              </span>
              <span className="text-[9px] text-muted-foreground/60">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
