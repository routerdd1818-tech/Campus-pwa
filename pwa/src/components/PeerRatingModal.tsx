import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Transaction } from '../types';
import { useApp } from '../context/AppContext';
import { X, Star, Sparkles, MessageSquareHeart, Check, ThumbsUp } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PeerRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  friendShareCode: string;
  transaction: Transaction | null;
  onRated?: () => void;
}

const QUICK_TAGS = [
  '🏆 超划算神單！',
  '☕️ 享受生活好品味',
  '💸 有點小奢侈喔～',
  '😋 下次我也要吃！',
  '👏 理財小模範！',
  '🐷 該克制存錢了～',
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  5: '超划算神單！生活智慧王 🏆',
  4: '很棒的花費，物超所值！💡',
  3: '合理開銷，日常平衡剛剛好 👌',
  2: '有點小奢侈，要注意預算喔 💸',
  1: '敗家預警！快要吃土啦 🐷',
};

export const PeerRatingModal: React.FC<PeerRatingModalProps> = ({
  isOpen,
  onClose,
  friendName,
  friendShareCode,
  transaction,
  onRated,
}) => {
  const { rateFriendAccounting } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transaction) {
      setRating(transaction.peerRating || 5);
      setFeedback(transaction.peerFeedback || '');
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const ok = await rateFriendAccounting(
      friendShareCode,
      transaction.id,
      rating,
      feedback.trim() || RATING_DESCRIPTIONS[rating] || '給了好友 5 星好評！'
    );
    setIsSubmitting(false);

    if (ok) {
      setSuccessMessage('評分已送達！好友下次打開 APP 即可看見您的評價 🎉');
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
      if (onRated) onRated();
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      alert('評分送出失敗，請確認網路連線！');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-calico-darkCard rounded-t-3xl sm:rounded-3xl shadow-ios-lg border border-black/5 dark:border-white/10 max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        {/* Fixed Non-Scrolling Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white dark:bg-calico-darkCard">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-2xl bg-amber-400/20 text-amber-500">
              <Star className="w-5 h-5 fill-amber-400 stroke-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-calico-cocoa dark:text-zinc-100 flex items-center space-x-1">
                <span>給 {friendName} 的記帳評分</span>
              </h3>
              <p className="text-[11px] text-calico-cocoa/60 dark:text-zinc-400">
                互相監督、讚賞理財，增添好友記帳樂趣 ✨
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-calico-cocoa/40 hover:text-calico-cocoa transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pb-10 sm:pb-6">

        {/* Transaction Info Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-calico-cream/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span
                style={{ backgroundColor: transaction.categoryColorHex || '#E67E22' }}
                className="w-2.5 h-2.5 rounded-full shrink-0"
              />
              <span className="text-xs font-black text-calico-cocoa dark:text-zinc-100">
                {transaction.categoryName}
              </span>
              <span className="text-[10px] text-calico-cocoa/50 font-mono">
                {transaction.date.slice(0, 10)}
              </span>
            </div>
            {transaction.notes ? (
              <p className="text-xs text-calico-cocoa/70 dark:text-zinc-300 mt-1 pl-4.5">
                {transaction.notes}
              </p>
            ) : (
              <p className="text-[10px] text-calico-cocoa/40 italic mt-0.5 pl-4.5">
                無備忘備註
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-base font-mono font-black text-calico-orange">
              ${transaction.amount}
            </span>
            {transaction.valueScore !== undefined && (
              <p className="text-[10px] text-calico-cocoa/60 font-bold">
                本人自評: {transaction.valueScore}分
              </p>
            )}
          </div>
        </div>

        {successMessage ? (
          <div className="py-8 text-center space-y-2 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="text-sm font-black text-calico-cocoa dark:text-zinc-100">
              {successMessage}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Star Rating Slider / Buttons */}
            <div className="text-center space-y-2">
              <label className="text-xs font-black text-calico-cocoa/80 dark:text-zinc-300">
                點擊星級進行評分
              </label>

              <div className="flex items-center justify-center space-x-2 py-1">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isFilled = starVal <= rating;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      className="p-1 transition-transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          isFilled
                            ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
                            : 'text-zinc-300 dark:text-zinc-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Rating description */}
              <p className="text-xs font-black text-amber-600 dark:text-amber-400">
                {RATING_DESCRIPTIONS[rating] || ''}
              </p>
            </div>

            {/* Quick Comment Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-calico-orange" />
                <span>一鍵帶入評語標籤</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setFeedback(tag)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                      feedback === tag
                        ? 'bg-calico-orange text-white border-calico-orange shadow-2xs'
                        : 'bg-black/5 dark:bg-white/10 text-calico-cocoa/80 dark:text-zinc-200 border-transparent hover:bg-calico-orange/15'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Comment Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 flex items-center space-x-1">
                <MessageSquareHeart className="w-3.5 h-3.5 text-pink-500" />
                <span>留一句話給好友 (選填)</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="寫下你想對好友說的鼓勵、吐槽或理財建議..."
                rows={2}
                maxLength={60}
                className="w-full px-3 py-2 rounded-2xl bg-calico-cream/40 dark:bg-zinc-800/60 border border-black/10 dark:border-white/10 text-xs text-calico-cocoa dark:text-zinc-100 placeholder:text-calico-cocoa/40 focus:outline-none focus:ring-2 focus:ring-calico-orange resize-none"
              />
              <span className="text-[10px] text-right block text-calico-cocoa/40">
                {feedback.length} / 60 字
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 text-calico-cocoa/70 dark:text-zinc-300 font-extrabold text-xs hover:bg-black/10 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-calico-orange text-white font-black text-xs shadow-ios-sm hover:brightness-105 active:scale-95 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{isSubmitting ? '送出中...' : '送出評分'}</span>
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>,
    document.body
  );
};
