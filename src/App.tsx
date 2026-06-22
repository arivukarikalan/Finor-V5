import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Holdings from './components/Holdings';
import ExitStrategy from './components/ExitStrategy';
import AskFinor from './components/AskFinor';
import Admin from './components/Admin';
import { PieChart, Briefcase, TrendingDown, Sparkles, Bell, User } from 'lucide-react';

type TabType = 'dashboard' | 'holdings' | 'exit' | 'ask' | 'admin';

const MOCK_HOLDINGS = [
  { ticker: 'BRITANNIA', qty: 10, avgPrice: 5264.40, ltp: 5195.00, prevLtp: 5195.00 },
  { ticker: 'DABUR', qty: 150, avgPrice: 432.23, ltp: 423.65, prevLtp: 423.65 },
  { ticker: 'EIHOTEL', qty: 100, avgPrice: 302.68, ltp: 322.80, prevLtp: 322.80 },
  { ticker: 'GILLETTE', qty: 4, avgPrice: 7713.50, ltp: 7828.50, prevLtp: 7828.50 },
  { ticker: 'HAL', qty: 10, avgPrice: 4200.00, ltp: 4408.10, prevLtp: 4408.10 },
  { ticker: 'ANANTRAJ', qty: 50, avgPrice: 527.08, ltp: 520.20, prevLtp: 520.20 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedStock, setSelectedStock] = useState<any>(null);

  const SHEET_API_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || localStorage.getItem('google_sheet_url') || "https://script.google.com/macros/s/AKfycbyPoa4szJQkOu_O14KMYSgwvKeQZe-JCj_Kdq9mbOyAXJtWfbPpGQ8dr4Tg9Ox7L4U5Aw/exec";
  const PROXY_URL = import.meta.env.VITE_PROXY_URL || localStorage.getItem('proxy_url') || "https://finor-v5.onrender.com";

  const [holdings, setHoldings] = useState<any[]>(MOCK_HOLDINGS);
  const [activeGTTs, setActiveGTTs] = useState<any[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingGTTs, setLoadingGTTs] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Unified Data Fetcher
  const fetchData = async (triggerSync = false) => {
    if (triggerSync) {
      setIsSyncing(true);
    } else {
      setLoadingHoldings(true);
    }
    setLoadingGTTs(true);

    // Fetch Holdings
    const loadMockData = () => {
      setHoldings(prev => {
        // preserve current simulation prices if already initialized
        if (prev && prev.length > 0 && prev[0].prevLtp !== undefined) return prev;
        return MOCK_HOLDINGS;
      });
      setLoadingHoldings(false);
      setIsSyncing(false);
    };

    if (!SHEET_API_URL || !SHEET_API_URL.startsWith("http") || SHEET_API_URL.includes("PASTE_YOUR")) {
      console.warn("Invalid or missing SHEET_API_URL. Bypassing fetch and loading mock data.");
      loadMockData();
    } else {
      try {
        const url = triggerSync ? `${SHEET_API_URL}?action=sync` : SHEET_API_URL;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'success') {
          const freshHoldings = result.data.map((stock: any) => ({
            ...stock,
            prevLtp: stock.ltp || stock.avgPrice,
            ltp: stock.ltp || stock.avgPrice
          }));
          setHoldings(freshHoldings);
        } else {
          loadMockData();
        }
      } catch (error) {
        console.error("Failed to fetch holdings:", error);
        loadMockData();
      } finally {
        setLoadingHoldings(false);
        setIsSyncing(false);
      }
    }

    // Fetch GTT Orders from Proxy
    try {
      const gttRes = await fetch(`${PROXY_URL}/api/gtt`);
      const gttJson = await gttRes.json();
      if (gttJson.status === 'success') {
        // filter active GTTs
        setActiveGTTs(gttJson.data.filter((g: any) => g.status === 'active'));
      } else {
        setActiveGTTs([]);
      }
    } catch (e) {
      console.error("Proxy GTT fetch failed:", e);
      setActiveGTTs([]);
    } finally {
      setLoadingGTTs(false);
    }
  };

  // 2. Cancel GTT Handler
  const handleCancelGTT = async (id: number) => {
    try {
      const res = await fetch(`${PROXY_URL}/api/gtt/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.status === 'success') {
        setActiveGTTs(prev => prev.filter(g => g.id !== id));
        return true;
      }
      return false;
    } catch(e) {
      console.error("Cancel failed", e);
      return false;
    }
  };

  // 3. Trigger initial fetch
  useEffect(() => {
    fetchData();
  }, [SHEET_API_URL, PROXY_URL]);

  // 4. Simulated Real-Time Price Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setHoldings(prevHoldings => {
        if (!prevHoldings || prevHoldings.length === 0) return prevHoldings;
        
        // Randomly select 1 or 2 stocks to tick
        const tickCount = Math.floor(Math.random() * 2) + 1; // 1 or 2
        const indicesToTick = new Set<number>();
        while (indicesToTick.size < Math.min(tickCount, prevHoldings.length)) {
          indicesToTick.add(Math.floor(Math.random() * prevHoldings.length));
        }

        return prevHoldings.map((stock, idx) => {
          if (indicesToTick.has(idx)) {
            // Tick price up or down by a micro-amount (e.g. -0.15% to +0.15%)
            const percentChange = (Math.random() * 0.3 - 0.15) / 100;
            const newLtp = parseFloat((stock.ltp * (1 + percentChange)).toFixed(2));
            return {
              ...stock,
              prevLtp: stock.ltp,
              ltp: newLtp
            };
          }
          return stock;
        });
      });
    }, 4000); // ticks every 4 seconds

    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'dashboard', icon: PieChart, label: 'Dashboard' },
    { id: 'holdings', icon: Briefcase, label: 'Holdings' },
    { id: 'ask', icon: Sparkles, label: 'Ask Finor', isSpecial: true },
    { id: 'exit', icon: TrendingDown, label: 'Exit Plan' }
  ];

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            holdings={holdings}
            loading={loadingHoldings}
            activeGTTs={activeGTTs}
            loadingGTTs={loadingGTTs}
            handleCancelGTT={handleCancelGTT}
          />
        );
      case 'holdings':
        return (
          <Holdings
            holdings={holdings}
            loading={loadingHoldings}
            syncing={isSyncing}
            onSyncKite={() => fetchData(true)}
            onSelectStock={(stock: any) => {
              setSelectedStock(stock);
              setActiveTab('exit');
            }}
          />
        );
      case 'exit':
        return (
          <ExitStrategy
            selectedStock={selectedStock ? holdings.find(h => h.ticker === selectedStock.ticker) || selectedStock : null}
            activeGTTs={activeGTTs}
            loadingGTTs={loadingGTTs}
            handleCancelGTT={handleCancelGTT}
            onRefreshGTTs={() => fetchData(false)}
          />
        );
      case 'ask':
        return <AskFinor holdings={holdings} />;
      case 'admin':
        return <Admin PROXY_URL={PROXY_URL} />;
      default:
        return <Dashboard holdings={holdings} loading={loadingHoldings} activeGTTs={activeGTTs} loadingGTTs={loadingGTTs} handleCancelGTT={handleCancelGTT} />;
    }
  };

  return (
    <div className="h-dvh w-full bg-[#F8F9FA] text-slate-900 flex flex-col overflow-hidden antialiased selection:bg-indigo-500/10">
      
      {/* 1. Header Bar - Elevated, Actionable, Clean */}
      <header className="w-full max-w-md mx-auto px-5 py-3 flex items-center justify-between shrink-0 bg-white border-b border-slate-200 z-40 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white shadow-sm">
            அ
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900">Finor</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Connected</span>
            </div>
          </div>
        </div>

        {/* Actionable Header Icons */}
        <div className="flex items-center gap-3">
          <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors relative">
            <Bell size={20} strokeWidth={1.5} />
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />
          </button>
          
          {/* Admin Profile Portal */}
          <button 
            onClick={() => setActiveTab('admin')}
            className={`p-1.5 rounded-full transition-colors border ${
              activeTab === 'admin' 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50' 
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <User size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* 2. Main Content Area - pb-[140px] acts as a global anti-clipping shield */}
      <main className="flex-1 w-full max-w-md mx-auto pt-2 pb-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {renderView()}
      </main>

      {/* 3. Floating Premium Nav - High Contrast, AI Emphasis, PWA Safe */}
      <div className="fixed bottom-[env(safe-area-inset-bottom,1.5rem)] left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="w-full max-w-[380px] bg-slate-900 rounded-[2rem] px-2.5 py-2 flex items-center justify-between shadow-[0_20px_40px_rgba(0,0,0,0.2)] pointer-events-auto border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (item.isSpecial) {
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-2xl transition-all duration-300 ${
                    isActive ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-800 text-indigo-400 hover:bg-slate-700'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`flex flex-col items-center justify-center gap-1.5 py-2 px-3 rounded-2xl transition-all duration-300 ${
                  isActive ? 'text-white bg-slate-800 shadow-inner' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}