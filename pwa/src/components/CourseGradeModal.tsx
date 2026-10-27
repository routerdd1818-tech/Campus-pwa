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

  const sAtt = parseScore(attendanceScore);
  const sMid = parseScore(midtermScore);
  const sFin = parseScore(finalScore);

  const currentAccumulated =
    (sAtt !== null ? (sAtt * wAtt) / 100 : 0) +
    (sMid !== null ? (sMid * wMid) / 100 : 0);

  const neededFor60 = wFin > 0 ? Math.ceil(((60 - currentAccumulated) * 100) / wFin) : 0;
  const neededFor80 = wFin > 0 ? Math.ceil(((80 - currentAccumulated) * 100) / wFin) : 0;

  const PRESET_WEIGHTS = [
    { label: '30 / 30 / 40 (標準)', att: 30, mid: 30, fin: 40 },
    { label: '20 / 40 / 40 (重考)', att: 20, mid: 40, fin: 40 },
    { label: '40 / 0 / 60 (無期中)', att: 40, mid: 0, fin: 60 },
    { label: '50 / 0 / 50 (各半)', att: 50, mid: 0, fin: 50 },
    { label: '20 / 30 / 50 (重期末)', att: 20, mid: 30, fin: 50 },
  ];

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

          {/* 配分權重設定與即時成績試算 */}
          <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 space-y-3">
            {/* 標題與總和狀態 */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-200 whitespace-nowrap">
                📊 配分權重與成績試算
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap shrink-0 ${
                  weightSum === 100
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : weightSum < 100
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}
              >
                {weightSum === 100
                  ? '權重總和: 100% ✓'
                  : weightSum < 100
                  ? `權重總和: ${weightSum}% (差 ${100 - weightSum}%)`
                  : `權重總和: ${weightSum}% (超 ${weightSum - 100}%)`}
              </span>
            </div>

            {/* 常用配分比例快速套用 */}
            <div>
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <span className="text-[10px] font-bold text-calico-cocoa/40 dark:text-zinc-500 whitespace-nowrap shrink-0">
                  常用配分：
                </span>
                {PRESET_WEIGHTS.map((preset) => {
                  const isCurrent =
                    wAtt === preset.att && wMid === preset.mid && wFin === preset.fin;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setAttendanceWeight(String(preset.att));
                        setMidtermWeight(String(preset.mid));
                        setFinalWeight(String(preset.fin));
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap shrink-0 ${
                        isCurrent
                          ? 'bg-calico-orange text-white shadow-2xs'
                          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 text-calico-cocoa/70 dark:text-zinc-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 三項獨立評分列 */}
            <div className="space-y-2.5">
              {/* 平時成績 */}
              <div className="p-3 rounded-2xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap shrink-0">
                      平時成績
                    </span>
                    <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400 font-medium truncate">
                      出席、小考、日常作業
                    </span>
                  </div>
                  <div className="text-right text-[11px] font-black shrink-0 whitespace-nowrap">
                    {sAtt !== null ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        進帳 +{((sAtt * wAtt) / 100).toFixed(1)} 分
                      </span>
                    ) : (
                      <span className="text-calico-cocoa/40 dark:text-zinc-500 font-medium">
                        尚未填寫
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                    <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400 whitespace-nowrap shrink-0">
                      配分權重
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={attendanceWeight}
                      onChange={(e) => setAttendanceWeight(e.target.value)}
                      className="w-full text-right text-xs font-black bg-transparent text-calico-cocoa dark:text-zinc-100 outline-none"
                    />
                    <span className="text-xs font-black text-calico-cocoa/40 dark:text-zinc-500 whitespace-nowrap shrink-0">
                      %
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                    <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400 whitespace-nowrap shrink-0">
                      目前分數
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={attendanceScore}
                      onChange={(e) => setAttendanceScore(e.target.value)}
                      placeholder="例: 85"
                      className="w-full text-right text-xs font-black bg-transparent text-calico-cocoa dark:text-zinc-100 placeholder:text-calico-cocoa/30 dark:placeholder:text-zinc-600 outline-none"
                    />
                    <span className="text-xs font-black text-calico-cocoa/40 dark:text-zinc-500 whitespace-nowrap shrink-0">
                      分
                    </span>
                  </div>
                </div>
              </div>

              {/* 期中考 */}
              <div className="p-3 rounded-2xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap shrink-0">
                      期中考試
                    </span>
                    <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400 font-medium truncate">
                      期中測驗或期中專題
                    </span>
                  </div>
                  <div className="text-right text-[11px] font-black shrink-0 whitespace-nowrap">
                    {sMid !== null ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        進帳 +{((sMid * wMid) / 100).toFixed(1)} 分
                      </span>
                    ) : (
                      <span className="text-calico-cocoa/40 dark:text-zinc-500 font-medium">
                        未考可留空
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                    <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400 whitespace-nowrap shrink-0">
                      配分權重
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={midtermWeight}
                      onChange={(e) => setMidtermWeight(e.target.value)}
                      className="w-full text-right text-xs font-black bg-transparent text-calico-cocoa dark:text-zinc-100 outline-none"
                    />
                    <span className="text-xs font-black text-calico-cocoa/40 dark:text-zinc-500 whitespace-nowrap shrink-0">
                      %
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                    <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400 whitespace-nowrap shrink-0">
                      目前分數
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={midtermScore}
                      onChange={(e) => setMidtermScore(e.target.value)}
                      placeholder="未考可留空"
                      className="w-full text-right text-xs font-black bg-transparent text-calico-cocoa dark:text-zinc-100 placeholder:text-calico-cocoa/30 dark:placeholder:text-zinc-600 outline-none"
                    />
                    <span className="text-xs font-black text-calico-cocoa/40 dark:text-zinc-500 whitespace-nowrap shrink-0">
                      分
                    </span>
                  </div>
                </div>
              </div>

              {/* 期末考 */}
              <div className="p-3 rounded-2xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap shrink-0">
                      期末考試
                    </span>
                    <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400 font-medium truncate">
                      期末考或成果發表
                    </span>
                  </div>
                  <div className="text-right text-[11px] font-black shrink-0 whitespace-nowrap">
                    {sFin !== null ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        進帳 +{((sFin * wFin) / 100).toFixed(1)} 分
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        留空自動逆推
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                    <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400 whitespace-nowrap shrink-0">
                      配分權重
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={finalWeight}
                      onChange={(e) => setFinalWeight(e.target.value)}
                      className="w-full text-right text-xs font-black bg-transparent text-calico-cocoa dark:text-zinc-100 outline-none"
                    />
                    <span className="text-xs font-black text-calico-cocoa/40 dark:text-zinc-500 whitespace-nowrap shrink-0">
                      %
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                    <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400 whitespace-nowrap shrink-0">
                      目前分數
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={finalScore}
                      onChange={(e) => setFinalScore(e.target.value)}
                      placeholder="留空逆推門檻"
                      className="w-full text-right text-xs font-black bg-transparent text-calico-cocoa dark:text-zinc-100 placeholder:text-calico-cocoa/30 dark:placeholder:text-zinc-600 outline-none"
                    />
                    <span className="text-xs font-black text-calico-cocoa/40 dark:text-zinc-500 whitespace-nowrap shrink-0">
                      分
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 即時智慧逆推預覽卡片 */}
            <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-black text-amber-900 dark:text-amber-200">
                <span className="flex items-center space-x-1">
                  <span>🎯 目前累計實得：</span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-300">
                    {currentAccumulated.toFixed(1)}
                  </span>
                  <span>分</span>
                </span>
                {wFin > 0 && finalScore.trim() === '' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 whitespace-nowrap shrink-0">
                    期末佔 {wFin}%
                  </span>
                )}
              </div>

              {wFin > 0 && finalScore.trim() === '' ? (
                <div className="text-[11px] text-amber-800 dark:text-amber-200 space-y-1 pt-0.5 border-t border-amber-500/15">
                  <div className="flex items-center justify-between">
                    <span>• 達 60 及格門檻需考：</span>
                    <span className="font-black text-xs">
                      {neededFor60 <= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">已過關 (0分即可) 🎉</span>
                      ) : neededFor60 > 100 ? (
                        <span className="text-rose-600 dark:text-rose-400">{neededFor60} 分 (需加分救火 ⚠️)</span>
                      ) : (
                        <span className="text-amber-900 dark:text-amber-100 underline decoration-amber-500">{neededFor60} 分</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>• 達 A 等級 (80分) 需考：</span>
                    <span className="font-black text-xs">
                      {neededFor80 <= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">已達標 (0分即可) 🌟</span>
                      ) : neededFor80 > 100 ? (
                        <span className="text-calico-cocoa/60 dark:text-zinc-400">超過 100 分</span>
                      ) : (
                        <span className="text-amber-900 dark:text-amber-100 underline decoration-amber-500">{neededFor80} 分</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-amber-800 dark:text-amber-200 pt-0.5 border-t border-amber-500/15">
                  <span>總試算成績：</span>
                  <strong className="text-sm font-black text-amber-900 dark:text-amber-100 ml-1">
                    {Math.round((currentAccumulated + ((sFin || 0) * wFin) / 100) * 10) / 10}
                  </strong>
                  <span className="ml-0.5">分</span>
                </div>
              )}
            </div>
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
