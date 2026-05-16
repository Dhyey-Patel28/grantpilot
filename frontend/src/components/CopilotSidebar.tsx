import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Sparkles, User, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Message {
  id: number;
  type: 'user' | 'agent';
  content: string | React.ReactNode;
}

export function CopilotSidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('grantpilot_copilot_messages');
    if (saved) {
      // Functions inside React nodes cannot be parsed from JSON easily, so we only store strings or fallback.
      // For simplicity, we'll initialize with default if empty or parsing fails.
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          // Note: React nodes won't rehydrate correctly from JSON, this is a simplified mock.
          setMessages(parsed);
          return;
        }
      } catch (e) {}
    }
    
    setMessages([
      {
        id: 1,
        type: 'agent',
        content: "Hi! I'm your Grant Copilot. I can analyze match scores, draft memos, or identify missing documents for your current active project."
      }
    ]);
  }, []);

  // Save string-only messages to local storage
  useEffect(() => {
    const stringMessages = messages.filter(m => typeof m.content === 'string');
    localStorage.setItem('grantpilot_copilot_messages', JSON.stringify(stringMessages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (userText: string) => {
    if (!userText.trim()) return;
    
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: userText }]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let response: React.ReactNode = "I can certainly help with that based on your project profile.";
      
      const textLower = userText.toLowerCase();
      if (textLower.includes('explain')) {
        response = "The USDA ReConnect Program is an 88% match because your area qualifies as 'Rural', and you are an eligible Local Government. However, you are missing a formal cost estimate.";
      } else if (textLower.includes('missing')) {
        response = (
          <div className="space-y-2">
            <p>You are missing 3 key documents:</p>
            <ul className="text-sm space-y-1">
              <li className="flex items-center text-red-400"><AlertTriangle className="w-3 h-3 mr-1"/> Certified Cost Estimate</li>
              <li className="flex items-center text-red-400"><AlertTriangle className="w-3 h-3 mr-1"/> Environmental Assessment</li>
              <li className="flex items-center text-red-400"><AlertTriangle className="w-3 h-3 mr-1"/> Match Commitment Letter</li>
            </ul>
          </div>
        );
      } else if (textLower.includes('memo')) {
        response = "I have drafted a Council Memo for the USDA ReConnect grant. It has been added to your Readiness Packet. Would you like me to open it?";
      }

      setMessages(prev => [...prev, { id: Date.now(), type: 'agent', content: response }]);
    }, 1500);
  };

  const suggestions = [
    "Explain this fit score",
    "Identify missing documents",
    "Generate council memo"
  ];

  return (
    <div className="w-80 glass-panel border-l border-borderColor flex flex-col z-20 shrink-0 h-full bg-bgPanel/80 backdrop-blur-xl">
      <div className="p-4 border-b border-borderColor flex items-center bg-bgPanelLight/30">
        <Sparkles className="w-5 h-5 text-primary mr-2" />
        <h2 className="font-bold text-textPrimary">Grant Copilot</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map(msg => (
          <motion.div 
            key={msg.id} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${msg.type === 'user' ? 'bg-primary text-white rounded-l-xl rounded-tr-xl' : 'bg-bgPanel border border-borderColor text-textPrimary rounded-r-xl rounded-tl-xl'} p-3 text-sm shadow-md`}>
              {msg.type === 'agent' && <div className="flex items-center mb-1 text-xs text-primary font-medium"><Bot className="w-3 h-3 mr-1"/> GrantPilot AI</div>}
              {msg.content}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-bgPanel border border-borderColor p-3 rounded-r-xl rounded-tl-xl flex space-x-1">
              <motion.div className="w-1.5 h-1.5 bg-textSecondary rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
              <motion.div className="w-1.5 h-1.5 bg-textSecondary rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
              <motion.div className="w-1.5 h-1.5 bg-textSecondary rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-borderColor bg-bgPanelLight/30">
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map(s => (
            <button 
              key={s} 
              onClick={() => handleSend(s)}
              className="text-[10px] bg-bgPanel hover:bg-bgPanelLight border border-borderColor text-textSecondary hover:text-textPrimary px-2 py-1 rounded-full transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask copilot..."
            className="w-full bg-bgPanel border border-borderColor rounded-lg py-2 pl-3 pr-10 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 p-1.5 text-primary hover:text-primary/80 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
