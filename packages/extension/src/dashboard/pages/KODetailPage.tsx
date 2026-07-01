import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  db,
  type KnowledgeObject,
  type Category,
  type Tag,
  type KORelation,
  type RelationType,
  seedCategories,
  RELATION_TYPES,
  RELATION_LABELS,
} from '@/lib/db';

export function KODetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ko, setKO] = useState<KnowledgeObject | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [relations, setRelations] = useState<KORelation[]>([]);
  const [allKOs, setAllKOs] = useState<KnowledgeObject[]>([]);
  const [relTarget, setRelTarget] = useState('');
  const [relType, setRelType] = useState<RelationType>('related_to');
  const [editTitle, setEditTitle] = useState('');
  const [editMeanings, setEditMeanings] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!id) return;
    const kid = Number(id);
    const [koData, rels, kos] = await Promise.all([
      db.knowledgeObjects.get(kid),
      db.relations
        .where('sourceKoId')
        .equals(kid)
        .or('targetKoId')
        .equals(kid)
        .toArray(),
      db.knowledgeObjects.orderBy('title').toArray(),
    ]);
    setKO(koData ?? null);
    setEditTitle(koData?.title ?? '');
    setEditMeanings(koData?.meanings ?? '');
    setRelations(rels);
    setAllKOs(kos.filter((k) => k.id !== kid));
    if (koData?.id) {
      const kotags = await db.koTags.where('koId').equals(koData.id).toArray();
      const tagIds = kotags.map((kt) => kt.tagId);
      const tagList = await db.tags.bulkGet(tagIds);
      setTags(tagList.filter(Boolean) as Tag[]);
    }
  };

  useEffect(() => {
    seedCategories().then(() => db.categories.toArray().then(setCats));
    load();
  }, [id]);

  const saveTitle = async () => {
    if (!ko?.id) return;
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditTitle(ko.title);
      return;
    }
    await db.knowledgeObjects.update(ko.id, { title: trimmed, updatedAt: Date.now() });
    load();
  };

  const saveMeanings = async () => {
    if (!ko?.id) return;
    await db.knowledgeObjects.update(ko.id, {
      meanings: editMeanings.trim() || undefined,
      updatedAt: Date.now(),
    });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const updateCategory = async (categoryId: number | undefined) => {
    if (!ko?.id) return;
    await db.knowledgeObjects.update(ko.id, { categoryId, updatedAt: Date.now() });
    load();
  };

  const addTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed || !ko?.id) return;

    let tag = await db.tags.where('name').equals(trimmed).first();
    if (!tag) {
      const tagId = await db.tags.add({ name: trimmed });
      tag = { id: tagId, name: trimmed };
    }

    const existing = await db.koTags.where({ koId: ko.id, tagId: tag.id }).first();
    if (!existing) {
      await db.koTags.add({ koId: ko.id, tagId: tag.id! });
    }

    setNewTag('');
    inputRef.current?.focus();
    load();
  };

  const removeTag = async (tagId: number) => {
    if (!ko?.id) return;
    await db.koTags.where({ koId: ko.id, tagId }).delete();
    load();
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const addRelation = async () => {
    if (!ko?.id || !relTarget) return;
    const targetId = Number(relTarget);
    const exists = await db.relations
      .where({ sourceKoId: ko.id, targetKoId: targetId, type: relType })
      .first();
    if (exists) return;
    await db.relations.add({ sourceKoId: ko.id, targetKoId: targetId, type: relType });
    setRelTarget('');
    load();
  };

  const removeRelation = async (relId: number) => {
    await db.relations.delete(relId);
    load();
  };

  const getKOTitle = (kid: number) => allKOs.find((k) => k.id === kid)?.title ?? `#${kid}`;

  if (!ko) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <span className="text-sm">←</span> 返回
      </button>

      <div className="glass-card-darker p-6">
        {/* Title */}
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={handleTitleKeyDown}
          className="w-full border-0 bg-transparent text-2xl font-bold tracking-tight text-foreground/90 outline-none ring-0 placeholder:text-foreground/20 focus:ring-0"
        />

        {/* Meanings */}
        <textarea
          value={editMeanings}
          onChange={(e) => setEditMeanings(e.target.value)}
          onBlur={saveMeanings}
          placeholder="中文释义（自动获取，可手动修改）"
          rows={3}
          className="glass-input mt-3 w-full resize-none leading-relaxed text-muted-foreground"
        />

        {/* Meta info */}
        <div className="mt-6 space-y-3 text-sm">
          {/* Category */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground/70 w-12 text-xs">分类</span>
            <select
              value={ko.categoryId ?? ''}
              onChange={(e) => updateCategory(e.target.value ? Number(e.target.value) : undefined)}
              className="glass-select flex-1"
            >
              <option value="">未分类</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="shrink-0 text-muted-foreground/70 w-12 text-xs">标签</span>
            {tags.map((t) => (
              <span key={t.id} className="glass-chip-active">
                {t.name}
                <button
                  onClick={() => removeTag(t.id!)}
                  className="ml-0.5 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? '+ 添加标签' : '+'}
              className="w-24 rounded-full border border-white/55 bg-white/45 backdrop-blur px-2.5 py-0.5 text-xs placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
            />
          </div>

          {/* Type badge */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground/70 w-12 text-xs">类型</span>
            <span className="glass-chip text-[11px]">{ko.type}</span>
          </div>

          {/* Source */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground/70 w-12 text-xs">来源</span>
            <span className="truncate text-xs text-muted-foreground">{ko.source}</span>
          </div>

          {/* Search count */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground/70 w-12 text-xs">搜索</span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(245,247,252,0.5) 100%)',
                border: '1px solid rgba(255,255,255,0.6)',
                color: 'hsl(222 18% 28%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
              }}
            >
              ×{ko.searchCount ?? 1}
            </span>
          </div>

          {/* Created time */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground/70 w-12 text-xs">创建</span>
            <span className="text-xs text-muted-foreground">
              {new Date(ko.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Relations */}
        <div
          className="mt-6 pt-5"
          style={{
            borderTop: '1px solid',
            borderImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 50%, transparent) 1',
          }}
        >
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            关联
          </h3>

          {relations.length > 0 ? (
            <ul className="mb-3 space-y-1">
              {relations.map((r) => {
                const isSource = r.sourceKoId === ko.id;
                const linkedId = isSource ? r.targetKoId : r.sourceKoId;
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Link
                      to={`/ko/${linkedId}`}
                      className="flex-1 truncate rounded-lg px-2 py-1 text-foreground/75 hover:bg-white/50 hover:underline transition-colors"
                    >
                      {isSource ? '→' : '←'}{' '}
                      <span className="text-muted-foreground/70">
                        {RELATION_LABELS[r.type]}
                      </span>{' '}
                      {getKOTitle(linkedId)}
                    </Link>
                    <button
                      onClick={() => removeRelation(r.id!)}
                      className="shrink-0 rounded-full p-0.5 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground/50">暂无关联</p>
          )}

          {/* Add relation */}
          <div className="flex items-center gap-1.5">
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value as RelationType)}
              className="glass-select text-[11px]"
            >
              {RELATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RELATION_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              value={relTarget}
              onChange={(e) => setRelTarget(e.target.value)}
              className="glass-select min-w-0 flex-1 text-[11px]"
            >
              <option value="">选择知识条目…</option>
              {allKOs.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.title}
                </option>
              ))}
            </select>
            <button
              onClick={addRelation}
              disabled={!relTarget}
              className="glass-btn-primary shrink-0 px-2.5 py-1 text-[11px] disabled:opacity-30"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
