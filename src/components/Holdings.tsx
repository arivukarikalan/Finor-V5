import { useState, useMemo } from 'react';
import { CloudDownload, ArrowUpRight, ArrowDownRight, Briefcase, Loader2, Search, ChevronRight } from 'lucide-react';
import { getColorForTicker, formatINR } from '../utils';

export default function Holdings({
  holdings,
  loading,
  syncing,
  onSyncKite,
  onSelectStock
}: {
  holdings: any[];
  loading: boolean;
  syncing: boolean;
  onSyncKite: () => void;
  onSelectStock?: (stock: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Gainers' | 'Losers'>('All');
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'name'>('value');

  // Map core calculations
  const calculatedHoldings = useMemo(() => {
    return holdings.map(stock => {
      const avg = stock.avgPrice || stock.buyPrice || 0;
      const invested = stock.qty * avg;
      const current = stock.qty * stock.ltp;
      const pnl = current - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      return { ...stock, invested, current, pnl, pnlPercent, isProfit: pnl >= 0 };
    });
  }, [holdings]);

  // Aggregate Portfolio Totals
  const { totalInvested, totalCurrent, totalPnl, isTotalProfit } = useMemo(() => {
    const invested = calculatedHoldings.reduce((sum, s) => sum + s.invested, 0);
    const current = calculatedHoldings.reduce((sum, s) => sum + s.current, 0);
    const pnl = current - invested;
    const isProfit = pnl >= 0;
    return { totalInvested: invested, totalCurrent: current, totalPnl: pnl, isTotalProfit: isProfit };
  }, [calculatedHoldings]);

  // Dynamic Filter Counts
  const allCount = calculatedHoldings.length;
  const gainersCount = calculatedHoldings.filter(s => s.isProfit).length;
  const losersCount = calculatedHoldings.filter(s => !s.isProfit).length;

  // Apply Filters & Search
  const processedHoldings = useMemo(() => {
    let list = calculatedHoldings.filter(stock => 
      stock.ticker.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (activeFilter === 'Gainers') list = list.filter(s => s.isProfit);
    if (activeFilter === 'Losers') list = list.filter(s => !s.isProfit);

    // Apply Sorting
    list.sort((a, b) => {
      if (sortBy === 'value') return b.current - a.current;
      if (sortBy === 'pnl') return b.pnlPercent - a.pnlPercent;
      if (sortBy === 'name') return a.ticker.localeCompare(b.ticker);
      return 0;
    });

    return list;
  }, [calculatedHoldings, searchQuery, activeFilter, sortBy]);

  return (
    <div className="space-y-5 animate-fade-in px-3 py-2 text-slate-900 pb-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <Briefcase size={14} className="text-indigo-600" />
          </div>
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">My Holdings</h2>
        </div>
        <button 
          onClick={onSyncKite}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 transition-colors text-[11px] font-bold text-indigo-600 disabled:opacity-50 shadow-sm cursor-pointer"
        >
          {syncing ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
          <span>{syncing ? 'Syncing...' : 'Sync Kite'}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
          <Loader2 size={32} className="text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Fetching Vault Data...</p>
        </div>
      ) : (
        <>
          {/* Portfolio Aggregate Summary */}
          <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex items-center justify-between">
             <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Invested</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{formatINR(totalInvested, { maximumFractionDigits: 0 })}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Current Value</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{formatINR(totalCurrent, { maximumFractionDigits: 0 })}</p>
                <div className="flex justify-end mt-1.5">
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-0.5 ${isTotalProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {isTotalProfit ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      <span>{isTotalProfit ? '+' : ''}{formatINR(totalPnl, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
             </div>
          </div>

          {/* Controls: Search & Native Sort Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search holdings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm focus:outline-none cursor-pointer pr-8"
              >
                <option value="value">Sort: Value</option>
                <option value="pnl">Sort: % Return</option>
                <option value="name">Sort: A-Z</option>
              </select>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <ChevronRight size={12} className="rotate-90 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Filter Pills with Dynamic Counts */}
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {[
              { label: 'All', count: allCount },
              { label: 'Gainers', count: gainersCount },
              { label: 'Losers', count: losersCount }
            ].map(filter => (
              <button
                key={filter.label}
                onClick={() => setActiveFilter(filter.label as any)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap transition-all shadow-sm flex items-center gap-1 ${
                  activeFilter === filter.label 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{filter.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeFilter === filter.label ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-400'}`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          {/* The Holdings List */}
          <div className="space-y-3">
            {processedHoldings.length === 0 ? (
              <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-[1.5rem] text-slate-400 text-xs font-medium">
                No holdings match your filters.
              </div>
            ) : (
              processedHoldings.map((stock) => {
                const avg = stock.avgPrice || stock.buyPrice || 0;
                
                // Real-time price updates ticking color flash
                const tickedUp = stock.ltp > stock.prevLtp;
                const tickedDown = stock.ltp < stock.prevLtp;
                const priceFlashClass = tickedUp ? 'bg-emerald-500/20 text-emerald-700 animate-pulse rounded px-1' :
                                       tickedDown ? 'bg-rose-500/20 text-rose-700 animate-pulse rounded px-1' : '';

                return (
                  <div 
                    key={stock.ticker} 
                    onClick={() => onSelectStock && onSelectStock(stock)}
                    className="bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm cursor-pointer hover:border-indigo-200 hover:shadow-md hover:scale-[1.01] transition-all group"
                  >
                    <div className="flex flex-col gap-3">
                      
                      {/* Top Row: Categorical Avatar, Name & Current Value */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 text-white rounded-full flex items-center justify-center font-black text-xs tracking-wider shadow-sm ${getColorForTicker(stock.ticker)}`}>
                            {stock.ticker.substring(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{stock.ticker}</h3>
                            <p className="text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5">
                              {stock.qty} Qty • Avg {formatINR(avg)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </div>

                      <div className="h-[1px] w-full bg-slate-50" />

                      {/* Bottom Row: Scannable Data Grid */}
                      <div className="grid grid-cols-2 gap-4 text-right">
                        <div className="flex flex-col items-start space-y-0.5">
                          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Invested</p>
                          <p className="text-xs font-bold text-slate-700">{formatINR(stock.invested, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-0.5">
                          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 font-bold">Current Value</p>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-semibold transition-all duration-300 ${priceFlashClass}`}>
                              {formatINR(stock.ltp)}
                            </span>
                            <p className="text-xs font-black text-slate-900">{formatINR(stock.current, { maximumFractionDigits: 0 })}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${stock.isProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {stock.isProfit ? '+' : ''}{stock.pnlPercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}