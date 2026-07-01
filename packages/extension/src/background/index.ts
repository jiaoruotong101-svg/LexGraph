import { db } from '@/lib/db';
import { autoCategorize } from '@/lib/categorize';

console.log('[LexGraph] Background Service Worker started');

/**
 * 从搜索结果页 URL 中提取搜索词。
 * 支持 Google、Bing、Baidu。
 */
function extractSearchTerm(url: string): { term: string; engine: string } | null {
  try {
    const u = new URL(url);

    // Google: /search?q=...
    if (u.hostname.includes('google.')) {
      const q = u.searchParams.get('q');
      if (q) return { term: q.trim(), engine: 'Google' };
    }

    // Bing: /search?q=...
    if (u.hostname.includes('bing.')) {
      const q = u.searchParams.get('q');
      if (q) return { term: q.trim(), engine: 'Bing' };
    }

    // Baidu: /s?wd=... or /s?word=...
    if (u.hostname.includes('baidu.')) {
      const wd = u.searchParams.get('wd') || u.searchParams.get('word');
      if (wd) return { term: wd.trim(), engine: 'Baidu' };
    }

    // Sogou: /web?query=...
    if (u.hostname.includes('sogou.')) {
      const q = u.searchParams.get('query');
      if (q) return { term: q.trim(), engine: 'Sogou' };
    }

    // 360 Search: /s?q= or /search?q=
    if (u.hostname.includes('so.com')) {
      const q = u.searchParams.get('q');
      if (q) return { term: q.trim(), engine: '360搜索' };
    }
  } catch {
    // 无效 URL，忽略
  }
  return null;
}

/**
 * 监听标签页 URL 变化，自动捕获搜索引擎的搜索词。
 */
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const result = extractSearchTerm(tab.url);
  if (!result) return;

  // 只捕获纯英文搜索词（允许字母、空格、连字符、撇号）
  if (!/^[a-zA-Z\s\-']+$/.test(result.term)) return;

  db.searchRecords
    .add({
      searchTerm: result.term,
      searchEngine: result.engine,
      url: tab.url,
      timestamp: Date.now(),
      status: 'inbox',
    })
    .then(() => {
      console.log(`[LexGraph] Captured: "${result.term}" (${result.engine})`);
    })
    .catch((err) => {
      console.error('[LexGraph] Failed to save search record:', err);
    });
});

// ─── 右键菜单：选中网页中的单词直接捕获到知识库 ───

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-word',
    title: '捕获到 LexGraph',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'capture-word' || !info.selectionText) return;

  const word = info.selectionText.trim();

  // 只捕获纯英文
  if (!/^[a-zA-Z\s\-']+$/.test(word)) return;

  // 去重：已存在则累加搜索次数
  const existing = await db.knowledgeObjects.where('title').equals(word).first();

  if (existing?.id) {
    const count = (existing.searchCount ?? 1) + 1;
    // 已有 KO 但未分类 → 尝试用已存释义自动分类
    const updateData: Record<string, unknown> = {
      searchCount: count,
      updatedAt: Date.now(),
    };
    if (!existing.categoryId && existing.meanings) {
      const catId = await autoCategorize(existing.meanings);
      if (catId != null) updateData.categoryId = catId;
    }
    await db.knowledgeObjects.update(existing.id, updateData);
    console.log(`[LexGraph] 右键捕获: "${word}" 搜索次数 +1 → ${count}`);
  } else {
    const meanings = await queryYoudao(word);
    await db.knowledgeObjects.add({
      title: word,
      type: 'word',
      source: `网页选中: ${tab?.url || 'unknown'}`,
      meanings: meanings ?? undefined,
      categoryId: await autoCategorize(meanings),
      searchCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    console.log(`[LexGraph] 右键捕获: "${word}" 已加入知识库`);
  }
});

/**
 * 有道词典 API — 查询英文单词的中文释义。
 * 放在 Service Worker 中执行，避开 CORS 限制。
 */
async function queryYoudao(word: string): Promise<string | null> {
  if (!/^[a-zA-Z\s\-']+$/.test(word)) return null;

  try {
    const res = await fetch(
      `https://dict.youdao.com/suggest?num=5&ver=3.0&doctype=json&cache=false&le=en&q=${encodeURIComponent(word)}`,
    );
    if (!res.ok) return null;

    const json = await res.json();
    const entries = json?.data?.entries;
    if (!entries || entries.length === 0) return null;

    const explain = entries[0]?.explain;
    return explain?.trim() ?? null;
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FETCH_MEANINGS' && message?.word) {
    queryYoudao(message.word).then((result) => sendResponse({ meanings: result }));
    return true;
  }
});
