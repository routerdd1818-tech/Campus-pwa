import React, { useState } from 'react';
import { Todo, TodoCategory, TodoPriority } from '../types';
import { X, CheckSquare, Calendar, Flag, Tag, FileText } from 'lucide-react';

interface TodoModalProps {
  todo?: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
}

const CATEGORIES: TodoCategory[] = ['作業', '考試', '報告', '生活', '個人', '論文閱讀'];
const PRIORITIES: { val: TodoPriority; label: string; color: string }[] = [
  { val: 'low', label: '低優先', color: 'text-gray-500 bg-gray-100 dark:bg-zinc-800' },
  { val: 'medium', label: '中優先', color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40' },
  { val: 'high', label: '高優先', color: 'text-red-600 bg-red-100 dark:bg-red-950/40' },
];

export const TodoModal: React.FC<TodoModalProps> = ({ todo, isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<TodoCategory>('作業');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [paperUrl, setPaperUrl] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setTitle(todo?.title || '');
      setNotes(todo?.notes || '');
      setCategory(todo?.category || '作業');
      setPriority(todo?.priority || 'medium');
      setDueDate(todo?.dueDate ? todo.dueDate.slice(0, 16) : '');
      setPaperUrl(todo?.paperUrl || '');
    }
  }, [isOpen, todo]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: todo?.id || `todo_${Date.now()}`,
      title: title.trim(),
      notes: notes.trim(),
      category,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      isCompleted: todo?.isCompleted ?? false,
      paperUrl: category === '論文閱讀' ? paperUrl.trim() : undefined,
      readingStatus: todo?.readingStatus || (category === '論文閱讀' ? '未讀' : undefined),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6">
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <h3 className="text-lg font-black text-calico-cocoa dark:text-zinc-100 flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-calico-orange" />
            <span>{todo ? '編輯待辦' : '新增待辦任務'}</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              任務名稱 *
            </label>
            <input
              type="text"
              required
              placeholder="例如：繳交資料結構期中報告"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
            />
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5" />
              <span>分類標籤</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    category === cat
                      ? 'bg-calico-orange text-white shadow-xs scale-105'
                      : 'bg-calico-cream/80 dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1.5 flex items-center space-x-1">
              <Flag className="w-3.5 h-3.5" />
              <span>重要程度</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.val}
                  onClick={() => setPriority(p.val)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    priority === p.val
                      ? 'border-calico-orange ring-2 ring-calico-orange/30 font-extrabold'
                      : 'border-transparent'
                  } ${p.color}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>截止日期與時間</span>
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
            />
          </div>

          {/* Paper url for research reading */}
          {category === '論文閱讀' && (
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5" />
                <span>論文 arXiv / DOI 連結</span>
              </label>
              <input
                type="url"
                placeholder="https://arxiv.org/abs/..."
                value={paperUrl}
                onChange={(e) => setPaperUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              備註說明
            </label>
            <textarea
              rows={2}
              placeholder="補充注意事項、繳交網址或分組名單..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-calico-orange/50 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-calico-orange text-white font-extrabold shadow-sm hover:brightness-105 active:scale-95 transition-all text-sm tracking-wide mt-2"
          >
            {todo ? '儲存變更' : '建立待辦'}
          </button>
        </form>
      </div>
    </div>
  );
};
