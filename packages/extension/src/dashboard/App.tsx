import { useCallback, useEffect, useState } from 'react';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { InboxPage } from './pages/InboxPage';
import { LibraryPage } from './pages/LibraryPage';
import { KODetailPage } from './pages/KODetailPage';
import { ReviewPage } from './pages/ReviewPage';
import { GraphPage } from './pages/GraphPage';
import { db } from '@/lib/db';

const NAV_ITEMS = [
  { path: '/', label: '收件箱', icon: '📥' },
  { path: '/library', label: '知识库', icon: '📚' },
  { path: '/review', label: '复习', icon: '🧠' },
  { path: '/graph', label: '图谱', icon: '🔗' },
];

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDetail = location.pathname.startsWith('/ko/');
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    const update = async () => {
      const now = Date.now();
      const all = await db.knowledgeObjects.toArray();
      setDueCount(all.filter((k) => (k.nextReviewAt ?? 0) <= now).length);
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, []);

  if (isDetail) return null;

  return (
    <nav className="glass-nav">
      <div className="mx-auto flex max-w-2xl">
        {NAV_ITEMS.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-all duration-200 ${
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground/55 hover:text-muted-foreground'
              }`}
            >
              <span className={`text-base transition-transform duration-200 ${active ? 'scale-110 drop-shadow-sm' : ''}`}>{icon}</span>
              <span className="flex items-center gap-1">
                {label}
                {path === '/review' && dueCount > 0 && (
                  <span
                    className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-primary-foreground"
                    style={{
                      background: 'linear-gradient(180deg, hsl(222 22% 26%) 0%, hsl(222 26% 14%) 100%)',
                      boxShadow: '0 1px 3px rgba(18,23,38,0.3), inset 0 1px 0 rgba(255,255,255,0.22)',
                    }}
                  >
                    {dueCount}
                  </span>
                )}
              </span>
              {active && (
                <span
                  className="absolute -top-[1px] left-1/4 right-1/4 h-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, hsl(222 22% 18%) 30%, hsl(215 28% 52%) 50%, hsl(222 22% 18%) 70%, transparent 100%)',
                    boxShadow: '0 0 8px hsl(215 28% 52% / 0.45)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Layout() {
  const [inboxKey, setInboxKey] = useState(0);

  const handleConvert = useCallback(() => {
    setInboxKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen pb-16">
      <Routes>
        <Route path="/" element={<InboxPage key={inboxKey} onConvert={handleConvert} />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/ko/:id" element={<KODetailPage />} />
      </Routes>
      <NavBar />
    </div>
  );
}

export function App() {
  return (
    <MemoryRouter>
      <Layout />
    </MemoryRouter>
  );
}
