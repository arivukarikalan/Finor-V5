// Inside src/App.tsx

import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Holdings from './components/Holdings';
import ExitStrategy from './components/ExitStrategy';
import AskFinor from './components/AskFinor';
import Admin from './components/Admin';
import { LayoutDashboard, Briefcase, TrendingDown, MessageSquareText, Settings } from 'lucide-react';

type TabType = 'dashboard' | 'holdings' | 'exit' | 'ask' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // NEW: State to remember which stock the user clicked!
  const [selectedStock, setSelectedStock] = useState<any>(null);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'holdings', icon: Briefcase, label: 'Holdings' },
    { id: 'exit', icon: TrendingDown, label: 'Exit Plan' },
    { id: 'ask', icon: MessageSquareText, label: 'Ask Finor' },
    { id: 'admin', icon: Settings, label: 'Admin' }
  ];

  // NEW: Pass the state and setter down to the components
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'holdings': return <Holdings onSelectStock={(stock: any) => {
        setSelectedStock(stock);
        setActiveTab('exit'); // Auto-switch to the Exit tab!
      }} />;
      case 'exit': return <ExitStrategy selectedStock={selectedStock} />;
      case 'ask': return <AskFinor />;
      case 'admin': return <Admin />;
      default: return <Dashboard />;
    }
  };

  return (
  // 1. Force the main layout canvas to stay exactly the size of the device screen
  <div className="h-dvh w-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden antialiased selection:bg-emerald-500/30">
    
    {/* 2. Header Bar - Fixed structural spacing */}
    <header className="w-full max-w-md mx-auto px-6 py-4 flex items-center justify-between shrink-0 bg-[#0a0a0a] border-b border-zinc-900/30 z-40">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center font-bold text-sm text-emerald-400">
          அ
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-zinc-200">Finor V5.0</h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-tight">Kite Personal Connected</p>
        </div>
      </div>
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
    </header>

    {/* 3. Main Content Area - This is now the ONLY area that handles scrollbars */}
    <main className="flex-1 w-full max-w-md mx-auto px-6 pt-4 pb-32 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {renderView()}
    </main>

    {/* 4. Floating Premium Bottom Navbar */}
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="w-full max-w-[380px] bg-[#141414]/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl px-3 py-2 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-300 relative ${
                isActive ? 'text-emerald-400 bg-zinc-900/50' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
              {isActive && (
                <span className="absolute -top-1 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>

  </div>
);
}