"use client";

import { useEffect, useRef, useState } from "react";

export type BookmarkView = {
  id: string;
  name: string;
  /** 位置说明（章节名/页码），展示在名称下方 */
  sub?: string;
};

/**
 * 书签抽屉（右侧滑出）。
 * 通用展示层：增（可命名）、删、改名、跳转全部通过回调交给阅读器，
 * 组件自身只管理「添加输入行 / 行内改名输入」两类瞬态 UI 状态。
 *
 * 关闭时内容整体卸载：瞬态输入状态随内部组件销毁，每次打开都从干净状态开始。
 */
export default function BookmarkPanel({
  open,
  onClose,
  items,
  canAdd,
  defaultName,
  notice,
  highlightId,
  onAdd,
  onJump,
  onRename,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  items: BookmarkView[];
  /** 阅读器就绪（有当前页）前禁止添加 */
  canAdd: boolean;
  /** 新书签默认名（通常为当前章节名/页码），可预填后修改 */
  defaultName: string;
  /** 顶部短暂提示（如"这里已有书签"） */
  notice: string | null;
  /** 需要滚动到并高亮的书签 id（如添加重复位置时） */
  highlightId: string | null;
  onAdd: (name: string) => void;
  onJump: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <PanelBody
      onClose={onClose}
      items={items}
      canAdd={canAdd}
      defaultName={defaultName}
      notice={notice}
      highlightId={highlightId}
      onAdd={onAdd}
      onJump={onJump}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
}

function PanelBody({
  onClose,
  items,
  canAdd,
  defaultName,
  notice,
  highlightId,
  onAdd,
  onJump,
  onRename,
  onDelete,
}: {
  onClose: () => void;
  items: BookmarkView[];
  canAdd: boolean;
  defaultName: string;
  notice: string | null;
  highlightId: string | null;
  onAdd: (name: string) => void;
  onJump: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // 改名输入框同时监听 Enter 与 blur 提交：用锁保证一次编辑只提交一次，
  // 且 Escape 取消后 blur 不再兜底提交
  const editLockRef = useRef(false);

  // 「添加」输入框挂载后聚焦（默认名在展开时已预填）
  useEffect(() => {
    if (!adding) return;
    requestAnimationFrame(() => {
      addRef.current?.focus();
      addRef.current?.select();
    });
  }, [adding]);

  const openAdd = () => {
    setDraft(defaultName);
    setAdding(true);
  };

  // 高亮目标书签：滚入视野并闪烁提示
  useEffect(() => {
    if (!highlightId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-bm="${highlightId}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightId]);

  const commitAdd = () => {
    const name = draft.trim() || defaultName || "书签";
    onAdd(name);
    setAdding(false);
    setDraft("");
  };

  const startEdit = (id: string, name: string) => {
    editLockRef.current = false;
    setEditingId(id);
    setEditDraft(name);
  };

  const commitEdit = () => {
    if (editLockRef.current) return;
    editLockRef.current = true;
    const name = editDraft.trim();
    if (editingId && name) onRename(editingId, name);
    setEditingId(null);
  };

  return (
    <div className="absolute inset-0 z-20" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <aside
        className="absolute inset-y-0 right-0 flex w-80 max-w-[85vw] flex-col border-l border-line bg-ink-2"
        onClick={(e) => e.stopPropagation()}
        aria-label="书签列表"
      >
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between border-b border-line/70 px-4 py-3">
          <p className="font-serif text-lg">
            书签
            {items.length > 0 && (
              <span className="ml-1.5 align-middle font-mono text-xs text-fog">
                {items.length}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-fog hover:text-paper"
          >
            关闭
          </button>
        </div>

        {/* 提示条 */}
        {notice && (
          <p className="shrink-0 border-b border-line/50 bg-lamp/10 px-4 py-2 text-xs text-lamp-2">
            {notice}
          </p>
        )}

        {/* 添加区 */}
        <div className="shrink-0 border-b border-line/70 px-3 py-3">
          {adding ? (
            <div className="flex items-center gap-2">
              <input
                ref={addRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // IME 组合期间（拼音候选确认）的 Enter/Escape 是输入法操作，不触发提交/取消
                  const composing = e.nativeEvent.isComposing || e.keyCode === 229;
                  if (e.key === "Enter" && !composing) commitAdd();
                  if (e.key === "Escape" && !composing) setAdding(false);
                }}
                placeholder="书签名称"
                maxLength={60}
                className="min-w-0 flex-1 rounded-md border border-line bg-ink-3 px-2.5 py-1.5 text-sm text-paper outline-none placeholder:text-fog/60 focus:border-lamp"
              />
              <button
                type="button"
                onClick={commitAdd}
                className="rounded-md bg-lamp px-2.5 py-1.5 text-sm text-on-accent transition-colors hover:bg-lamp-2"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md px-2 py-1.5 text-sm text-fog hover:text-paper"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canAdd}
              onClick={openAdd}
              title={canAdd ? "把当前阅读位置加为书签" : "阅读器尚未就绪"}
              className="w-full rounded-md border border-dashed border-line px-3 py-2 text-sm text-fog transition-colors hover:border-lamp/60 hover:text-lamp-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ＋ 把当前页加为书签
            </button>
          )}
        </div>

        {/* 列表 */}
        <div ref={listRef} className="no-scrollbar flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm leading-6 text-fog">
              还没有书签。
              <br />
              翻到想记住的位置，点上面的「＋」收藏并起个名字。
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((item) =>
                editingId === item.id ? (
                  <li key={item.id} className="rounded-md bg-ink-3/60 px-2 py-1.5">
                    <input
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        const composing = e.nativeEvent.isComposing || e.keyCode === 229;
                        if (e.key === "Enter" && !composing) commitEdit();
                        if (e.key === "Escape" && !composing) {
                          editLockRef.current = true;
                          setEditingId(null);
                        }
                      }}
                      onBlur={commitEdit}
                      maxLength={60}
                      className="w-full rounded-md border border-line bg-ink-3 px-2 py-1 text-sm text-paper outline-none focus:border-lamp"
                    />
                  </li>
                ) : (
                  <li
                    key={item.id}
                    data-bm={item.id}
                    className={
                      "group rounded-md transition-colors " +
                      (highlightId === item.id
                        ? "bg-lamp/15 ring-1 ring-lamp"
                        : "hover:bg-ink-3/60")
                    }
                  >
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => onJump(item.id)}
                        title="跳转到书签位置"
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm text-paper group-hover:text-lamp-2">
                          {item.name}
                        </span>
                        {item.sub && (
                          <span className="block truncate text-xs text-fog">
                            {item.sub}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(item.id, item.name)}
                        title="重命名"
                        aria-label={`重命名书签 ${item.name}`}
                        className="rounded p-1 text-fog opacity-70 transition-opacity hover:bg-ink-3 hover:text-lamp-2 group-hover:opacity-100"
                      >
                        {/* 铅笔 */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        title="删除书签"
                        aria-label={`删除书签 ${item.name}`}
                        className="rounded p-1 text-fog opacity-70 transition-opacity hover:bg-ink-3 hover:text-lamp-2 group-hover:opacity-100"
                      >
                        {/* 垃圾桶 */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
