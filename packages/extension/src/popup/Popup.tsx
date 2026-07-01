import { useEffect, useState } from 'react';
import { APP_NAME, APP_SLOGAN, VERSION } from '@lexgraph/shared';
import { db } from '@/lib/db';

export function Popup() {
  const [inboxCount, setInboxCount] = useState<number | null>(null);
  const [koCount, setKOCount] = useState<number | null>(null);
  const [dueCount, setDueCount] = useState<number | null>(null);

  useEffect(() => {
    db.searchRecords.where('status').equals('inbox').count().then(setInboxCount);
    db.knowledgeObjects.count().then(setKOCount);
    db.knowledgeObjects.toArray().then((all) => {
      const now = Date.now();
      setDueCount(all.filter((k) => (k.nextReviewAt ?? 0) <= now).length);
    });
  }, []);

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
  };

  return (
    <div
      className="flex w-[300px] flex-col items-center gap-4 p-5 text-center"
      style={{
        background:
          'radial-gradient(ellipse 90% 60% at 50% -20%, hsl(215 28% 70% / 0.10), transparent 60%), radial-gradient(ellipse 70% 55% at 110% 90%, hsl(220 20% 60% / 0.08), transparent 60%), linear-gradient(180deg, hsl(220 20% 97%) 0%, hsl(220 16% 94%) 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-2">
        <span className="text-2xl drop-shadow-sm">📖</span>
        <h1
          className="text-lg font-bold tracking-tight"
          style={{
            background: 'linear-gradient(180deg, hsl(222 22% 12%) 0%, hsl(222 22% 22%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {APP_NAME}
        </h1>
      </div>
      <p className="-mt-2 text-[11px] text-muted-foreground/70">{APP_SLOGAN}</p>

      {/* Stats cards */}
      <div className="flex w-full gap-2.5">
        <StatCard label="收件箱" value={inboxCount} />
        <StatCard label="知识" value={koCount} />
        <StatCard label="待复习" value={dueCount} />
      </div>

      {/* Open button */}
      <button onClick={openDashboard} className="glass-btn-primary w-full py-2.5">
        打开面板
      </button>

      <p className="text-[10px] text-muted-foreground/50">v{VERSION}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="glass-card flex flex-1 flex-col items-center py-3">
      <p
        className="text-xl font-bold tabular-nums"
        style={{
          background: 'linear-gradient(180deg, hsl(222 22% 12%) 0%, hsl(222 22% 28%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {value ?? '—'}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground/65">{label}</p>
    </div>
  );
}
