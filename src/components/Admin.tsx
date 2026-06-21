import { useState, useEffect } from 'react';
import { Settings, Server, Key, Save, CheckCircle, XCircle } from 'lucide-react';

export default function Admin() {
  const [googleUrl, setGoogleUrl] = useState(localStorage.getItem('google_sheet_url') || "");
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || "");
  const [proxyStatus, setProxyStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    // Check if Proxy is reachable
    fetch('https://finor-v5.onrender.com/api/gtt')
      .then(() => setProxyStatus('online'))
      .catch(() => setProxyStatus('offline'));
  }, []);

  const handleSave = () => {
    localStorage.setItem('google_sheet_url', googleUrl);
    localStorage.setItem('gemini_api_key', geminiKey);
    alert("Configuration Saved Successfully!");
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
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
            <p className="text-xs text-zinc-500">https://finor-v5.onrender.com/</p>
          </div>
        </div>
        {proxyStatus === 'online' ? <CheckCircle className="text-emerald-500" /> : <XCircle className="text-rose-500" />}
      </div>

      {/* Configuration Card */}
      <div className="bg-[#121212] border border-zinc-900 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Key className="text-zinc-500" size={16} />
          <h3 className="text-sm font-bold text-zinc-300">Environment Config</h3>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Google Web App URL</label>
          <input 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-emerald-500 outline-none"
            value={googleUrl}
            onChange={(e) => setGoogleUrl(e.target.value)}
            placeholder="https://script.google.com/..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Gemini API Key</label>
          <input 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-emerald-500 outline-none"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            type="password"
          />
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-3 mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Save size={16} /> Save Configuration
        </button>
      </div>
    </div>
  );
}