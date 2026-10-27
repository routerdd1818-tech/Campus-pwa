import React, { useState, useEffect } from 'react';
import { CourseGradeItem, CreditCategory } from '../types';
import { EmojiColorPicker, MODERN_PALETTE } from './EmojiColorPicker';

interface CourseGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: CourseGradeItem) => void;
  initialData?: CourseGradeItem | null;
}

export const CourseGradeModal: React.FC<CourseGradeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [courseName, setCourseName] = useState('');
  const [semester, setSemester] = useState('115-1');
  const [emoji, setEmoji] = useState('💻');
  const [colorHex, setColorHex] = useState(MODERN_PALETTE[1].hex);
  const [credits, setCredits] = useState('3');
  const [category, setCategory] = useState<CreditCategory>('required');

  const [attendanceWeight, setAttendanceWeight] = useState('30');
  const [midtermWeight, setMidtermWeight] = useState('30');
  const [finalWeight, setFinalWeight] = useState('40');

  const [attendanceScore, setAttendanceScore] = useState('');
  const [midtermScore, setMidtermScore] = useState('');
  const [finalScore, setFinalScore] = useState('');

  useEffect(() => {
    if (initialData) {
      setCourseName(initialData.courseName);
      setSemester(initialData.semester || '115-1');
      setEmoji(initialData.emoji || '💻');
      setColorHex(initialData.colorHex || MODERN_PALETTE[1].hex);
      setCredits(String(initialData.credits));
      setCategory(initialData.category || 'required');
      setAttendanceWeight(String(initialData.attendanceWeight));
      setMidtermWeight(String(initialData.midtermWeight));
      setFinalWeight(String(initialData.finalWeight));
      setAttendanceScore(initialData.attendanceScore !== null ? String(initialData.attendanceScore) : '');
      setMidtermScore(initialData.midtermScore !== null ? String(initialData.midtermScore) : '');
      setFinalScore(initialData.finalScore !== null ? String(initialData.finalScore) : '');
    } else {
      setCourseName('');
      setSemester('115-1');
      setEmoji('💻');
      setColorHex(MODERN_PALETTE[1].hex);
      setCredits('3');
      setCategory('required');
      setAttendanceWeight('30');
      setMidtermWeight('30');
      setFinalWeight('40');
      setAttendanceScore('85');
      setMidtermScore('');
      setFinalScore('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const wAtt = Math.max(0, Number(attendanceWeight) || 0);
  const wMid = Math.max(0, Number(midtermWeight) || 0);
  const wFin = Math.max(0, Number(finalWeight) || 0);
  const weightSum = wAtt + wMid + wFin;

  const parseScore = (str: string): number | null => {
    if (str.trim() === '') return null;
    const n = Number(str);
    if (isNaN(n)) return null;
    return Math.min(100, Math.max(0, n));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    const item: CourseGradeItem = {
      id: initialData?.id || `cg_${Date.now()}`,
      semester: semester.trim() || '115-1',
      courseName: courseName.trim(),
      emoji: emoji || '📚',
      colorHex,
      credits: Math.max(0, Number(credits) || 0),
      category,
      attendanceWeight: wAtt,
      midtermWeight: wMid,
      finalWeight: wFin,
      attendanceScore: parseScore(attendanceScore),
      midtermScore: parseScore(midtermScore),
      finalScore: parseScore(finalScore),
      isPassed: initialData?.isPassed ?? true,
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-calico-darkCard border border-black/10 dark:border-white/10 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{emoji}</span>
            <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
              {initialData ? '編輯科目與成績配分' : '新增修課學分與成績試算'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400 font-bold flex items-center justify-center hover:bg-black/10 transition-all shrink-0"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 科目名稱與學期 */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                科目名稱 *
              </label>
              <input
                type="text"
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="例如：微積分、演算法"
                className="w-full px-3 py-2 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                學期
              </label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="115-1"
                className="w-full px-3 py-2 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-sm font-bold text-center text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              />
            </div>
          </div>

          {/* 必選修分類 與 學分數 */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1">
                學分屬性
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-zinc-800">
                {(
                  [
                    { id: 'required', label: '必修' },
                    { id: 'elective', label: '選修' },
                    { id: 'general', label: '通識' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                      category === cat.id
                        ? 'bg-white dark:bg-zinc-700 text-calico-orange shadow-2xs'
                        : 'text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 block mb-1 whitespace-nowrap">
                學分數
              </label>
              <input
                type="number"
                min={0}
                max={12}
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-black/5 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-sm font-black text-center text-calico-cocoa dark:text-zinc-100 outline-none focus:border-calico-orange"
              />
            </div>
          </div>

          {/* 配分權重設定 */}
          <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200">
                📊 配分權重與目前成績（未考可留空）
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap shrink-0 ${
                  weightSum === 100
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                權重總和: {weightSum}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* 平時 */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400">
                  <span>平時</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={attendanceWeight}
                      onChange={(e) => setAttendanceWeight(e.target.value)}
                      className="w-9 text-right bg-transparent font-black text-calico-cocoa dark:text-zinc-100 outline-none"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={attendanceScore}
                  onChange={(e) => setAttendanceScore(e.target.value)}
                  placeholder="平時分"
                  className="w-full px-2 py-1.5 rounded-lg bg-black/5 dark:bg-zinc-900 text-center text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:ring-1 focus:ring-calico-orange"
                />
              </div>

              {/* 期中 */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400">
                  <span>期中考</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={midtermWeight}
                      onChange={(e) => setMidtermWeight(e.target.value)}
                      className="w-9 text-right bg-transparent font-black text-calico-cocoa dark:text-zinc-100 outline-none"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={midtermScore}
                  onChange={(e) => setMidtermScore(e.target.value)}
                  placeholder="期中分"
                  className="w-full px-2 py-1.5 rounded-lg bg-black/5 dark:bg-zinc-900 text-center text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:ring-1 focus:ring-calico-orange"
                />
              </div>

              {/* 期末 */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-400">
                  <span>期末考</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={finalWeight}
                      onChange={(e) => setFinalWeight(e.target.value)}
                      className="w-9 text-right bg-transparent font-black text-calico-cocoa dark:text-zinc-100 outline-none"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={finalScore}
                  onChange={(e) => setFinalScore(e.target.value)}
                  placeholder="留空逆推"
                  className="w-full px-2 py-1.5 rounded-lg bg-black/5 dark:bg-zinc-900 text-center text-sm font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:ring-1 focus:ring-calico-orange"
                />
              </div>
            </div>
            <p className="text-[10px] font-semibold text-calico-cocoa/50 dark:text-zinc-400">
              💡 期末考欄位留空時，系統將自動為你逆推「期末考至少要考幾分才能 60 分及格與拿 A (80分)」。
            </p>
          </div>

          {/* 純自訂 Emoji 與色票 */}
          <EmojiColorPicker
            selectedEmoji={emoji}
            onSelectEmoji={setEmoji}
            selectedColor={colorHex}
            onSelectColor={setColorHex}
            label="科目代表 Emoji 與主題色"
          />

          {/* 底部按鈕 */}
          <div className="flex items-center space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-black/5 dark:bg-zinc-800 text-xs font-black text-calico-cocoa/70 dark:text-zinc-300 hover:bg-black/10 transition-all whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="submit"
              style={{ backgroundColor: colorHex }}
              className="flex-1 py-2.5 rounded-2xl text-white text-xs font-black shadow-md hover:opacity-95 active:scale-98 transition-all whitespace-nowrap"
            >
              {initialData ? '儲存成績設定' : '新增科目試算'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
