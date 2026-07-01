/**
 * 通过 Background Service Worker 查询有道词典的中文释义。
 * Dashboard 页面受 CORS 限制，不能直接请求外部 API，
 * 所以改为发消息给 Service Worker 代为请求。
 */
export async function fetchChineseMeanings(word: string): Promise<string | null> {
  // 非英文单词跳过
  if (!/^[a-zA-Z\s\-']+$/.test(word)) return null;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_MEANINGS',
      word,
    });
    return response?.meanings ?? null;
  } catch {
    return null;
  }
}
