import React from 'react';
import {
  BookOpen,
  GraduationCap,
  Laptop,
  Smartphone,
  Wallet,
  Landmark,
  CreditCard,
  Coins,
  UtensilsCrossed,
  Coffee,
  ShoppingCart,
  Bus,
  Home,
  Activity,
  HeartPulse,
  Gamepad2,
  Briefcase,
  Award,
  Gift,
  Sparkles,
  TrendingUp,
  PiggyBank,
  Tag,
  Clock,
  LucideIcon,
} from 'lucide-react';
import { resolveCategoryIcon, ICON_MAP } from './CategoryIcon';

export const MODERN_PALETTE = [
  { hex: '#E67E22', label: '溫暖橘' },
  { hex: '#3B82F6', label: '科技藍' },
  { hex: '#10B981', label: '清新綠' },
  { hex: '#EF4444', label: '活力紅' },
  { hex: '#8B5CF6', label: '夢幻紫' },
  { hex: '#EC4899', label: '柔和粉' },
  { hex: '#F59E0B', label: '亮橘黃' },
  { hex: '#6366F1', label: '靛青藍' },
  { hex: '#14B8A6', label: '薄荷碧' },
  { hex: '#64748B', label: '質樸灰' },
];

export const MODERN_ICONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'book', label: '學業', icon: BookOpen },
  { key: 'graduation-cap', label: '學分', icon: GraduationCap },
  { key: 'laptop', label: '數位/3C', icon: Laptop },
  { key: 'smartphone', label: '行動/通訊', icon: Smartphone },
  { key: 'wallet', label: '錢包', icon: Wallet },
  { key: 'landmark', label: '金融/銀行', icon: Landmark },
  { key: 'credit-card', label: '卡片/支付', icon: CreditCard },
  { key: 'coins', label: '零用/費用', icon: Coins },
  { key: 'utensils-crossed', label: '餐飲', icon: UtensilsCrossed },
  { key: 'coffee', label: '飲品/咖啡', icon: Coffee },
  { key: 'shopping-cart', label: '日常購物', icon: ShoppingCart },
  { key: 'bus', label: '通勤交通', icon: Bus },
  { key: 'home', label: '住宿生活', icon: Home },
  { key: 'activity', label: '體能運動', icon: Activity },
  { key: 'heart-pulse', label: '健康醫療', icon: HeartPulse },
  { key: 'gamepad-2', label: '社團娛樂', icon: Gamepad2 },
  { key: 'briefcase', label: '實習工作', icon: Briefcase },
  { key: 'award', label: '競賽獎項', icon: Award },
  { key: 'gift', label: '慶祝送禮', icon: Gift },
  { key: 'sparkles', label: '心願目標', icon: Sparkles },
  { key: 'trending-up', label: '投資成長', icon: TrendingUp },
  { key: 'piggy-bank', label: '儲蓄累積', icon: PiggyBank },
  { key: 'clock', label: '時間管理', icon: Clock },
  { key: 'tag', label: '其他標籤', icon: Tag },
];

export const POPULAR_EMOJIS = MODERN_ICONS.map((i) => i.key);

interface EmojiColorPickerProps {
  selectedEmoji: string;
  onSelectEmoji: (emoji: string) => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  label?: string;
}

export const EmojiColorPicker: React.FC<EmojiColorPickerProps> = ({
  selectedEmoji,
  onSelectEmoji,
  selectedColor,
  onSelectColor,
  label = '圖示徽章與色彩',
}) => {
  // 判斷是否為 Lucide Icon Key
  const MatchedIcon: LucideIcon = ICON_MAP[selectedEmoji] || resolveCategoryIcon(selectedEmoji);
  const isCustomText = !ICON_MAP[selectedEmoji] && selectedEmoji && selectedEmoji.length <= 4 && !/^[a-z\-]+$/.test(selectedEmoji);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 whitespace-nowrap shrink-0">
          {label}
        </label>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">預覽效果:</span>
          <div
            style={{
              backgroundColor: `${selectedColor}22`,
              borderColor: `${selectedColor}50`,
              color: selectedColor,
            }}
            className="w-9 h-9 rounded-2xl border flex items-center justify-center text-sm shadow-2xs shrink-0 transition-all"
          >
            {isCustomText ? (
              <span className="text-base">{selectedEmoji}</span>
            ) : (
              <MatchedIcon className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* SVG Icon Quick Picker Grid (純記帳簡約風格) */}
      <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold px-0.5">
          <span className="whitespace-nowrap shrink-0">記帳風格圖示選擇</span>
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-[10px]">自訂輸入:</span>
            <input
              type="text"
              value={selectedEmoji}
              onChange={(e) => onSelectEmoji(e.target.value.trim() || 'book')}
              maxLength={12}
              placeholder="名稱或符號"
              className="w-20 text-center text-xs py-0.5 px-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-calico-cocoa dark:text-zinc-100 font-bold outline-none focus:border-calico-orange"
            />
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2 max-h-36 overflow-y-auto pr-1">
          {MODERN_ICONS.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedEmoji === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectEmoji(item.key)}
                title={item.label}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0 ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-800 shadow-ios ring-2 scale-105'
                    : 'hover:bg-white/60 dark:hover:bg-zinc-800/60 text-calico-cocoa/60 dark:text-zinc-400'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${selectedColor}18`,
                        color: selectedColor,
                        boxShadow: `0 0 0 2px ${selectedColor}`,
                      }
                    : undefined
                }
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Badges Selector */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-calico-cocoa/50 dark:text-zinc-400 block px-0.5">
          主題色票
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MODERN_PALETTE.map((c) => {
            const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => onSelectColor(c.hex)}
                title={c.label}
                style={{ backgroundColor: c.hex }}
                className={`w-7 h-7 rounded-full shrink-0 transition-transform active:scale-90 flex items-center justify-center ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-calico-orange dark:ring-offset-calico-darkCard scale-110 shadow-xs'
                    : 'opacity-80 hover:opacity-100'
                }`}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-white shadow-2xs" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
