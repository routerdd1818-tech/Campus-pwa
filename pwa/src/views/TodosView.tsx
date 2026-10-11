import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Todo } from '../types';
import { TodoModal } from '../components/TodoModal';
import confetti from 'canvas-confetti';
import {
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  Trash2,
  ExternalLink,
  BookOpen,
  Plane,
  Clock,
  Sparkles,
  Repeat,
  Tag,
  CheckSquare,
} from 'lucide-react';

export const TodosView: React.FC = () => {
  const { todos, addTodo, updateTodo, toggleTodo, deleteTodo, customTodoCategories } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dynamic filter list
  const filters = useMemo(() => {
    const list = [
      { id: 'all', label: '全部' },
      { id: 'period', label: '✈️ 週期與跨日' },
      ...customTodoCategories.map((c) => ({ id: c.name, label: c.name })),
      { id: 'completed', label: '已完成' },
    ];
    return list;
  }, [customTodoCategories]);

  const filteredTodos = useMemo(() => {
    return todos.filter((t) => {
      if (selectedFilter === 'all') return !t.isCompleted;
      if (selectedFilter === 'completed') return t.isCompleted;
      if (selectedFilter === 'period') return Boolean(t.startDate && t.endDate) && !t.isCompleted;
      return t.category === selectedFilter && !t.isCompleted;
    });
  }, [todos, selectedFilter]);

  // Statistics
  const pendingCount = todos.filter((t) => !t.isCompleted).length;
  const periodCount = todos.filter((t) => !t.isCompleted && Boolean(t.startDate && t.endDate)).length;
  const completedCount = todos.filter((t) => t.isCompleted).length;

  const handleToggle = (id: string, currentlyCompleted: boolean) => {
    toggleTodo(id);
    if (!currentlyCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#E67E22', '#48BB78', '#FEEBC8', '#3D2F2E', '#3182CE'],
      });
    }
  };

  const getDueBadge = (dueDateStr?: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffHours = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center space-x-1">
          <AlertCircle className="w-3 h-3" />
          <span>已逾期</span>
        </span>
      );
    }
    if (diffHours <= 24) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
          今天截止
        </span>
      );
    }
    const days = Math.ceil(diffHours / 24);
    return (
      <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 text-[10px] font-bold">
        剩 {days} 天
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
            待辦與任務清單
          </h2>
          <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400">
            {pendingCount} 項進行中，{periodCount} 項跨日週期安排
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTodo(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1 px-4 py-2 rounded-2xl bg-calico-orange text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all hover:brightness-105"
        >
          <Plus className="w-4 h-4" />
          <span>新增待辦</span>
        </button>
      </div>

      {/* KPI Stats Quick Bar */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs">
          <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block">
            進行中任務
          </span>
          <span className="text-base font-black text-calico-cocoa dark:text-zinc-100">
            {pendingCount}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs">
          <span className="text-[10px] font-bold text-calico-orange block">
            ✈️ 週期排程
          </span>
          <span className="text-base font-black text-calico-orange">
            {periodCount}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-2xs">
          <span className="text-[10px] font-bold text-calico-sage block">
            已完成
          </span>
          <span className="text-base font-black text-calico-sage">
            {completedCount}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedFilter === f.id
                ? 'bg-calico-orange text-white shadow-xs scale-105 font-black'
                : 'bg-white/70 dark:bg-zinc-800/70 text-calico-cocoa/70 dark:text-zinc-400 hover:bg-calico-orange/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Todo List */}
      <div className="space-y-2.5">
        {filteredTodos.map((todo) => {
          const isPeriod = Boolean(todo.startDate && todo.endDate);
          return (
            <div
              key={todo.id}
              className={`p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios transition-all flex items-start justify-between space-x-3 ${
                todo.isCompleted
                  ? 'opacity-60 bg-gray-50/50 dark:bg-zinc-900/50'
                  : 'hover:shadow-ios-lg'
              }`}
            >
              {/* Left: Checkbox & Info */}
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <button
                  onClick={() => handleToggle(todo.id, todo.isCompleted)}
                  className="mt-0.5 text-calico-orange active:scale-80 transition-transform shrink-0"
                >
                  {todo.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 fill-calico-orange text-white" />
                  ) : (
                    <Circle className="w-5 h-5 text-calico-cocoa/30 hover:text-calico-orange" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h4
                      onClick={() => {
                        setEditingTodo(todo);
                        setIsModalOpen(true);
                      }}
                      className={`text-sm font-extrabold cursor-pointer hover:text-calico-orange transition-colors truncate ${
                        todo.isCompleted
                          ? 'line-through text-calico-cocoa/40 dark:text-zinc-500'
                          : 'text-calico-cocoa dark:text-zinc-100'
                      }`}
                    >
                      {todo.title}
                    </h4>
                  </div>

                  {/* Multi-day Period Bar */}
                  {isPeriod && (
                    <div className="mt-1.5 flex items-center space-x-1.5 text-xs font-bold text-calico-orange">
                      <span className="px-2 py-0.5 rounded-lg bg-calico-orange/15 border border-calico-orange/20 flex items-center space-x-1">
                        <Plane className="w-3 h-3 shrink-0" />
                        <span>
                          {todo.startDate} ~ {todo.endDate}
                        </span>
                        {todo.recurrence && todo.recurrence !== 'none' && (
                          <span className="ml-1 text-[10px] px-1 bg-calico-orange text-white rounded">
                            {todo.recurrence === 'daily'
                              ? '每天'
                              : todo.recurrence === 'weekly'
                              ? '每週'
                              : '週期'}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {todo.notes && (
                    <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 mt-1 line-clamp-2">
                      {todo.notes}
                    </p>
                  )}

                  {/* Tags row */}
                  <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-1">
                    {/* Category */}
                    <span className="px-2 py-0.5 rounded-lg bg-calico-cream dark:bg-zinc-800 text-calico-cocoa/75 dark:text-zinc-300 text-[10px] font-bold border border-black/5 dark:border-white/5">
                      {todo.category}
                    </span>

                    {/* Priority */}
                    {todo.priority === 'high' && (
                      <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold">
                        高優先
                      </span>
                    )}

                    {/* Due countdown */}
                    {!isPeriod && getDueBadge(todo.dueDate)}

                    {/* Paper link if any */}
                    {todo.paperUrl && (
                      <a
                        href={todo.paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold inline-flex items-center space-x-1 hover:underline"
                      >
                        <BookOpen className="w-2.5 h-2.5" />
                        <span>查看論文</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Delete button */}
              <button
                onClick={() => deleteTodo(todo.id)}
                className="p-1.5 rounded-xl text-calico-cocoa/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0"
                title="刪除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {filteredTodos.length === 0 && (
          <div className="text-center py-12 rounded-3xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10">
            <p className="text-sm font-bold text-calico-cocoa/60 dark:text-zinc-400">
              {selectedFilter === 'completed'
                ? '目前沒有已完成的待辦項目'
                : '太棒了！此分類所有項目都已完成 🎉'}
            </p>
          </div>
        )}
      </div>

      {/* Todo Modal */}
      <TodoModal
        isOpen={isModalOpen}
        todo={editingTodo}
        onClose={() => setIsModalOpen(false)}
        onSave={(saved) => {
          if (editingTodo) {
            updateTodo(saved);
          } else {
            addTodo(saved);
          }
        }}
      />
    </div>
  );
};
