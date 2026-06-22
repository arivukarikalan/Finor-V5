import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2, Trash2, Zap } from 'lucide-react';
import { getColorForTicker, formatINR } from '../utils';

type GTTOrder = {
  id: number;
  type: string;
  status: string;
  condition: {
    tradingsymbol: string;
    exchange: string;
    trigger_values: number[];
  };
  orders: Array<{
    transaction_type: string;
    quantity: number;
    price: number;
  }>;
};

export default function Dashboard({
  holdings,
  loading,
  activeGTTs,
  loadingGTTs,
  handleCancelGTT
}: {
  holdings: any[];
  loading: boolean;
  activeGTTs: GTTOrder[];
  loadingGTTs: boolean;
  handleCancelGTT: (id: number) => Promise<boolean>;
}) {
  const [timeRange, setTimeRange] = useState('1M');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Core Calculations
  const totalCurrent = useMemo(() => {
    return holdings.reduce((sum, s) => sum + (s.qty * s.ltp), 0);
  }, [holdings]);

  const totalInvested = useMemo(() => {
    return holdings.reduce((sum, s) => sum + (s.qty * (s.avgPrice || s.buyPrice || 0)), 0);
  }, [holdings]);

  const totalPnl = totalCurrent - totalInvested;
  const pnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const isProfit = totalPnl >= 0;

  // Generate dynamic chart data based on live totalCurrent
  const chartData = useMemo(() => {
    const count = timeRange === '1D' ? 12 : timeRange === '1W' ? 7 : timeRange === '1M' ? 15 : timeRange === '3M' ? 15 : 20;
    const baseValue = totalCurrent || 408380;
    
    const data = [];
    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      // Generate a deterministic wave pattern with an upward trend ending at exactly baseValue
      const wave = Math.sin(progress * Math.PI * 2.5) * (baseValue * 0.02);
      const trend = progress * (baseValue * 0.04);
      let pointVal = baseValue * 0.94 + wave + trend;
      
      if (i === count - 1) {
        pointVal = baseValue;
      }
      
      data.push({
        value: Math.round(pointVal),
        label: getChartLabel(i, count, timeRange)
      });
    }
    return data;
  }, [totalCurrent, timeRange]);

  // Chart Scales & Grid
  const { minVal, rangeVal, dPath, dArea } = useMemo(() => {
    const values = chartData.map(d => d.value);
    const max = Math.max(...values) || 1;
    const min = Math.min(...values) || 0;
    const range = max - min || 1;

    const points = chartData.map((d, idx) => {
      const x = (idx / (chartData.length - 1)) * 300;
      const y = 80 - ((d.value - min) / range) * 60;
      return { x, y };
    });

    const path = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = points.length > 0 ? `${path} L ${points[points.length - 1].x} 90 L ${points[0].x} 90 Z` : '';

    return { minVal: min, rangeVal: range, dPath: path, dArea: area };
  }, [chartData]);

  // Interactive Hover Calculations
  const activeVal = hoveredIdx !== null ? chartData[hoveredIdx].value : totalCurrent;
  const initialChartVal = chartData[0]?.value || 0;
  const hoverDiff = activeVal - initialChartVal;
  const hoverDiffPercent = initialChartVal > 0 ? (hoverDiff / initialChartVal) * 100 : 0;
  const isHoverProfit = hoverDiff >= 0;

  // Chart Hover Event Handlers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.round(progress * (chartData.length - 1));
    setHoveredIdx(idx);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    await handleCancelGTT(id);
    setCancellingId(null);
  };

  return (
    <div className="space-y-5 animate-fade-in px-4 py-2 bg-[#F8F9FA] min-h-screen text-slate-900 pb-12">
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
          <Loader2 size={32} className="text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Analytics...</p>
        </div>
      ) : (
        <>
          {/* Main Portfolio Value Card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col space-y-4 relative overflow-hidden transition-all duration-300">
             <div className="text-center space-y-1">
               <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                 {hoveredIdx !== null ? `${chartData[hoveredIdx].label} Portfolio Value` : 'Portfolio Value'}
               </p>
               <h1 className="text-4xl font-black text-slate-900 tracking-tight transition-all duration-200">
                 {formatINR(activeVal, { maximumFractionDigits: 0 })}
               </h1>
               
               <div className="flex items-center justify-center gap-1.5 mt-1">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200 ${
                    hoveredIdx !== null 
                      ? (isHoverProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')
                      : (isProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')
                  }`}>
                    {hoveredIdx !== null 
                      ? (isHoverProfit ? <TrendingUp size={12} strokeWidth={2.5} /> : <TrendingDown size={12} strokeWidth={2.5} />)
                      : (isProfit ? <TrendingUp size={12} strokeWidth={2.5} /> : <TrendingDown size={12} strokeWidth={2.5} />)
                    }
                    <span>
                      {hoveredIdx !== null 
                        ? `${isHoverProfit ? '+' : ''}${formatINR(hoverDiff, { maximumFractionDigits: 0 })}` 
                        : `${isProfit ? '+' : ''}${formatINR(totalPnl, { maximumFractionDigits: 0 })}`
                      }
                    </span>
                    <span>
                      ({hoveredIdx !== null 
                        ? `${hoverDiffPercent.toFixed(2)}%`
                        : `${pnlPercent.toFixed(2)}%`
                      })
                    </span>
                  </div>
               </div>
             </div>

             {/* Chart Area with Interactive Pointer */}
             <div className="w-full pt-4">
               <div className="w-full h-32 relative">
                 <svg 
                   className="w-full h-full overflow-visible cursor-crosshair select-none" 
                   viewBox="0 0 300 100" 
                   preserveAspectRatio="none"
                   onMouseMove={handleMouseMove}
                   onMouseLeave={handleMouseLeave}
                   onTouchMove={(e) => {
                     if (e.touches[0]) {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const x = e.touches[0].clientX - rect.left;
                       const progress = Math.max(0, Math.min(1, x / rect.width));
                       const idx = Math.round(progress * (chartData.length - 1));
                       setHoveredIdx(idx);
                     }
                   }}
                   onTouchEnd={handleMouseLeave}
                 >
                   <defs>
                     <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                       <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                     </linearGradient>
                   </defs>
                   
                   {/* Y-Axis Grid Lines */}
                   <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                   <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                   <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeWidth="1" />

                   {/* Line and Gradient Path */}
                   {dArea && <path d={dArea} fill="url(#chartGradient)" />}
                   {dPath && <path d={dPath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />}

                   {/* Active Hover Dotted Line & Circle */}
                   {hoveredIdx !== null && (
                     <>
                       <line 
                         x1={(hoveredIdx / (chartData.length - 1)) * 300} 
                         y1={10} 
                         x2={(hoveredIdx / (chartData.length - 1)) * 300} 
                         y2={90} 
                         stroke="#c7d2fe" 
                         strokeWidth="1.5" 
                         strokeDasharray="3 3" 
                       />
                       <circle 
                         cx={(hoveredIdx / (chartData.length - 1)) * 300} 
                         cy={80 - ((chartData[hoveredIdx].value - minVal) / rangeVal) * 60} 
                         r="5" 
                         fill="#ffffff" 
                         stroke="#4f46e5" 
                         strokeWidth="2.5" 
                       />
                     </>
                   )}

                   {/* Default Tracker Circle */}
                   {hoveredIdx === null && chartData.length > 0 && (
                     <circle 
                       cx={300} 
                       cy={80 - ((chartData[chartData.length - 1].value - minVal) / rangeVal) * 60} 
                       r="4" 
                       fill="#4f46e5" 
                       stroke="#ffffff" 
                       strokeWidth="2" 
                     />
                   )}
                 </svg>
                 
                 {/* Dynamic Hover Tooltip */}
                 {hoveredIdx !== null && (
                   <div 
                     className="absolute top-0 bg-slate-900 text-white font-extrabold text-[9px] px-2 py-0.5 rounded shadow-md pointer-events-none transition-all duration-75 uppercase tracking-wider"
                     style={{ 
                       left: `${Math.min(88, Math.max(12, (hoveredIdx / (chartData.length - 1)) * 100))}%`,
                       transform: 'translate(-50%, -100%)' 
                     }}
                   >
                     {chartData[hoveredIdx].label}
                   </div>
                 )}
               </div>

               {/* Time Toggle */}
               <div className="flex items-center justify-between mt-5 bg-slate-50 p-1 rounded-xl border border-slate-100">
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
            <div className="w-full h-3.5 rounded-full flex overflow-hidden bg-slate-100 shadow-inner">
              {holdings.map((stock: any) => {
                const percentage = totalCurrent > 0 ? ((stock.qty * stock.ltp) / totalCurrent) * 100 : 0;
                if (percentage <= 0) return null;
                return (
                  <div 
                    key={stock.ticker} 
                    className={`${getColorForTicker(stock.ticker)} h-full border-r border-white last:border-0 transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                );
              })}
            </div>

            {/* Dynamic Legend Pills */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {holdings.map((stock: any) => {
                const percentage = totalCurrent > 0 ? ((stock.qty * stock.ltp) / totalCurrent * 100) : 0;
                return (
                  <div key={stock.ticker} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getColorForTicker(stock.ticker)}`} />
                      <span className="text-xs font-bold text-slate-700">{stock.ticker}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Automations Section */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between h-6">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Active Automations</h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {loadingGTTs ? <Loader2 size={10} className="animate-spin" /> : `${activeGTTs.length} Active`}
              </span>
            </div>

            {loadingGTTs ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 size={20} className="text-indigo-500 animate-spin" />
              </div>
            ) : activeGTTs.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Zap size={24} className="opacity-20 text-slate-500" />
                <p className="text-xs font-semibold">No active protection guards set.</p>
                <p className="text-[9px] text-slate-400">Deploy Target & Stop-Loss GTTs in the Exit Plan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGTTs.map((g) => {
                  const ticker = g.condition.tradingsymbol;
                  const isOco = g.type === 'two-leg';
                  const limitBuy = g.type === 'single' && g.orders[0]?.transaction_type === 'BUY';
                  const qty = g.orders[0]?.quantity || 0;

                  return (
                    <div key={g.id} className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center font-black text-[10px] shadow-sm ${getColorForTicker(ticker)}`}>
                          {ticker.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-slate-900 leading-none">{ticker}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded leading-none border uppercase ${
                              isOco ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              limitBuy ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {isOco ? 'OCO' : limitBuy ? 'BUY' : 'GTT'}
                            </span>
                          </div>
                          <p className="text-[9px] font-semibold text-slate-400 mt-1">
                            {qty} Shares · {isOco ? `SL: ₹${g.condition.trigger_values[0]} | Target: ₹${g.condition.trigger_values[1]}` : `Trig: ₹${g.condition.trigger_values[0]}`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancel(g.id)}
                        disabled={cancellingId === g.id}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50/50 transition-all active:scale-95 disabled:opacity-50"
                        title="Cancel Order"
                      >
                        {cancellingId === g.id ? <Loader2 size={14} className="animate-spin text-rose-500" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Assets Section */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between h-6">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">My Assets</h3>
            </div>

            <div className="space-y-3">
              {holdings.map((stock: any) => {
                const stockTotal = stock.qty * stock.ltp;
                const stockPnl = stock.pnl || (stock.avgPrice ? ((stock.ltp - stock.avgPrice) / stock.avgPrice * 100) : 0);
                const stockIsProfit = stockPnl >= 0;
                
                // Real-time ticking animations logic:
                // Check if price ticked relative to prevLtp
                const tickedUp = stock.ltp > stock.prevLtp;
                const tickedDown = stock.ltp < stock.prevLtp;
                const priceFlashClass = tickedUp ? 'bg-emerald-500/20 text-emerald-700 animate-pulse rounded px-1' :
                                       tickedDown ? 'bg-rose-500/20 text-rose-700 animate-pulse rounded px-1' : '';
                
                return (
                  <div key={stock.ticker} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 text-white rounded-full flex items-center justify-center font-black text-xs tracking-wider shadow-sm ${getColorForTicker(stock.ticker)}`}>
                        {stock.ticker.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{stock.ticker}</h4>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{stock.qty} Shares · Avg {formatINR(stock.avgPrice || 0)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-sm text-slate-900">{formatINR(stockTotal, { maximumFractionDigits: 0 })}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className={`text-[10px] font-semibold transition-all duration-300 ${priceFlashClass}`}>
                          {formatINR(stock.ltp)}
                        </span>
                        <div className={`text-[11px] font-bold flex items-center gap-0.5 ${stockIsProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {stockIsProfit ? <ArrowUpRight size={12} strokeWidth={2.5} /> : <ArrowDownRight size={12} strokeWidth={2.5} />}
                          <span>{stockIsProfit ? '+' : ''}{stockPnl.toFixed(1)}%</span>
                        </div>
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

// Chart Helpers
function getChartLabel(idx: number, total: number, range: string): string {
  if (range === '1D') {
    const hours = ['9:30 AM', '10:30 AM', '11:30 AM', '12:30 PM', '1:30 PM', '2:30 PM', '3:30 PM'];
    return hours[Math.floor((idx / total) * hours.length)] || '9:30 AM';
  }
  if (range === '1W') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days[Math.floor((idx / total) * days.length)] || 'Mon';
  }
  if (range === '1M') {
    return `Day ${Math.floor((idx / total) * 30) + 1}`;
  }
  if (range === '3M') {
    return `Week ${Math.floor((idx / total) * 12) + 1}`;
  }
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const curMonth = new Date().getMonth();
  const monthIdx = (curMonth - Math.floor((1 - (idx / total)) * 12) + 12) % 12;
  return months[monthIdx];
}