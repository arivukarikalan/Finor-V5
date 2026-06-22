import { useState } from 'react';
import { Lock, Sparkles, Delete } from 'lucide-react';

export default function Login({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const CORRECT_PIN = '4321'; // Default secure PIN

  const handleKeyPress = (num: string) => {
    if (isError) setIsError(false);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      
      // Auto submit when 4 digits are reached
      if (nextPin === CORRECT_PIN) {
        setTimeout(() => {
          onUnlock();
        }, 300);
      } else if (nextPin.length === 4) {
        // Wrong PIN
        setTimeout(() => {
          setIsError(true);
          setPin('');
        }, 200);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  return (
    <div className="h-dvh w-full max-w-md mx-auto bg-slate-950 text-white flex flex-col justify-between px-6 py-12 overflow-hidden select-none antialiased relative">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col items-center text-center mt-8 space-y-4 shrink-0">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.15)] relative">
          <Lock className="text-indigo-400" size={24} />
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
            <Sparkles size={10} className="text-white animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <h1 className="text-xl font-black tracking-tight">Finor Vault Locked</h1>
          <p className="text-xs text-slate-400 font-semibold max-w-[240px] leading-relaxed">
            Welcome back, Arivalagan. Enter your secure 4-digit PIN to access portfolio analytics.
          </p>
        </div>
      </div>

      {/* Pin Code Indicator Dots */}
      <div className="flex flex-col items-center space-y-4 my-auto shrink-0">
        <div className={`flex items-center gap-6 py-4 ${isError ? 'animate-bounce border-rose-500' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const hasValue = pin.length > idx;
            return (
              <div 
                key={idx} 
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                  isError ? 'bg-rose-500 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' :
                  hasValue ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_12px_rgba(79,70,229,0.5)] scale-110' : 
                  'bg-transparent border-slate-700'
                }`}
              />
            );
          })}
        </div>
        
        {isError && (
          <p className="text-[11px] font-bold text-rose-500 animate-pulse tracking-wide uppercase">
            Incorrect PIN. Try again.
          </p>
        )}
        {!isError && (
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Default PIN: 4321
          </p>
        )}
      </div>

      {/* Numerical Keypad Grid */}
      <div className="w-full max-w-xs mx-auto grid grid-cols-3 gap-y-4 gap-x-6 shrink-0 pb-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            className="h-16 w-16 mx-auto rounded-full bg-slate-900/50 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700/80 text-lg font-black transition-all active:scale-90 flex items-center justify-center cursor-pointer shadow-sm select-none"
          >
            {num}
          </button>
        ))}
        
        {/* Clear Button */}
        <button
          onClick={handleClear}
          className="h-16 w-16 mx-auto text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors active:scale-95 flex items-center justify-center cursor-pointer select-none"
        >
          Clear
        </button>

        {/* Zero */}
        <button
          onClick={() => handleKeyPress('0')}
          className="h-16 w-16 mx-auto rounded-full bg-slate-900/50 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700/80 text-lg font-black transition-all active:scale-90 flex items-center justify-center cursor-pointer shadow-sm select-none"
        >
          0
        </button>

        {/* Backspace */}
        <button
          onClick={handleBackspace}
          className="h-16 w-16 mx-auto text-slate-400 hover:text-white transition-colors active:scale-90 flex items-center justify-center cursor-pointer select-none"
        >
          <Delete size={20} />
        </button>
      </div>
    </div>
  );
}
