import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, ShieldCheck, Loader2, XCircle } from 'lucide-react';

export default function Dashboard() {
// Inside Dashboard.tsx
  const API_URL = localStorage.getItem('google_sheet_url') || "";
  const PROXY_URL = "http://localhost:3001"; 

  const [holdings, setHoldings] = useState<any[]>([]);
  const [activeGTTs, setActiveGTTs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Holdings from Google Sheet
      if (!API_URL.includes("PASTE_YOUR")) {
        try {
          const res = await fetch(API_URL);
          const json = await res.json();
          if (json.status === 'success') setHoldings(json.data);
        } catch (e) { console.error("Holdings fetch failed", e); }
      }
      
      // 2. Fetch Active GTT Orders via Proxy
      try {
        const gttRes = await fetch(`${PROXY_URL}/api/gtt`);
        const gttJson = await gttRes.json();
        if (gttJson.status === 'success') {
          setActiveGTTs(gttJson.data.filter((g: any) => g.status === 'active'));
        }
      } catch (e) { console.error("Proxy GTT fetch failed - is the server running?", e); }
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleCancelGTT = async (id: number) => {
    try {
      const res = await fetch(`${PROXY_URL}/api/gtt/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.status === 'success') {
        setActiveGTTs(prev => prev.filter(g => g.id !== id));
      }
    } catch(e) { console.error("Cancel failed", e); }
  };

  const totalCurrent = holdings.reduce((sum, s) => sum + (s.qty * s.ltp), 0);
  const totalInvested = holdings.reduce((sum, s) => sum + (s.qty * s.avgPrice), 0);
  const totalPnl = totalCurrent - totalInvested;
  const pnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const isProfit = totalPnl >= 0;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Activity size={14} className="text-zinc-400" />
          </div>
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200">Dashboard</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-[#121212] border border-zinc-900 rounded-3xl">
          <Loader2 size={24} className="text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Portfolio Card */}
          <div className="bg-[#121212] border border-zinc-900 rounded-3xl p-6 shadow-xl">
             <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Portfolio Total</p>
             <h1 className="text-3xl font-black text-white mb-4">₹{totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h1>
             <div className={`text-sm font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                {isProfit ? '+' : '-'}₹{Math.abs(totalPnl).toLocaleString('en-IN')} ({Math.abs(pnlPercent).toFixed(2)}%)
             </div>
          </div>

          {/* Active GTTs Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active GTT Orders</h3>
            {activeGTTs.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-zinc-800 rounded-2xl text-zinc-600 text-xs">
                    No active GTT orders found.
                </div>
            ) : (
                activeGTTs.map(o => (
                    <div key={o.id} className="bg-[#121212] border border-zinc-900 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-white">{o.condition.tradingsymbol}</p>
                            <p className="text-[10px] text-zinc-500">Trigger: {o.condition.trigger_values.join(' / ')}</p>
                        </div>
                        <button 
                            onClick={() => handleCancelGTT(o.id)}
                            className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-full transition-colors"
                        >
                            <XCircle size={18} />
                        </button>
                    </div>
                ))
            )}
          </div>
        </>
      )}
    </div>
  );
}