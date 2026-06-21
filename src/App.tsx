import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Holdings from './components/Holdings';
import ExitStrategy from './components/ExitStrategy';
import AskFinor from './components/AskFinor';
import Admin from './components/Admin';
import { PieChart, Briefcase, TrendingDown, Sparkles, Bell, User } from 'lucide-react';

type TabType = 'dashboard' | 'holdings' | 'exit' | 'ask' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedStock, setSelectedStock] = useState<any>(null);

  // Admin moved to header. 4 items remain. Ask Finor is highlighted.
  const navItems = [
    { id: 'dashboard', icon: PieChart, label: 'Dashboard' },
    { id: 'holdings', icon: Briefcase, label: 'Holdings' },
    { id: 'ask', icon: Sparkles, label: 'Ask Finor', isSpecial: true },
    { id: 'exit', icon: TrendingDown, label: 'Exit Plan' }
  ];

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'holdings': return <Holdings onSelectStock={(stock: any) => {
        setSelectedStock(stock);
        setActiveTab('exit'); 
      }} />;
      case 'exit': return <ExitStrategy selectedStock={selectedStock} />;
      case 'ask': return <AskFinor />;
      case 'admin': return <Admin />;
      default: return <Dashboard />;
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
            {/* Unified Status Badge */}
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
            {/* Unread Notification Dot */}
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`p-1.5 rounded-full transition-colors border ${activeTab === 'admin' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            <User size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* 2. Main Content Area - pb-36 guarantees clearance over the floating nav */}
      <main className="flex-1 w-full max-w-md mx-auto pt-2 pb-36 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {renderView()}
      </main>

      {/* 3. Floating Premium Nav - High Contrast, 4 Items, AI Emphasis */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="w-full max-w-[380px] bg-slate-900 rounded-[2rem] px-2.5 py-2 flex items-center justify-between shadow-[0_20px_40px_rgba(0,0,0,0.2)] pointer-events-auto border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            // Special UI treatment for the AI Assistant tab
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

            // Standard UI for remaining tabs
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