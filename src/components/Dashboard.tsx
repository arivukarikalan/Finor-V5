import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2, XCircle } from 'lucide-react';

export default function Dashboard() {
  const API_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || localStorage.getItem('google_sheet_url') || "";
  const PROXY_URL = localStorage.getItem('proxy_url') || "https://finor-v5.onrender.com"; 

  const [holdings, setHoldings] = useState<any[]>([]);
  const [activeGTTs, setActiveGTTs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1M');

  useEffect(() => {
    const fetchData = async () => {
      if (!API_URL.includes("PASTE_YOUR")) {
        try {
          const res = await fetch(API_URL);
          const json = await res.json();
          if (json.status === 'success') setHoldings(json.data);
        } catch (e) { console.error("Holdings fetch failed", e); }
      }
      
      try {
        const gttRes = await fetch(`${PROXY_URL}/api/gtt`);
        const gttJson = await gttRes.json();
        if (gttJson.status === 'success') {
          setActiveGTTs(gttJson.data.filter((g: any) => g.status === 'active'));
        }
      } catch (e) { console.error("Proxy GTT fetch failed", e); }
      
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

  // Strict Categorical Colors (No Reds or Greens to avoid semantic confusion)
  const catColors = ['bg-indigo-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-fuchsia-500'];

  // Dummy fallback data matching the exact weights
  const displayHoldings = holdings.length > 0 ? holdings : [
    { ticker: 'ANANTRAJ', qty: 50, avgPrice: 527, ltp: 520, pnl: -1.3, weight: 40 },
    { ticker: 'BRITANNIA', qty: 10, avgPrice: 5264, ltp: 5195, pnl: -1.32, weight: 25 },
    { ticker: 'DABUR', qty: 150, avgPrice: 432, ltp: 423, pnl: -1.99, weight: 20 },
    { ticker: 'EIHOTEL', qty: 100, avgPrice: 302, ltp: 322, pnl: 6.65, weight: 15 }
  ];

  return (
    <div className="space-y-5 animate-fade-in px-4 py-2 bg-[#F8F9FA] min-h-screen text-slate-900">
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
          <Loader2 size={32} className="text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Analytics...</p>
        </div>
      ) : (
        <>
          {/* Main Portfolio Value Card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col space-y-4">
             <div className="text-center space-y-1">
               <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Portfolio Value</p>
               <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                 ₹{totalCurrent > 0 ? totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : "4,08,380"}
               </h1>
               
               <div className="flex items-center justify-center gap-1.5 mt-1">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${isProfit || totalCurrent === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isProfit || totalCurrent === 0 ? <TrendingUp size={12} strokeWidth={2.5} /> : <TrendingDown size={12} strokeWidth={2.5} />}
                    <span>{totalCurrent === 0 ? "+₹19,698" : `${isProfit ? '+' : '-'}₹${Math.abs(totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</span>
                    <span>({totalCurrent === 0 ? "4.82%" : `${Math.abs(pnlPercent).toFixed(2)}%`})</span>
                  </div>
               </div>
             </div>

             {/* Chart Area with Axes */}
             <div className="w-full pt-4">
               <div className="w-full h-32 relative">
                 <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                   <defs>
                     <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                       <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                     </linearGradient>
                   </defs>
                   
                   {/* Y-Axis Grid Lines */}
                   <line x1="0" y1="20" x2="300" y2="20" stroke="#f8fafc" strokeWidth="1" />
                   <line x1="0" y1="50" x2="300" y2="50" stroke="#f8fafc" strokeWidth="1" />
                   <line x1="0" y1="80" x2="300" y2="80" stroke="#f8fafc" strokeWidth="1" />

                   {/* Main Paths */}
                   <path d="M 0 80 Q 40 85 80 50 T 160 65 T 240 30 T 300 15 L 300 80 L 0 80 Z" fill="url(#chartGradient)" />
                   <path d="M 0 80 Q 40 85 80 50 T 160 65 T 240 30 T 300 15" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />

                   {/* Active Data Point & Drop Line */}
                   <line x1="240" y1="30" x2="240" y2="80" stroke="#4f46e5" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                   <circle cx="240" cy="30" r="4" fill="#white" stroke="#4f46e5" strokeWidth="2" />
                   <circle cx="240" cy="30" r="10" fill="#4f46e5" opacity="0.1" className="animate-ping" />

                   {/* X-Axis Labels */}
                   <text x="10" y="95" fill="#cbd5e1" fontSize="9" fontWeight="700">APR</text>
                   <text x="150" y="95" fill="#cbd5e1" fontSize="9" fontWeight="700" textAnchor="middle">MAY</text>
                   <text x="290" y="95" fill="#cbd5e1" fontSize="9" fontWeight="700" textAnchor="end">JUN</text>
                 </svg>
                 
                 {/* Floating Value Tooltip */}
                 <div className="absolute top-1 left-[72%] transform -translate-x-1/2 bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1 rounded-md shadow-md">
                   ₹4.08L
                 </div>
               </div>

               {/* Time Toggle */}
               <div className="flex items-center justify-between mt-4 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  {['1D', '1W', '1M', '3M', '1Y'].map(t => (
                    <button 
                      key={t} 
                      onClick={() => setTimeRange(t)}
                      className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all ${timeRange === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t}
                    </button>
                  ))}
               </div>
             </div>
          </div>

          {/* Portfolio Distribution Chart */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between h-6">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Allocation</h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Live Weight</span>
            </div>
            
            {/* True Proportional Bar chart */}
            <div className="w-full h-3.5 rounded-full flex overflow-hidden bg-slate-100">
              {displayHoldings.map((stock: any, idx) => {
                const percentage = totalCurrent > 0 ? ((stock.qty * stock.ltp) / totalCurrent) * 100 : stock.weight;
                return (
                  <div 
                    key={stock.ticker} 
                    className={`${catColors[idx % catColors.length]} h-full border-r-2 border-white last:border-0`}
                    style={{ width: `${percentage}%` }}
                  />
                );
              })}
            </div>

            {/* Dynamic Legend Pills */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {displayHoldings.map((stock: any, idx) => (
                <div key={stock.ticker} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${catColors[idx % catColors.length]}`} />
                    <span className="text-xs font-bold text-slate-700">{stock.ticker}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {totalCurrent > 0 ? `${((stock.qty * stock.ltp) / totalCurrent * 100).toFixed(0)}%` : `${stock.weight}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* My Assets Section */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between h-6">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">My Assets</h3>
              <button className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700">View All</button>
            </div>

            <div className="space-y-3">
              {displayHoldings.map((stock: any) => {
                const stockTotal = stock.qty * stock.ltp;
                const stockPnl = stock.pnl || ((stock.ltp - stock.avgPrice) / stock.avgPrice * 100);
                const stockIsProfit = stockPnl >= 0;
                
                return (
                  <div key={stock.ticker} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-black text-xs tracking-wider">
                        {stock.ticker.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{stock.ticker}</h4>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{stock.qty} Shares · Avg ₹{stock.avgPrice.toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-sm text-slate-900">₹{stockTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      <div className={`text-[11px] font-bold flex items-center justify-end gap-0.5 mt-0.5 ${stockIsProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {stockIsProfit ? <ArrowUpRight size={12} strokeWidth={2.5} /> : <ArrowDownRight size={12} strokeWidth={2.5} />}
                        <span>{stockIsProfit ? '+' : ''}{stockPnl.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}