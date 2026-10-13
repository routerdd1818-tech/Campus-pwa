import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Transaction, DebtRecord, SplitBill } from '../types';
import { TransactionModal } from '../components/TransactionModal';
import { PeerRatingModal } from '../components/PeerRatingModal';
import { DebtModal } from '../components/DebtModal';
import { RepayDebtModal } from '../components/RepayDebtModal';
import { SplitBillModal } from '../components/SplitBillModal';
import { fetchSharedScheduleByCode } from '../services/supabase';
import {
  Plus,
  CreditCard,
  Trash2,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Sparkles,
  Calendar,
  Users,
  Star,
  RefreshCw,
  UserPlus,
  CheckCircle2,
  Clock,
  ArrowRight,
  DollarSign,
  Calculator,
  Receipt,
  Edit2,
  CalendarDays,
} from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';

// ============================================================================
// 🥧 Interactive SVG Donut / Pie Chart Component
// ============================================================================
interface CategoryPieChartProps {
  categories: {
    name: string;
    amount: number;
    colorHex: string;
    count: number;
    percent: number;
  }[];
  totalExpense: number;
  emptyText?: string;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categories,
  totalExpense,
  emptyText = '尚無支出記錄',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius; // ~402.124

  let accumulatedPercent = 0;

  if (totalExpense === 0 || categories.length === 0) {
    return (
      <div className="py-6 flex flex-col items-center justify-center text-center">
        <svg viewBox="0 0 180 180" className="w-36 h-36">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-black/5 dark:text-white/10"
          />
          <text
            x="90"
            y="94"
            textAnchor="middle"
            className="text-sm font-black fill-calico-cocoa/40 dark:fill-zinc-500"
          >
            $0
          </text>
        </svg>
        <p className="text-xs text-calico-cocoa/50 dark:text-zinc-500 font-bold mt-2">
          {emptyText} 🍃
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SVG Donut Chart with Center KPI */}
      <div className="flex items-center justify-center py-2">
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
          <svg viewBox="0 0 180 180" className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-black/5 dark:text-white/5"
            />

            {/* Slices */}
            {categories.map((c, index) => {
              const strokeDasharray = `${(c.percent / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += c.percent;

              const isHovered = hoveredIndex === index;

              return (
                <circle
                  key={c.name}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke={c.colorHex}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
                  className="cursor-pointer transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Centered Donut Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {hoveredIndex !== null && categories[hoveredIndex] ? (
              <>
                <span
                  style={{ color: categories[hoveredIndex].colorHex }}
                  className="text-xs font-black truncate max-w-[100px]"
                >
                  {categories[hoveredIndex].name}
                </span>
                <span className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                  ${categories[hoveredIndex].amount}
                </span>
                <span className="text-[10px] font-mono font-bold text-calico-cocoa/60 dark:text-zinc-400">
                  {categories[hoveredIndex].percent}% ({categories[hoveredIndex].count}筆)
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400">
                  總支出
                </span>
                <span className="text-lg font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                  ${totalExpense.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-calico-orange">
                  {categories.length} 個類別
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category List with Progress Bars & Interactive Highlights */}
      <div className="space-y-2 pt-1">
        {categories.map((c, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <div
              key={c.name}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
              className={`p-2 rounded-2xl transition-all cursor-pointer ${
                isHovered
                  ? 'bg-black/5 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/10'
                  : 'hover:bg-black/2 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <div className="flex items-center space-x-2">
                  <div
                    style={{ backgroundColor: `${c.colorHex}25`, color: c.colorHex }}
                    className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <CategoryIcon categoryName={c.name} className="w-3 h-3" />
                  </div>
                  <span className="text-calico-cocoa dark:text-zinc-200">{c.name}</span>
                  <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-500 font-semibold">
                    ({c.count} 筆)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-calico-cocoa dark:text-zinc-100">
                    ${c.amount}
                  </span>
                  <span className="text-calico-cocoa/50 dark:text-zinc-400 font-mono w-9 text-right">
                    {c.percent}%
                  </span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div
                  style={{
                    width: `${c.percent}%`,
                    backgroundColor: c.colorHex,
                  }}
                  className="h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 📱 Main Accounting View
// ============================================================================
export const AccountingView: React.FC = () => {
  const {
    currentUser,
    settings,
    transactions,
    budgetInfo,
    addTransaction,
    deleteTransaction,
    savedFriends,
    saveFriendRecord,
    setIsShareModalOpen,
    debts,
    splitBills,
    deleteDebt,
    deleteSplitBill,
    settleSplitParticipant,
    settleEntireSplitBill,
  } = useApp();

  // Top Scope: 'mine' (我的記帳) | 'friends' (好友帳本)
  const [ledgerScope, setLedgerScope] = useState<'mine' | 'friends'>('mine');
  const [selectedFriendIndex, setSelectedFriendIndex] = useState<number>(0);
  const [isRefreshingFriend, setIsRefreshingFriend] = useState<boolean>(false);
  const [ratingModalTx, setRatingModalTx] = useState<Transaction | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState<boolean>(false);

  // 🤝 往來帳務 (多人分帳 · 借還 · 分期)
  const [isSocialDebtOpen, setIsSocialDebtOpen] = useState(false);
  const [socialDebtTab, setSocialDebtTab] = useState<'splits' | 'debts'>('splits');
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitToEdit, setSplitToEdit] = useState<SplitBill | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<DebtRecord | null>(null);
  const [repayDebtTarget, setRepayDebtTarget] = useState<DebtRecord | null>(null);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [expandedDebtHistoryId, setExpandedDebtHistoryId] = useState<string | null>(null);

  // 📅 好友帳本當日消費日期導航
  const [friendSelectedDate, setFriendSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [friendViewListMode, setFriendViewListMode] = useState<'daily' | 'all'>('daily');

  const handleFriendPrevDay = () => {
    const d = new Date(friendSelectedDate);
    d.setDate(d.getDate() - 1);
    setFriendSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleFriendNextDay = () => {
    const d = new Date(friendSelectedDate);
    d.setDate(d.getDate() + 1);
    setFriendSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleFriendToday = () => {
    setFriendSelectedDate(new Date().toISOString().slice(0, 10));
  };

  // 🧮 債務與分帳統計 (Debt Stats)
  const debtStats = useMemo(() => {
    const activeDebts = (debts || []).filter((d) => !d.isSettled);
    const iOweDebts = activeDebts.filter((d) => d.type === 'i_owe');
    const theyOweDebts = activeDebts.filter((d) => d.type === 'they_owe');

    const totalIOwe = iOweDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const totalTheyOwe = theyOweDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

    const activeSplits = (splitBills || []).filter((b) => !b.isSettled);
    let splitToReceive = 0;
    let splitToPay = 0;
    const myName = currentUser?.displayName || settings.ownerName || '我';

    activeSplits.forEach((sb) => {
      (sb.settlements || []).forEach((st) => {
        if (!st.isSettled) {
          if (st.to === myName) splitToReceive += st.amount;
          if (st.from === myName) splitToPay += st.amount;
        }
      });
    });

    return {
      totalIOwe,
      totalTheyOwe,
      splitToReceive,
      splitToPay,
      activeDebtsCount: activeDebts.length,
      activeSplitsCount: activeSplits.length,
      netDebt: totalIOwe + splitToPay - (totalTheyOwe + splitToReceive),
    };
  }, [debts, splitBills, currentUser, settings.ownerName]);

  // Active friend calculations
  const currentFriend = savedFriends[selectedFriendIndex] || savedFriends[0];

  const handleRefreshFriend = async () => {
    if (!currentFriend) return;
    setIsRefreshingFriend(true);
    try {
      const latest = await fetchSharedScheduleByCode(currentFriend.shareCode);
      if (latest) {
        saveFriendRecord({
          ...currentFriend,
          lastViewedAt: new Date().toISOString(),
          cachedSchedule: latest,
        });
      }
    } finally {
      setIsRefreshingFriend(false);
    }
  };

  useEffect(() => {
    if (selectedFriendIndex >= savedFriends.length && savedFriends.length > 0) {
      setSelectedFriendIndex(0);
    }
  }, [savedFriends.length, selectedFriendIndex]);

  const friendSchedule = currentFriend?.cachedSchedule;
  const isFriendExpenseShared = friendSchedule ? friendSchedule.isExpenseSharingEnabled !== false : true;

  const friendTransactions = useMemo(() => {
    if (!friendSchedule || !Array.isArray(friendSchedule.accountingData)) return [];
    return [...friendSchedule.accountingData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [friendSchedule]);

  // 🌟 好友記帳：聚焦於「當日消費」而非總花費
  const friendStats = useMemo(() => {
    let todayExpense = 0;
    let todayIncome = 0;
    let todayRatedCount = 0;
    let todayTotalRating = 0;
    const todayCatMap: Record<string, { amount: number; colorHex: string; count: number }> = {};

    let totalExpense = 0;
    let totalIncome = 0;
    const catMap: Record<string, { amount: number; colorHex: string; count: number }> = {};
    let ratedCount = 0;
    let totalRating = 0;

    const todayTxs = friendTransactions.filter(
      (t) => t.date && t.date.slice(0, 10) === friendSelectedDate
    );

    todayTxs.forEach((t) => {
      if (t.type === 'expense' || !t.type) {
        todayExpense += t.amount;
        if (!todayCatMap[t.categoryName]) {
          todayCatMap[t.categoryName] = { amount: 0, colorHex: t.categoryColorHex || '#E67E22', count: 0 };
        }
        todayCatMap[t.categoryName].amount += t.amount;
        todayCatMap[t.categoryName].count += 1;
      } else {
        todayIncome += t.amount;
      }

      if (t.peerRating) {
        todayTotalRating += t.peerRating;
        todayRatedCount += 1;
      }
    });

    friendTransactions.forEach((t) => {
      if (t.type === 'expense' || !t.type) {
        totalExpense += t.amount;
        if (!catMap[t.categoryName]) {
          catMap[t.categoryName] = { amount: 0, colorHex: t.categoryColorHex || '#E67E22', count: 0 };
        }
        catMap[t.categoryName].amount += t.amount;
        catMap[t.categoryName].count += 1;
      } else {
        totalIncome += t.amount;
      }

      if (t.peerRating) {
        totalRating += t.peerRating;
        ratedCount += 1;
      }
    });

    const todayCategories = Object.entries(todayCatMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        colorHex: data.colorHex,
        count: data.count,
        percent: todayExpense > 0 ? Math.round((data.amount / todayExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const categories = Object.entries(catMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        colorHex: data.colorHex,
        count: data.count,
        percent: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      todayExpense,
      todayIncome,
      todayTxCount: todayTxs.length,
      todayCategories,
      todayAvgRating: todayRatedCount > 0 ? (todayTotalRating / todayRatedCount).toFixed(1) : null,
      todayRatedCount,
      todayTransactions: todayTxs,
      totalExpense,
      totalIncome,
      categories,
      txCount: friendTransactions.length,
      avgRating: ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : null,
      ratedCount,
    };
  }, [friendTransactions, friendSelectedDate]);

  const renderPeerRatingBadge = (tx: Transaction) => {
    if (!tx.peerRating) return null;
    return (
      <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className="flex items-center text-amber-500 shrink-0">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < (tx.peerRating || 0)
                    ? 'fill-amber-400 text-amber-500'
                    : 'text-gray-300 dark:text-zinc-600'
                }`}
              />
            ))}
          </div>
          <span className="font-extrabold text-amber-700 dark:text-amber-300 shrink-0">
            {tx.peerRating}星
          </span>
          {tx.peerFeedback && (
            <span className="text-calico-cocoa/80 dark:text-zinc-300 truncate font-semibold">
              「{tx.peerFeedback}」
            </span>
          )}
        </div>
        {tx.peerRaterName && (
          <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-bold shrink-0 ml-2">
            · 來自 {tx.peerRaterName}
          </span>
        )}
      </div>
    );
  };

  // Primary view mode: 'ledger' (流水帳) | 'weekly' (每週統計) | 'monthly' (每月統計)
  const [viewMode, setViewMode] = useState<'ledger' | 'weekly' | 'monthly'>('ledger');

  // Ledger filters
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --------------------------------------------------------------------------
  // 🗓️ Weekly Analytics State & Calculations
  // --------------------------------------------------------------------------
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(() => new Date());

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 is Sunday
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const formatDate = (dateObj: Date) => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    // Calculate week number in year
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

    return {
      startStr: formatDate(sunday),
      endStr: formatDate(saturday),
      displayStart: `${sunday.getMonth() + 1}/${sunday.getDate()}`,
      displayEnd: `${saturday.getMonth() + 1}/${saturday.getDate()}`,
      year: sunday.getFullYear(),
      weekNum,
    };
  };

  const currentWeekRange = useMemo(() => getWeekRange(new Date()), []);
  const selectedWeekRange = useMemo(() => getWeekRange(selectedWeekDate), [selectedWeekDate]);

  const handlePrevWeek = () => {
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const isCurrentWeek = selectedWeekRange.startStr === currentWeekRange.startStr;

  // Transactions for selected week
  const weeklyTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tDate = t.date.slice(0, 10);
      return tDate >= selectedWeekRange.startStr && tDate <= selectedWeekRange.endStr;
    });
  }, [transactions, selectedWeekRange]);

  // Weekly Stats calculation
  const weeklyStats = useMemo(() => {
    let expense = 0;
    let income = 0;
    const catMap: Record<string, { amount: number; colorHex: string; count: number }> = {};
    let totalScore = 0;
    let scoreCount = 0;

    weeklyTransactions.forEach((t) => {
      if (t.type === 'expense') {
        expense += t.amount;
        if (!catMap[t.categoryName]) {
          catMap[t.categoryName] = { amount: 0, colorHex: t.categoryColorHex || '#E67E22', count: 0 };
        }
        catMap[t.categoryName].amount += t.amount;
        catMap[t.categoryName].count += 1;

        if (t.valueScore) {
          totalScore += t.valueScore;
          scoreCount += 1;
        }
      } else {
        income += t.amount;
      }
    });

    const net = income - expense;

    const categories = Object.entries(catMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        colorHex: data.colorHex,
        count: data.count,
        percent: expense > 0 ? Math.round((data.amount / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const dailyAvg = Math.round(expense / 7);
    const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : null;

    return {
      expense,
      income,
      net,
      categories,
      dailyAvg,
      avgScore,
      txCount: weeklyTransactions.length,
    };
  }, [weeklyTransactions]);

  // --------------------------------------------------------------------------
  // 📊 Monthly Analytics State & Calculations
  // --------------------------------------------------------------------------
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const currentYearMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const handlePrevMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedYearMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedYearMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthlyTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.slice(0, 7) === selectedYearMonth);
  }, [transactions, selectedYearMonth]);

  const monthlyStats = useMemo(() => {
    let expense = 0;
    let income = 0;
    const catMap: Record<string, { amount: number; colorHex: string; count: number }> = {};
    let totalScore = 0;
    let scoreCount = 0;

    monthlyTransactions.forEach((t) => {
      if (t.type === 'expense') {
        expense += t.amount;
        if (!catMap[t.categoryName]) {
          catMap[t.categoryName] = { amount: 0, colorHex: t.categoryColorHex || '#E67E22', count: 0 };
        }
        catMap[t.categoryName].amount += t.amount;
        catMap[t.categoryName].count += 1;

        if (t.valueScore) {
          totalScore += t.valueScore;
          scoreCount += 1;
        }
      } else {
        income += t.amount;
      }
    });

    const net = income - expense;

    const categories = Object.entries(catMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        colorHex: data.colorHex,
        count: data.count,
        percent: expense > 0 ? Math.round((data.amount / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const [y, m] = selectedYearMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const dailyAvg = Math.round(expense / daysInMonth);
    const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : null;

    return {
      expense,
      income,
      net,
      categories,
      dailyAvg,
      avgScore,
      txCount: monthlyTransactions.length,
    };
  }, [monthlyTransactions, selectedYearMonth]);

  const displayYearMonthText = useMemo(() => {
    const [y, m] = selectedYearMonth.split('-');
    return `${y} 年 ${parseInt(m, 10)} 月`;
  }, [selectedYearMonth]);

  // --------------------------------------------------------------------------
  // 💳 Ledger filtered list
  // --------------------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (selectedCategoryFilter !== 'all' && t.categoryName !== selectedCategoryFilter) return false;
      return true;
    });
  }, [transactions, filterType, selectedCategoryFilter]);

  const spentPercent = Math.min(
    100,
    Math.round((budgetInfo.todaySpent / budgetInfo.effectiveLimit) * 100)
  );

  return (
    <div className="space-y-4">
      {/* 🌟 Top Scope Switcher: 我的帳本 vs 好友帳本 */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-lg font-black text-calico-cocoa dark:text-zinc-100 flex items-center space-x-1.5">
            <span>{ledgerScope === 'mine' ? '💰 記帳理財' : '🤝 好友帳本與評分'}</span>
          </h2>
          <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
            {ledgerScope === 'mine' ? '掌握每筆開銷，培養儲蓄習慣' : '互相查閱好友開銷，給予暖心理財星評'}
          </p>
        </div>

        <div className="p-1 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center gap-1 text-xs font-bold shadow-2xs">
          <button
            onClick={() => setLedgerScope('mine')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
              ledgerScope === 'mine'
                ? 'bg-white dark:bg-calico-darkCard text-calico-orange shadow-ios-sm font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
            }`}
          >
            <span>🐱 我的帳本</span>
          </button>

          <button
            onClick={() => setLedgerScope('friends')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
              ledgerScope === 'friends'
                ? 'bg-white dark:bg-calico-darkCard text-calico-orange shadow-ios-sm font-black'
                : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>好友帳本</span>
            {savedFriends.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-calico-orange"></span>
            )}
          </button>
        </div>
      </div>

      {ledgerScope === 'mine' && (
        <>
          {/* Top View Mode 3-Segment Switcher */}
      <div className="p-1 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center gap-1 text-xs font-bold shadow-2xs">
        <button
          onClick={() => setViewMode('ledger')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
            viewMode === 'ledger'
              ? 'bg-white dark:bg-calico-darkCard text-calico-orange shadow-ios-sm font-black'
              : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>流水帳</span>
        </button>

        <button
          onClick={() => setViewMode('weekly')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
            viewMode === 'weekly'
              ? 'bg-white dark:bg-calico-darkCard text-calico-orange shadow-ios-sm font-black'
              : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>每週統計</span>
        </button>

        <button
          onClick={() => setViewMode('monthly')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
            viewMode === 'monthly'
              ? 'bg-white dark:bg-calico-darkCard text-calico-orange shadow-ios-sm font-black'
              : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>每月統計</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 📊 MODE A: 每週統計分析 (WEEKLY ANALYTICS WITH PIE CHART) */}
      {/* ========================================================================= */}
      {viewMode === 'weekly' && (
        <div className="space-y-4 animate-fade-in">
          {/* Week Navigator Header */}
          <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex items-center justify-between">
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-xl text-calico-cocoa/60 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all"
              title="上一週"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                  {selectedWeekRange.displayStart} ~ {selectedWeekRange.displayEnd}
                </h3>
                {isCurrentWeek ? (
                  <span className="text-[10px] bg-calico-orange/15 text-calico-orange font-bold px-2 py-0.5 rounded-full">
                    本週
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedWeekDate(new Date())}
                    className="text-[10px] bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-full hover:bg-calico-orange/15 hover:text-calico-orange transition-all"
                  >
                    回到本週
                  </button>
                )}
              </div>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-medium mt-0.5">
                {selectedWeekRange.year} 年第 {selectedWeekRange.weekNum} 週 · 共 {weeklyStats.txCount} 筆收支
              </p>
            </div>

            <button
              onClick={handleNextWeek}
              className="p-2 rounded-xl text-calico-cocoa/60 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all"
              title="下一週"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekly KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-rose-200/50 dark:border-zinc-700/40 shadow-ios">
              <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 text-xs font-bold mb-1">
                <ArrowDownRight className="w-4 h-4" />
                <span>本週總支出</span>
              </div>
              <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                ${weeklyStats.expense}
              </p>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                日均支出約 ${weeklyStats.dailyAvg} / 天
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-emerald-200/50 dark:border-zinc-700/40 shadow-ios">
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
                <ArrowUpRight className="w-4 h-4" />
                <span>本週總收入</span>
              </div>
              <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                ${weeklyStats.income}
              </p>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                本週淨結餘 {weeklyStats.net >= 0 ? `+$${weeklyStats.net}` : `-$${Math.abs(weeklyStats.net)}`}
              </p>
            </div>
          </div>

          {/* 🌟 Category Pie Chart (週支出圓餅圖) */}
          <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-calico-orange/15 text-calico-orange">
                  <PieChart className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                  本週支出圓餅圖分析
                </h4>
              </div>
              <span className="text-xs font-bold text-calico-cocoa/40 dark:text-zinc-400">
                共 {weeklyStats.categories.length} 個類別
              </span>
            </div>

            <CategoryPieChart
              categories={weeklyStats.categories}
              totalExpense={weeklyStats.expense}
              emptyText="此週尚無任何支出記錄"
            />
          </div>

          {/* Weekly Transaction List */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-calico-cocoa/60 dark:text-zinc-400 uppercase tracking-wider px-1">
              本週收支明細清單
            </h4>

            {weeklyTransactions.length > 0 ? (
              weeklyTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex flex-col space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div
                        style={{ backgroundColor: `${tx.categoryColorHex || '#E67E22'}20`, color: tx.categoryColorHex || '#E67E22' }}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                      >
                        <CategoryIcon icon={tx.categoryIcon} categoryName={tx.categoryName} className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                            {tx.categoryName}
                          </h5>
                          {tx.valueScore && (
                            <span className="text-[10px] bg-calico-orange/15 text-calico-orange px-1.5 py-0.2 rounded-md font-bold shrink-0">
                              ★ {tx.valueScore}分
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 mt-0.5 truncate">
                          {tx.notes || tx.paymentMethodName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 text-right shrink-0">
                      <div>
                        <p
                          className={`text-sm font-black ${
                            tx.type === 'expense'
                              ? 'text-calico-cocoa dark:text-zinc-100'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {tx.type === 'expense' ? `-$${tx.amount}` : `+$${tx.amount}`}
                        </p>
                        <p className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400">
                          {tx.date.slice(5, 10)}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteTransaction(tx.id)}
                        className="p-1 rounded-lg text-calico-cocoa/20 hover:text-red-500 transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {renderPeerRatingBadge(tx)}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-calico-cocoa/40 dark:text-zinc-500 font-bold">
                此週尚無交易記錄 🍃
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 MODE B: 每月統計分析 (MONTHLY ANALYTICS WITH PIE CHART) */}
      {/* ========================================================================= */}
      {viewMode === 'monthly' && (
        <div className="space-y-4 animate-fade-in">
          {/* Month Navigator Header */}
          <div className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex items-center justify-between">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl text-calico-cocoa/60 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all"
              title="上個月"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                  {displayYearMonthText}
                </h3>
                {selectedYearMonth === currentYearMonthStr ? (
                  <span className="text-[10px] bg-calico-orange/15 text-calico-orange font-bold px-2 py-0.5 rounded-full">
                    本月
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedYearMonth(currentYearMonthStr)}
                    className="text-[10px] bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-full hover:bg-calico-orange/15 hover:text-calico-orange transition-all"
                  >
                    回到本月
                  </button>
                )}
              </div>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-medium mt-0.5">
                共記錄 {monthlyStats.txCount} 筆收支
              </p>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl text-calico-cocoa/60 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all"
              title="下個月"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Monthly KPI Dashboard Cards */}
          {/* Monthly KPI Dashboard 4 Cards (支出、收入、結餘、債務) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-rose-200/50 dark:border-zinc-700/40 shadow-ios">
              <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 text-xs font-bold mb-1">
                <ArrowDownRight className="w-4 h-4" />
                <span>本月總支出</span>
              </div>
              <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                ${monthlyStats.expense}
              </p>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                日均支出約 ${monthlyStats.dailyAvg} / 天
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-emerald-200/50 dark:border-zinc-700/40 shadow-ios">
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
                <ArrowUpRight className="w-4 h-4" />
                <span>本月總收入</span>
              </div>
              <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                ${monthlyStats.income}
              </p>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                {monthlyStats.income > 0 ? '薪資/生活費已入帳' : '尚未記錄本月收入'}
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50 to-indigo-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-sky-200/50 dark:border-zinc-700/40 shadow-ios">
              <div className="flex items-center space-x-1.5 text-sky-600 dark:text-sky-400 text-xs font-bold mb-1">
                <BarChart3 className="w-4 h-4" />
                <span>本月淨結餘</span>
              </div>
              <p
                className={`text-2xl font-black tracking-tight ${
                  monthlyStats.net >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {monthlyStats.net >= 0 ? `+$${monthlyStats.net}` : `-$${Math.abs(monthlyStats.net)}`}
              </p>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                {monthlyStats.avgScore ? `理財滿意度 ★ ${monthlyStats.avgScore}分` : '本月儲蓄結餘'}
              </p>
            </div>

            {/* Box 4: 往來債務 (待還 / 待收) */}
            <div
              onClick={() => {
                setViewMode('ledger');
                setIsSocialDebtOpen(true);
              }}
              className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-amber-200/50 dark:border-zinc-700/40 shadow-ios cursor-pointer hover:border-amber-400 transition-all group"
              title="點擊展開往來分帳與借還債務中心"
            >
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold mb-1">
                <div className="flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>往來債務</span>
                </div>
                <span className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-md font-extrabold group-hover:scale-105 transition-transform">
                  {debtStats.activeDebtsCount + debtStats.activeSplitsCount} 筆 ➔
                </span>
              </div>
              <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {debtStats.totalIOwe > 0 ? `待還 $${debtStats.totalIOwe}` : debtStats.totalTheyOwe > 0 ? `待收 $${debtStats.totalTheyOwe}` : '$0'}
              </p>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1 truncate">
                {debtStats.totalTheyOwe > 0 && debtStats.totalIOwe > 0
                  ? `待收 $${debtStats.totalTheyOwe} · 待還 $${debtStats.totalIOwe}`
                  : debtStats.totalIOwe > 0
                  ? '包含分期與借款剩餘'
                  : debtStats.totalTheyOwe > 0
                  ? '包含代墊與借出款項'
                  : '無未結清借還款項 🍃'}
              </p>
            </div>
          </div>

          {/* 🌟 Category Pie Chart (月支出圓餅圖) */}
          <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-calico-orange/15 text-calico-orange">
                  <PieChart className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                  本月支出圓餅圖分析
                </h4>
              </div>
              <span className="text-xs font-bold text-calico-cocoa/40 dark:text-zinc-400">
                共 {monthlyStats.categories.length} 個類別
              </span>
            </div>

            <CategoryPieChart
              categories={monthlyStats.categories}
              totalExpense={monthlyStats.expense}
              emptyText="此月份尚無任何支出記錄"
            />
          </div>

          {/* Monthly Transaction History Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-calico-cocoa/60 dark:text-zinc-400 uppercase tracking-wider px-1">
              {displayYearMonthText} 收支記錄清單
            </h4>

            {monthlyTransactions.length > 0 ? (
              monthlyTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex flex-col space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div
                        style={{ backgroundColor: `${tx.categoryColorHex || '#E67E22'}20`, color: tx.categoryColorHex || '#E67E22' }}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                      >
                        <CategoryIcon icon={tx.categoryIcon} categoryName={tx.categoryName} className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                            {tx.categoryName}
                          </h5>
                          {tx.valueScore && (
                            <span className="text-[10px] bg-calico-orange/15 text-calico-orange px-1.5 py-0.2 rounded-md font-bold shrink-0">
                              ★ {tx.valueScore}分
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 mt-0.5 truncate">
                          {tx.notes || tx.paymentMethodName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 text-right shrink-0">
                      <div>
                        <p
                          className={`text-sm font-black ${
                            tx.type === 'expense'
                              ? 'text-calico-cocoa dark:text-zinc-100'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {tx.type === 'expense' ? `-$${tx.amount}` : `+$${tx.amount}`}
                        </p>
                        <p className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400">
                          {tx.date.slice(5, 10)}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteTransaction(tx.id)}
                        className="p-1 rounded-lg text-calico-cocoa/20 hover:text-red-500 transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {renderPeerRatingBadge(tx)}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-calico-cocoa/40 dark:text-zinc-500 font-bold">
                本月份無交易記錄 🍃
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💳 MODE C: 今日收支流水帳 (DAILY LEDGER) */}
      {/* ========================================================================= */}
      {viewMode === 'ledger' && (
        <div className="space-y-4 animate-fade-in">
          {/* Today's Budget Hero Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-white via-white to-calico-cream/90 dark:from-calico-darkCard dark:to-zinc-900 border border-black/5 dark:border-white/10 shadow-ios relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-7xl select-none opacity-5 dark:opacity-10 pointer-events-none">
              🐾
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                  今日剩餘預算
                </span>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className="text-3xl font-black tracking-tight text-calico-cocoa dark:text-zinc-100">
                    ${Math.max(0, budgetInfo.remaining)}
                  </span>
                  <span className="text-xs font-bold text-calico-cocoa/50 dark:text-zinc-400">
                    / ${budgetInfo.effectiveLimit} 元
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block">
                  距每月結算日
                </span>
                <span className="inline-block mt-0.5 px-2.5 py-1 rounded-full bg-calico-orange/15 text-calico-orange text-xs font-extrabold">
                  剩 {budgetInfo.daysUntilReset} 天
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-calico-cocoa/70 dark:text-zinc-400">
                  今日已花費 ${budgetInfo.todaySpent}
                </span>
                <span
                  className={`font-black ${
                    spentPercent > 90 ? 'text-red-500' : 'text-calico-orange'
                  }`}
                >
                  {spentPercent}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden p-0.5">
                <div
                  style={{ width: `${spentPercent}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    spentPercent > 90
                      ? 'bg-red-500'
                      : spentPercent > 70
                      ? 'bg-amber-500'
                      : 'bg-calico-orange'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Action Row & Category Filters */}
          <div className="flex items-center justify-between gap-2">
            {/* Filter Segmented Control */}
            <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterType === 'expense'
                    ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                支出
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterType === 'income'
                    ? 'bg-white dark:bg-zinc-800 text-calico-sage shadow-ios-sm'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                收入
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {/* 🤝 Collapsible Social Ledger & Debt Button */}
              <button
                onClick={() => setIsSocialDebtOpen((prev) => !prev)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-2xl font-bold text-xs shadow-ios-sm active:scale-95 transition-all border ${
                  isSocialDebtOpen
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600 shadow-amber-500/20'
                    : 'bg-white dark:bg-calico-darkCard text-calico-cocoa dark:text-zinc-200 border-black/5 dark:border-white/10 hover:border-amber-400/50'
                }`}
                title="展開/收合分帳與借還債務管理"
              >
                <Users className={`w-3.5 h-3.5 ${isSocialDebtOpen ? 'text-white' : 'text-amber-500'}`} />
                <span>分帳與借還</span>
                {(debtStats.activeDebtsCount > 0 || debtStats.activeSplitsCount > 0) && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isSocialDebtOpen
                        ? 'bg-white/25 text-white'
                        : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {debtStats.activeDebtsCount + debtStats.activeSplitsCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isSocialDebtOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* + 記一筆 */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-1 px-3.5 py-2 rounded-2xl bg-calico-orange text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all hover:brightness-105"
              >
                <Plus className="w-4 h-4" />
                <span>記一筆</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 🤝 Collapsible Panel: 分帳與借還 (Multi-person Bill Splitting & Debts) */}
          {/* ========================================================================= */}
          {isSocialDebtOpen && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-amber-500/10 dark:from-zinc-900 dark:to-calico-darkCard border border-amber-500/20 dark:border-amber-500/30 shadow-ios space-y-4 animate-fade-in">
              {/* Header with Switcher Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                      往來分帳與借還
                    </h3>
                    <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400">
                      多人聚餐先墊錢分帳 · 借款分期與還款進度
                    </p>
                  </div>
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold">
                  <button
                    onClick={() => setSocialDebtTab('splits')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                      socialDebtTab === 'splits'
                        ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-ios-sm'
                        : 'text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>多人分帳</span>
                    {debtStats.activeSplitsCount > 0 && (
                      <span className="text-[10px] px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        {debtStats.activeSplitsCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setSocialDebtTab('debts')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                      socialDebtTab === 'debts'
                        ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-ios-sm'
                        : 'text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>借還與分期</span>
                    {debtStats.activeDebtsCount > 0 && (
                      <span className="text-[10px] px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        {debtStats.activeDebtsCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* TAB 1: 多人分帳 (Multi-Person Bill Splitting) */}
              {socialDebtTab === 'splits' && (
                <div className="space-y-3">
                  {/* Summary & Create button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                    <div className="flex items-center space-x-4 text-xs">
                      <div>
                        <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold">
                          待收分攤款
                        </span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          +${debtStats.splitToReceive}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-black/10 dark:bg-white/10" />
                      <div>
                        <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold">
                          待付分攤款
                        </span>
                        <span className="text-sm font-black text-red-500 dark:text-red-400">
                          -${debtStats.splitToPay}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSplitToEdit(null);
                        setIsSplitModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>發起多人分帳</span>
                    </button>
                  </div>

                  {/* List of Split Bills */}
                  {splitBills.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10">
                      <p className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                        尚無分帳記錄。出去吃飯、買禮物，支援多人先墊錢與多人分攤結算！
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {splitBills.map((sb) => {
                        const allSettled = sb.isSettled || (sb.settlements && sb.settlements.every((s) => s.isSettled));
                        return (
                          <div
                            key={sb.id}
                            className={`p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border transition-all ${
                              allSettled
                                ? 'border-black/5 dark:border-white/5 opacity-70'
                                : 'border-amber-500/20 dark:border-amber-500/30 shadow-ios-sm'
                            }`}
                          >
                            {/* Bill Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
                                  allSettled
                                    ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'
                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                }`}>
                                  {allSettled ? '✓ 已全數結清' : '進行中'}
                                </span>
                                <h4 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100">
                                  {sb.title}
                                </h4>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                                  ${sb.totalAmount}
                                </span>
                                <button
                                  onClick={() => {
                                    setSplitToEdit(sb);
                                    setIsSplitModalOpen(true);
                                  }}
                                  className="p-1 text-calico-cocoa/40 hover:text-amber-500 transition-colors"
                                  title="編輯"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteSplitBill(sb.id)}
                                  className="p-1 text-calico-cocoa/40 hover:text-red-500 transition-colors"
                                  title="刪除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Payers & Participants Summary */}
                            <div className="mt-2 text-xs text-calico-cocoa/70 dark:text-zinc-300 space-y-1 bg-black/2 dark:bg-white/5 p-2.5 rounded-xl">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-calico-cocoa/50 dark:text-zinc-400 font-bold">
                                  💳 先墊錢：
                                </span>
                                <span className="font-semibold text-calico-cocoa dark:text-zinc-200">
                                  {(sb.payers || []).map((p) => `${p.name} $${p.paidAmount}`).join('、') || '無'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-calico-cocoa/50 dark:text-zinc-400 font-bold">
                                  👥 分攤人：
                                </span>
                                <span className="font-semibold text-calico-cocoa dark:text-zinc-200">
                                  {(sb.participants || []).map((p) => `${p.name} ($${p.owedAmount})`).join('、') || '無'}
                                </span>
                              </div>
                              {sb.notes && (
                                <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 pt-1 border-t border-black/5 dark:border-white/5">
                                  備註：{sb.notes}
                                </p>
                              )}
                            </div>

                            {/* Settlement Transfer Paths (誰該給誰多少) */}
                            {sb.settlements && sb.settlements.length > 0 && (
                              <div className="mt-2.5 space-y-1.5">
                                <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block">
                                  轉帳結算指引：
                                </span>
                                {sb.settlements.map((st, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 text-xs"
                                  >
                                    <div className="flex items-center space-x-1.5 min-w-0">
                                      <span className="font-extrabold text-calico-cocoa dark:text-zinc-200 truncate">
                                        {st.from}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />
                                      <span className="font-extrabold text-calico-cocoa dark:text-zinc-200 truncate">
                                        {st.to}
                                      </span>
                                      <span className="font-black text-amber-600 dark:text-amber-400 ml-1">
                                        ${st.amount}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => settleSplitParticipant(sb.id, sIdx)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ml-2 ${
                                        st.isSettled
                                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-white'
                                      }`}
                                    >
                                      {st.isSettled ? '✓ 已清' : '標記結清'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: 借還與分期 (Debts & Loans Tracker) */}
              {socialDebtTab === 'debts' && (
                <div className="space-y-3">
                  {/* Summary & Create button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                    <div className="flex items-center space-x-4 text-xs">
                      <div>
                        <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold">
                          我欠別人 (待還)
                        </span>
                        <span className="text-sm font-black text-red-500 dark:text-red-400">
                          ${debtStats.totalIOwe}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-black/10 dark:bg-white/10" />
                      <div>
                        <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold">
                          別人欠我 (待收)
                        </span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          ${debtStats.totalTheyOwe}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setDebtToEdit(null);
                        setIsDebtModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增借還/分期</span>
                    </button>
                  </div>

                  {/* List of Debts */}
                  {debts.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10">
                      <p className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                        尚無債務或分期記錄。紀錄朋友借款、信用卡分期剩餘、精確追蹤每次還款剩多少！
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {debts.map((d) => {
                        const progressPercent =
                          d.totalAmount > 0
                            ? Math.min(100, Math.round(((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100))
                            : 100;
                        const isExpanded = expandedDebtHistoryId === d.id;

                        return (
                          <div
                            key={d.id}
                            className={`p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border transition-all ${
                              d.isSettled
                                ? 'border-black/5 dark:border-white/5 opacity-70'
                                : 'border-amber-500/20 dark:border-amber-500/30 shadow-ios-sm'
                            }`}
                          >
                            {/* Debt Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 min-w-0">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                                    d.type === 'i_owe'
                                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {d.type === 'i_owe' ? '我欠對方' : '對方欠我'}
                                </span>
                                <h4 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                                  {d.title}
                                </h4>
                                <span className="text-xs text-calico-cocoa/50 dark:text-zinc-400 font-bold truncate">
                                  ({d.counterparty})
                                </span>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0">
                                {d.isSettled ? (
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    ✓ 已全額還清
                                  </span>
                                ) : (
                                  <div className="text-right">
                                    <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold">
                                      尚餘欠款
                                    </span>
                                    <span className="text-base font-black text-red-600 dark:text-red-400">
                                      ${d.remainingAmount}
                                    </span>
                                  </div>
                                )}
                                <button
                                  onClick={() => {
                                    setDebtToEdit(d);
                                    setIsDebtModalOpen(true);
                                  }}
                                  className="p-1 text-calico-cocoa/40 hover:text-amber-500 transition-colors"
                                  title="編輯"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteDebt(d.id)}
                                  className="p-1 text-calico-cocoa/40 hover:text-red-500 transition-colors"
                                  title="刪除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Details: Total, Installment, Dates */}
                            <div className="mt-2 text-xs space-y-1.5 bg-black/2 dark:bg-white/5 p-2.5 rounded-xl">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-calico-cocoa/60 dark:text-zinc-400">原始總額</span>
                                <span className="font-bold text-calico-cocoa dark:text-zinc-200">
                                  ${d.totalAmount}
                                </span>
                              </div>

                              {d.isInstallment && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-calico-cocoa/60 dark:text-zinc-400">分期進度</span>
                                  <span className="font-bold text-amber-600 dark:text-amber-400">
                                    第 {d.paidPeriods || 0} / {d.totalPeriods || 1} 期
                                    {d.periodAmount ? ` (每期 $${d.periodAmount})` : ''}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-calico-cocoa/60 dark:text-zinc-400">起始/到期</span>
                                <span className="font-semibold text-calico-cocoa/70 dark:text-zinc-300">
                                  {d.startDate} ~ {d.dueDate ? d.dueDate : '無特定到期'}
                                </span>
                              </div>

                              {/* Repayment Progress Bar */}
                              <div className="pt-1">
                                <div className="flex items-center justify-between text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-bold mb-1">
                                  <span>還款進度</span>
                                  <span>{progressPercent}% (已還 ${d.totalAmount - d.remainingAmount})</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                  <div
                                    style={{ width: `${progressPercent}%` }}
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons: Log Repayment & History Toggle */}
                            <div className="mt-2.5 flex items-center justify-between pt-1">
                              <button
                                onClick={() => setExpandedDebtHistoryId(isExpanded ? null : d.id)}
                                className="text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 hover:text-amber-500 flex items-center space-x-1"
                              >
                                <span>📜 還款紀錄 ({d.repayments?.length || 0})</span>
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>

                              {!d.isSettled && (
                                <button
                                  onClick={() => {
                                    setRepayDebtTarget(d);
                                    setIsRepayModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all flex items-center space-x-1"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>記一次還款</span>
                                </button>
                              )}
                            </div>

                            {/* Repayment History Expansion */}
                            {isExpanded && (
                              <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 space-y-1.5 animate-fade-in">
                                <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block">
                                  歷次還款明細：
                                </span>
                                {d.repayments && d.repayments.length > 0 ? (
                                  d.repayments.map((rp) => (
                                    <div
                                      key={rp.id}
                                      className="p-2 rounded-xl bg-black/3 dark:bg-white/5 flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-mono text-[10px] text-calico-cocoa/50 dark:text-zinc-400">
                                            {rp.date}
                                          </span>
                                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                                            已還 ${rp.amount}
                                          </span>
                                        </div>
                                        {rp.notes && (
                                          <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 mt-0.5">
                                            {rp.notes}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400 block">
                                          還完後剩餘
                                        </span>
                                        <span className="font-extrabold text-calico-cocoa dark:text-zinc-200">
                                          ${rp.remainingAfter}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[11px] text-calico-cocoa/40 dark:text-zinc-500 italic py-1">
                                    尚無還款紀錄
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transaction List */}
          <div className="space-y-2.5">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex flex-col space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  {/* Left: Icon & Title */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      style={{ backgroundColor: `${tx.categoryColorHex || '#E67E22'}20`, color: tx.categoryColorHex || '#E67E22' }}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                    >
                      <CategoryIcon icon={tx.categoryIcon} categoryName={tx.categoryName} className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                          {tx.categoryName}
                        </h4>
                        {tx.valueScore && (
                          <span className="text-[10px] bg-calico-orange/15 text-calico-orange px-1.5 py-0.2 rounded-md font-bold shrink-0">
                            ★ {tx.valueScore}分
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 mt-0.5 truncate">
                        {tx.notes || tx.paymentMethodName}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount & Delete */}
                  <div className="flex items-center space-x-3 text-right shrink-0">
                    <div>
                      <p
                        className={`text-base font-black ${
                          tx.type === 'expense'
                            ? 'text-calico-cocoa dark:text-zinc-100'
                            : 'text-calico-sage'
                        }`}
                      >
                        {tx.type === 'expense' ? `-$${tx.amount}` : `+$${tx.amount}`}
                      </p>
                      <p className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400">
                        {new Date(tx.date).toLocaleDateString('zh-TW', {
                          month: 'numeric',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1 rounded-lg text-calico-cocoa/20 hover:text-red-500 transition-colors"
                      title="刪除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {renderPeerRatingBadge(tx)}
              </div>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="text-center py-12 rounded-3xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10">
                <p className="text-sm font-bold text-calico-cocoa/60 dark:text-zinc-400">
                  目前尚無收支記錄，點擊上方「記一筆」開始吧！
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )}

      {/* ========================================================================= */}
      {/* 🤝 SCOPE B: 好友帳本與評分 (FRIENDS ACCOUNTING & PEER RATING) */}
      {/* ========================================================================= */}
      {ledgerScope === 'friends' && (
        <div className="space-y-4 animate-fade-in">
          {savedFriends.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-calico-orange/15 text-calico-orange flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100">
                尚未新增任何好友 🐾
              </h3>
              <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                輸入好友的課表分享代碼（例如 舒舒、榮豐），即可在此即時查閱好友的帳本開銷，並為每筆消費給予 1~5 星評分與反饋！
              </p>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="mt-2 px-5 py-2.5 rounded-2xl bg-calico-orange text-white font-bold text-xs shadow-ios-sm hover:brightness-105 active:scale-95 transition-all inline-flex items-center space-x-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>輸入好友分享代碼</span>
              </button>
            </div>
          ) : (
            <>
              {/* Friend Selector Tabs */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {savedFriends.map((f, idx) => (
                  <button
                    key={f.shareCode}
                    onClick={() => setSelectedFriendIndex(idx)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-all ${
                      selectedFriendIndex === idx
                        ? 'bg-calico-orange text-white shadow-ios-sm'
                        : 'bg-white dark:bg-calico-darkCard text-calico-cocoa dark:text-zinc-300 border border-black/5 dark:border-white/10 hover:border-calico-orange/30'
                    }`}
                  >
                    <span>👤 {f.nickname || f.ownerName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        selectedFriendIndex === idx
                          ? 'bg-white/20 text-white'
                          : 'bg-black/5 dark:bg-white/10 text-calico-cocoa/50 dark:text-zinc-400'
                      }`}
                    >
                      {f.shareCode}
                    </span>
                  </button>
                ))}

                {/* Refresh Friend Data */}
                <button
                  onClick={handleRefreshFriend}
                  disabled={isRefreshingFriend}
                  className="p-2 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 text-calico-cocoa/70 dark:text-zinc-300 hover:text-calico-orange active:scale-95 transition-all shrink-0"
                  title="從雲端刷新好友帳本"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingFriend ? 'animate-spin text-calico-orange' : ''}`} />
                </button>

                {/* Add more friends */}
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="p-2 rounded-2xl bg-white dark:bg-calico-darkCard border border-dashed border-black/15 dark:border-white/15 text-calico-cocoa/50 dark:text-zinc-400 hover:text-calico-orange active:scale-95 transition-all shrink-0"
                  title="新增好友"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>

              {/* 📅 Friend Date Navigation Toolbar */}
              <div className="p-3 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios-sm flex items-center justify-between">
                <button
                  onClick={handleFriendPrevDay}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-calico-cocoa dark:text-zinc-300 transition-colors"
                  title="前一天"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2">
                  <CalendarDays className="w-4 h-4 text-calico-orange" />
                  <input
                    type="date"
                    value={friendSelectedDate}
                    onChange={(e) => e.target.value && setFriendSelectedDate(e.target.value)}
                    className="bg-transparent text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none cursor-pointer"
                  />
                  {friendSelectedDate === new Date().toISOString().slice(0, 10) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-calico-orange/15 text-calico-orange font-black">
                      今日
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  {friendSelectedDate !== new Date().toISOString().slice(0, 10) && (
                    <button
                      onClick={handleFriendToday}
                      className="px-2 py-1 rounded-xl text-[10px] font-bold bg-calico-orange/15 text-calico-orange hover:bg-calico-orange hover:text-white transition-all"
                    >
                      回到今日
                    </button>
                  )}
                  <button
                    onClick={handleFriendNextDay}
                    className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-calico-cocoa dark:text-zinc-300 transition-colors"
                    title="後一天"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Friend Summary KPI Cards (聚焦「當日消費」) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-amber-200/50 dark:border-zinc-700/40 shadow-ios">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
                    {currentFriend?.nickname || currentFriend?.ownerName || '好友'} 的當日消費
                  </span>
                  <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100">
                    ${friendStats.todayExpense}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                    <span>共 {friendStats.todayTxCount} 筆當日消費</span>
                    <span>(歷史累計 ${friendStats.totalExpense})</span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-orange-200/50 dark:border-zinc-700/40 shadow-ios">
                  <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 block mb-1">
                    好友互評平均
                  </span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-calico-cocoa dark:text-zinc-100">
                      {friendStats.todayAvgRating ? `★ ${friendStats.todayAvgRating}` : (friendStats.avgRating ? `★ ${friendStats.avgRating}` : '尚無評分')}
                    </span>
                  </div>
                  <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                    今日評分 {friendStats.todayRatedCount} 筆 · 歷史累計 {friendStats.ratedCount} 筆
                  </p>
                </div>
              </div>

              {/* Friend Expense Donut Chart */}
              <div className="p-5 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-xl bg-calico-orange/15 text-calico-orange">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
                      {currentFriend?.nickname || currentFriend?.ownerName || '好友'} 開銷類別圓餅圖
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-calico-cocoa/40 dark:text-zinc-400">
                    {friendStats.todayCategories.length > 0
                      ? `當日 ${friendStats.todayCategories.length} 個類別`
                      : `歷史 ${friendStats.categories.length} 個類別`}
                  </span>
                </div>

                <CategoryPieChart
                  categories={friendStats.todayCategories.length > 0 ? friendStats.todayCategories : friendStats.categories}
                  totalExpense={friendStats.todayCategories.length > 0 ? friendStats.todayExpense : friendStats.totalExpense}
                  emptyText={friendStats.todayCategories.length > 0 ? '當日尚無支出記錄' : '好友目前尚無支出記錄'}
                />
              </div>

              {/* Friend Transactions List with Peer Rating Button & Mode Toggle */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <h4 className="text-xs font-black text-calico-cocoa/60 dark:text-zinc-400 uppercase tracking-wider">
                    {currentFriend?.nickname || currentFriend?.ownerName || '好友'} 的收支明細與評分
                  </h4>
                  
                  {/* View Mode Toggle: Daily vs All */}
                  <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-bold">
                    <button
                      onClick={() => setFriendViewListMode('daily')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        friendViewListMode === 'daily'
                          ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                          : 'text-calico-cocoa/60 dark:text-zinc-400'
                      }`}
                    >
                      當日明細 ({friendStats.todayTxCount})
                    </button>
                    <button
                      onClick={() => setFriendViewListMode('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        friendViewListMode === 'all'
                          ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                          : 'text-calico-cocoa/60 dark:text-zinc-400'
                      }`}
                    >
                      全部歷史 ({friendTransactions.length})
                    </button>
                  </div>
                </div>

                {(friendViewListMode === 'daily' ? friendStats.todayTransactions : friendTransactions).length > 0 ? (
                  (friendViewListMode === 'daily' ? friendStats.todayTransactions : friendTransactions).map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 rounded-3xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios flex flex-col space-y-2.5 transition-all"
                    >
                      {/* Top line: Category, Name, Amount, Date */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            style={{
                              backgroundColor: `${tx.categoryColorHex || '#E67E22'}20`,
                              color: tx.categoryColorHex || '#E67E22',
                            }}
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                          >
                            <CategoryIcon
                              icon={tx.categoryIcon}
                              categoryName={tx.categoryName}
                              className="w-5 h-5"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                                {tx.categoryName}
                              </h5>
                              {tx.valueScore && (
                                <span className="text-[10px] bg-calico-orange/15 text-calico-orange px-1.5 py-0.2 rounded-md font-bold shrink-0">
                                  ★ 自評 {tx.valueScore}分
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-calico-cocoa/60 dark:text-zinc-400 mt-0.5 truncate">
                              {tx.notes || tx.paymentMethodName || '無備註'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <p
                            className={`text-base font-black ${
                              tx.type === 'expense' || !tx.type
                                ? 'text-calico-cocoa dark:text-zinc-100'
                                : 'text-calico-sage'
                            }`}
                          >
                            {tx.type === 'expense' || !tx.type ? `-$${tx.amount}` : `+$${tx.amount}`}
                          </p>
                          <p className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400">
                            {new Date(tx.date).toLocaleDateString('zh-TW', {
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Rating Card / Rating Button */}
                      {tx.peerRating ? (
                        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs bg-amber-500/5 dark:bg-amber-500/10 -mx-1 px-3 py-2 rounded-2xl">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <div className="flex items-center text-amber-500 shrink-0">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < (tx.peerRating || 0)
                                      ? 'fill-amber-400 text-amber-500'
                                      : 'text-gray-300 dark:text-zinc-600'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-extrabold text-amber-700 dark:text-amber-300 shrink-0">
                              {tx.peerRating}星
                            </span>
                            {tx.peerFeedback && (
                              <span className="text-calico-cocoa/80 dark:text-zinc-300 truncate font-semibold">
                                「{tx.peerFeedback}」
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setRatingModalTx(tx);
                              setIsRatingModalOpen(true);
                            }}
                            className="text-[11px] font-bold text-calico-orange hover:underline shrink-0 ml-2"
                          >
                            重新評分
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRatingModalTx(tx);
                            setIsRatingModalOpen(true);
                          }}
                          className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-98 transition-all"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>給這筆開銷打個星級評分！⭐️</span>
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 rounded-3xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10 space-y-2">
                    <p className="text-sm font-bold text-calico-cocoa/70 dark:text-zinc-300">
                      好友目前尚無記帳記錄 ☕️
                    </p>
                    <p className="text-xs text-calico-cocoa/50 dark:text-zinc-400">
                      點擊上方重新整理按鈕，隨時同步好友最新公開帳本！
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addTransaction}
      />

      {/* Peer Rating Modal */}
      <PeerRatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        friendName={currentFriend ? (currentFriend.nickname || currentFriend.ownerName) : '好友'}
        friendShareCode={currentFriend ? currentFriend.shareCode : ''}
        transaction={ratingModalTx}
      />

      {/* 🤝 Multi-Person Bill Splitting Modal */}
      <SplitBillModal
        isOpen={isSplitModalOpen}
        onClose={() => {
          setIsSplitModalOpen(false);
          setSplitToEdit(null);
        }}
        billToEdit={splitToEdit}
      />

      {/* 💳 Debt & Loan Tracker Modal */}
      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setDebtToEdit(null);
        }}
        debtToEdit={debtToEdit}
      />

      {/* 💰 Repay Debt Modal */}
      <RepayDebtModal
        isOpen={isRepayModalOpen}
        onClose={() => {
          setIsRepayModalOpen(false);
          setRepayDebtTarget(null);
        }}
        debt={repayDebtTarget}
      />
    </div>
  );
};
