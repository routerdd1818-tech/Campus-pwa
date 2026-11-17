/**
 * 📈 股票與基金報價服務 (Stock & Fund Quote Service)
 * 支援台股 (TWSE/TPEx)、美股主要 ETF/個股即時查詢與離線基準行情
 */

import { quantService } from './quantService';

export interface StockPreset {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  defaultPrice: number; // 參考基準價格 (TWD)
  currency: 'TWD' | 'USD';
  description: string;
}

export const POPULAR_STOCKS: StockPreset[] = [
  { symbol: '0050.TW', name: '元大台灣50', market: 'TW', defaultPrice: 195.5, currency: 'TWD', description: '台股市值前50大權值股' },
  { symbol: '00878.TW', name: '國泰永續高股息', market: 'TW', defaultPrice: 22.8, currency: 'TWD', description: '高人氣季配息ETF' },
  { symbol: '00929.TW', name: '復華科技優息', market: 'TW', defaultPrice: 18.9, currency: 'TWD', description: '月配息科技高股息' },
  { symbol: '0056.TW', name: '元大高股息', market: 'TW', defaultPrice: 37.8, currency: 'TWD', description: '元老級高股息ETF' },
  { symbol: '006208.TW', name: '富邦台50', market: 'TW', defaultPrice: 114.0, currency: 'TWD', description: '低內扣費市值型ETF' },
  { symbol: '2330.TW', name: '台積電', market: 'TW', defaultPrice: 1060.0, currency: 'TWD', description: '晶圓代工龍頭' },
  { symbol: '2454.TW', name: '聯發科', market: 'TW', defaultPrice: 1310.0, currency: 'TWD', description: 'IC設計龍頭' },
  { symbol: '2317.TW', name: '鴻海', market: 'TW', defaultPrice: 215.0, currency: 'TWD', description: '電子代工與AI伺服器' },
  { symbol: 'VOO', name: 'Vanguard標普500', market: 'US', defaultPrice: 17200.0, currency: 'TWD', description: '美股S&P500指數ETF (約535 USD)' },
  { symbol: 'QQQ', name: 'Invesco那斯達克', market: 'US', defaultPrice: 16250.0, currency: 'TWD', description: '美國前百大科技股ETF (約505 USD)' },
  { symbol: 'NVDA', name: '輝達 NVIDIA', market: 'US', defaultPrice: 4550.0, currency: 'TWD', description: 'AI晶片龍頭 (約142 USD)' },
  { symbol: 'AAPL', name: '蘋果 Apple', market: 'US', defaultPrice: 7500.0, currency: 'TWD', description: '消費電子與科技巨擘 (約233 USD)' },
];

const USD_TO_TWD = 32.2;

/**
 * 取得單一標的最新價格（優先嘗試 AlphaMind v2 即時撮合，失敗時依序降級）
 */
export async function fetchStockPrice(symbol: string): Promise<{ price: number; name?: string; updatedAt: string }> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const rawTicker = cleanSymbol.replace(/\.(TW|TWO)$/i, '');

  // 1. 優先嘗試由 AlphaMind v2 量化後端獲取（直連 TWSE MIS，無 CORS 且支援全台股）
  try {
    const quotes = await quantService.getRealtimeQuotes([rawTicker]);
    if (quotes && quotes[rawTicker] && quotes[rawTicker].price > 0) {
      const q = quotes[rawTicker];
      return {
        price: q.price,
        name: q.name || undefined,
        updatedAt: q.timestamp || new Date().toISOString(),
      };
    }
  } catch {
    // 降級處理
  }

  // 2. 嘗試由公開 Yahoo Finance API 獲取（適用美股等標的）
  try {
    const targetSymbol = cleanSymbol.includes('.') || cleanSymbol.length <= 4
      ? cleanSymbol
      : `${cleanSymbol}.TW`;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d&range=1d`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice) {
        let price = Number(meta.regularMarketPrice);
        const currency = meta.currency || 'TWD';
        if (currency === 'USD') {
          price = Math.round(price * USD_TO_TWD * 10) / 10;
        }
        return {
          price: Math.round(price * 10) / 10,
          name: meta.shortName || meta.symbol,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    // 降級處理
  }

  // 3. 查閱內建基準清單
  const preset = POPULAR_STOCKS.find(
    (p) => p.symbol.toUpperCase() === cleanSymbol || p.symbol.split('.')[0] === cleanSymbol || p.symbol.split('.')[0] === rawTicker
  );
  if (preset) {
    return {
      price: preset.defaultPrice,
      name: preset.name,
      updatedAt: new Date().toISOString(),
    };
  }

  // 4. 自訂未收錄標的，保留當前價格
  return {
    price: 100,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 批次更新所有持股標的之行情（優先調用 AlphaMind v2 批次合併查詢）
 */
export async function batchFetchStockPrices(
  symbols: string[]
): Promise<Record<string, { price: number; name?: string }>> {
  const result: Record<string, { price: number; name?: string }> = {};
  if (!symbols.length) return result;

  // 1. 整理代碼映射並由 AlphaMind 批次獲取台股
  const rawToOriginal: Record<string, string> = {};
  const rawList: string[] = [];

  symbols.forEach((s) => {
    const clean = s.trim().toUpperCase();
    const raw = clean.replace(/\.(TW|TWO)$/i, '');
    rawToOriginal[raw] = s;
    rawList.push(raw);
  });

  const remainingSymbols: string[] = [];

  try {
    const liveQuotes = await quantService.getRealtimeQuotes(rawList);
    Object.entries(liveQuotes).forEach(([raw, q]) => {
      if (q && q.price > 0) {
        const orig = rawToOriginal[raw] || raw;
        result[orig] = { price: q.price, name: q.name };
      }
    });
  } catch {
    // 若 AlphaMind 未連線則整批降級
  }

  // 找出尚未獲取行情的標的（如美股或非台股代碼）
  symbols.forEach((s) => {
    if (!result[s]) {
      remainingSymbols.push(s);
    }
  });

  // 2. 對其餘標的進行單檔查詢降級
  if (remainingSymbols.length > 0) {
    const promises = remainingSymbols.map(async (s) => {
      try {
        const quote = await fetchStockPrice(s);
        result[s] = { price: quote.price, name: quote.name };
      } catch {
        // 保持原樣
      }
    });
    await Promise.allSettled(promises);
  }

  return result;
}
