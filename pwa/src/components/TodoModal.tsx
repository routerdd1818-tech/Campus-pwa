import React, { useState } from 'react';
import { Todo, TodoPriority, TodoRecurrence } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  CheckSquare,
  Calendar,
  Flag,
  Tag,
  FileText,
  Clock,
  Plus,
  Check,
  Repeat,
  Sparkles,
} from 'lucide-react';

interface TodoModalProps {
  todo?: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
}

const PRIORITIES: { val: TodoPriority; label: string; color: string }[] = [
  { val: 'low', label: '低優先', color: 'text-gray-500 bg-gray-100 dark:bg-zinc-800' },
  { val: 'medium', label: '中優先', color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40' },
  { val: 'high', label: '高優先', color: 'text-red-600 bg-red-100 dark:bg-red-950/40' },
];

const PALETTE = [
  '#E67E22', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3182CE', '#3B82F6',
  '#6366F1', '#805AD5', '#8B5CF6', '#A855F7',
  '#D53F8C', '#EC4899', '#EF4444', '#78716C', '#3D2F2E',
];

export const TodoModal: React.FC<TodoModalProps> = ({ todo, isOpen, onClose, onSave }) => {
  const { customTodoCategories, addCustomCategory } = useApp();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<string>('作業');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [isPeriodTask, setIsPeriodTask] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [recurrence, setRecurrence] = useState<TodoRecurrence>('none');
  const [dueDate, setDueDate] = useState('');
  const [paperUrl, setPaperUrl] = useState('');

  // Inline custom category creation
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PALETTE[0]);

  React.useEffect(() => {
    if (isOpen) {
      if (todo) {
        setTitle(todo.title || '');
        setNotes(todo.notes || '');
        setCategory(todo.category || '作業');
        setPriority(todo.priority || 'medium');
        setDueDate(todo.dueDate ? todo.dueDate.slice(0, 16) : '');
        setPaperUrl(todo.paperUrl || '');
        setIsPeriodTask(Boolean(todo.startDate && todo.endDate));
        setStartDate(todo.startDate || '');
        setEndDate(todo.endDate || '');
        setRecurrence(todo.recurrence || 'none');
      } else {
        setTitle('');
        setNotes('');
        setCategory(customTodoCategories[0]?.name || '作業');
        setPriority('medium');
        setDueDate('');
        setPaperUrl('');
        setIsPeriodTask(false);
        setStartDate('');
        setEndDate('');
        setRecurrence('none');
      }
      setIsCreatingCategory(false);
      setNewCatName('');
    }
  }, [isOpen, todo, customTodoCategories]);

  if (!isOpen) return null;

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const catName = newCatName.trim();
    addCustomCategory('todo', {
      name: catName,
      colorHex: newCatColor,
    });
    setCategory(catName);
    setNewCatName('');
    setIsCreatingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: todo?.id || `todo_${Date.now()}`,
      title: title.trim(),
      notes: notes.trim(),
      category,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : (startDate ? new Date(startDate).toISOString() : undefined),
      startDate: isPeriodTask && startDate ? startDate : undefined,
      endDate: isPeriodTask && endDate ? endDate : undefined,
      recurrence: isPeriodTask ? recurrence : 'none',
      isCompleted: todo?.isCompleted ?? false,
      paperUrl: category === '論文閱讀' ? paperUrl.trim() : undefined,
      readingStatus: todo?.readingStatus || (category === '論文閱讀' ? '未讀' : undefined),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-calico-darkCard z-10 flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-2xl bg-calico-orange/15 text-calico-orange">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-calico-cocoa dark:text-zinc-100">
                {todo ? '編輯待辦任務' : '新增待辦任務'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                支援單日截止、跨日行程與自訂分類
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              任務名稱 *
            </label>
            <input
              type="text"
              required
              placeholder="例如：微積分期中作業、旅遊自由行、專案簡報"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-3 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
            />
          </div>

          {/* Deadline / Period Selector Section */}
          <div className="p-3.5 rounded-2xl bg-calico-cream/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-calico-orange" />
                <span>截止日期與排程設定</span>
              </label>

              {/* Segmented Toggle: 單日截止 vs 選擇區間 */}
              <div className="p-0.5 rounded-xl bg-black/5 dark:bg-white/10 flex items-center text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPeriodTask(false)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${
                    !isPeriodTask
                      ? 'bg-calico-orange text-white shadow-xs font-black'
                      : 'text-calico-cocoa/60 dark:text-zinc-400'
                  }`}
                >
                  單日截止
                </button>
                <button
                  type="button"
                  onClick={() => setIsPeriodTask(true)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${
                    isPeriodTask
                      ? 'bg-calico-orange text-white shadow-xs font-black'
                      : 'text-calico-cocoa/60 dark:text-zinc-400'
                  }`}
                >
                  選擇區間
                </button>
              </div>
            </div>

            {isPeriodTask ? (
              <div className="space-y-2.5 animate-fade-in pt-1">
                <div className="grid grid-cols-2 gap-2 min-w-0 w-full">
                  <div className="min-w-0">
                    <label className="block text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                      開始日期
                    </label>
                    <input
                      type="date"
                      required={isPeriodTask}
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (!endDate || e.target.value > endDate) setEndDate(e.target.value);
                      }}
                      className="w-full min-w-0 max-w-full px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold appearance-none [-webkit-appearance:none]"
                      style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                      結束日期
                    </label>
                    <input
                      type="date"
                      required={isPeriodTask}
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full min-w-0 max-w-full px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold appearance-none [-webkit-appearance:none]"
                      style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Recurrence Selector */}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1 flex items-center space-x-1">
                    <Repeat className="w-3 h-3" />
                    <span>重複頻率（可選）</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 min-w-0">
                    {(
                      [
                        { val: 'none', label: '單次區間' },
                        { val: 'daily', label: '每天重複' },
                        { val: 'weekly', label: '每週重複' },
                        { val: 'monthly', label: '每月重複' },
                      ] as { val: TodoRecurrence; label: string }[]
                    ).map((r) => (
                      <button
                        type="button"
                        key={r.val}
                        onClick={() => setRecurrence(r.val)}
                        className={`py-1.5 px-0.5 rounded-xl text-[10.5px] sm:text-[11px] font-bold transition-all truncate text-center ${
                          recurrence === r.val
                            ? 'bg-calico-cocoa text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                            : 'bg-white/60 dark:bg-zinc-900/60 text-calico-cocoa/70 dark:text-zinc-400'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full min-w-0 max-w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-calico-orange/50 appearance-none [-webkit-appearance:none]"
                  style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                />

                {/* Quick Presets for iPhone one-tap setting */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {[
                    { label: '今天 18:00', getVal: () => `${new Date().toISOString().slice(0, 10)}T18:00` },
                    { label: '今晚 23:59', getVal: () => `${new Date().toISOString().slice(0, 10)}T23:59` },
                    {
                      label: '明天 12:00',
                      getVal: () => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        return `${d.toISOString().slice(0, 10)}T12:00`;
                      },
                    },
                    {
                      label: '明天 23:59',
                      getVal: () => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        return `${d.toISOString().slice(0, 10)}T23:59`;
                      },
                    },
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.label}
                      onClick={() => setDueDate(p.getVal())}
                      className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] font-bold text-calico-cocoa/70 dark:text-zinc-300 hover:bg-calico-orange/15 hover:text-calico-orange transition-all shrink-0"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>


          {/* Category selection & Custom Category Creator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5" />
                <span>分類標籤</span>
              </label>

              <button
                type="button"
                onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                className="text-xs font-bold text-calico-orange hover:underline flex items-center space-x-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>自訂新標籤</span>
              </button>
            </div>

            {/* Inline Category Creator Panel */}
            {isCreatingCategory && (
              <div className="mb-2.5 p-3 rounded-2xl bg-calico-cream dark:bg-zinc-800/80 border border-calico-orange/30 animate-fade-in space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="輸入新標籤 (例如：旅遊、出國、專題)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-calico-orange/50"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={!newCatName.trim()}
                    className="px-3 py-1.5 rounded-xl bg-calico-orange text-white text-xs font-extrabold shadow-xs active:scale-95 disabled:opacity-40 transition-all flex items-center space-x-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>新增</span>
                  </button>
                </div>
                {/* Color swatches & custom color */}
                <div className="flex items-center space-x-1.5 pt-0.5 overflow-x-auto scrollbar-none py-1">
                  <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 font-bold shrink-0">顏色：</span>
                  <label
                    className="relative flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-calico-orange/60 bg-calico-orange/10 cursor-pointer shrink-0"
                    title="自訂任意顏色"
                  >
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <Sparkles className="w-2.5 h-2.5 text-calico-orange" />
                  </label>
                  {PALETTE.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewCatColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-4 h-4 rounded-full transition-transform shrink-0 ${
                        newCatColor === c ? 'scale-125 ring-2 ring-calico-cocoa dark:ring-white shadow-2xs' : 'opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {customTodoCategories.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    type="button"
                    key={cat.id || cat.name}
                    onClick={() => setCategory(cat.name)}
                    style={{
                      borderColor: isSelected ? cat.colorHex : 'transparent',
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-calico-orange text-white shadow-xs scale-105'
                        : 'bg-calico-cream/80 dark:bg-zinc-800 text-calico-cocoa/70 dark:text-zinc-400 hover:bg-black/5'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: isSelected ? '#FFFFFF' : cat.colorHex }} />
                    {cat.name}
                  </button>
                );
              })}
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
              placeholder="補充行程安排、繳交網址或分組名單..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-calico-orange/50 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-calico-orange text-white font-extrabold shadow-ios hover:brightness-105 active:scale-95 transition-all text-sm tracking-wide mt-2"
          >
            {todo ? '儲存任務變更' : '建立待辦任務'}
          </button>
        </form>
      </div>
    </div>
  );
};
