import React, { useState, useMemo } from 'react';
import { Course, Todo } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  Edit3,
  MapPin,
  User,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  CheckSquare,
  GraduationCap,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface CourseHubModalProps {
  isOpen: boolean;
  course: Course | null;
  onClose: () => void;
  onEditCourse: (course: Course) => void;
}

const WEEKDAY_LABELS = ['', '週一', '週二', '週三', '週四', '週五', '週六', '週日'];

export const CourseHubModal: React.FC<CourseHubModalProps> = ({
  isOpen,
  course,
  onClose,
  onEditCourse,
}) => {
  const {
    courses,
    updateCourse,
    recordCourseAbsence,
    removeCourseAbsence,
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    courseGrades,
    addCourseGrade,
  } = useApp();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskIsExam, setNewTaskIsExam] = useState(false);
  const [absenceNote, setAbsenceNote] = useState('');

  // 取得最新即時課程狀態
  const liveCourse = useMemo(() => {
    if (!course) return null;
    return courses.find((c) => c.id === course.id) || course;
  }, [courses, course]);

  // 篩選關聯此課程的待辦與考試
  const courseTodos = useMemo(() => {
    if (!liveCourse) return [];
    const nameKey = liveCourse.name.trim().toLowerCase();
    return todos.filter(
      (t) =>
        t.courseId === liveCourse.id ||
        (nameKey && (t.title || '').toLowerCase().includes(nameKey)) ||
        (nameKey && (t.notes || '').toLowerCase().includes(nameKey))
    );
  }, [todos, liveCourse]);

  // 比對成績試算卡
  const matchedGradeCard = useMemo(() => {
    if (!liveCourse) return null;
    const nameKey = liveCourse.name.trim().toLowerCase();
    return courseGrades.find((cg) => cg.courseName.trim().toLowerCase() === nameKey) || null;
  }, [courseGrades, liveCourse]);

  if (!isOpen || !liveCourse) return null;

  const absenceCount = liveCourse.absenceCount ?? (liveCourse.absenceLogs?.length || 0);
  const maxAbsences = liveCourse.maxAbsences ?? 3;
  const remainQuota = Math.max(0, maxAbsences - absenceCount);
  const absencePercent = Math.min(100, Math.round((absenceCount / Math.max(1, maxAbsences)) * 100));

  const statusTone =
    absenceCount >= maxAbsences
      ? {
          badge: '🔴 扣考/學分警戒',
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
          bar: 'bg-rose-500',
        }
      : absenceCount === maxAbsences - 1
      ? {
          badge: '🟡 僅剩 1 次額度',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
          bar: 'bg-amber-500',
        }
      : {
          badge: `🟢 安全 (剩 ${remainQuota} 次額度)`,
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
          bar: 'bg-emerald-500',
        };

  const handleAdjustMaxAbsences = async (delta: number) => {
    const nextMax = Math.max(1, Math.min(18, maxAbsences + delta));
    await updateCourse({ ...liveCourse, maxAbsences: nextMax });
  };

  const handleAddCourseTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const fullTitle = newTaskTitle.trim().includes(liveCourse.name)
      ? newTaskTitle.trim()
      : `【${liveCourse.name}】${newTaskTitle.trim()}`;

    const newTodo: Todo = {
      id: `todo_crs_${Date.now()}`,
      title: fullTitle,
      dueDate: newTaskDue ? `${newTaskDue}T23:59:00.000Z` : undefined,
      isCompleted: false,
      priority: newTaskIsExam ? 'high' : 'medium',
      category: newTaskIsExam ? '考試' : '作業',
      colorHex: liveCourse.colorHex || '#E67E22',
      courseId: liveCourse.id,
      isCountdown: newTaskIsExam && Boolean(newTaskDue),
    };
    await addTodo(newTodo);
    setNewTaskTitle('');
    setNewTaskDue('');
    setNewTaskIsExam(false);
  };

  const handleCreateGradeCard = () => {
    addCourseGrade({
      id: `cg_${Date.now()}`,
      semester: liveCourse.semester || '115-1',
      courseName: liveCourse.name,
      emoji: 'BookOpen',
      colorHex: liveCourse.colorHex || '#E67E22',
      credits: liveCourse.credits ?? 3,
      category: liveCourse.category || 'required',
      attendanceWeight: 20,
      midtermWeight: 40,
      finalWeight: 40,
      attendanceScore: Math.max(0, 100 - absenceCount * 10),
      midtermScore: null,
      finalScore: null,
      isPassed: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/55 backdrop-blur-xs animate-fade-in">
      <div className="bg-calico-cream dark:bg-calico-darkCard w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl border border-black/5 dark:border-white/10 flex flex-col max-h-[88dvh] overflow-hidden animate-sheet-up">
        {/* Pull Handle */}
        <div className="w-10 h-1.5 rounded-full bg-calico-cocoa/15 dark:bg-white/15 mx-auto mb-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div
              style={{ backgroundColor: liveCourse.colorHex || '#E67E22' }}
              className="w-3 h-11 rounded-full shrink-0 mt-0.5 shadow-2xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-calico-orange/15 text-calico-orange tabular-nums">
                  {WEEKDAY_LABELS[liveCourse.dayOfWeek]} {liveCourse.startTime} - {liveCourse.endTime}
                </span>
                {liveCourse.credits && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 tabular-nums">
                    {liveCourse.credits} 學分
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 mt-1 truncate">
                {liveCourse.name}
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-calico-cocoa/60 dark:text-zinc-400 font-bold mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-calico-orange" />
                  <span>{liveCourse.classroom || '未設定教室'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{liveCourse.instructor || '未設定教師'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditCourse(liveCourse);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-200 hover:border-calico-orange flex items-center gap-1 shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-calico-orange" />
              <span>編輯設定</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-calico-cocoa/50 dark:text-zinc-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-0.5">
          {/* 1. 翹課 / 請假安全額度計數器 */}
          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-800/70 border border-black/5 dark:border-white/10 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-calico-orange" />
                <h4 className="text-xs font-black text-calico-cocoa dark:text-zinc-100">
                  點名 / 翹課安全額度計數器
                </h4>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusTone.bg}`}>
                {statusTone.badge}
              </span>
            </div>

            {/* 進度條與上限設定 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black tabular-nums">
                <span className="text-calico-cocoa dark:text-zinc-200">
                  已缺席 / 請假：<strong className="text-sm font-mono">{absenceCount}</strong> 次
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                  <span>安全上限：{maxAbsences} 次</span>
                  <button
                    type="button"
                    onClick={() => handleAdjustMaxAbsences(-1)}
                    className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/10 flex items-center justify-center font-mono hover:bg-black/10"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustMaxAbsences(1)}
                    className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/10 flex items-center justify-center font-mono hover:bg-black/10"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div
                  style={{ width: `${absencePercent}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${statusTone.bar}`}
                />
              </div>
            </div>

            {/* 一鍵登記按鈕列 */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={absenceNote}
                onChange={(e) => setAbsenceNote(e.target.value)}
                placeholder="選填備註（如：睡過頭、看牙醫）"
                className="flex-1 px-3 py-1.5 rounded-xl bg-calico-cream/70 dark:bg-zinc-900 border border-black/5 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 placeholder:text-calico-cocoa/40 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    recordCourseAbsence(liveCourse.id, 'skip', absenceNote);
                    setAbsenceNote('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 text-[11px] font-black transition-all active:scale-95 whitespace-nowrap"
                >
                  + 自主翹課
                </button>
                <button
                  type="button"
                  onClick={() => {
                    recordCourseAbsence(liveCourse.id, 'personal', absenceNote);
                    setAbsenceNote('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 text-[11px] font-black transition-all active:scale-95 whitespace-nowrap"
                >
                  + 事假
                </button>
                <button
                  type="button"
                  onClick={() => {
                    recordCourseAbsence(liveCourse.id, 'sick', absenceNote);
                    setAbsenceNote('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 text-[11px] font-black transition-all active:scale-95 whitespace-nowrap"
                >
                  + 病假
                </button>
              </div>
            </div>

            {/* 歷史缺席紀錄 */}
            {liveCourse.absenceLogs && liveCourse.absenceLogs.length > 0 && (
              <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1.5">
                {liveCourse.absenceLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-2.5 py-1.5 rounded-xl bg-calico-cream/50 dark:bg-zinc-900/50 flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-calico-cocoa/60 dark:text-zinc-400 tabular-nums">
                        {log.date}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-black text-[10px] ${
                          log.type === 'skip'
                            ? 'bg-rose-500/15 text-rose-600'
                            : log.type === 'personal'
                            ? 'bg-amber-500/15 text-amber-600'
                            : 'bg-blue-500/15 text-blue-600'
                        }`}
                      >
                        {log.type === 'skip' ? '自主翹課' : log.type === 'personal' ? '事假' : '病假'}
                      </span>
                      {log.note && (
                        <span className="text-calico-cocoa dark:text-zinc-200 font-bold">
                          {log.note}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCourseAbsence(liveCourse.id, log.id)}
                      className="text-calico-cocoa/40 hover:text-rose-500 p-1"
                      title="撤銷此筆紀錄"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. 本課專屬作業與考試待辦 */}
          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-800/70 border border-black/5 dark:border-white/10 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-calico-sage" />
                <h4 className="text-xs font-black text-calico-cocoa dark:text-zinc-100">
                  本課作業與考試待辦 ({courseTodos.filter((t) => !t.isCompleted).length} 項未完成)
                </h4>
              </div>
            </div>

            {/* 快速新增本課作業/考試 */}
            <form onSubmit={handleAddCourseTask} className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="輸入本課作業、報告或期中考內容..."
                  className="flex-1 px-3 py-2 rounded-xl bg-calico-cream/70 dark:bg-zinc-900 border border-black/5 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 placeholder:text-calico-cocoa/40 focus:outline-none focus:border-calico-orange"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-calico-orange text-white text-xs font-black shadow-2xs active:scale-95 transition-all shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-calico-cocoa/50" />
                  <span className="text-calico-cocoa/60 dark:text-zinc-400 font-bold">截止/考試日：</span>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-calico-cream/70 dark:bg-zinc-900 border border-black/5 dark:border-white/10 text-[11px] font-mono font-bold text-calico-cocoa dark:text-zinc-200"
                  />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-amber-600 dark:text-amber-400">
                  <input
                    type="checkbox"
                    checked={newTaskIsExam}
                    onChange={(e) => setNewTaskIsExam(e.target.checked)}
                    className="rounded accent-calico-orange"
                  />
                  <span>列為考試並同步重要日子倒數</span>
                </label>
              </div>
            </form>

            {courseTodos.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {courseTodos.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-2xl bg-calico-cream/50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs"
                  >
                    <div
                      onClick={() => toggleTodo(t.id)}
                      className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                    >
                      {t.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-calico-sage shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-calico-cocoa/30 shrink-0" />
                      )}
                      <span
                        className={`font-bold truncate ${
                          t.isCompleted ? 'line-through text-calico-cocoa/40' : 'text-calico-cocoa dark:text-zinc-100'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {t.dueDate && (
                        <span className="text-[10px] font-mono font-bold text-calico-orange tabular-nums">
                          {t.dueDate.slice(5, 10)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteTodo(t.id)}
                        className="text-calico-cocoa/30 hover:text-rose-500 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-calico-cocoa/40 dark:text-zinc-500 text-center py-2 font-bold">
                目前尚無綁定此課程的作業或考試待辦
              </p>
            )}
          </div>

          {/* 3. 本課成績配分與學分連動 */}
          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-800/70 border border-black/5 dark:border-white/10 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-black text-calico-cocoa dark:text-zinc-100">
                  成績權重與學分試算連動
                </h4>
              </div>
              {!matchedGradeCard && (
                <button
                  type="button"
                  onClick={handleCreateGradeCard}
                  className="px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[11px] font-black hover:bg-indigo-500/25 transition-all"
                >
                  + 建立本課成績配分卡
                </button>
              )}
            </div>

            {matchedGradeCard ? (
              <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 flex items-center justify-between text-xs tabular-nums">
                <div>
                  <span className="font-black text-calico-cocoa dark:text-zinc-100 block">
                    {matchedGradeCard.semester} 學期 · {matchedGradeCard.credits} 學分
                  </span>
                  <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400">
                    出席 {matchedGradeCard.attendanceScore ?? '-'} · 期中 {matchedGradeCard.midtermScore ?? '-'} · 期末 {matchedGradeCard.finalScore ?? '-'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-mono font-black">
                  已連動成績單
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">
                點擊右上角可一鍵將「{liveCourse.name}」加入學分與 GPA 成績試算器中。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
