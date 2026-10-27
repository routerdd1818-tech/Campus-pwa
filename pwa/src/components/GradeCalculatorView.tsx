import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CourseGradeItem, CreditCategory } from '../types';
import { CourseGradeModal } from './CourseGradeModal';

function scoreToGpa43(score: number): { gpa: number; letter: string } {
  if (score >= 90) return { gpa: 4.3, letter: 'A+' };
  if (score >= 85) return { gpa: 4.0, letter: 'A' };
  if (score >= 80) return { gpa: 3.7, letter: 'A-' };
  if (score >= 77) return { gpa: 3.3, letter: 'B+' };
  if (score >= 73) return { gpa: 3.0, letter: 'B' };
  if (score >= 70) return { gpa: 2.7, letter: 'B-' };
  if (score >= 67) return { gpa: 2.3, letter: 'C+' };
  if (score >= 63) return { gpa: 2.0, letter: 'C' };
  if (score >= 60) return { gpa: 1.7, letter: 'C-' };
  return { gpa: 0.0, letter: 'F' };
}

const CATEGORY_LABELS: Record<CreditCategory, { label: string; badgeClass: string }> = {
  required: {
    label: '必修',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  elective: {
    label: '選修',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  general: {
    label: '通識',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
};

export const GradeCalculatorView: React.FC = () => {
  const {
    courseGrades,
    addCourseGrade,
    updateCourseGrade,
    deleteCourseGrade,
    importCoursesToGrades,
    graduationTarget,
    updateGraduationTarget,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CourseGradeItem | null>(null);
  const [isTargetConfigOpen, setIsTargetConfigOpen] = useState(false);
  const [importToast, setImportToast] = useState<string | null>(null);

  // 畢業門檻編輯暫存
  const [reqTargetInput, setReqTargetInput] = useState(String(graduationTarget.requiredTarget));
  const [elecTargetInput, setElecTargetInput] = useState(String(graduationTarget.electiveTarget));
  const [genTargetInput, setGenTargetInput] = useState(String(graduationTarget.generalTarget));

  // 計算單科目前累計與期末逆推
  const analyzeCourse = (item: CourseGradeItem) => {
    const att = item.attendanceScore ?? 0;
    const mid = item.midtermScore ?? 0;
    const fin = item.finalScore;

    const currentAccumulated =
      (att * item.attendanceWeight) / 100 + (mid * item.midtermWeight) / 100;

    if (fin !== null && fin !== undefined) {
      const totalScore = Math.round((currentAccumulated + (fin * item.finalWeight) / 100) * 10) / 10;
      const { gpa, letter } = scoreToGpa43(totalScore);
      return {
        isFinalEntered: true,
        totalScore,
        gpa,
        letter,
        neededFor60: 0,
        neededFor80: 0,
      };
    }

    // 尚未輸入期末考：逆推期末考需要幾分才能總分 60 (及格) 與 80 (A-)
    const wFin = item.finalWeight > 0 ? item.finalWeight : 40;
    const neededFor60 = Math.ceil(((60 - currentAccumulated) * 100) / wFin);
    const neededFor80 = Math.ceil(((80 - currentAccumulated) * 100) / wFin);

    // 預估總分（若平時與期中有填，按目前已考權重等比例推估）
    const enteredWeight =
      (item.attendanceScore !== null ? item.attendanceWeight : 0) +
      (item.midtermScore !== null ? item.midtermWeight : 0);
    const projectedScore =
      enteredWeight > 0 ? Math.round((currentAccumulated / enteredWeight) * 100) : 0;
    const { gpa, letter } = scoreToGpa43(projectedScore);

    return {
      isFinalEntered: false,
      totalScore: projectedScore,
      currentAccumulated: Math.round(currentAccumulated * 10) / 10,
      gpa,
      letter,
      neededFor60,
      neededFor80,
    };
  };

  // 學分與 GPA 總計
  const summary = useMemo(() => {
    let requiredCredits = 0;
    let electiveCredits = 0;
    let generalCredits = 0;
    let totalWeightedScore = 0;
    let totalWeightedGpa = 0;
    let gradedCredits = 0;

    for (const item of courseGrades) {
      const info = analyzeCourse(item);
      const passed = info.isFinalEntered ? info.totalScore >= 60 : item.isPassed !== false;

      if (passed) {
        if (item.category === 'required') requiredCredits += item.credits;
        else if (item.category === 'elective') electiveCredits += item.credits;
        else generalCredits += item.credits;
      }

      if (
        item.attendanceScore !== null ||
        item.midtermScore !== null ||
        item.finalScore !== null
      ) {
        totalWeightedScore += info.totalScore * item.credits;
        totalWeightedGpa += info.gpa * item.credits;
        gradedCredits += item.credits;
      }
    }

    const totalEarned = requiredCredits + electiveCredits + generalCredits;
    const avgScore = gradedCredits > 0 ? (totalWeightedScore / gradedCredits).toFixed(1) : '0.0';
    const avgGpa = gradedCredits > 0 ? (totalWeightedGpa / gradedCredits).toFixed(2) : '0.00';

    return {
      totalEarned,
      requiredCredits,
      electiveCredits,
      generalCredits,
      avgScore,
      avgGpa,
    };
  }, [courseGrades]);

  const handleImportFromSchedule = () => {
    const count = importCoursesToGrades();
    if (count > 0) {
      setImportToast(`已從目前課表匯入 ${count} 門新科目！`);
    } else {
      setImportToast('目前課表的所有科目皆已在清單中');
    }
    setTimeout(() => setImportToast(null), 3000);
  };

  const handleSaveTargetConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const req = Math.max(0, Number(reqTargetInput) || 72);
    const elec = Math.max(0, Number(elecTargetInput) || 36);
    const gen = Math.max(0, Number(genTargetInput) || 20);
    updateGraduationTarget({
      totalTarget: req + elec + gen,
      requiredTarget: req,
      electiveTarget: elec,
      generalTarget: gen,
    });
    setIsTargetConfigOpen(false);
  };

  const totalPct = Math.min(
    100,
    Math.round((summary.totalEarned / Math.max(1, graduationTarget.totalTarget)) * 100)
  );

  return (
    <div className="space-y-4">
      {/* 🎓 畢業學分進度與 GPA 總覽卡片 */}
      <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xl shrink-0">🎓</span>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 truncate">
                畢業學分進度 & 學期 GPA 試算
              </h3>
              <p className="text-[11px] font-semibold text-calico-cocoa/50 dark:text-zinc-400">
                自動逆推期末及格分數 · 支援一鍵匯入課表
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setReqTargetInput(String(graduationTarget.requiredTarget));
              setElecTargetInput(String(graduationTarget.electiveTarget));
              setGenTargetInput(String(graduationTarget.generalTarget));
              setIsTargetConfigOpen(!isTargetConfigOpen);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-black text-calico-cocoa/70 dark:text-zinc-300 hover:bg-black/10 transition-all whitespace-nowrap shrink-0"
          >
            ⚙️ 門檻設定
          </button>
        </div>

        {/* 畢業門檻快速設定折疊區 */}
        {isTargetConfigOpen && (
          <form
            onSubmit={handleSaveTargetConfig}
            className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 space-y-2.5 animate-fade-in"
          >
            <div className="text-xs font-black text-calico-cocoa dark:text-zinc-200">
              設定系所畢業學分門檻（總計：{Number(reqTargetInput || 0) + Number(elecTargetInput || 0) + Number(genTargetInput || 0)} 學分）
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-calico-cocoa/60 dark:text-zinc-400 block mb-1">
                  必修門檻
                </label>
                <input
                  type="number"
                  min={0}
                  value={reqTargetInput}
                  onChange={(e) => setReqTargetInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-center text-calico-cocoa dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-calico-cocoa/60 dark:text-zinc-400 block mb-1">
                  選修門檻
                </label>
                <input
                  type="number"
                  min={0}
                  value={elecTargetInput}
                  onChange={(e) => setElecTargetInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-center text-calico-cocoa dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-calico-cocoa/60 dark:text-zinc-400 block mb-1">
                  通識門檻
                </label>
                <input
                  type="number"
                  min={0}
                  value={genTargetInput}
                  onChange={(e) => setGenTargetInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-center text-calico-cocoa dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsTargetConfigOpen(false)}
                className="px-3 py-1 rounded-xl text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 rounded-xl bg-calico-orange text-white text-xs font-black shadow-xs"
              >
                儲存門檻
              </button>
            </div>
          </form>
        )}

        {/* 4 格核心指標 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block whitespace-nowrap">
              已修總學分
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-lg font-black text-calico-cocoa dark:text-zinc-100">
                {summary.totalEarned}
              </span>
              <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400">
                / {graduationTarget.totalTarget}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 block whitespace-nowrap">
              預估 GPA (4.3)
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {summary.avgGpa}
              </span>
              <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400">
                / 4.3
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block whitespace-nowrap">
              加權總平均
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {summary.avgScore}
              </span>
              <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400">
                分
              </span>
            </div>
          </div>
        </div>

        {/* 總進度條 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-calico-cocoa/70 dark:text-zinc-300">
              畢業總進度（還差 {Math.max(0, graduationTarget.totalTarget - summary.totalEarned)} 學分）
            </span>
            <span className="text-calico-orange font-black">{totalPct}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              style={{ width: `${totalPct}%` }}
              className="h-full rounded-full bg-gradient-to-r from-calico-orange to-amber-500 transition-all duration-500"
            />
          </div>
        </div>

        {/* 必 / 選 / 通識 三軌細項 */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            {
              label: '必修',
              earned: summary.requiredCredits,
              target: graduationTarget.requiredTarget,
              color: '#3B82F6',
            },
            {
              label: '選修',
              earned: summary.electiveCredits,
              target: graduationTarget.electiveTarget,
              color: '#8B5CF6',
            },
            {
              label: '通識',
              earned: summary.generalCredits,
              target: graduationTarget.generalTarget,
              color: '#10B981',
            },
          ].map((track) => {
            const pct = Math.min(100, Math.round((track.earned / Math.max(1, track.target)) * 100));
            return (
              <div
                key={track.label}
                className="p-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-calico-cocoa/70 dark:text-zinc-300 whitespace-nowrap">
                    {track.label}
                  </span>
                  <span className="font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                    {track.earned}/{track.target}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                  <div
                    style={{ width: `${pct}%`, backgroundColor: track.color }}
                    className="h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 頂部快捷操作列 */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleImportFromSchedule}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap shrink-0"
        >
          <span>🔄</span>
          <span>從目前課表匯入科目</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="py-2.5 px-4 rounded-2xl bg-calico-orange text-white text-xs font-black shadow-ios-sm hover:opacity-95 active:scale-95 transition-all flex items-center space-x-1 whitespace-nowrap shrink-0"
        >
          <span>＋</span>
          <span>新增科目</span>
        </button>
      </div>

      {importToast && (
        <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center animate-fade-in">
          {importToast}
        </div>
      )}

      {/* 科目成績與期末救援試算列表 */}
      <div className="space-y-3">
        {courseGrades.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 text-center space-y-2">
            <div className="text-3xl">📚</div>
            <p className="text-sm font-black text-calico-cocoa dark:text-zinc-200">
              尚無科目成績紀錄
            </p>
            <p className="text-xs text-calico-cocoa/50 dark:text-zinc-400">
              點擊上方「從目前課表匯入科目」即可一鍵帶入本學期所有課程！
            </p>
          </div>
        ) : (
          courseGrades.map((item) => {
            const info = analyzeCourse(item);
            const catMeta = CATEGORY_LABELS[item.category || 'required'];

            return (
              <div
                key={item.id}
                className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3 transition-all"
              >
                {/* 標題列 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div
                      style={{
                        backgroundColor: `${item.colorHex || '#3B82F6'}20`,
                        borderColor: `${item.colorHex || '#3B82F6'}40`,
                      }}
                      className="w-10 h-10 rounded-2xl border flex items-center justify-center text-lg shrink-0"
                    >
                      {item.emoji || '📚'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 truncate">
                          {item.courseName}
                        </h4>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap shrink-0 ${catMeta.badgeClass}`}
                        >
                          {catMeta.label} · {item.credits}學分
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-calico-cocoa/50 dark:text-zinc-400 mt-0.5">
                        學期 {item.semester} · 配分 {item.attendanceWeight}% / {item.midtermWeight}% / {item.finalWeight}%
                      </p>
                    </div>
                  </div>

                  {/* 右側預估分數與等第 */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      <div className="flex items-baseline justify-end space-x-1">
                        <span className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                          {info.totalScore}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-lg bg-calico-orange/15 text-calico-orange text-[10px] font-black">
                          {info.letter}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-calico-cocoa/40 dark:text-zinc-500 block whitespace-nowrap">
                        {info.isFinalEntered ? '學期總成績' : '目前預估'}
                      </span>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] font-bold text-calico-cocoa/70 dark:text-zinc-300 hover:bg-black/10 whitespace-nowrap"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCourseGrade(item.id)}
                        className="px-2 py-1 rounded-lg bg-rose-500/10 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 whitespace-nowrap"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>

                {/* 平時 / 期中 / 期末 快速輸入格 */}
                <div className="grid grid-cols-3 gap-2">
                  {/* 平時 */}
                  <div className="p-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 whitespace-nowrap">
                      平時({item.attendanceWeight}%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="--"
                      value={item.attendanceScore !== null ? item.attendanceScore : ''}
                      onChange={(e) => {
                        const val = e.target.value.trim() === '' ? null : Math.min(100, Math.max(0, Number(e.target.value)));
                        updateCourseGrade({ ...item, attendanceScore: val });
                      }}
                      className="w-12 text-right bg-transparent text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:text-calico-orange"
                    />
                  </div>

                  {/* 期中 */}
                  <div className="p-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 whitespace-nowrap">
                      期中({item.midtermWeight}%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="--"
                      value={item.midtermScore !== null ? item.midtermScore : ''}
                      onChange={(e) => {
                        const val = e.target.value.trim() === '' ? null : Math.min(100, Math.max(0, Number(e.target.value)));
                        updateCourseGrade({ ...item, midtermScore: val });
                      }}
                      className="w-12 text-right bg-transparent text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:text-calico-orange"
                    />
                  </div>

                  {/* 期末 */}
                  <div className="p-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 whitespace-nowrap">
                      期末({item.finalWeight}%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="留空逆推"
                      value={item.finalScore !== null ? item.finalScore : ''}
                      onChange={(e) => {
                        const val = e.target.value.trim() === '' ? null : Math.min(100, Math.max(0, Number(e.target.value)));
                        updateCourseGrade({ ...item, finalScore: val });
                      }}
                      className="w-14 text-right bg-transparent text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none focus:text-calico-orange"
                    />
                  </div>
                </div>

                {/* 💡 期末考及格救援試算橫幅 */}
                {!info.isFinalEntered ? (
                  <div
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-wrap items-center justify-between gap-1.5 ${
                      info.neededFor60 <= 0
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        : info.neededFor60 <= 75
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                        : info.neededFor60 <= 100
                        ? 'bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>
                        {info.neededFor60 <= 0
                          ? '🎉 穩過！目前實拿已達 60 分以上'
                          : info.neededFor60 <= 100
                          ? `🎯 期末考至少需考 【 ${info.neededFor60} 分 】 才能 60 分及格`
                          : `🚨 危險！期末考滿分仍差 ${Math.ceil(((info.neededFor60 - 100) * item.finalWeight) / 100)} 分及格（建議評估停修或加分）`}
                      </span>
                    </div>
                    {info.neededFor80 > 0 && info.neededFor80 <= 100 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/70 dark:bg-zinc-800/80 whitespace-nowrap shrink-0">
                        考 {info.neededFor80} 分拿 A-
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className={`p-2 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                      info.totalScore >= 60
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    <span>
                      {info.totalScore >= 60
                        ? `✅ 已通過取得 ${item.credits} 學分（學期總分 ${info.totalScore}）`
                        : `⚠️ 未達 60 分及格標準（學期總分 ${info.totalScore}）`}
                    </span>
                    <span className="font-black whitespace-nowrap">GPA {info.gpa.toFixed(1)}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <CourseGradeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={(saved) => {
          if (editingItem) {
            updateCourseGrade(saved);
          } else {
            addCourseGrade(saved);
          }
        }}
        initialData={editingItem}
      />
    </div>
  );
};
