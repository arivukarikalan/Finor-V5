import { useState, useEffect } from 'react';
import { Server, CheckCircle2, XCircle, KeyRound, ExternalLink, ChevronLeft, LogOut, Clock, Database, Settings, Sparkles } from 'lucide-react';

export default function Admin({ PROXY_URL }: { PROXY_URL: string }) {
  const [proxyStatus, setProxyStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [tokenTime, setTokenTime] = useState<string>('Checking...');
  const [generatedLabel, setGeneratedLabel] = useState<string>('');

  // Local Storage Settings State
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('google_sheet_url') || import.meta.env.VITE_GOOGLE_SHEET_URL || '');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem('proxy_url') || import.meta.env.VITE_PROXY_URL || 'https://finor-v5.onrender.com');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Check Proxy Server Health
  useEffect(() => {
    fetch(`${PROXY_URL}/api/gtt`)
      .then(() => setProxyStatus('online'))
      .catch(() => setProxyStatus('offline'));
  }, [PROXY_URL]);

  // 2. Handle redirection success check & countdown timer
  useEffect(() => {
    // Check if redirect has ?login=success
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'success') {
      localStorage.setItem('token_generated_at', Date.now().toString());
      // Clean query string
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Set fallback if none exists so the interface isn't empty
    let generatedAtStr = localStorage.getItem('token_generated_at');
    if (!generatedAtStr) {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      localStorage.setItem('token_generated_at', twoHoursAgo.toString());
      generatedAtStr = twoHoursAgo.toString();
    }

    const updateCountdown = () => {
      const generatedTime = parseInt(localStorage.getItem('token_generated_at') || '0');
      if (generatedTime === 0) {
        setTokenTime('No active token');
        setGeneratedLabel('Session token missing');
        return;
      }

      const expiryTime = generatedTime + 24 * 60 * 60 * 1000;
      const diff = expiryTime - Date.now();

      if (diff <= 0) {
        setTokenTime('Token Expired');
        setGeneratedLabel('Authorize session to trade');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTokenTime(`Token expires in ${hours}h ${minutes}m ${seconds}s`);
        
        const date = new Date(generatedTime);
        const formattedDate = date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        setGeneratedLabel(`Generated: Today, ${formattedDate}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    window.location.href = `${PROXY_URL}/api/auth/login`;
  };

  const handleSaveSettings = () => {
    localStorage.setItem('google_sheet_url', sheetUrl.trim());
    localStorage.setItem('gemini_api_key', geminiKey.trim());
    localStorage.setItem('proxy_url', proxyUrl.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in px-3 py-2 text-slate-900 pb-[160px]">
      
      {/* 1. Header (Fixed Contrast & Added Back Navigation) */}
      <div className="flex items-center gap-3 mb-2">
        <button 
          onClick={() => window.history.back()} 
          className="p-1.5 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} className="text-slate-600" />
        </button>
        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Account & Settings</h2>
      </div>

      {/* 2. User Profile Card */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-[1.5rem] p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-lg shadow-sm">
            அ
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Arivalagan</h3>
            <p className="text-xs font-bold text-slate-400">Pro Tier • Kite Connected</p>
          </div>
        </div>
        <button className="p-2.5 text-slate-400 bg-slate-50 rounded-full hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer">
          <LogOut size={16} />
        </button>
      </div>

      {/* 3. System Health */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-[1.5rem] p-5 space-y-3">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Infrastructure</h4>
        
        <div className={`p-4 rounded-xl border flex items-center justify-between ${proxyStatus === 'online' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
          <div className="flex items-center gap-3">
            <Server className={proxyStatus === 'online' ? 'text-emerald-600' : 'text-rose-600'} size={18} />
            <div>
              <p className="text-sm font-bold text-slate-900">Execution Engine</p>
              <p className="text-[10px] font-bold text-slate-500">Node.js Proxy</p>
            </div>
          </div>
          {proxyStatus === 'online' ? (
             <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                 <CheckCircle2 size={12}/> Online
             </span>
          ) : (
             <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-md">
                 <XCircle size={12}/> Offline
             </span>
          )}
        </div>
      </div>

      {/* 4. Broker Authentication Card */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-[1.5rem] p-5 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <KeyRound className="text-indigo-600" size={18} />
            <h3 className="text-sm font-extrabold text-slate-900">Broker Authentication</h3>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
            tokenTime.startsWith('Token expires') 
              ? 'text-emerald-700 bg-emerald-100 border-emerald-200' 
              : 'text-rose-700 bg-rose-100 border-rose-200'
          }`}>
            {tokenTime.startsWith('Token expires') ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
          Zerodha requires a fresh session token daily. Authorize to enable algorithmic execution.
        </p>

        {/* Dynamic State Feedback Component */}
        <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 border border-slate-100">
           <Clock size={16} className="text-slate-400" />
           <div>
              <p className="text-[11px] font-bold text-slate-700">{tokenTime}</p>
              <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{generatedLabel}</p>
           </div>
        </div>

        <button 
          onClick={handleLogin}
          className="w-full py-3.5 mt-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
        >
          Regenerate Token <ExternalLink size={16} />
        </button>
      </div>

      {/* 5. System Configuration Card */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-[1.5rem] p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="text-indigo-600" size={18} />
          <h3 className="text-sm font-extrabold text-slate-900">API Configuration</h3>
        </div>

        <div className="space-y-3">
          {/* Google Sheet URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Database size={10} /> Google Sheets Web App URL
            </label>
            <input 
              type="text" 
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800"
            />
          </div>

          {/* Gemini API Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> Gemini API Key
            </label>
            <input 
              type="password" 
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Enter Gemini API Key"
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800"
            />
          </div>

          {/* Execution Proxy URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Server size={10} /> Node.js Execution Proxy
            </label>
            <input 
              type="text" 
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="https://finor-v5.onrender.com"
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800"
            />
          </div>
        </div>

        <button 
          onClick={handleSaveSettings}
          disabled={saveSuccess}
          className={`w-full py-3 mt-2 rounded-xl font-bold text-xs transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
            saveSuccess 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 font-extrabold' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {saveSuccess ? (
            <><CheckCircle2 size={14} /> Settings Saved & Reloading...</>
          ) : (
            'Save Configuration'
          )}
        </button>
      </div>
      
    </div>
  );
}