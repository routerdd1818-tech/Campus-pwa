import React, { useState } from 'react';
import { Course, ClassPeriod } from '../types';
import { callGeminiOcrGateway } from '../services/supabase';
import { useApp } from '../context/AppContext';
import { X, Sparkles, Upload, Loader2, CheckCircle2, AlertCircle, Wand2, Clock } from 'lucide-react';

interface OcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCourses: (courses: Course[]) => void;
}

// 根據使用者的節次作息設定，自動校準每堂課的起訖時間
function calibrateCourseTimes(
  item: any,
  periods: ClassPeriod[]
): { startTime: string; endTime: string; note?: string } {
  if (!periods || periods.length === 0) {
    return { startTime: item.startTime || '09:00', endTime: item.endTime || '12:00' };
  }

  // 1. 優先檢查是否具有節次代碼 (例如 [1, 2], [5, 6, 7], "5-7", 或 "第 2-4 節")
  let periodNums: number[] = [];
  if (Array.isArray(item.periodCodes)) {
    periodNums = item.periodCodes
      .map((x: any) => Number(String(x).replace(/\D/g, '')))
      .filter((n: number) => !isNaN(n) && n > 0);
  } else if (typeof item.periodCodes === 'string') {
    const matches = item.periodCodes.match(/\d+/g);
    if (matches) {
      if (item.periodCodes.includes('-') && matches.length >= 2) {
        const startP = Number(matches[0]);
        const endP = Number(matches[1]);
        for (let p = startP; p <= endP; p++) periodNums.push(p);
      } else {
        periodNums = matches.map(Number);
      }
    }
  }

  if (periodNums.length > 0) {
    const matchedPeriods = periods.filter(
      (p) => periodNums.includes(p.id) || periodNums.includes(Number(p.displayCode))
    );
    if (matchedPeriods.length > 0) {
      const minStart = matchedPeriods.reduce(
        (min, p) => (p.startTime < min ? p.startTime : min),
        matchedPeriods[0].startTime
      );
      const maxEnd = matchedPeriods.reduce(
        (max, p) => (p.endTime > max ? p.endTime : max),
        matchedPeriods[0].endTime
      );
      return { startTime: minStart, endTime: maxEnd, note: `依第 ${periodNums.join(',')} 節校準` };
    }
  }

  // 2. 若無節次代碼，則根據 raw startTime / endTime 比對最貼近的作息節次
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const rawStartMins = toMins(item.startTime || '09:00');
  const rawEndMins = toMins(item.endTime || '12:00');

  // 找出起點最接近的節次
  let closestStartPeriod = periods[0];
  let minStartDiff = Infinity;
  for (const p of periods) {
    const diff = Math.abs(toMins(p.startTime) - rawStartMins);
    if (diff < minStartDiff) {
      minStartDiff = diff;
      closestStartPeriod = p;
    }
  }

  // 找出終點最接近的節次
  let closestEndPeriod = periods[periods.length - 1];
  let minEndDiff = Infinity;
  for (const p of periods) {
    const diff = Math.abs(toMins(p.endTime) - rawEndMins);
    if (diff < minEndDiff) {
      minEndDiff = diff;
      closestEndPeriod = p;
    }
  }

  // 差異小於 45 分鐘時自動校準對齊作息
  const finalStart = minStartDiff <= 45 ? closestStartPeriod.startTime : item.startTime || '09:00';
  const finalEnd = minEndDiff <= 45 ? closestEndPeriod.endTime : item.endTime || '12:00';

  return {
    startTime: finalStart,
    endTime: finalEnd,
    note: minStartDiff <= 45 ? `自動校正作息` : undefined,
  };
}

export const OcrModal: React.FC<OcrModalProps> = ({ isOpen, onClose, onImportCourses }) => {
  const { classPeriods } = useApp();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedCourses, setParsedCourses] = useState<Course[]>([]);
  const [rawOcrItems, setRawOcrItems] = useState<any[]>([]);
  const [autoCalibratePeriods, setAutoCalibratePeriods] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setParsedCourses([]);
    setRawOcrItems([]);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      setBase64Data(base64);
    };
    reader.readAsDataURL(file);
  };

  const mapItemsToCourses = (items: any[], calibrate: boolean): Course[] => {
    const colors = ['#E67E22', '#3D2F2E', '#48BB78', '#3182CE', '#805AD5', '#DD6B20'];
    return items.map((item: any, idx: number) => {
      let startTime = item.startTime || '09:00';
      let endTime = item.endTime || '12:00';

      if (calibrate) {
        const cal = calibrateCourseTimes(item, classPeriods);
        startTime = cal.startTime;
        endTime = cal.endTime;
      }

      return {
        id: `ocr_${Date.now()}_${idx}`,
        name: item.name || '未命名課程',
        classroom: item.classroom || '',
        instructor: item.instructor || '',
        dayOfWeek: (Number(item.dayOfWeek) >= 1 && Number(item.dayOfWeek) <= 7 ? Number(item.dayOfWeek) : 1) as any,
        startTime,
        endTime,
        colorHex: colors[idx % colors.length],
        isSharedWithFriends: true,
      };
    });
  };

  const handleToggleCalibrate = () => {
    const nextVal = !autoCalibratePeriods;
    setAutoCalibratePeriods(nextVal);
    if (rawOcrItems.length > 0) {
      setParsedCourses(mapItemsToCourses(rawOcrItems, nextVal));
    }
  };

  const handleStartOCR = async () => {
    if (!base64Data) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await callGeminiOcrGateway(base64Data);
      if (!result.ok || !result.text) {
        throw new Error(result.error || '辨識服務無回應，請確認圖片清晰度');
      }

      // Clean JSON markdown blocks if any
      const cleaned = result.text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const items = JSON.parse(cleaned);
      if (!Array.isArray(items)) {
        throw new Error('辨識結果格式異常，未取得課程列表');
      }

      setRawOcrItems(items);
      const mapped = mapItemsToCourses(items, autoCalibratePeriods);
      setParsedCourses(mapped);
    } catch (err: any) {
      setErrorMsg(err.message || '辨識失敗，請確認圖片清晰度');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedCourses.length === 0) return;
    onImportCourses(parsedCourses);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-calico-darkCard rounded-3xl p-6 shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-calico-orange/15 text-calico-orange flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-calico-cocoa dark:text-zinc-100">
                AI 課表圖片辨識
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                上傳課表截圖，Google Gemini 自動分析並匯入
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload area */}
        <div className="mt-4">
          <label className="flex flex-col items-center justify-center w-full h-44 rounded-2xl border-2 border-dashed border-calico-orange/40 hover:border-calico-orange bg-calico-cream/40 dark:bg-zinc-800/40 cursor-pointer overflow-hidden transition-all">
            {imagePreview ? (
              <img src={imagePreview} alt="Timetable preview" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center px-4">
                <Upload className="w-8 h-8 text-calico-orange mb-2 animate-bounce" />
                <p className="text-xs font-bold text-calico-cocoa dark:text-zinc-200">
                  點此選擇照片 或 截圖貼上
                </p>
                <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 mt-1">
                  支援 JPG、PNG 格式的大學選課系統或課表截圖
                </p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {/* OCR Trigger button */}
        {imagePreview && parsedCourses.length === 0 && (
          <div className="mt-4">
            <button
              onClick={handleStartOCR}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-calico-orange text-white font-extrabold flex items-center justify-center space-x-2 shadow-sm hover:brightness-105 active:scale-95 transition-all text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gemini AI 正在深入辨識中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>開始 AI 智慧辨識</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Parsed courses list */}
        {parsedCourses.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-200 flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-calico-sage" />
                <span>成功辨識出 {parsedCourses.length} 門課程：</span>
              </span>

              {/* Auto calibration toggle button */}
              <button
                type="button"
                onClick={handleToggleCalibrate}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all ${
                  autoCalibratePeriods
                    ? 'bg-calico-orange/15 text-calico-orange border border-calico-orange/30'
                    : 'bg-black/5 dark:bg-white/10 text-calico-cocoa/50 dark:text-zinc-400'
                }`}
                title="自動依校園作息校正每節課時間"
              >
                <Wand2 className="w-3 h-3" />
                <span>{autoCalibratePeriods ? '已依節次校準時間' : '原始圖片時間'}</span>
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {parsedCourses.map((c, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-calico-cream/80 dark:bg-zinc-800 border border-black/5 dark:border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.colorHex }} />
                    <span className="font-bold text-calico-cocoa dark:text-zinc-100 truncate">{c.name}</span>
                    <span className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 font-mono shrink-0">
                      週{['一', '二', '三', '四', '五', '六', '日'][c.dayOfWeek - 1]} {c.startTime}-{c.endTime}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    {autoCalibratePeriods && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-calico-orange/10 text-calico-orange font-bold flex items-center space-x-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>校準</span>
                      </span>
                    )}
                    <span className="text-[11px] text-calico-cocoa/60 font-medium">{c.classroom || '未定教室'}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirmImport}
              className="w-full py-3 px-4 rounded-xl bg-calico-sage text-white font-extrabold flex items-center justify-center space-x-1 shadow-sm hover:brightness-105 active:scale-95 transition-all text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>一鍵將全部課程匯入課表</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
