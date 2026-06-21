import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export default function AskFinor() {
  // 🔴 PASTE YOUR KEYS HERE:
  const SHEET_API_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || localStorage.getItem('google_sheet_url') || "";
 // Replace your GEMINI_API_KEY line with this:
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || "";
  const PROXY_URL = "https://finor-v5.onrender.com";

  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "Hello! I am Finor, your personal AI trading assistant. I'm loading your portfolio now..." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [portfolioContext, setPortfolioContext] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchContext = async () => {
      if (!SHEET_API_URL || SHEET_API_URL.includes("PASTE_YOUR")) return;
      try {
        const response = await fetch(SHEET_API_URL);
        const result = await response.json();
        
        if (result.status === 'success') {
          let contextString = "Here is the user's current live stock portfolio:\n";
          result.data.forEach((stock: any) => {
            contextString += `- ${stock.qty} shares of ${stock.ticker} at Avg Price ₹${stock.avgPrice}. Current LTP is ₹${stock.ltp}.\n`;
          });
          setPortfolioContext(contextString);
          
          setMessages([
             { role: 'assistant', content: "Portfolio synced! You can ask me things like 'What is my most profitable stock?' or tell me to 'Buy 10 shares of ZOMATO at 145'." }
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch context:", error);
      }
    };
    fetchContext();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !GEMINI_API_KEY || GEMINI_API_KEY.includes("PASTE_YOUR")) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const systemInstruction = `You are Finor, a sharp, professional, and concise algorithmic trading assistant. 
      IMPORTANT MATH RULE: Perform all calculations step-by-step internally before giving the final answer.
      
      AGENT TOOL - SELL OCO GTT: <<<ORDER>>> {"ticker": "STOCK_NAME", "qty": NUMBER, "targetPrice": NUMBER, "stopLossPrice": NUMBER, "ltp": NUMBER} <<<ORDER>>>
      AGENT TOOL - BUY GTT: <<<BUY_ORDER>>> {"ticker": "STOCK_NAME", "qty": NUMBER, "triggerPrice": NUMBER, "limitPrice": NUMBER, "ltp": NUMBER} <<<BUY_ORDER>>>
      AGENT TOOL - CANCEL GTT: <<<CANCEL>>> {"trigger_id": NUMBER} <<<CANCEL>>>

      ${portfolioContext}`;

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\nUser Prompt: " + userMessage }] }],
          config: { temperature: 0.7 }
      });

      let replyText = response.text || "I'm sorry, I couldn't process that.";
      let orderStatusMsg: string | null = null; // Explicitly typed as string or null

      const orderMatch = replyText.match(/<<<ORDER>>>(.*?)<<<ORDER>>>/s);
      const buyMatch = replyText.match(/<<<BUY_ORDER>>>(.*?)<<<BUY_ORDER>>>/s);
      const cancelMatch = replyText.match(/<<<CANCEL>>>(.*?)<<<CANCEL>>>/s);
      
      if (orderMatch || buyMatch || cancelMatch) {
          let endpoint = '';
          let fetchBody: any = {};
          let uiActionMsg = '';
          let isCancel = false;

          if (orderMatch) {
              const orderData = JSON.parse(orderMatch[1].trim());
              endpoint = `${PROXY_URL}/api/gtt/place`;
              fetchBody = orderData;
              uiActionMsg = `*Deploying SELL OCO order for ${orderData.ticker}...*`;
              replyText = replyText.replace(/<<<ORDER>>>.*?<<<ORDER>>>/s, '').trim();
          } else if (buyMatch) {
              const buyData = JSON.parse(buyMatch[1].trim());
              endpoint = `${PROXY_URL}/api/gtt/buy`;
              fetchBody = buyData;
              uiActionMsg = `*Deploying BUY GTT order for ${buyData.ticker}...*`;
              replyText = replyText.replace(/<<<BUY_ORDER>>>.*?<<<BUY_ORDER>>>/s, '').trim();
          } else if (cancelMatch) {
              const cancelData = JSON.parse(cancelMatch[1].trim());
              endpoint = `${PROXY_URL}/api/gtt/${cancelData.trigger_id}`;
              isCancel = true;
              uiActionMsg = `*Requesting cancellation of GTT ${cancelData.trigger_id}...*`;
              replyText = replyText.replace(/<<<CANCEL>>>.*?<<<CANCEL>>>/s, '').trim();
          }
          
          replyText += `\n\n${uiActionMsg}`;
          setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
          
          try {
            const proxyRes = await fetch(endpoint, {
                method: isCancel ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: isCancel ? null : JSON.stringify(fetchBody)
            });
            const proxyResult = await proxyRes.json();
            orderStatusMsg = proxyResult.status === 'success' ? `✅ **Action Complete:** ${proxyResult.message || 'GTT Executed.'}` : `❌ **Action Failed:** ${proxyResult.message}`;
          } catch (e) {
            orderStatusMsg = `❌ **Action Failed:** Could not reach the local proxy server at ${PROXY_URL}.`;
          }
          
          setTimeout(() => {
             if(orderStatusMsg) setMessages(prev => [...prev, { role: 'assistant', content: orderStatusMsg as string }]);
          }, 800);
          setIsTyping(false);
          return; 
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I am having trouble connecting to my neural network." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in relative">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Sparkles size={14} className="text-zinc-400" />
        </div>
        <h2 className="text-sm font-semibold tracking-wide text-zinc-200">Ask Finor AI</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 [&::-webkit-scrollbar]:hidden">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-800 text-zinc-100' : 'bg-[#121212] border border-zinc-800/50 text-zinc-300'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0"><Bot size={16} /></div>
             <div className="p-3 rounded-2xl bg-[#121212] border border-zinc-800/50 text-zinc-400 text-xs flex items-center gap-1"><Loader2 size={14} className="animate-spin" /> Finor is thinking...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="relative shrink-0">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your portfolio..."
          className="w-full bg-[#121212] border border-zinc-800 rounded-full py-3.5 pl-5 pr-12 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
        />
        <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center">
          <Send size={16} className="ml-0.5" />
        </button>
      </div>
    </div>
  );
}