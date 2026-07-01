import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, type KnowledgeObject, type Category, type Tag, type KOTag, seedCategories } from '@/lib/db';

export function LibraryPage() {
  const [kos, setKOs] = useState<KnowledgeObject[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [koTags, setKOTags] = useState<KOTag[]>([]);
  const [filterId, setFilterId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az' | 'za' | 'count'>('newest');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    seedCategories().then(() =>
      Promise.all([
        db.knowledgeObjects.orderBy('createdAt').reverse().toArray(),
        db.categories.toArray(),
        db.tags.toArray(),
        db.koTags.toArray(),
      ]).then(([kos, cats, tags, koTags]) => {
        setKOs(kos);
        setCats(cats);
        setTags(tags);
        setKOTags(koTags);
        setLoading(false);
      }),
    );
  }, []);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  let filtered = filterId ? kos.filter((k) => k.categoryId === filterId) : kos;

  if (selectedTagIds.size > 0) {
    const koTagCount = new Map<number, number>();
    for (const kt of koTags) {
      if (selectedTagIds.has(kt.tagId)) {
        koTagCount.set(kt.koId, (koTagCount.get(kt.koId) ?? 0) + 1);
      }
    }
    const target = selectedTagIds.size;
    const validKoIds = new Set<number>();
    for (const [koId, count] of koTagCount) {
      if (count >= target) validKoIds.add(koId);
    }
    filtered = filtered.filter((k) => k.id != null && validKoIds.has(k.id));
  }

  const catName = (id?: number) => cats.find((c) => c.id === id)?.name;

  const relevantKoIds = new Set(filtered.map((k) => k.id!).filter(Boolean));
  const relevantTagIds = new Set(
    koTags.filter((kt) => relevantKoIds.has(kt.koId)).map((kt) => kt.tagId),
  );
  const visibleTags = tags.filter((t) => relevantTagIds.has(t.id!));

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return a.createdAt - b.createdAt;
      case 'az':
        return a.title.localeCompare(b.title);
      case 'za':
        return b.title.localeCompare(a.title);
      case 'count':
        return (b.searchCount ?? 1) - (a.searchCount ?? 1);
      default:
        return b.createdAt - a.createdAt;
    }
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-baseline gap-3">
        <h1
          className="text-xl font-bold tracking-tight"
          style={{
            background: 'linear-gradient(180deg, hsl(222 22% 12%) 0%, hsl(222 22% 22%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          知识库
        </h1>
        {!loading && kos.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground/60">
            共 {kos.length} 条
          </span>
        )}
      </div>

      {/* Category filter chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilterId(null)}
          className={filterId === null ? 'glass-chip-active' : 'glass-chip'}
        >
          全部
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterId(c.id!)}
            className={filterId === c.id ? 'glass-chip-active' : 'glass-chip'}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Tag filter chips */}
      {visibleTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {visibleTags.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTag(t.id!)}
              className={
                selectedTagIds.has(t.id!) ? 'glass-chip-active' : 'glass-chip'
              }
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Sort + count bar */}
      {!loading && filtered.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-muted-foreground/70">
            {filtered.length} 个词
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="glass-select ml-auto"
          >
            <option value="newest">最近添加</option>
            <option value="oldest">最早添加</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="count">搜索次数</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : sorted.length === 0 ? (
        <div className="glass-card-darker flex flex-col items-center p-12">
          <span className="text-4xl opacity-70">📚</span>
          <p className="mt-3 text-sm text-muted-foreground">
            {filterId || selectedTagIds.size > 0
              ? '没有匹配的知识条目'
              : '暂无知识条目'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            在收件箱中将搜索记录转为 KO 即可在此查看
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((ko) => (
            <li
              key={ko.id}
              onClick={() => navigate(`/ko/${ko.id}`)}
              className="glass-card flex cursor-pointer items-center justify-between px-5 py-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-px"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground/90">
                  {ko.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/65">
                  {catName(ko.categoryId) || '未分类'} ·{' '}
                  {new Date(ko.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className="ml-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(245,247,252,0.5) 100%)',
                  border: '1px solid rgba(255,255,255,0.6)',
                  color: 'hsl(222 18% 30%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(18,23,38,0.04)',
                }}
              >
                ×{ko.searchCount ?? 1}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
