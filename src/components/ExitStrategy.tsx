import { useState } from 'react';
import { TrendingDown, Target, ShieldAlert, Zap, ChevronRight, Loader2, CheckCircle2, Info, X, Trash2, Edit3 } from 'lucide-react';

// Exact same color hash from Holdings for global consistency
const catColors = ['bg-indigo-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-fuchsia-500'];
const getColorForTicker = (ticker: string) => {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  return catColors[Math.abs(hash) % catColors.length];
};

export default function ExitStrategy({ selectedStock }: { selectedStock?: any }) {
  
  if (!selectedStock) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-32 space-y-4 text-slate-400 animate-fade-in">
        <TrendingDown size={48} className="opacity-20" />
        <p className="text-sm font-semibold">Select a stock from Holdings to plan an exit.</p>
      </div>
    );
  }

  const stock = selectedStock; 
  
  const [targetPrice, setTargetPrice] = useState(Math.floor(stock.ltp * 1.05));
  const [stopLossPrice, setStopLossPrice] = useState(Math.floor(stock.ltp * 0.95));
  const [selectedQty, setSelectedQty] = useState(stock.qty); 
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Calculations
  const expectedProfit = (targetPrice - stock.avgPrice) * selectedQty;
  const expectedLoss = (stock.avgPrice - stopLossPrice) * selectedQty;
  const targetPercent = ((targetPrice - stock.ltp) / stock.ltp) * 100;
  const stopLossPercent = ((stock.ltp - stopLossPrice) / stock.ltp) * 100;
  
  const riskPerShare = stock.avgPrice - stopLossPrice;
  const rewardPerShare = targetPrice - stock.avgPrice;
  const rrRatio = riskPerShare > 0 ? (rewardPerShare / riskPerShare).toFixed(1) : '∞';

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployStatus('idle');

    try {
      const response = await fetch('https://finor-v5.onrender.com/api/gtt/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: stock.ticker, qty: selectedQty, targetPrice, stopLossPrice, ltp: stock.ltp })
      });

      const result = await response.json();
      setDeployStatus(result.status === 'success' ? 'success' : 'error');
    } catch (error) {
      console.error("Proxy Connection Error:", error);
      setDeployStatus('error');
    } finally {
      setIsDeploying(false);
      setTimeout(() => {
        setDeployStatus('idle');
        setShowConfirmModal(false);
      }, 3000);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in px-3 py-2 text-slate-900">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <TrendingDown size={14} className="text-indigo-600" />
        </div>
        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Exit Strategy Planner</h2>
      </div>

      {/* Active Stock Selector */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-[1.5rem] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Planning For</p>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 text-white rounded-full flex items-center justify-center font-black text-[9px] shadow-sm ${getColorForTicker(stock.ticker)}`}>
                {stock.ticker.substring(0, 2)}
              </div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">{stock.ticker}</h3>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">{stock.qty} Shares Owned • Avg: ₹{stock.avgPrice.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Current Price</p>
            <p className="text-lg font-black text-indigo-600">₹{stock.ltp.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="border-t border-slate-50 pt-4 mt-1">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-600">Quantity to Exit</span>
            <input 
              type="number" value={selectedQty} 
              onChange={(e) => setSelectedQty(Math.min(stock.qty, Math.max(1, Number(e.target.value))))}
              className="w-16 text-right font-bold text-sm bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <input 
            type="range" min={1} max={stock.qty} step={1} value={selectedQty} 
            onChange={(e) => setSelectedQty(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
            <span>0</span>
            <span>{stock.qty}</span>
          </div>
        </div>
      </div>

      {/* Target Price Section */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-[1.5rem] p-5 space-y-4">
        <div className="flex items-center justify-between text-emerald-600 mb-1">
          <div className="flex items-center gap-2">
            <Target size={16} strokeWidth={2.5} />
            <h4 className="text-sm font-extrabold uppercase tracking-wide">Take Profit</h4>
          </div>
          <span className="text-[11px] font-bold bg-emerald-100 px-2 py-0.5 rounded-md">+{targetPercent.toFixed(1)}%</span>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500">Target Trigger</span>
            <div className="relative">
               <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
               <input 
                 type="number" value={targetPrice} onChange={(e) => setTargetPrice(Number(e.target.value))}
                 className="w-24 pl-6 pr-2 text-right font-bold text-sm bg-white border border-emerald-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
               />
            </div>
          </div>
          <input 
            type="range" min={Math.floor(stock.ltp)} max={Math.floor(stock.ltp * 1.5)} value={targetPrice} 
            onChange={(e) => setTargetPrice(Number(e.target.value))}
            className="w-full h-1.5 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
            <span>LTP</span>
            <span>+50%</span>
          </div>
        </div>

        <div className="pt-3 flex justify-between items-center border-t border-emerald-100/50">
          <span className="text-[11px] font-bold text-slate-500">Expected Realized Gain</span>
          <span className="text-sm font-black text-emerald-600">+₹{expectedProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Stop Loss Section */}
      <div className="bg-rose-50/50 border border-rose-100 rounded-[1.5rem] p-5 space-y-4">
        <div className="flex items-center justify-between text-rose-500 mb-1">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} strokeWidth={2.5} />
            <h4 className="text-sm font-extrabold uppercase tracking-wide">Stop Loss</h4>
          </div>
          <span className="text-[11px] font-bold bg-rose-100 px-2 py-0.5 rounded-md">-{stopLossPercent.toFixed(1)}%</span>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500">Stop Trigger</span>
            <div className="relative">
               <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
               <input 
                 type="number" value={stopLossPrice} onChange={(e) => setStopLossPrice(Number(e.target.value))}
                 className="w-24 pl-6 pr-2 text-right font-bold text-sm bg-white border border-rose-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
               />
            </div>
          </div>
          <input 
            type="range" min={Math.floor(stock.avgPrice * 0.8)} max={Math.floor(stock.ltp)} value={stopLossPrice} 
            onChange={(e) => setStopLossPrice(Number(e.target.value))}
            className="w-full h-1.5 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
            <span>Floor (-20%)</span>
            <span>LTP</span>
          </div>
        </div>

        <div className="pt-3 flex justify-between items-center border-t border-rose-100/50">
          <span className="text-[11px] font-bold text-slate-500">Max Acceptable Loss</span>
          <span className="text-sm font-black text-rose-600">-₹{Math.abs(expectedLoss).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Analytics & Deployment Action */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-2 text-xs font-bold">
            <span className="text-slate-500 flex items-center gap-1">
                <Info size={12} className="text-indigo-400" /> Risk/Reward Ratio
            </span>
            <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">1 : {rrRatio}</span>
        </div>
        
        <button 
          onClick={() => setShowConfirmModal(true)}
          className="w-full group flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-2xl font-bold transition-all shadow-sm"
        >
          <Zap size={18} className="text-indigo-400" />
          <span>Review OCO Order</span>
          <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* CONFIRMATION MODAL OVERLAY */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            {/* mb-24 explicitly pushes the modal up so it never hits the bottom nav */}
            <div className="w-full max-w-md bg-white rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 mb-24">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-slate-900">Confirm Exit Strategy</h3>
                    <button onClick={() => setShowConfirmModal(false)} className="p-2 bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100"><X size={18}/></button>
                </div>
                
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between border-b border-slate-50 pb-2 text-sm">
                        <span className="font-bold text-slate-500">Asset</span>
                        <span className="font-black text-slate-900">{selectedQty} Shares of {stock.ticker}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 text-sm">
                        <span className="font-bold text-slate-500">Take Profit</span>
                        <span className="font-black text-emerald-600">₹{targetPrice} <span className="text-[10px] bg-emerald-50 px-1 rounded ml-1">+{targetPercent.toFixed(1)}%</span></span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 text-sm">
                        <span className="font-bold text-slate-500">Stop Loss</span>
                        <span className="font-black text-rose-600">₹{stopLossPrice} <span className="text-[10px] bg-rose-50 px-1 rounded ml-1">-{stopLossPercent.toFixed(1)}%</span></span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 text-sm">
                        <span className="font-bold text-slate-500">Expected P&L</span>
                        <span className="font-black text-emerald-600">+₹{expectedProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 text-sm">
                        <span className="font-bold text-slate-500">Max Risk</span>
                        <span className="font-black text-rose-600">-₹{Math.abs(expectedLoss).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2 text-sm">
                        <span className="font-bold text-slate-500">Risk:Reward</span>
                        <span className="font-black text-slate-900">1 : {rrRatio}</span>
                    </div>
                    
                    <div className="bg-indigo-50 p-3 rounded-xl flex items-start gap-3 mt-4">
                        <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-indigo-900 leading-relaxed">
                            This places a simultaneous <span className="font-black">OCO Order</span>. Triggering either the Target or the Stop Loss automatically cancels the other.
                        </p>
                    </div>
                </div>

                <button 
                  onClick={handleDeploy}
                  disabled={isDeploying || deployStatus === 'success'}
                  className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all ${
                    deployStatus === 'success' ? 'bg-emerald-50 text-emerald-600' :
                    deployStatus === 'error' ? 'bg-rose-50 text-rose-600' :
                    'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                  }`}
                >
                  {isDeploying ? (
                    <><Loader2 size={18} className="animate-spin text-white" /><span>Transmitting to Broker...</span></>
                  ) : deployStatus === 'success' ? (
                    <><CheckCircle2 size={18} /><span>Order Deployed Successfully</span></>
                  ) : deployStatus === 'error' ? (
                    <><ShieldAlert size={18} /><span>Connection Failed</span></>
                  ) : (
                    <span>Confirm & Deploy</span>
                  )}
                </button>
            </div>
        </div>
      )}

      {/* NEW: Active GTT Orders List */}
      <div className="pt-6 border-t border-slate-200 mt-8 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Exit Orders</h3>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">1 Active</span>
        </div>
        
        {/* Mock Data Card (You will map this from your API later) */}
        <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-3 group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center font-black text-[10px] shadow-sm ${getColorForTicker(stock.ticker)}`}>
                        {stock.ticker.substring(0, 2)}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="font-black text-sm text-slate-900">{stock.ticker}</p>
                            <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-100">OCO Active</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400">{stock.qty} Shares</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={16} /></button>
                    <button className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Take Profit</p>
                    <p className="text-xs font-black text-emerald-600">₹{targetPrice}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Stop Loss</p>
                    <p className="text-xs font-black text-rose-500">₹{stopLossPrice}</p>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
}