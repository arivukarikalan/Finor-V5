import { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Bot, User, Sparkles, Loader2, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AskFinor({ holdings }: { holdings: any[] }) {
  const PROXY_URL = import.meta.env.VITE_PROXY_URL || localStorage.getItem('proxy_url') || "https://finor-v5.onrender.com";

  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "Hello! I am Finor, your personal AI trading assistant. Portfolio synced! How can I help you analyze your holdings today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // New State: Pending Trade Confirmation Gate
  const [pendingAction, setPendingAction] = useState<{ type: string, endpoint: string, body: any, uiText: string } | null>(null);
  const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [rateLimitTimer, setRateLimitTimer] = useState<number>(0);

  useEffect(() => {
    if (rateLimitTimer <= 0) return;
    const interval = setInterval(() => {
      setRateLimitTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitTimer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAction]);

  // Compute portfolio context dynamically
  const portfolioContext = useMemo(() => {
    let contextString = "Here is the user's current live stock portfolio:\n";
    holdings.forEach((stock: any) => {
      const avg = stock.avgPrice || stock.buyPrice || 0;
      contextString += `- ${stock.qty} shares of ${stock.ticker} at Avg Price ₹${avg}. Current LTP is ₹${stock.ltp}.\n`;
    });
    return contextString;
  }, [holdings]);

  const handleSend = async (textOverride?: string) => {
    const userMessage = textOverride || input.trim();
    if (!userMessage) return;

    setInput('');
    setPendingAction(null); // Clear any unconfirmed actions
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const systemInstruction = `You are Finor, a highly intelligent, institutional-grade algorithmic trading assistant. 
      IMPORTANT RULES:
      1. Use Markdown tables aggressively for lists of stocks or numeric comparisons.
      2. Keep responses highly concise and formatted for a mobile app screen.
      3. Perform all math internally before providing final answers.
      
      AGENT TOOL - SELL OCO GTT: <<<ORDER>>> {"ticker": "STOCK_NAME", "qty": NUMBER, "targetPrice": NUMBER, "stopLossPrice": NUMBER, "ltp": NUMBER} <<<ORDER>>>
      AGENT TOOL - BUY GTT: <<<BUY_ORDER>>> {"ticker": "STOCK_NAME", "qty": NUMBER, "triggerPrice": NUMBER, "limitPrice": NUMBER, "ltp": NUMBER} <<<BUY_ORDER>>>
      AGENT TOOL - CANCEL GTT: <<<CANCEL>>> {"trigger_id": NUMBER} <<<CANCEL>>>

      ${portfolioContext}`;

      const chatRes = await fetch(`${PROXY_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          systemInstruction: systemInstruction
        })
      });

      const chatJson = await chatRes.json();
      if (chatJson.status !== 'success') {
        throw new Error(chatJson.message || 'Failed to generate response');
      }

      let replyText = chatJson.data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that.";

      // Extract execution intents
      const orderMatch = replyText.match(/<<<ORDER>>>(.*?)<<<ORDER>>>/s);
      const buyMatch = replyText.match(/<<<BUY_ORDER>>>(.*?)<<<BUY_ORDER>>>/s);
      const cancelMatch = replyText.match(/<<<CANCEL>>>(.*?)<<<CANCEL>>>/s);
      
      if (orderMatch || buyMatch || cancelMatch) {
          let pendingType = '';
          let endpoint = '';
          let fetchBody: any = {};
          let uiText = '';

          if (orderMatch) {
              fetchBody = JSON.parse(orderMatch[1].trim());
              endpoint = `${PROXY_URL}/api/gtt/place`;
              uiText = `Sell ${fetchBody.qty}x ${fetchBody.ticker} (Target: ₹${fetchBody.targetPrice}, Stop: ₹${fetchBody.stopLossPrice})`;
              pendingType = 'SELL OCO';
              replyText = replyText.replace(/<<<ORDER>>>.*?<<<ORDER>>>/s, '').trim();
          } else if (buyMatch) {
              fetchBody = JSON.parse(buyMatch[1].trim());
              endpoint = `${PROXY_URL}/api/gtt/buy`;
              uiText = `Buy ${fetchBody.qty}x ${fetchBody.ticker} at ₹${fetchBody.limitPrice}`;
              pendingType = 'BUY LIMIT';
              replyText = replyText.replace(/<<<BUY_ORDER>>>.*?<<<BUY_ORDER>>>/s, '').trim();
          } else if (cancelMatch) {
              fetchBody = JSON.parse(cancelMatch[1].trim());
              endpoint = `${PROXY_URL}/api/gtt/${fetchBody.trigger_id}`;
              uiText = `Cancel GTT Order #${fetchBody.trigger_id}`;
              pendingType = 'CANCEL';
              replyText = replyText.replace(/<<<CANCEL>>>.*?<<<CANCEL>>>/s, '').trim();
          }
          
          setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
          // Trigger the confirmation gate instead of firing blindly
          setPendingAction({ type: pendingType, endpoint, body: fetchBody, uiText });
          setIsTyping(false);
          return; 
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);

    } catch (error: any) {
      const errorMsg = error?.message || "Sorry, I am having trouble connecting to my neural network.";
      if (errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("limit") || errorMsg.toLowerCase().includes("exceeded") || errorMsg.toLowerCase().includes("429")) {
        setRateLimitTimer(20); // 20s cooldown for rate limits
      }
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ **AI Connection Failure:** ${errorMsg}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    setActionStatus('loading');
    
    try {
        const proxyRes = await fetch(pendingAction.endpoint, {
            method: pendingAction.type === 'CANCEL' ? 'DELETE' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: pendingAction.type === 'CANCEL' ? null : JSON.stringify(pendingAction.body)
        });
        const proxyResult = await proxyRes.json();
        
        if (proxyResult.status === 'success') {
            setMessages(prev => [...prev, { role: 'assistant', content: `✅ **Confirmed:** ${pendingAction.uiText} has been routed to Kite.` }]);
        } else {
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ **Failed:** ${proxyResult.message}` }]);
        }
    } catch (e) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ **Failed:** Could not reach execution proxy.` }]);
    } finally {
        setPendingAction(null);
        setActionStatus('idle');
    }
  };

  // Custom Markdown components to enforce app styling inside AI responses
  const MarkdownComponents = {
    table: ({node, ...props}: any) => <div className="overflow-x-auto my-3"><table className="w-full text-left border-collapse" {...props} /></div>,
    th: ({node, ...props}: any) => <th className="border-b border-slate-200 py-2 px-2 font-black text-[10px] text-slate-400 uppercase tracking-widest" {...props} />,
    td: ({node, ...props}: any) => {
        const textContent = props.children?.toString() || "";
        // Auto-color logic: If it contains a negative number, make it red. Positive percent/numbers, green.
        let colorClass = "text-slate-800 font-bold";
        if (textContent.includes('-₹') || textContent.includes('-%')) colorClass = "text-rose-600 font-black";
        else if ((textContent.includes('+₹') || textContent.includes('+%'))) colorClass = "text-emerald-600 font-black";
        
        return <td className={`border-b border-slate-100 py-2.5 px-2 text-xs ${colorClass}`} {...props} />
    },
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-black text-slate-900" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
  };

  return (
    // Replaced h-[calc] with pure flex layout and global padding protection
    <div className="flex flex-col h-full min-h-[75vh] animate-fade-in relative pb-8">
      
      {/* 1. Header (High Contrast Light Theme) */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2 pt-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center">
            <Sparkles size={14} className="text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Ask Finor AI</h2>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5">Gemini 1.5 Flash</p>
          </div>
        </div>
        <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Free Tier (15 RPM)
        </span>
      </div>

      {/* 2. Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-2 [&::-webkit-scrollbar]:hidden">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Brand-aligned Avatars */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === 'assistant' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                
                {/* Chat Bubbles */}
                <div className={`p-4 rounded-[1.5rem] text-sm leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md' 
                    : 'bg-white border border-slate-100 text-slate-600 rounded-tl-sm shadow-sm'
                }`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {msg.content}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Interactive Suggestion Chips (Only show after the first welcome message) */}
            {idx === 0 && msg.role === 'assistant' && messages.length === 1 && (
                <div className="flex flex-wrap gap-2 pl-11">
                    {["Summarize my portfolio", "What is my top gainer?", "Buy 10 shares of ZOMATO at 145"].map(prompt => (
                        <button 
                            key={prompt}
                            onClick={() => handleSend(prompt)}
                            className="bg-white border border-slate-200 text-indigo-600 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-600 text-white shadow-sm flex items-center justify-center shrink-0"><Bot size={16} /></div>
             <div className="p-4 rounded-[1.5rem] rounded-tl-sm bg-white border border-slate-100 text-slate-400 text-xs font-bold flex items-center gap-2 shadow-sm">
                 <Loader2 size={14} className="animate-spin text-indigo-600" /> Finor is computing...
             </div>
          </div>
        )}

        {/* 3. The Execution Gate (Confirmation UI) */}
        {pendingAction && (
          <div className="flex gap-3 pl-11 mt-2">
             <div className="bg-white border border-indigo-100 shadow-md rounded-[1.5rem] p-4 w-full max-w-[85%] border-l-4 border-l-indigo-600 animate-in slide-in-from-bottom-2">
                 <div className="flex items-center gap-2 mb-2">
                     <ShieldAlert size={14} className="text-indigo-600" />
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Execution Required</h4>
                 </div>
                 <p className="text-sm font-black text-slate-900 mb-4">{pendingAction.uiText}</p>
                 
                 <div className="flex gap-2">
                     <button 
                         onClick={confirmPendingAction}
                         disabled={actionStatus === 'loading'}
                         className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-colors flex justify-center items-center gap-1"
                     >
                         {actionStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> Confirm</>}
                     </button>
                     <button 
                         onClick={() => setPendingAction(null)}
                         disabled={actionStatus === 'loading'}
                         className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2.5 rounded-xl transition-colors flex justify-center items-center gap-1"
                     >
                         <X size={14} /> Cancel
                     </button>
                 </div>
             </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {rateLimitTimer > 0 && (
        <div className="mx-2 mb-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 flex items-center justify-between shadow-sm animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">API Quota Exceeded</p>
              <p className="text-[9px] font-bold text-amber-600 mt-0.5">Gemini rate limit is completed</p>
            </div>
          </div>
          <span className="text-[10px] font-black bg-amber-200/60 text-amber-800 px-2.5 py-1 rounded-md">
            Retry in {rateLimitTimer}s
          </span>
        </div>
      )}

      {/* 4. Input Area */}
      <div className="relative shrink-0 mx-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your portfolio..."
          className="w-full bg-white shadow-sm border border-slate-200 rounded-full py-4 pl-5 pr-14 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <button 
          onClick={() => handleSend()} 
          disabled={!input.trim() || isTyping}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center transition-all"
        >
          <Send size={16} className="ml-0.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}