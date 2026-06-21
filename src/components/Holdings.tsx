import { useState, useEffect } from 'react';
import { CloudDownload, ArrowUpRight, ArrowDownRight, Briefcase, Loader2 } from 'lucide-react';

type Stock = { ticker: string; qty: number; avgPrice: number; ltp: number };

export default function Holdings({ onSelectStock }: { onSelectStock?: (stock: Stock) => void }) {
  
  // 🔴 PASTE YOUR COPIED GOOGLE WEB APP URL HERE:
  const API_URL = "https://script.google.com/macros/s/AKfycbyPoa4szJQkOu_O14KMYSgwvKeQZe-JCj_Kdq9mbOyAXJtWfbPpGQ8dr4Tg9Ox7L4U5Aw/exec";

  const [rawHoldings, setRawHoldings] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchHoldings = async (triggerSync = false) => {
    if (triggerSync) setSyncing(true);
    else setLoading(true);

    try {
      const url = triggerSync ? `${API_URL}?action=sync` : API_URL;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.status === 'success') {
        setRawHoldings(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch API:", error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (API_URL && !API_URL.includes("PASTE_YOUR")) {
      fetchHoldings();
    } else {
      setLoading(false); 
    }
  }, []);

  const holdings = rawHoldings.map(stock => {
    const invested = stock.qty * stock.avgPrice;
    const current = stock.qty * stock.ltp;
    const pnl = current - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
    return { ...stock, invested, current, pnl, pnlPercent, isProfit: pnl >= 0 };
  });

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Briefcase size={14} className="text-zinc-400" />
          </div>
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200">My Holdings</h2>
        </div>
        <button 
          onClick={() => fetchHoldings(true)}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors text-xs font-medium text-emerald-400 disabled:opacity-50"
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
          <span>{syncing ? 'Syncing...' : 'Sync Kite'}</span>
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 size={24} className="text-emerald-500 animate-spin" />
          <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Fetching Vault Data...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {holdings.map((stock) => (
            <div 
              key={stock.ticker} 
              onClick={() => onSelectStock && onSelectStock(stock)}
              className="bg-[#121212] border border-zinc-900 rounded-2xl p-4 space-y-4 cursor-pointer hover:border-emerald-500/30 hover:bg-[#161616] transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">{stock.ticker}</h3>
                  {/* THE FIX: Added Average Price display right here! */}
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {stock.qty} Shares • Avg: ₹{stock.avgPrice.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">₹{stock.ltp.toFixed(2)}</p>
                  <div className={`flex items-center justify-end gap-0.5 text-[11px] font-bold ${stock.isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {stock.isProfit ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span>{Math.abs(stock.pnlPercent).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
              <div className="h-[1px] w-full bg-zinc-800/50" />
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Invested</p>
                  <p className="font-medium text-zinc-300">₹{stock.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Returns</p>
                  <p className={`font-semibold ${stock.isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {stock.isProfit ? '+' : '-'}₹{Math.abs(stock.pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}