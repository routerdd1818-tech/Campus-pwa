import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Transaction,
  DebtRecord,
  SplitBill,
  RecurringItem,
  Installment,
  SavingsJar,
  FriendPeriodMode,
} from '../types';
import { TransactionModal } from '../components/TransactionModal';
import { PeerRatingModal } from '../components/PeerRatingModal';
import { DebtModal } from '../components/DebtModal';
import { RepayDebtModal } from '../components/RepayDebtModal';
import { SplitBillModal } from '../components/SplitBillModal';
import { RecurringModal } from '../components/RecurringModal';
import { InstallmentModal } from '../components/InstallmentModal';
import { SavingsJarModal } from '../components/SavingsJarModal';
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
    recurringItems,
    addRecurringItem,
    updateRecurringItem,
    deleteRecurringItem,
    recordRecurringNow,
    installments,
    addInstallment,
    updateInstallment,
    deleteInstallment,
    payInstallmentPeriod,
    savingsJars,
    addSavingsJar,
    updateSavingsJar,
    deleteSavingsJar,
    depositToSavingsJar,
  } = useApp();

  // Top Scope: 'mine' (我的記帳) | 'friends' (好友帳本)
  const [ledgerScope, setLedgerScope] = useState<'mine' | 'friends'>('mine');
  const [selectedFriendIndex, setSelectedFriendIndex] = useState<number>(0);
  const [isRefreshingFriend, setIsRefreshingFriend] = useState<boolean>(false);
  const [ratingModalTx, setRatingModalTx] = useState<Transaction | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState<boolean>(false);

  // 🤝 往來與長期計畫 (多人分帳 · 借還 · 固定收支 · 分期 · 夢想存錢筒)
  type DrawerTab = 'splits' | 'debts' | 'recurring' | 'installments' | 'savings';
  const [isSocialDebtOpen, setIsSocialDebtOpen] = useState(false);
  const [socialDebtTab, setSocialDebtTab] = useState<DrawerTab>('splits');
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitToEdit, setSplitToEdit] = useState<SplitBill | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<DebtRecord | null>(null);
  const [repayDebtTarget, setRepayDebtTarget] = useState<DebtRecord | null>(null);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [expandedDebtHistoryId, setExpandedDebtHistoryId] = useState<string | null>(null);

  // 🔄 固定收支 · 💳 分期付款 · 🏺 夢想存錢筒 Modals
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [recurringToEdit, setRecurringToEdit] = useState<RecurringItem | null>(null);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentToEdit, setInstallmentToEdit] = useState<Installment | null>(null);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [savingsToEdit, setSavingsToEdit] = useState<SavingsJar | null>(null);
  const [customDepositJarId, setCustomDepositJarId] = useState<string | null>(null);
  const [customDepositAmount, setCustomDepositAmount] = useState('');
  const [customDepositNote, setCustomDepositNote] = useState('');
  const [syncDepositToExpense, setSyncDepositToExpense] = useState(false);
  const [expandedSavingsId, setExpandedSavingsId] = useState<string | null>(null);

  // 📅 好友帳本日期與週期導航 (日 / 週 / 月)
  const [friendPeriodMode, setFriendPeriodMode] = useState<FriendPeriodMode>('daily');
  const [friendSelectedDate, setFriendSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [friendViewListMode, setFriendViewListMode] = useState<'daily' | 'all'>('daily');

  const friendWeekRange = useMemo(() => {
    const [y, m, d] = friendSelectedDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    const day = curr.getDay(); // 0 is Sun
    const start = new Date(curr);
    start.setDate(curr.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    return { startStr, endStr };
  }, [friendSelectedDate]);

  const friendPeriodLabel = useMemo(() => {
    if (friendPeriodMode === 'daily') return '當日';
    if (friendPeriodMode === 'weekly') return '當週';
    return '當月';
  }, [friendPeriodMode]);

  const isCurrentFriendPeriod = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (friendPeriodMode === 'daily') return friendSelectedDate === todayStr;
    if (friendPeriodMode === 'weekly') return todayStr >= friendWeekRange.startStr && todayStr <= friendWeekRange.endStr;
    return friendSelectedDate.slice(0, 7) === todayStr.slice(0, 7);
  }, [friendPeriodMode, friendSelectedDate, friendWeekRange]);

  const handleFriendPrev = () => {
    const [y, m, d] = friendSelectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (friendPeriodMode === 'daily') {
      date.setDate(date.getDate() - 1);
    } else if (friendPeriodMode === 'weekly') {
      date.setDate(date.getDate() - 7);
    } else {
      date.setMonth(date.getMonth() - 1);
    }
    setFriendSelectedDate(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    );
  };

  const handleFriendNext = () => {
    const [y, m, d] = friendSelectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (friendPeriodMode === 'daily') {
      date.setDate(date.getDate() + 1);
    } else if (friendPeriodMode === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setFriendSelectedDate(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    );
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

  // 🔄 固定收支統計 (Recurring Stats)
  const recurringStats = useMemo(() => {
    const activeItems = (recurringItems || []).filter((r) => r.isActive);
    const monthlyExpense = activeItems
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
    const monthlyIncome = activeItems
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const recordedThisMonthCount = activeItems.filter((r) => r.lastRecordedMonth === currentMonth).length;
    return {
      monthlyExpense,
      monthlyIncome,
      net: monthlyIncome - monthlyExpense,
      activeCount: activeItems.length,
      recordedThisMonthCount,
    };
  }, [recurringItems]);

  // 💳 分期付款統計 (Installment Stats)
  const installmentStats = useMemo(() => {
    const activeList = (installments || []).filter((i) => !i.isCompleted);
    const totalRemaining = activeList.reduce(
      (sum, i) => sum + Math.max(0, (i.totalPeriods - i.paidPeriods) * i.periodAmount),
      0
    );
    const totalMonthlyPayment = activeList.reduce((sum, i) => sum + i.periodAmount, 0);
    return {
      activeCount: activeList.length,
      totalRemaining,
      totalMonthlyPayment,
    };
  }, [installments]);

  // 🐾 月底吃土生存試算 (Daily Survival Budget)
  const survivalBudget = useMemo(() => {
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7);
    const todayDay = now.getDate();
    const [y, m] = currentMonthStr.split('-').map(Number);
    const daysInCurrentMonth = new Date(y, m, 0).getDate();

    const currentMonthExpense = transactions
      .filter((t) => t.type === 'expense' && t.date.slice(0, 7) === currentMonthStr)
      .reduce((sum, t) => sum + t.amount, 0);

    const currentMonthIncome = transactions
      .filter((t) => t.type === 'income' && t.date.slice(0, 7) === currentMonthStr)
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyTotalBudget = settings.isIncomeBasedDailyLimit && currentMonthIncome > 0
      ? currentMonthIncome
      : (settings.customDailyLimit || 300) * daysInCurrentMonth;

    // 尚未扣除之固定支出
    const pendingRecurring = (recurringItems || [])
      .filter((r) => r.isActive && r.type === 'expense' && r.lastRecordedMonth !== currentMonthStr)
      .reduce((sum, r) => sum + r.amount, 0);

    // 尚未扣除之本月分期
    const pendingInstallment = (installments || [])
      .filter((i) => !i.isCompleted && i.billingDay >= todayDay)
      .reduce((sum, i) => sum + i.periodAmount, 0);

    const totalReservedFixed = pendingRecurring + pendingInstallment;
    const freeBalance = Math.max(0, monthlyTotalBudget - currentMonthExpense - totalReservedFixed);
    const remainingDays = Math.max(1, budgetInfo.daysUntilReset || (daysInCurrentMonth - todayDay + 1));
    const dailySafetyBudget = Math.floor(freeBalance / remainingDays);

    let status: 'safe' | 'warning' | 'danger' = 'safe';
    let catComment = '大魚大肉！罐罐自由無壓力 🐟';

    if (dailySafetyBudget < 100) {
      status = 'danger';
      catComment = '吃土警報發布！只剩泡麵能吃了喵 😿';
    } else if (dailySafetyBudget < 200) {
      status = 'warning';
      catComment = '微吃土狀態，建議吃學餐省荷包 🍱';
    } else if (dailySafetyBudget < 400) {
      status = 'safe';
      catComment = '生活安穩，喝杯大冰奶犒賞自己 ☕';
    } else {
      status = 'safe';
      catComment = '大魚大肉！罐罐自由無壓力 🐟';
    }

    return {
      monthlyTotalBudget,
      currentMonthExpense,
      totalReservedFixed,
      freeBalance,
      remainingDays,
      dailySafetyBudget,
      status,
      catComment,
    };
  }, [transactions, settings, recurringItems, installments, budgetInfo.daysUntilReset]);

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

  // 🌟 好友記帳：週期篩選 (日 / 週 / 月) 與統計
  const friendStats = useMemo(() => {
    let periodExpense = 0;
    let periodIncome = 0;
    let periodRatedCount = 0;
    let periodTotalRating = 0;
    const periodCatMap: Record<string, { amount: number; colorHex: string; count: number }> = {};

    let totalExpense = 0;
    let totalIncome = 0;
    const catMap: Record<string, { amount: number; colorHex: string; count: number }> = {};
    let ratedCount = 0;
    let totalRating = 0;

    const periodTxs = friendTransactions.filter((t) => {
      if (!t.date) return false;
      const txDate = t.date.slice(0, 10);
      if (friendPeriodMode === 'daily') {
        return txDate === friendSelectedDate;
      } else if (friendPeriodMode === 'weekly') {
        return txDate >= friendWeekRange.startStr && txDate <= friendWeekRange.endStr;
      } else {
        return txDate.slice(0, 7) === friendSelectedDate.slice(0, 7);
      }
    });

    periodTxs.forEach((t) => {
      if (t.type === 'expense' || !t.type) {
        periodExpense += t.amount;
        if (!periodCatMap[t.categoryName]) {
          periodCatMap[t.categoryName] = { amount: 0, colorHex: t.categoryColorHex || '#E67E22', count: 0 };
        }
        periodCatMap[t.categoryName].amount += t.amount;
        periodCatMap[t.categoryName].count += 1;
      } else {
        periodIncome += t.amount;
      }

      if (t.peerRating) {
        periodTotalRating += t.peerRating;
        periodRatedCount += 1;
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

    const periodCategories = Object.entries(periodCatMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        colorHex: data.colorHex,
        count: data.count,
        percent: periodExpense > 0 ? Math.round((data.amount / periodExpense) * 100) : 0,
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
      periodExpense,
      periodIncome,
      periodTxCount: periodTxs.length,
      periodCategories,
      periodAvgRating: periodRatedCount > 0 ? (periodTotalRating / periodRatedCount).toFixed(1) : null,
      periodRatedCount,
      periodTransactions: periodTxs,
      todayExpense: periodExpense,
      todayIncome: periodIncome,
      todayTxCount: periodTxs.length,
      todayCategories: periodCategories,
      todayAvgRating: periodRatedCount > 0 ? (periodTotalRating / periodRatedCount).toFixed(1) : null,
      todayRatedCount: periodRatedCount,
      todayTransactions: periodTxs,
      totalExpense,
      totalIncome,
      categories,
      txCount: friendTransactions.length,
      avgRating: ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : null,
      ratedCount,
    };
  }, [friendTransactions, friendPeriodMode, friendSelectedDate, friendWeekRange]);

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

            {/* Box 4: 往來與長期計畫 */}
            <div
              onClick={() => {
                setViewMode('ledger');
                setIsSocialDebtOpen(true);
              }}
              className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-amber-200/50 dark:border-zinc-700/40 shadow-ios cursor-pointer hover:border-amber-400 transition-all group"
              title="點擊展開往來分帳、借還、固定收支、分期與存錢計畫"
            >
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold mb-1">
                <span className="font-extrabold tracking-tight">往來與計畫</span>
                <span className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-extrabold group-hover:scale-105 transition-transform whitespace-nowrap">
                  {debtStats.activeDebtsCount + debtStats.activeSplitsCount + recurringStats.activeCount + installmentStats.activeCount + (savingsJars || []).length} 筆 ➔
                </span>
              </div>
              <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {debtStats.totalIOwe > 0 ? `待還 $${debtStats.totalIOwe}` : debtStats.totalTheyOwe > 0 ? `待收 $${debtStats.totalTheyOwe}` : `$${installmentStats.totalRemaining}`}
              </p>
              <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1 truncate">
                {debtStats.totalTheyOwe > 0 && debtStats.totalIOwe > 0
                  ? `待收 $${debtStats.totalTheyOwe} · 待還 $${debtStats.totalIOwe}`
                  : installmentStats.activeCount > 0
                  ? `分期剩餘 $${installmentStats.totalRemaining} · 存錢 ${(savingsJars || []).length} 個`
                  : debtStats.totalIOwe > 0
                  ? '包含借款與待償項目'
                  : debtStats.totalTheyOwe > 0
                  ? '包含代墊與借出款項'
                  : '多人分帳 · 借還 · 固定 · 分期'}
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

          {/* 🐾 月底吃土生存試算卡片 (Daily Survival Barometer) */}
          <div
            className={`p-4 rounded-3xl border shadow-ios space-y-2.5 transition-all ${
              survivalBudget.status === 'danger'
                ? 'bg-rose-500/10 dark:bg-rose-950/20 border-rose-500/30'
                : survivalBudget.status === 'warning'
                ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30'
                : 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <span className="text-2xl shrink-0">
                  {survivalBudget.status === 'danger' ? '😿' : survivalBudget.status === 'warning' ? '🐱' : '😸'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <h4 className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap shrink-0">
                      月底吃土生存試算
                    </h4>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                        survivalBudget.status === 'danger'
                          ? 'bg-rose-500 text-white'
                          : survivalBudget.status === 'warning'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {survivalBudget.status === 'danger' ? '吃土警報' : survivalBudget.status === 'warning' ? '謹慎節約' : '安全餘裕'}
                    </span>
                  </div>
                  <p className="text-[10px] text-calico-cocoa/60 dark:text-zinc-400 mt-0.5 truncate">
                    {survivalBudget.catComment}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 block whitespace-nowrap">
                  今日安全額度
                </span>
                <span
                  className={`text-xl font-black whitespace-nowrap tracking-tight ${
                    survivalBudget.status === 'danger'
                      ? 'text-rose-600 dark:text-rose-400'
                      : survivalBudget.status === 'warning'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  ${survivalBudget.dailySafetyBudget}
                  <span className="text-xs font-bold text-calico-cocoa/50 dark:text-zinc-400"> /天</span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-medium text-calico-cocoa/70 dark:text-zinc-300">
              <span className="whitespace-nowrap shrink-0">
                自由支配剩餘: <strong className="font-extrabold text-calico-cocoa dark:text-zinc-100">${survivalBudget.freeBalance}</strong>
              </span>
              <span className="text-[10px] text-calico-cocoa/40 dark:text-zinc-400 whitespace-nowrap shrink-0">
                (已預留固定與分期 ${survivalBudget.totalReservedFixed} · 剩 {survivalBudget.remainingDays} 天)
              </span>
            </div>
          </div>

          {/* Action Row & Category Filters */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {/* Filter Segmented Control */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold shrink-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                  filterType === 'expense'
                    ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                支出
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                  filterType === 'income'
                    ? 'bg-white dark:bg-zinc-800 text-calico-sage shadow-ios-sm'
                    : 'text-calico-cocoa/60 dark:text-zinc-400'
                }`}
              >
                收入
              </button>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              {/* 🤝 Collapsible Social Ledger & Debt Button (Compact) */}
              <button
                onClick={() => setIsSocialDebtOpen((prev) => !prev)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-ios-sm active:scale-95 transition-all border shrink-0 ${
                  isSocialDebtOpen
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600 shadow-amber-500/20'
                    : 'bg-white dark:bg-calico-darkCard text-calico-cocoa dark:text-zinc-200 border-black/5 dark:border-white/10 hover:border-amber-400/50'
                }`}
                title="展開/收合往來分帳與長期計畫"
              >
                <span>往來與計畫</span>
                {(debtStats.activeDebtsCount > 0 || debtStats.activeSplitsCount > 0 || recurringStats.activeCount > 0 || installmentStats.activeCount > 0 || (savingsJars || []).length > 0) && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isSocialDebtOpen
                        ? 'bg-white/25 text-white'
                        : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {debtStats.activeDebtsCount + debtStats.activeSplitsCount + recurringStats.activeCount + installmentStats.activeCount + (savingsJars || []).length}
                  </span>
                )}
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    isSocialDebtOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* + 記一筆 (Compact) */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-calico-orange text-white font-bold text-xs whitespace-nowrap shadow-ios-sm active:scale-95 transition-all hover:brightness-105 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>記一筆</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 🤝 Collapsible Panel: 往來與長期計畫中心 (All-in-One Drawer) */}
          {/* ========================================================================= */}
          {isSocialDebtOpen && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-amber-500/10 dark:from-zinc-900 dark:to-calico-darkCard border border-amber-500/20 dark:border-amber-500/30 shadow-ios space-y-4 animate-fade-in">
              {/* Header with Switcher Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                    往來與長期計畫
                  </h3>
                  <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 whitespace-nowrap">
                    多人分帳 · 往來借還 · 每月固定 · 分期付款 · 夢想存錢
                  </p>
                </div>

                {/* Sub Tab Switcher: 5 Tabs */}
                <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold overflow-x-auto scrollbar-none w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSocialDebtTab('splits')}
                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center space-x-1.5 ${
                      socialDebtTab === 'splits'
                        ? 'bg-white dark:bg-zinc-800 text-calico-cocoa dark:text-zinc-100 shadow-ios-sm font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
                    }`}
                  >
                    <span>多人分帳</span>
                    {debtStats.activeSplitsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold">
                        {debtStats.activeSplitsCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSocialDebtTab('debts')}
                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center space-x-1.5 ${
                      socialDebtTab === 'debts'
                        ? 'bg-white dark:bg-zinc-800 text-calico-cocoa dark:text-zinc-100 shadow-ios-sm font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
                    }`}
                  >
                    <span>往來借還</span>
                    {debtStats.activeDebtsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold">
                        {debtStats.activeDebtsCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSocialDebtTab('recurring')}
                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center space-x-1.5 ${
                      socialDebtTab === 'recurring'
                        ? 'bg-white dark:bg-zinc-800 text-calico-cocoa dark:text-zinc-100 shadow-ios-sm font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
                    }`}
                  >
                    <span>每月固定</span>
                    {recurringStats.activeCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-extrabold">
                        {recurringStats.activeCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSocialDebtTab('installments')}
                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center space-x-1.5 ${
                      socialDebtTab === 'installments'
                        ? 'bg-white dark:bg-zinc-800 text-calico-cocoa dark:text-zinc-100 shadow-ios-sm font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
                    }`}
                  >
                    <span>分期付款</span>
                    {installmentStats.activeCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-extrabold">
                        {installmentStats.activeCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSocialDebtTab('savings')}
                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center space-x-1.5 ${
                      socialDebtTab === 'savings'
                        ? 'bg-white dark:bg-zinc-800 text-calico-cocoa dark:text-zinc-100 shadow-ios-sm font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400 hover:text-calico-cocoa'
                    }`}
                  >
                    <span>夢想存錢</span>
                    {(savingsJars || []).length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-extrabold">
                        {(savingsJars || []).length}
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
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all flex items-center space-x-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>發起分帳</span>
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
                                  先墊款：
                                </span>
                                <span className="font-semibold text-calico-cocoa dark:text-zinc-200">
                                  {(sb.payers || []).map((p) => `${p.name} $${p.paidAmount}`).join('、') || '無'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-calico-cocoa/50 dark:text-zinc-400 font-bold">
                                  分攤人：
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
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all flex items-center space-x-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增借還</span>
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
                                <span>還款明細 ({d.repayments?.length || 0})</span>
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
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
                                >
                                  記還款
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

              {/* TAB 3: 每月固定收支 (Recurring Items) */}
              {socialDebtTab === 'recurring' && (
                <div className="space-y-3">
                  {/* Summary & Create button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                    <div className="flex items-center space-x-3 text-xs">
                      <div>
                        <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold whitespace-nowrap">
                          每月固定支出
                        </span>
                        <span className="text-sm font-black text-rose-500 dark:text-rose-400 whitespace-nowrap">
                          -${recurringStats.monthlyExpense}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-black/10 dark:bg-white/10" />
                      <div>
                        <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold whitespace-nowrap">
                          每月固定收入
                        </span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          +${recurringStats.monthlyIncome}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setRecurringToEdit(null);
                        setIsRecurringModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all flex items-center space-x-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增固定收支</span>
                    </button>
                  </div>

                  {/* List of Recurring Items */}
                  {(!recurringItems || recurringItems.length === 0) ? (
                    <div className="p-6 text-center rounded-2xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10">
                      <p className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                        尚未建立固定收支，點擊上方按鈕建立房租、電信或串流扣款 🏠
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {recurringItems.map((r) => {
                        const currentMonth = new Date().toISOString().slice(0, 7);
                        const isRecordedThisMonth = r.lastRecordedMonth === currentMonth;

                        return (
                          <div
                            key={r.id}
                            className={`p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border transition-all ${
                              !r.isActive
                                ? 'border-black/5 dark:border-white/5 opacity-60'
                                : 'border-black/5 dark:border-white/10 shadow-ios-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                <div
                                  style={{
                                    backgroundColor: `${r.colorHex || '#3B82F6'}20`,
                                    borderColor: `${r.colorHex || '#3B82F6'}40`,
                                  }}
                                  className="w-10 h-10 rounded-2xl border flex items-center justify-center text-lg shrink-0 shadow-2xs"
                                >
                                  {r.emoji || '🏠'}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <h4 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                                      {r.title}
                                    </h4>
                                    <span className="text-[10px] bg-black/5 dark:bg-white/10 text-calico-cocoa/60 dark:text-zinc-400 px-1.5 py-0.2 rounded-md font-medium whitespace-nowrap shrink-0">
                                      每月 {r.dayOfMonth} 日
                                    </span>
                                    {!r.isActive && (
                                      <span className="text-[10px] bg-black/10 text-zinc-500 px-1.5 py-0.2 rounded-md font-bold whitespace-nowrap shrink-0">
                                        已暫停
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-calico-cocoa/50 dark:text-zinc-400 mt-0.5 truncate">
                                    {r.categoryName} · {r.paymentMethodName || '一般扣款'}
                                    {r.notes ? ` · ${r.notes}` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`text-base font-black whitespace-nowrap ${
                                    r.type === 'expense'
                                      ? 'text-calico-cocoa dark:text-zinc-100'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {r.type === 'expense' ? `-$${r.amount}` : `+$${r.amount}`}
                                </span>
                                <div className="flex items-center space-x-1 mt-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecurringToEdit(r);
                                      setIsRecurringModalOpen(true);
                                    }}
                                    className="p-1 text-calico-cocoa/40 hover:text-amber-500 transition-colors"
                                    title="編輯"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteRecurringItem(r.id)}
                                    className="p-1 text-calico-cocoa/40 hover:text-red-500 transition-colors"
                                    title="刪除"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Record now button */}
                            <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                              <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-medium">
                                {isRecordedThisMonth ? `✓ 本月 (${currentMonth}) 已記帳入流水帳` : `本月尚未記錄此項目`}
                              </span>
                              <button
                                type="button"
                                disabled={isRecordedThisMonth}
                                onClick={() => recordRecurringNow(r.id)}
                                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                                  isRecordedThisMonth
                                    ? 'bg-black/5 dark:bg-white/5 text-calico-cocoa/40 dark:text-zinc-500 cursor-not-allowed'
                                    : 'bg-calico-orange/15 hover:bg-calico-orange text-calico-orange hover:text-white shadow-2xs active:scale-95'
                                }`}
                              >
                                <span>{isRecordedThisMonth ? '本月已入帳' : '本月一鍵入帳'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: 分期付款追蹤 (Installments Tracker) */}
              {socialDebtTab === 'installments' && (
                <div className="space-y-3">
                  {/* Summary & Create button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                    <div className="flex items-center space-x-3 text-xs">
                      <div>
                        <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold whitespace-nowrap">
                          分期剩餘總額
                        </span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          ${installmentStats.totalRemaining}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-black/10 dark:bg-white/10" />
                      <div>
                        <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold whitespace-nowrap">
                          進行中分期
                        </span>
                        <span className="text-sm font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                          {installmentStats.activeCount} 個計畫
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setInstallmentToEdit(null);
                        setIsInstallmentModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all flex items-center space-x-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增分期計畫</span>
                    </button>
                  </div>

                  {/* List of Installments */}
                  {(!installments || installments.length === 0) ? (
                    <div className="p-6 text-center rounded-2xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10">
                      <p className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                        目前無分期付款計畫，筆電、手機或機車分期皆可在此追蹤 💻
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {installments.map((inst) => {
                        const isDone = inst.isCompleted || inst.paidPeriods >= inst.totalPeriods;
                        const progressPercent = Math.min(100, Math.round((inst.paidPeriods / inst.totalPeriods) * 100));
                        const remainingAmount = Math.max(0, (inst.totalPeriods - inst.paidPeriods) * inst.periodAmount);

                        return (
                          <div
                            key={inst.id}
                            className={`p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border transition-all ${
                              isDone
                                ? 'border-black/5 dark:border-white/5 opacity-60'
                                : 'border-indigo-500/20 dark:border-indigo-500/30 shadow-ios-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                <div
                                  style={{
                                    backgroundColor: `${inst.colorHex || '#6366F1'}20`,
                                    borderColor: `${inst.colorHex || '#6366F1'}40`,
                                  }}
                                  className="w-10 h-10 rounded-2xl border flex items-center justify-center text-lg shrink-0 shadow-2xs"
                                >
                                  {inst.emoji || '💻'}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <h4 className="text-sm font-extrabold text-calico-cocoa dark:text-zinc-100 truncate">
                                      {inst.title}
                                    </h4>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold whitespace-nowrap shrink-0 ${
                                        isDone
                                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                          : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                      }`}
                                    >
                                      {isDone ? '✓ 已全數結清' : `進行中 ${inst.paidPeriods}/${inst.totalPeriods} 期`}
                                    </span>
                                  </div>
                                  <p className="text-xs text-calico-cocoa/50 dark:text-zinc-400 mt-0.5 truncate">
                                    每月 {inst.billingDay} 日扣款 · 每期 ${inst.periodAmount} · {inst.paymentMethodName || '信用卡'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-base font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                                  ${inst.totalAmount}
                                </span>
                                <div className="flex items-center space-x-1 mt-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInstallmentToEdit(inst);
                                      setIsInstallmentModalOpen(true);
                                    }}
                                    className="p-1 text-calico-cocoa/40 hover:text-indigo-500 transition-colors"
                                    title="編輯"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteInstallment(inst.id)}
                                    className="p-1 text-calico-cocoa/40 hover:text-red-500 transition-colors"
                                    title="刪除"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-2.5">
                              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                <span className="text-calico-cocoa/60 dark:text-zinc-400">
                                  已繳 {inst.paidPeriods} 期 / 剩 {Math.max(0, inst.totalPeriods - inst.paidPeriods)} 期 (剩餘 ${remainingAmount})
                                </span>
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                  {progressPercent}%
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                                <div
                                  style={{ width: `${progressPercent}%` }}
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isDone ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Pay this period button */}
                            {!isDone && (
                              <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                                <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-medium">
                                  扣繳後將自動建立一筆 ${inst.periodAmount} 支出流水帳
                                </span>
                                <button
                                  type="button"
                                  onClick={() => payInstallmentPeriod(inst.id)}
                                  className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white shadow-2xs active:scale-95 transition-all whitespace-nowrap shrink-0"
                                >
                                  扣繳第 {inst.paidPeriods + 1} 期 (${inst.periodAmount})
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: 夢想存錢筒／願望清單 (Savings Jar) */}
              {socialDebtTab === 'savings' && (
                <div className="space-y-3">
                  {/* Summary & Create button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                    <div className="flex items-center space-x-3 text-xs">
                      <div>
                        <span className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 block font-bold whitespace-nowrap">
                          夢想累積總存款
                        </span>
                        <span className="text-sm font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">
                          ${(savingsJars || []).reduce((acc, j) => acc + j.currentAmount, 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-black/10 dark:bg-white/10" />
                      <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={syncDepositToExpense}
                          onChange={(e) => setSyncDepositToExpense(e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-calico-orange"
                        />
                        <span className="text-[11px] font-bold text-calico-cocoa/70 dark:text-zinc-300 whitespace-nowrap">
                          投幣同步記支出
                        </span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSavingsToEdit(null);
                        setIsSavingsModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-ios-sm active:scale-95 transition-all flex items-center space-x-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增夢想清單</span>
                    </button>
                  </div>

                  {/* List of Savings Jars */}
                  {(!savingsJars || savingsJars.length === 0) ? (
                    <div className="p-6 text-center rounded-2xl bg-white/40 dark:bg-zinc-800/20 border border-dashed border-black/10 dark:border-white/10">
                      <p className="text-xs font-bold text-calico-cocoa/60 dark:text-zinc-400">
                        尚無夢想存錢筒，設定畢旅、平板或演唱會目標，每天少喝一杯手搖輕鬆達標 🏺
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savingsJars.map((jar) => {
                        const pct = Math.min(100, Math.round((jar.currentAmount / Math.max(1, jar.targetAmount)) * 100));
                        const remain = Math.max(0, jar.targetAmount - jar.currentAmount);
                        let dailyMicroGoal: number | null = null;
                        if (jar.targetDate && remain > 0) {
                          const today = new Date(new Date().toISOString().slice(0, 10));
                          const end = new Date(jar.targetDate);
                          const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          if (diffDays > 0) {
                            dailyMicroGoal = Math.ceil(remain / diffDays);
                          }
                        }
                        const isHistoryOpen = expandedSavingsId === jar.id;
                        const isCustomOpen = customDepositJarId === jar.id;

                        return (
                          <div
                            key={jar.id}
                            className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/10 shadow-ios-sm space-y-3"
                          >
                            {/* Top info */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div
                                  style={{
                                    backgroundColor: `${jar.colorHex || '#8B5CF6'}20`,
                                    borderColor: `${jar.colorHex || '#8B5CF6'}40`,
                                  }}
                                  className="w-10 h-10 rounded-2xl border flex items-center justify-center text-lg shrink-0 shadow-2xs"
                                >
                                  {jar.emoji || '🏺'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <h4 className="text-sm font-black text-calico-cocoa dark:text-zinc-100 truncate">
                                      {jar.title}
                                    </h4>
                                    {jar.isCompleted && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black whitespace-nowrap shrink-0">
                                        🎉 已達標
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-semibold text-calico-cocoa/50 dark:text-zinc-400 truncate mt-0.5">
                                    {jar.targetDate ? `目標日 ${jar.targetDate}` : '持續累積中'}
                                    {dailyMicroGoal ? ` · 每日存 $${dailyMicroGoal} 即達標` : ''}
                                    {jar.notes ? ` · ${jar.notes}` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSavingsToEdit(jar);
                                    setIsSavingsModalOpen(true);
                                  }}
                                  className="p-1 text-calico-cocoa/40 hover:text-amber-500 transition-colors"
                                  title="編輯"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSavingsJar(jar.id)}
                                  className="p-1 text-calico-cocoa/40 hover:text-red-500 transition-colors"
                                  title="刪除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-calico-cocoa dark:text-zinc-200 whitespace-nowrap">
                                  已存 <strong style={{ color: jar.colorHex }}>${jar.currentAmount.toLocaleString()}</strong> / ${jar.targetAmount.toLocaleString()}
                                </span>
                                <span className="text-[11px] font-black text-calico-cocoa/60 dark:text-zinc-400 whitespace-nowrap">
                                  {pct}% {remain > 0 ? `(差 $${remain.toLocaleString()})` : ''}
                                </span>
                              </div>
                              <div className="w-full h-2.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: jar.isCompleted ? '#10B981' : jar.colorHex || '#8B5CF6',
                                  }}
                                  className="h-full rounded-full transition-all duration-500"
                                />
                              </div>
                            </div>

                            {/* ⚡ Quick Deposit Coins */}
                            <div className="space-y-2 pt-1 border-t border-black/5 dark:border-white/5">
                              <div className="flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none">
                                {[
                                  { label: '🧋省手搖 +$60', amt: 60, note: '省下一杯手搖飲' },
                                  { label: '🍱省宵夜 +$120', amt: 120, note: '忍住沒吃宵夜' },
                                  { label: '💰+$500', amt: 500, note: '固定儲蓄投入' },
                                ].map((btn) => (
                                  <button
                                    key={btn.label}
                                    type="button"
                                    onClick={() => depositToSavingsJar(jar.id, btn.amt, btn.note, syncDepositToExpense)}
                                    className="px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-zinc-700/80 hover:bg-purple-500/15 hover:text-purple-600 dark:hover:text-purple-300 text-[11px] font-black text-calico-cocoa dark:text-zinc-200 active:scale-95 transition-all whitespace-nowrap shrink-0"
                                  >
                                    {btn.label}
                                  </button>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomDepositJarId(isCustomOpen ? null : jar.id);
                                    setCustomDepositAmount('');
                                    setCustomDepositNote('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300 text-[11px] font-black active:scale-95 transition-all whitespace-nowrap shrink-0"
                                >
                                  ✏️ 自訂存入
                                </button>
                              </div>

                              {/* Custom Deposit Inline Input */}
                              {isCustomOpen && (
                                <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center gap-2 animate-fade-in">
                                  <input
                                    type="number"
                                    min={1}
                                    value={customDepositAmount}
                                    onChange={(e) => setCustomDepositAmount(e.target.value)}
                                    placeholder="金額 ($)"
                                    className="w-24 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={customDepositNote}
                                    onChange={(e) => setCustomDepositNote(e.target.value)}
                                    placeholder="備註 (如: 打工獎金)"
                                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const val = Number(customDepositAmount);
                                      if (val > 0) {
                                        depositToSavingsJar(jar.id, val, customDepositNote || '自訂存入', syncDepositToExpense);
                                        setCustomDepositJarId(null);
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-black whitespace-nowrap shrink-0"
                                  >
                                    存入
                                  </button>
                                </div>
                              )}

                              {/* Deposit History Toggle */}
                              <div className="flex items-center justify-between pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setExpandedSavingsId(isHistoryOpen ? null : jar.id)}
                                  className="text-[10px] font-bold text-calico-cocoa/50 dark:text-zinc-400 hover:text-purple-500 flex items-center space-x-1"
                                >
                                  <span>📜 投幣紀錄 ({jar.deposits?.length || 0} 筆)</span>
                                  <ChevronDown className={`w-3 h-3 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
                                </button>
                              </div>

                              {isHistoryOpen && jar.deposits && jar.deposits.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-black/5 dark:border-white/5 max-h-36 overflow-y-auto">
                                  {jar.deposits.map((dep) => (
                                    <div
                                      key={dep.id}
                                      className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03]"
                                    >
                                      <span className="text-calico-cocoa/70 dark:text-zinc-300 font-semibold truncate">
                                        {dep.date} · {dep.note || '存入'}
                                      </span>
                                      <span className="font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 ml-2">
                                        +${dep.amount}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
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
                輸入好友的課表分享代碼（例如 小明、阿豪），即可在此即時查閱好友的帳本開銷，並為每筆消費給予 1~5 星評分與反饋！
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

              {/* 📅 Friend Period Switcher (日 / 週 / 月) */}
              <div className="p-1 rounded-2xl bg-black/5 dark:bg-white/10 text-xs font-bold">
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setFriendPeriodMode('daily')}
                    className={`py-1.5 px-2 rounded-xl transition-all text-center whitespace-nowrap shrink-0 ${
                      friendPeriodMode === 'daily'
                        ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    📅 日檢視
                  </button>
                  <button
                    type="button"
                    onClick={() => setFriendPeriodMode('weekly')}
                    className={`py-1.5 px-2 rounded-xl transition-all text-center whitespace-nowrap shrink-0 ${
                      friendPeriodMode === 'weekly'
                        ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    🗓️ 週檢視
                  </button>
                  <button
                    type="button"
                    onClick={() => setFriendPeriodMode('monthly')}
                    className={`py-1.5 px-2 rounded-xl transition-all text-center whitespace-nowrap shrink-0 ${
                      friendPeriodMode === 'monthly'
                        ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm font-black'
                        : 'text-calico-cocoa/60 dark:text-zinc-400'
                    }`}
                  >
                    📊 月檢視
                  </button>
                </div>
              </div>

              {/* 📅 Friend Date Navigation Toolbar */}
              <div className="p-3 rounded-2xl bg-white dark:bg-calico-darkCard border border-black/5 dark:border-white/10 shadow-ios-sm flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleFriendPrev}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-calico-cocoa dark:text-zinc-300 transition-colors shrink-0"
                  title="前一個週期"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2 shrink-0">
                  <CalendarDays className="w-4 h-4 text-calico-orange shrink-0" />
                  {friendPeriodMode === 'daily' ? (
                    <input
                      type="date"
                      value={friendSelectedDate}
                      onChange={(e) => e.target.value && setFriendSelectedDate(e.target.value)}
                      className="bg-transparent text-xs font-black text-calico-cocoa dark:text-zinc-100 outline-none cursor-pointer"
                    />
                  ) : friendPeriodMode === 'weekly' ? (
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                      {friendWeekRange.startStr.slice(5)} ~ {friendWeekRange.endStr.slice(5)}
                    </span>
                  ) : (
                    <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100 whitespace-nowrap">
                      {friendSelectedDate.slice(0, 4)} 年 {parseInt(friendSelectedDate.slice(5, 7), 10)} 月
                    </span>
                  )}
                  {isCurrentFriendPeriod && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-calico-orange/15 text-calico-orange font-black whitespace-nowrap shrink-0">
                      當期
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {!isCurrentFriendPeriod && (
                    <button
                      type="button"
                      onClick={handleFriendToday}
                      className="px-2 py-1 rounded-xl text-[10px] font-bold bg-calico-orange/15 text-calico-orange hover:bg-calico-orange hover:text-white transition-all whitespace-nowrap shrink-0"
                    >
                      回到當期
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFriendNext}
                    className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-calico-cocoa dark:text-zinc-300 transition-colors shrink-0"
                    title="後一個週期"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Friend Summary KPI Cards (聚焦「當期消費」) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-amber-200/50 dark:border-zinc-700/40 shadow-ios">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
                    {currentFriend?.nickname || currentFriend?.ownerName || '好友'} 的{friendPeriodLabel}消費
                  </span>
                  <p className="text-2xl font-black text-calico-cocoa dark:text-zinc-100">
                    ${friendStats.periodExpense}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                    <span>共 {friendStats.periodTxCount} 筆{friendPeriodLabel}消費</span>
                    <span>(歷史累計 ${friendStats.totalExpense})</span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-orange-200/50 dark:border-zinc-700/40 shadow-ios">
                  <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 block mb-1">
                    好友互評平均
                  </span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-calico-cocoa dark:text-zinc-100">
                      {friendStats.periodAvgRating ? `★ ${friendStats.periodAvgRating}` : (friendStats.avgRating ? `★ ${friendStats.avgRating}` : '尚無評分')}
                    </span>
                  </div>
                  <p className="text-[10px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold mt-1">
                    {friendPeriodLabel}評分 {friendStats.periodRatedCount} 筆 · 歷史累計 {friendStats.ratedCount} 筆
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
                    {friendStats.periodCategories.length > 0
                      ? `${friendPeriodLabel} ${friendStats.periodCategories.length} 個類別`
                      : '尚無支出'}
                  </span>
                </div>

                <CategoryPieChart
                  categories={friendStats.periodCategories}
                  totalExpense={friendStats.periodExpense}
                  emptyText={`${friendPeriodLabel}尚無支出記錄`}
                />
              </div>

              {/* Friend Transactions List with Peer Rating Button & Mode Toggle */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <h4 className="text-xs font-black text-calico-cocoa/60 dark:text-zinc-400 uppercase tracking-wider">
                    {currentFriend?.nickname || currentFriend?.ownerName || '好友'} 的收支明細與評分
                  </h4>
                  
                  {/* View Mode Toggle: Period vs All */}
                  <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFriendViewListMode('daily')}
                      className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                        friendViewListMode === 'daily'
                          ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                          : 'text-calico-cocoa/60 dark:text-zinc-400'
                      }`}
                    >
                      {friendPeriodLabel}明細 ({friendStats.periodTxCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFriendViewListMode('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                        friendViewListMode === 'all'
                          ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-ios-sm'
                          : 'text-calico-cocoa/60 dark:text-zinc-400'
                      }`}
                    >
                      全部歷史 ({friendTransactions.length})
                    </button>
                  </div>
                </div>

                {(friendViewListMode === 'daily' ? friendStats.periodTransactions : friendTransactions).length > 0 ? (
                  (friendViewListMode === 'daily' ? friendStats.periodTransactions : friendTransactions).map((tx) => (
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

      {/* 🔄 Recurring Item Modal */}
      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => {
          setIsRecurringModalOpen(false);
          setRecurringToEdit(null);
        }}
        recurringToEdit={recurringToEdit}
      />

      {/* 💳 Installment Modal */}
      <InstallmentModal
        isOpen={isInstallmentModalOpen}
        onClose={() => {
          setIsInstallmentModalOpen(false);
          setInstallmentToEdit(null);
        }}
        installmentToEdit={installmentToEdit}
      />

      {/* 🏺 Savings Jar Modal */}
      <SavingsJarModal
        isOpen={isSavingsModalOpen}
        onClose={() => {
          setIsSavingsModalOpen(false);
          setSavingsToEdit(null);
        }}
        onSave={(saved) => {
          if (savingsToEdit) {
            updateSavingsJar(saved);
          } else {
            addSavingsJar(saved);
          }
        }}
        initialData={savingsToEdit}
      />
    </div>
  );
};
