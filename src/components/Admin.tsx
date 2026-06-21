import { useState, useEffect } from 'react';
import { Settings, Server, CheckCircle, XCircle, KeyRound, ExternalLink } from 'lucide-react';

export default function Admin() {
  const [proxyStatus, setProxyStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Pulling URLs directly from Vercel Cloud Environment Variables
  const PROXY_URL = import.meta.env.VITE_PROXY_URL || "https://finor-v5.onrender.com";
  const GOOGLE_AUTH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || "";

  useEffect(() => {
    // Check if Render Proxy is awake and reachable
    fetch(`${PROXY_URL}/api/gtt`)
      .then(() => setProxyStatus('online'))
      .catch(() => setProxyStatus('offline'));
  }, [PROXY_URL]);

  const handleLogin = () => {
    if (!GOOGLE_AUTH_URL) {
      alert("System Error: VITE_GOOGLE_SHEET_URL is missing from Vercel Environment Variables.");
      return;
    }
    // Opens your Google Apps Script auth flow in a new browser tab
    window.open(GOOGLE_AUTH_URL, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in p-6 pb-24">
      <div className="flex items-center gap-2">
        <Settings className="text-zinc-400" size={20} />
        <h2 className="text-lg font-bold text-zinc-100">System Admin</h2>
      </div>

      {/* Proxy Health Card */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${proxyStatus === 'online' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
        <div className="flex items-center gap-3">
          <Server className={proxyStatus === 'online' ? 'text-emerald-500' : 'text-rose-500'} />
          <div>
            <p className="text-sm font-bold text-zinc-200">Execution Proxy</p>
            <p className="text-xs text-zinc-500 break-all">{PROXY_URL.replace('https://', '')}</p>
          </div>
        </div>
        {proxyStatus === 'online' ? <CheckCircle className="text-emerald-500" /> : <XCircle className="text-rose-500" />}
      </div>

      {/* Daily Authentication Card */}
      <div className="bg-[#121212] border border-zinc-900 rounded-3xl p-6 space-y-4 shadow-lg shadow-black/50">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="text-zinc-400" size={18} />
          <h3 className="text-sm font-bold text-zinc-200">Daily Authentication</h3>
        </div>
        
        <p className="text-xs text-zinc-500 leading-relaxed">
          Zerodha requires a fresh session token every morning. Tap below to securely log into Kite and authorize today's market execution.
        </p>

        <button 
          onClick={handleLogin}
          className="w-full py-3.5 mt-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
        >
          Generate Daily Token <ExternalLink size={16} />
        </button>
      </div>
    </div>
  );
}