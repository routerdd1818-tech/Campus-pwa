import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { SplitBill, SplitPayer, SplitParticipant, SplitSettlement } from '../types';
import {
  Users,
  X,
  Plus,
  Trash2,
  DollarSign,
  ArrowRight,
  Sparkles,
  Calculator,
  Check,
  Receipt,
  UserPlus,
} from 'lucide-react';

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  billToEdit?: SplitBill | null;
}

const QUICK_TITLES = ['聚餐吃好料', '出遊住宿/交通', '採買零食日用品', '小組專案印刷', '外送代訂'];

// 🧮 最小轉帳次數貪婪清算演算法 (Greedy Debt Settlement Algorithm)
function computeSettlements(payers: SplitPayer[], participants: SplitParticipant[]): SplitSettlement[] {
  const netBalances: Record<string, number> = {};

  // 1. Add paid amounts
  payers.forEach((p) => {
    const name = p.name.trim();
    if (!name) return;
    netBalances[name] = (netBalances[name] || 0) + (Number(p.amount) || 0);
  });

  // 2. Subtract owed shares
  participants.forEach((p) => {
    const name = p.name.trim();
    if (!name) return;
    netBalances[name] = (netBalances[name] || 0) - (Number(p.shareAmount) || 0);
  });

  // 3. Separate creditors and debtors
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  Object.entries(netBalances).forEach(([name, balance]) => {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ name, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ name, amount: -rounded });
    }
  });

  const settlements: SplitSettlement[] = [];

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const transferAmount = Math.min(creditor.amount, debtor.amount);
    if (transferAmount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(transferAmount),
        isSettled: false,
      });
    }

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    if (creditor.amount <= 0.01) cIdx++;
    if (debtor.amount <= 0.01) dIdx++;
  }

  return settlements;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({ isOpen, onClose, billToEdit }) => {
  const { addSplitBill, updateSplitBill, currentUser, settings, savedFriends } = useApp();

  const myName = currentUser?.displayName || settings.ownerName || '我';

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // 多人先墊錢名單
  const [payers, setPayers] = useState<SplitPayer[]>([{ name: myName, amount: 0 }]);

  // 多人分錢名單
  const [participants, setParticipants] = useState<SplitParticipant[]>([
    { name: myName, shareAmount: 0, isSettled: false },
  ]);

  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [newMemberInput, setNewMemberInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (billToEdit) {
        setTitle(billToEdit.title);
        setDate(billToEdit.date.slice(0, 10));
        setNotes(billToEdit.notes || '');
        setSplitMode(billToEdit.splitMode || 'equal');
        setPayers(
          billToEdit.payers && billToEdit.payers.length > 0
            ? billToEdit.payers
            : [{ name: myName, amount: billToEdit.totalAmount }]
        );
        setParticipants(
          billToEdit.participants && billToEdit.participants.length > 0
            ? billToEdit.participants
            : (billToEdit.members || [myName]).map((m) => ({
                name: m,
                shareAmount: Math.round(billToEdit.totalAmount / (billToEdit.members?.length || 1)),
                isSettled: billToEdit.isSettled,
              }))
        );
      } else {
        setTitle('');
        setDate(new Date().toISOString().slice(0, 10));
        setNotes('');
        setSplitMode('equal');
        setPayers([{ name: myName, amount: 0 }]);
        // Pre-populate with myself and first saved friend if any
        const initialMembers = [myName];
        if (savedFriends.length > 0) {
          initialMembers.push(savedFriends[0].nickname || savedFriends[0].ownerName);
        }
        setParticipants(
          initialMembers.map((name) => ({ name, shareAmount: 0, isSettled: false }))
        );
      }
      setErrorMsg(null);
      setNewMemberInput('');
    }
  }, [isOpen, billToEdit, myName, savedFriends]);

  // Compute total paid amount
  const totalPaid = useMemo(() => {
    return payers.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payers]);

  // When splitMode is 'equal', auto recalculate equal shares for all participants
  useEffect(() => {
    if (splitMode === 'equal' && participants.length > 0) {
      const perPerson = Math.floor(totalPaid / participants.length);
      const remainder = totalPaid - perPerson * participants.length;

      setParticipants((prev) =>
        prev.map((p, idx) => ({
          ...p,
          shareAmount: idx === 0 ? perPerson + remainder : perPerson,
        }))
      );
    }
  }, [splitMode, totalPaid, participants.length]);

  // Compute real-time settlements
  const calculatedSettlements = useMemo(() => {
    return computeSettlements(payers, participants);
  }, [payers, participants]);

  if (!isOpen) return null;

  // Payers handlers
  const handlePayerChange = (index: number, field: 'name' | 'amount', value: any) => {
    setPayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleAddPayer = (name = '') => {
    setPayers((prev) => [...prev, { name: name || '', amount: 0 }]);
  };

  const handleRemovePayer = (index: number) => {
    if (payers.length <= 1) return;
    setPayers((prev) => prev.filter((_, i) => i !== index));
  };

  // Participants handlers
  const handleParticipantShareChange = (index: number, amount: number) => {
    setParticipants((prev) =>
      prev.map((p, i) => (i === index ? { ...p, shareAmount: amount } : p))
    );
  };

  const handleAddParticipant = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (participants.some((p) => p.name === trimmed)) return;

    setParticipants((prev) => [
      ...prev,
      { name: trimmed, shareAmount: 0, isSettled: false },
    ]);
    setNewMemberInput('');
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 1) return;
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('請輸入分帳活動名稱');
      return;
    }
    if (totalPaid <= 0) {
      setErrorMsg('請填寫先墊錢的金額（總金額不可為 0）');
      return;
    }
    if (participants.length < 2) {
      setErrorMsg('多人分帳至少需要 2 位參與分攤人');
      return;
    }

    const settlements = calculatedSettlements;

    if (billToEdit) {
      updateSplitBill({
        ...billToEdit,
        title: title.trim(),
        totalAmount: totalPaid,
        payers,
        participants,
        settlements,
        splitMode,
        date,
        notes: notes.trim(),
        isSettled: billToEdit.isSettled,
      });
    } else {
      addSplitBill({
        id: `split_${Date.now()}`,
        title: title.trim(),
        totalAmount: totalPaid,
        payers,
        participants,
        settlements,
        splitMode,
        date,
        notes: notes.trim(),
        isSettled: false,
      });
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-lg bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white dark:bg-calico-darkCard z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 tracking-tight">
                {billToEdit ? '編輯多人分帳' : '新增多人分帳與代墊'}
              </h3>
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold">
                支援多人先墊錢、多人分攤與一鍵自動試算誰該給誰
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

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pb-14 sm:pb-6">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-bold animate-fade-in">
              {errorMsg}
            </div>
          )}

          {/* 1. Title & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                活動 / 聚餐名稱
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：慶功宴火鍋、包棟民宿..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-sm font-bold text-calico-cocoa dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
                活動日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Quick Title Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {QUICK_TITLES.map((qt) => (
              <button
                key={qt}
                type="button"
                onClick={() => setTitle(qt)}
                className="px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-bold text-calico-cocoa/60 dark:text-zinc-400 hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
              >
                {qt}
              </button>
            ))}
          </div>

          {/* 2. 多人先墊錢名單 (Payers Section) */}
          <div className="p-4 rounded-3xl bg-amber-50/60 dark:bg-zinc-800/50 border border-amber-200/50 dark:border-zinc-700/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Receipt className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                  誰先墊了錢？(可多人同時墊款)
                </h4>
              </div>
              <span className="text-xs font-black text-amber-900 dark:text-amber-300">
                總墊款：${totalPaid}
              </span>
            </div>

            <div className="space-y-2">
              {payers.map((payer, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={payer.name}
                    onChange={(e) => handlePayerChange(idx, 'name', e.target.value)}
                    placeholder="墊錢者姓名"
                    className="w-28 sm:w-36 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
                  />
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-calico-cocoa/40">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={payer.amount === 0 ? '' : payer.amount}
                      onChange={(e) => handlePayerChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="墊付金額"
                      className="w-full pl-6 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100"
                    />
                  </div>
                  {payers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePayer(idx)}
                      className="p-1.5 text-calico-cocoa/30 hover:text-rose-500 transition-colors"
                      title="移除此墊款人"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              {/* Quick Add Friend as Payer */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-calico-cocoa/50 font-bold">快捷加入：</span>
                {savedFriends.map((f) => {
                  const fname = f.nickname || f.ownerName || '好友';
                  return (
                    <button
                      key={f.shareCode}
                      type="button"
                      onClick={() => handleAddPayer(fname)}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300/40"
                    >
                      + {fname}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleAddPayer('')}
                className="px-2.5 py-1 rounded-xl bg-amber-600 text-white text-xs font-bold flex items-center space-x-1 shadow-2xs hover:bg-amber-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>加一位墊錢人</span>
              </button>
            </div>
          </div>

          {/* 3. 多人分錢名單 (Participants Section) */}
          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 space-y-3 shadow-ios-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-calico-orange" />
                <h4 className="text-xs font-black text-calico-cocoa dark:text-zinc-100">
                  誰要分錢？({participants.length} 人參與分攤)
                </h4>
              </div>

              {/* Split Mode Selector */}
              <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/10 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSplitMode('equal')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    splitMode === 'equal'
                      ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-2xs font-black'
                      : 'text-calico-cocoa/60 dark:text-zinc-400'
                  }`}
                >
                  均分 (AA制)
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('custom')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    splitMode === 'custom'
                      ? 'bg-white dark:bg-zinc-800 text-calico-orange shadow-2xs font-black'
                      : 'text-calico-cocoa/60 dark:text-zinc-400'
                  }`}
                >
                  自訂金額
                </button>
              </div>
            </div>

            {/* Quick Add Participants from Friends */}
            {savedFriends.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-calico-cocoa/40 font-bold">加入好友：</span>
                {savedFriends.map((f) => {
                  const fname = f.nickname || f.ownerName || '好友';
                  const alreadyIn = participants.some((p) => p.name === fname);
                  return (
                    <button
                      key={f.shareCode}
                      type="button"
                      disabled={alreadyIn}
                      onClick={() => handleAddParticipant(fname)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                        alreadyIn
                          ? 'bg-black/5 dark:bg-white/5 text-calico-cocoa/30 cursor-not-allowed'
                          : 'bg-calico-orange/15 text-calico-orange hover:bg-calico-orange/25'
                      }`}
                    >
                      {alreadyIn ? `✓ ${fname}` : `+ ${fname}`}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Add Custom Participant Input */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMemberInput}
                onChange={(e) => setNewMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddParticipant(newMemberInput);
                  }
                }}
                placeholder="輸入其他參與者姓名 (如：小明)"
                className="flex-1 px-3 py-1.5 rounded-xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => handleAddParticipant(newMemberInput)}
                className="px-3 py-1.5 rounded-xl bg-calico-orange text-white text-xs font-bold hover:brightness-105 transition-all shrink-0 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>加入</span>
              </button>
            </div>

            {/* Participants Share List */}
            <div className="space-y-2 pt-1">
              {participants.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-calico-cream/30 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-calico-orange/15 text-calico-orange text-xs font-black flex items-center justify-center">
                      {p.name.slice(0, 1)}
                    </span>
                    <span className="text-xs font-bold text-calico-cocoa dark:text-zinc-100">
                      {p.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {splitMode === 'equal' ? (
                      <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100">
                        應付 ${p.shareAmount}
                      </span>
                    ) : (
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-calico-cocoa/40">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={p.shareAmount === 0 ? '' : p.shareAmount}
                          onChange={(e) =>
                            handleParticipantShareChange(idx, parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-5 pr-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 text-xs font-black text-calico-cocoa dark:text-zinc-100 text-right"
                        />
                      </div>
                    )}

                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(idx)}
                        className="p-1 text-calico-cocoa/25 hover:text-rose-500 transition-colors"
                        title="移除分攤人"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. 智慧結算試算指示 (Real-Time Settlement Preview) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-zinc-900 dark:to-zinc-800 border border-amber-200/50 dark:border-zinc-700/40 space-y-2.5">
            <div className="flex items-center space-x-1.5">
              <Calculator className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                智慧試算：結算轉帳路徑
              </h4>
            </div>

            {calculatedSettlements.length > 0 ? (
              <div className="space-y-1.5">
                {calculatedSettlements.map((st, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-2xl bg-white/90 dark:bg-zinc-800/90 border border-amber-200/40 dark:border-zinc-700/50 flex items-center justify-between text-xs font-bold"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-rose-600 dark:text-rose-400 font-black">
                        {st.from}
                      </span>
                      <span className="text-calico-cocoa/40">應轉給</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        {st.to}
                      </span>
                    </div>
                    <span className="text-sm font-black text-amber-800 dark:text-amber-300">
                      ${st.amount} 元
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400 py-1 font-semibold text-center">
                各方代墊與應付金額已完全相抵或尚未輸入金額 🍃
              </p>
            )}
          </div>

          {/* 5. Notes */}
          <div>
            <label className="block text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 mb-1">
              分帳備註說明 (選填)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：發票存小明載具，已含 10% 服務費..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/80 border border-black/10 dark:border-white/10 text-xs font-bold text-calico-cocoa dark:text-zinc-100"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-calico-orange text-white font-black text-sm shadow-ios hover:brightness-105 active:scale-95 transition-all mt-2"
          >
            {billToEdit ? '儲存分帳修改' : '建立多人分帳'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
