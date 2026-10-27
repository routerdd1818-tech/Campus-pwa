import React from 'react';

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

export const POPULAR_EMOJIS = [
  '🏠', '🍿', '📱', '💻', '🛵', '💳', '🎓', '📝', '📚', '☕',
  '🍔', '🛒', '⚡', '🚌', '✈️', '🎮', '🐱', '🎵', '🎂', '💰',
  '🏋️', '🏥', '🏖️', '💡'
];

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
  label = '圖示與色彩',
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-calico-cocoa/70 dark:text-zinc-400 whitespace-nowrap shrink-0">
          {label}
        </label>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] text-calico-cocoa/50 dark:text-zinc-400">當前效果:</span>
          <div
            style={{
              backgroundColor: `${selectedColor}25`,
              borderColor: `${selectedColor}60`,
            }}
            className="w-8 h-8 rounded-xl border flex items-center justify-center text-lg shadow-2xs shrink-0 transition-all"
          >
            {selectedEmoji || '✨'}
          </div>
        </div>
      </div>

      {/* Emoji Quick Picker Grid */}
      <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-calico-cocoa/50 dark:text-zinc-400 font-semibold px-0.5">
          <span className="whitespace-nowrap shrink-0">快捷 Emoji 選擇</span>
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-[10px]">自訂輸入:</span>
            <input
              type="text"
              value={selectedEmoji}
              onChange={(e) => onSelectEmoji(e.target.value.trim() || '✨')}
              maxLength={4}
              placeholder="貼上"
              className="w-12 text-center text-xs py-0.5 px-1 rounded-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-calico-cocoa dark:text-zinc-100 font-bold outline-none focus:border-calico-orange"
            />
          </div>
        </div>

        <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
          {POPULAR_EMOJIS.map((emoji) => {
            const isSelected = selectedEmoji === emoji;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onSelectEmoji(emoji)}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-base sm:text-lg transition-all active:scale-90 shrink-0 ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-800 shadow-ios ring-2 ring-calico-orange scale-105'
                    : 'hover:bg-white/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                {emoji}
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
