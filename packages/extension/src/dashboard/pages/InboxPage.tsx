import { useEffect, useState } from 'react';
import { db, type SearchRecord } from '@/lib/db';
import { fetchChineseMeanings } from '@/lib/dictionary';
import { autoCategorize } from '@/lib/categorize';

interface Props {
  onConvert?: () => void;
}

export function InboxPage({ onConvert }: Props) {
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    const all = await db.searchRecords.orderBy('timestamp').reverse().toArray();
    setRecords(all);
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const convertToKO = async (r: SearchRecord) => {
    if (!r.id) return;

    const existing = await db.knowledgeObjects
      .where('title')
      .equals(r.searchTerm)
      .first();

    if (existing?.id) {
      const count = (existing.searchCount ?? 1) + 1;
      const updateData: Record<string, unknown> = {
        source: `${r.searchEngine}: ${r.url}`,
        searchCount: count,
        updatedAt: Date.now(),
      };
      if (!existing.categoryId && existing.meanings) {
        const catId = await autoCategorize(existing.meanings);
        if (catId != null) updateData.categoryId = catId;
      }
      await db.knowledgeObjects.update(existing.id, updateData);
    } else {
      const meanings = await fetchChineseMeanings(r.searchTerm);
      await db.knowledgeObjects.add({
        title: r.searchTerm,
        type: 'word',
        source: `${r.searchEngine}: ${r.url}`,
        searchRecordId: r.id,
        meanings: meanings ?? undefined,
        categoryId: await autoCategorize(meanings),
        searchCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await db.searchRecords.update(r.id, { status: 'archived' });
    loadRecords();
    onConvert?.();
  };

  const archive = async (id: number) => {
    await db.searchRecords.update(id, { status: 'archived' });
    loadRecords();
  };

  const inboxRecords = records.filter((r) => r.status === 'inbox');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-baseline gap-3">
        <h1
          className="text-xl font-bold tracking-tight"
          style={{
            background: 'linear-gradient(180deg, hsl(222 22% 12%) 0%, hsl(222 22% 22%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          收件箱
        </h1>
        {!loading && inboxRecords.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground/60">
            {inboxRecords.length} 条待处理
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : inboxRecords.length === 0 ? (
        <div className="glass-card-darker flex flex-col items-center p-12">
          <span className="text-4xl opacity-70">📥</span>
          <p className="mt-3 text-sm text-muted-foreground">暂无搜索记录</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            在搜索引擎中搜索英文单词后会自动出现在这里
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {inboxRecords.map((r) => (
            <li
              key={r.id}
              className="glass-card flex items-center justify-between px-5 py-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-px"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground/90">
                  {r.searchTerm}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/65">
                  {r.searchEngine} · {new Date(r.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 gap-1.5">
                <button
                  onClick={() => convertToKO(r)}
                  className="glass-btn-primary px-3 py-1.5 text-xs"
                >
                  + KO
                </button>
                <button
                  onClick={() => r.id && archive(r.id)}
                  className="glass-btn px-2.5 py-1.5 text-xs text-muted-foreground"
                >
                  忽略
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
