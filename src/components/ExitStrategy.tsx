import { useState } from 'react';
import { TrendingDown, Target, ShieldAlert, Zap, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';

// Inside src/components/ExitStrategy.tsx

export default function ExitStrategy({ selectedStock }: { selectedStock?: any }) {
  
  // If no stock is selected yet, show a placeholder screen
  if (!selectedStock) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20 space-y-4 text-zinc-500 animate-fade-in">
        <TrendingDown size={48} className="opacity-20" />
        <p className="text-sm">Select a stock from your Holdings to plan an exit.</p>
      </div>
    );
  }

  const stock = selectedStock; // Use the real clicked stock!
  
  // The rest of the state remains the same
  const [targetPrice, setTargetPrice] = useState(Math.floor(stock.ltp * 1.05));
  const [stopLossPrice, setStopLossPrice] = useState(Math.floor(stock.ltp * 0.95));
  
  // THE FIX: New State for Quantity!
  const [selectedQty, setSelectedQty] = useState(stock.qty); 
  
  // New States for Deployment
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // THE FIX: Expected P&L now uses the selectedQty!
  const expectedProfit = (targetPrice - stock.avgPrice) * selectedQty;
  const expectedLoss = (stock.avgPrice - stopLossPrice) * selectedQty;
  const targetPercent = ((targetPrice - stock.ltp) / stock.ltp) * 100;
  const stopLossPercent = ((stock.ltp - stopLossPrice) / stock.ltp) * 100;

  // The function that talks to our Node.js Proxy Server
  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployStatus('idle');

    try {
      const response = await fetch('https://finor-v5.onrender.com/api/gtt/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: stock.ticker,
          qty: selectedQty, // THE FIX: Send the selected quantity!
          targetPrice: targetPrice,
          stopLossPrice: stopLossPrice,
          ltp: stock.ltp 
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        setDeployStatus('success');
      } else {
        setDeployStatus('error');
      }
    } catch (error) {
      console.error("Proxy Connection Error:", error);
      setDeployStatus('error');
    } finally {
      setIsDeploying(false);
      // Reset status after 3 seconds so the button goes back to normal
      setTimeout(() => setDeployStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      
      {/* Header */}
            <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <TrendingDown size={14} className="text-zinc-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">Exit Strategy Planner</h2>
      </div>

      {/* Active Stock Selector */}
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Planning For</p>
            <h3 className="text-lg font-bold text-white">{stock.ticker}</h3>
            <p className="text-xs text-zinc-400">{stock.qty} Shares Owned • Avg: ₹{stock.avgPrice.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">LTP</p>
            <p className="text-lg font-bold text-emerald-400">₹{stock.ltp.toFixed(2)}</p>
          </div>
        </div>
        
        {/* THE FIX: Quantity Adjustment Slider */}
        <div className="border-t border-zinc-800/60 pt-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-zinc-400">Quantity to Exit</span>
            <span className="text-lg font-bold text-white">{selectedQty}</span>
          </div>
          <input 
            type="range" min={1} max={stock.qty} step={1}
            value={selectedQty} onChange={(e) => setSelectedQty(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      {/* Target Price Section */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={64} /></div>
        <div className="flex items-center gap-2 text-emerald-400">
          <Target size={16} />
          <h4 className="text-sm font-bold uppercase tracking-wider">Take Profit</h4>
        </div>
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-bold text-white">₹{targetPrice}</span>
            <span className="text-sm font-bold text-emerald-400">+{targetPercent.toFixed(1)}% from LTP</span>
          </div>
          <input 
            type="range" min={Math.floor(stock.ltp)} max={Math.floor(stock.ltp * 1.5)} 
            value={targetPrice} onChange={(e) => setTargetPrice(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
        <div className="pt-2 flex justify-between items-center border-t border-emerald-500/10">
          <span className="text-xs text-zinc-400">Expected Realized P&L</span>
          <span className="text-sm font-bold text-emerald-400">+₹{expectedProfit.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Stop Loss Section */}
      <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldAlert size={64} /></div>
        <div className="flex items-center gap-2 text-rose-500">
          <ShieldAlert size={16} />
          <h4 className="text-sm font-bold uppercase tracking-wider">Stop Loss</h4>
        </div>
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-bold text-white">₹{stopLossPrice}</span>
            <span className="text-sm font-bold text-rose-500">-{stopLossPercent.toFixed(1)}% from LTP</span>
          </div>
          <input 
            type="range" min={Math.floor(stock.avgPrice * 0.8)} max={Math.floor(stock.ltp)} 
            value={stopLossPrice} onChange={(e) => setStopLossPrice(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
        </div>
        <div className="pt-2 flex justify-between items-center border-t border-rose-500/10">
          <span className="text-xs text-zinc-400">Max Acceptable Loss</span>
          <span className="text-sm font-bold text-rose-500">-₹{expectedLoss.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Action Button */}
      <button 
        onClick={handleDeploy}
        disabled={isDeploying || deployStatus === 'success'}
        className={`w-full group relative flex items-center justify-center gap-2 border p-4 rounded-xl font-bold transition-all duration-300 overflow-hidden ${
          deployStatus === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
            : deployStatus === 'error'
            ? 'bg-rose-500/20 border-rose-500 text-rose-400'
            : 'bg-[#1a1a1a] hover:bg-[#222222] border-zinc-800 hover:border-emerald-500/50 text-white'
        }`}
      >
        {isDeploying ? (
          <>
            <Loader2 size={18} className="animate-spin text-emerald-400" />
            <span>Transmitting to Proxy...</span>
          </>
        ) : deployStatus === 'success' ? (
          <>
            <CheckCircle2 size={18} />
            <span>GTT Active on Node</span>
          </>
        ) : deployStatus === 'error' ? (
          <>
            <ShieldAlert size={18} />
            <span>Connection Failed</span>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <Zap size={18} className="text-emerald-400" />
            <span>Deploy OCO GTT Order</span>
            <ChevronRight size={18} className="text-zinc-500 group-hover:text-emerald-400 transition-colors" />
          </>
        )}
      </button>
      <p className="text-center text-[10px] text-zinc-500 mt-2">
        This will place an automated target & stop-loss trigger via Local Proxy.
      </p>

    </div>
  );
}