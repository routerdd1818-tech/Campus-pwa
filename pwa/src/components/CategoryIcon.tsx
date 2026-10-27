import React from 'react';
import {
  UtensilsCrossed,
  Coffee,
  Bus,
  Car,
  BookOpen,
  GraduationCap,
  ShoppingCart,
  ShoppingBag,
  Gamepad2,
  Laptop,
  Smartphone,
  Home,
  HeartPulse,
  Activity,
  Sparkles,
  Gift,
  Shirt,
  Coins,
  Briefcase,
  Award,
  Tag,
  MoreHorizontal,
  Wallet,
  Landmark,
  CreditCard,
  TrendingUp,
  PiggyBank,
  QrCode,
  HandCoins,
  LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  'utensils-crossed': UtensilsCrossed,
  coffee: Coffee,
  bus: Bus,
  car: Car,
  book: BookOpen,
  'graduation-cap': GraduationCap,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  'gamepad-2': Gamepad2,
  laptop: Laptop,
  smartphone: Smartphone,
  home: Home,
  'heart-pulse': HeartPulse,
  activity: Activity,
  sparkles: Sparkles,
  gift: Gift,
  shirt: Shirt,
  coins: Coins,
  briefcase: Briefcase,
  award: Award,
  tag: Tag,
  'more-horizontal': MoreHorizontal,
  wallet: Wallet,
  landmark: Landmark,
  'credit-card': CreditCard,
  'trending-up': TrendingUp,
  'piggy-bank': PiggyBank,
  'qr-code': QrCode,
  'hand-coins': HandCoins,
};

export interface CategoryIconOption {
  key: string;
  id: string;
  label: string;
  icon: LucideIcon;
}

export const AVAILABLE_CATEGORY_ICONS: CategoryIconOption[] = [
  { key: 'utensils-crossed', id: 'utensils-crossed', label: '餐飲', icon: UtensilsCrossed },
  { key: 'coffee', id: 'coffee', label: '飲品', icon: Coffee },
  { key: 'bus', id: 'bus', label: '交通', icon: Bus },
  { key: 'book', id: 'book', label: '學習', icon: BookOpen },
  { key: 'shopping-cart', id: 'shopping-cart', label: '日用', icon: ShoppingCart },
  { key: 'gamepad-2', id: 'gamepad-2', label: '娛樂', icon: Gamepad2 },
  { key: 'laptop', id: 'laptop', label: '3C 數位', icon: Laptop },
  { key: 'home', id: 'home', label: '生活', icon: Home },
  { key: 'activity', id: 'activity', label: '運動', icon: Activity },
  { key: 'heart-pulse', id: 'heart-pulse', label: '醫療', icon: HeartPulse },
  { key: 'shirt', id: 'shirt', label: '服飾', icon: Shirt },
  { key: 'gift', id: 'gift', label: '送禮', icon: Gift },
  { key: 'briefcase', id: 'briefcase', label: '工作/薪資', icon: Briefcase },
  { key: 'coins', id: 'coins', label: '生活費', icon: Coins },
  { key: 'award', id: 'award', label: '獎學金', icon: Award },
  { key: 'tag', id: 'tag', label: '其他', icon: Tag },
];

export const EXTENDED_COLOR_PALETTE = [
  '#EF4444', // 鮮紅
  '#F97316', // 亮橘
  '#F59E0B', // 琥珀
  '#EAB308', // 金黃
  '#84CC16', // 檸檬綠
  '#10B981', // 翡翠綠
  '#14B8A6', // 蒂芬妮綠
  '#06B6D4', // 青綠
  '#0EA5E9', // 天空藍
  '#3B82F6', // 湛藍
  '#6366F1', // 靛藍
  '#8B5CF6', // 紫羅蘭
  '#A855F7', // 薰衣草紫
  '#D946EF', // 洋紅
  '#EC4899', // 玫瑰粉
  '#FB7185', // 珊瑚粉
  '#78350F', // 濃巧棕
  '#64748B', // 石板灰
];

export function resolveCategoryIcon(iconKey?: string, categoryName?: string): LucideIcon {
  if (iconKey && ICON_MAP[iconKey]) {
    return ICON_MAP[iconKey];
  }

  // Automatic semantic matching based on category title
  const name = (categoryName || '').toLowerCase();
  if (/餐|吃|飯|麵|食|早|午|晚|便當|火鍋|點心/.test(name)) return UtensilsCrossed;
  if (/喝|手搖|咖啡|飲料|茶/.test(name)) return Coffee;
  if (/車|公車|捷運|高鐵|火車|交通|通勤|uber|計程車|油/.test(name)) return Bus;
  if (/課|學|書|文具|筆記|補習|考/.test(name)) return BookOpen;
  if (/買|超商|超市|全聯|7-11|全家|購|日用|生活/.test(name)) return ShoppingCart;
  if (/玩|遊戲|電玩|steam|電影|唱歌|ktv|娛樂|休閒/.test(name)) return Gamepad2;
  if (/電腦|手機|3c|筆電|耳機|軟體|訂閱|網購/.test(name)) return Laptop;
  if (/房|租|水電|瓦斯|網速|住|家/.test(name)) return Home;
  if (/跑|健身|運動|羽球|籃球|瑜珈/.test(name)) return Activity;
  if (/醫|藥|看診|牙科|健保|保健/.test(name)) return HeartPulse;
  if (/衣服|褲|鞋|穿搭|美妝|保養|髮/.test(name)) return Shirt;
  if (/禮|紅包|生日|送|慶祝/.test(name)) return Gift;
  if (/薪|打工|兼職|家教|工作|實習/.test(name)) return Briefcase;
  if (/生活費|零用錢|津貼/.test(name)) return Coins;
  if (/獎|獎學金|比賽/.test(name)) return Award;
  if (/現|錢包|皮夾|零錢|cash/.test(name)) return Wallet;
  if (/銀行|存款|活存|定存|郵局|richart|玉山|國泰|中信|bank/.test(name)) return Landmark;
  if (/line|pay|街口|支付|悠遊|一卡通|電子|行動|wallet/.test(name)) return Smartphone;
  if (/卡|信用卡|簽帳|card/.test(name)) return CreditCard;
  if (/股|證券|基金|投資|etf|stock/.test(name)) return TrendingUp;
  if (/借|欠|債|應收/.test(name)) return HandCoins;

  return Tag;
}

export interface CategoryIconProps {
  icon?: string;
  iconKey?: string;
  categoryName?: string;
  name?: string;
  className?: string;
  colorHex?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  iconKey,
  categoryName,
  name,
  className,
  colorHex,
  size,
}) => {
  const effectiveKey = iconKey || icon;
  const effectiveName = categoryName || name;
  const IconComponent = resolveCategoryIcon(effectiveKey, effectiveName);

  const sizeClass = size ? SIZE_MAP[size] : '';
  const finalClass = className || sizeClass || 'w-4 h-4';

  if (colorHex) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-lg shrink-0 p-1"
        style={{ backgroundColor: `${colorHex}22`, color: colorHex }}
      >
        <IconComponent className={finalClass} />
      </span>
    );
  }

  return <IconComponent className={finalClass} />;
};

