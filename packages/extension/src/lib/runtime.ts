/**
 * 检测当前代码运行环境。
 * 在 Edge Extension 中，同样的代码可能运行在 Service Worker、Popup 或独立 Tab 中。
 */

export type RuntimeContext = 'background' | 'popup' | 'dashboard' | 'unknown';

export function getRuntimeContext(): RuntimeContext {
  if (typeof window === 'undefined') {
    return 'background';
  }
  const url = window.location.href;
  if (url.includes('popup')) {
    return 'popup';
  }
  if (url.includes('dashboard')) {
    return 'dashboard';
  }
  return 'unknown';
}

export function isExtension(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
}
