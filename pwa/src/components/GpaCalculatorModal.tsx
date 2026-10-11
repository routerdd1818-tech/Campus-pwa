import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  GraduationCap,
  X,
  Plus,
  Trash2,
  Sparkles,
  Calculator,
  RefreshCw,
} from 'lucide-react';

interface GpaCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CourseGradeItem {
  id: string;
  name: string;
  credits: number;
  grade: string;
}

const GRADE_POINTS: Record<string, number> = {
  'A+': 4.3,
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D': 1.0,
  'F': 0.0,
};

export const GpaCalculatorModal: React.FC<GpaCalculatorModalProps> = ({ isOpen, onClose }) => {
  const { courses } = useApp();

  const [items, setItems] = useState<CourseGradeItem[]>(() => {
    return courses.map((c) => ({
      id: c.id,
      name: c.name,
      credits: 3,
      grade: 'A',
    }));
  });

  const [newName, setNewName] = useState('');
  const [newCredits, setNewCredits] = useState(3);
  const [newGrade, setNewGrade] = useState('A');

  if (!isOpen) return null;

  const handleImportCourses = () => {
    setItems(
      courses.map((c) => ({
        id: `imp_${c.id}_${Date.now()}`,
        name: c.name,
        credits: 3,
        grade: 'A',
      }))
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: `gpa_${Date.now()}`,
        name: newName.trim(),
        credits: newCredits,
        grade: newGrade,
      },
    ]);
    setNewName('');
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: 'credits' | 'grade', value: any) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  // Calculations
  const { totalCredits, gpa } = useMemo(() => {
    let creditsSum = 0;
    let pointsSum = 0;

    items.forEach((item) => {
      const pts = GRADE_POINTS[item.grade] ?? 0;
      creditsSum += item.credits;
      pointsSum += pts * item.credits;
    });

    const calculatedGpa = creditsSum > 0 ? (pointsSum / creditsSum).toFixed(2) : '0.00';
    return { totalCredits: creditsSum, gpa: calculatedGpa };
  }, [items]);

  const numGpa = parseFloat(gpa);
  const butlerComment =
    numGpa >= 4.0
      ? '👑 卷王誕生！這成績管家佩服得五體投地，獎勵一條小魚乾喵！'
      : numGpa >= 3.5
      ? '🌟 成績優異！妥妥的名列前茅，期末穩如泰山喵～'
      : numGpa >= 2.5
      ? '☕ 安全歐趴！學分有拿到最重要，身心健康第一喵！'
      : '🐾 危！期末考前需要跟可樂管家閉關苦讀一下喵！';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] overflow-y-auto pb-32 sm:pb-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-2xl bg-calico-orange/15 text-calico-orange">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                學期 GPA 與學分歐趴試算
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                預估各科等第成績，自動推算學期 GPA (4.3 滿分制)
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

        {/* GPA Summary Card */}
        <div className="mt-4 p-4 rounded-3xl bg-gradient-to-br from-calico-orange/15 via-calico-cream to-amber-100/50 dark:from-zinc-800 dark:via-zinc-800/80 dark:to-zinc-900 border border-calico-orange/30 shadow-ios text-center space-y-1">
          <div className="text-[11px] font-black uppercase text-calico-orange tracking-wider">
            預估學期 GPA / 總學分
          </div>
          <div className="text-3xl font-mono font-black text-calico-cocoa dark:text-zinc-100">
            {gpa} <span className="text-xs font-normal text-calico-cocoa/60 dark:text-zinc-400">/ 4.30</span>
          </div>
          <div className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-300">
            本學期共修習 {totalCredits} 學分 ({items.length} 門課程)
          </div>
          <p className="text-xs font-bold text-calico-orange pt-1">
            {butlerComment}
          </p>
        </div>

        {/* Quick Import from Timetable */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200">
            科目與預估等第列表
          </span>
          <button
            type="button"
            onClick={handleImportCourses}
            className="px-2.5 py-1 rounded-xl bg-calico-orange/15 text-calico-orange text-[11px] font-bold hover:bg-calico-orange/25 active:scale-95 transition-all flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>匯入現有課表科目</span>
          </button>
        </div>

        {/* Items List */}
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center justify-between gap-2 text-xs"
            >
              <span className="font-bold text-calico-cocoa dark:text-zinc-100 flex-1 truncate">
                {item.name}
              </span>

              {/* Credits */}
              <div className="flex items-center space-x-1 shrink-0">
                <select
                  value={item.credits}
                  onChange={(e) => handleUpdateItem(item.id, 'credits', Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold"
                >
                  <option value={1}>1 學分</option>
                  <option value={2}>2 學分</option>
                  <option value={3}>3 學分</option>
                  <option value={4}>4 學分</option>
                </select>

                {/* Grade */}
                <select
                  value={item.grade}
                  onChange={(e) => handleUpdateItem(item.id, 'grade', e.target.value)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-orange font-mono"
                >
                  {Object.keys(GRADE_POINTS).map((g) => (
                    <option key={g} value={g}>
                      {g} ({GRADE_POINTS[g]})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1 text-calico-cocoa/30 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add custom item form */}
        <form onSubmit={handleAddItem} className="mt-3 flex items-center space-x-2">
          <input
            type="text"
            placeholder="新增科目 (如：通識心理學)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="px-3 py-1.5 rounded-xl bg-calico-orange text-white text-xs font-extrabold shadow-2xs active:scale-95 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5 inline mr-0.5" />
            新增
          </button>
        </form>
      </div>
    </div>
  );
};
