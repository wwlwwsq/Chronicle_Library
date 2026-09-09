/**
 * 书签的本地存储（按书隔离）。
 *
 * 阅读进度本就存在 localStorage（Epub 存 CFI / Txt 存页码），书签沿用
 * 同一模式：每本书一个独立 key，无需登录与后端改动，删除书籍条目时
 * 无需清理（key 按书 id 隔离，不会串书）。
 */

export type BookmarkBase = {
  id: string;
  /** 用户自定义名称，未命名时保存默认名（当前章节/页码） */
  name: string;
  createdAt: number;
};

/** EPUB 书签：以 CFI 精确定位到页，chapter 为收藏时章节名（展示用快照） */
export type EpubBookmark = BookmarkBase & { cfi: string; chapter: string };

/** TXT 书签：以页码定位（分页算法固定，页码稳定） */
export type TxtBookmark = BookmarkBase & { page: number };

export const bookmarkKey = (bookId: number) => `mbw:bookmarks:${bookId}`;

export function newBookmarkId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `bm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function loadBookmarks<T extends BookmarkBase>(bookId: number): T[] {
  try {
    const raw = localStorage.getItem(bookmarkKey(bookId));
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // 兼容脏数据：过滤掉损坏/旧版本的不完整条目（null、缺 id/name/createdAt），
    // 否则渲染排序（createdAt）与查找比较（cfi/page）时会抛错或行为异常
    return list.filter(
      (b): b is T =>
        typeof b === "object" &&
        b !== null &&
        typeof (b as { id?: unknown }).id === "string" &&
        typeof (b as { name?: unknown }).name === "string" &&
        Number.isFinite((b as { createdAt?: unknown }).createdAt)
    );
  } catch {
    return [];
  }
}

export function saveBookmarks<T extends BookmarkBase>(
  bookId: number,
  list: T[]
): void {
  try {
    localStorage.setItem(bookmarkKey(bookId), JSON.stringify(list));
  } catch {
    // 存储满/隐私模式等写入失败时静默：书签仅在本次会话内有效
  }
}
