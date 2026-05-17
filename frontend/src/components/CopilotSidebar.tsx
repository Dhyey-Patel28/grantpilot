"use client";
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Bot, Send, Sparkles, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface Message {
  id: number;
  type: 'user' | 'agent';
  content: string | React.ReactNode;
}

const defaultMessages: Message[] = [
  {
    id: 1,
    type: 'agent',
    content: "Hi! I'm your Grant Copilot. I can analyze match scores, draft memos, or identify missing documents for your current active project."
  }
];

export const CopilotSidebar = memo(function CopilotSidebar() {
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(1);

  // Hydrate state from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('grantpilot_copilot_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setMessages(parsed);
          prevMessageCountRef.current = parsed.length;
        }
      }
      const collapsed = localStorage.getItem('grantpilot_copilot_collapsed');
      if (collapsed !== null) setIsExpanded(collapsed !== 'true');
    } catch {
      // Ignore malformed saved sidebar state.
    }
  }, []);

  // Only save to localStorage when messages actually change
  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      const stringMessages = messages.filter(m => typeof m.content === 'string');
      localStorage.setItem('grantpilot_copilot_messages', JSON.stringify(stringMessages));
    }
  }, [messages]);

  // Scroll to bottom only when messages change or typing starts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  const toggleCollapse = useCallback(() => {
    setIsExpanded(prev => {
      const next = !prev;
      localStorage.setItem('grantpilot_copilot_collapsed', (!next).toString());
      return next;
    });
  }, []);

  const handleSend = useCallback((userText: string) => {
    if (!userText.trim()) return;
    
    setInput('');
    const userMsg: Message = { id: Date.now(), type: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
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
  }, []);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  }, [handleSend, input]);

  const suggestions = ['Explain this fit score', 'Identify missing documents', 'Generate council memo'];

  return (
    <div
      className="glass-panel border-l border-borderColor flex flex-col z-20 shrink-0 h-full bg-bgPanel/80 backdrop-blur-xl relative"
      style={{
        width: isExpanded ? '320px' : '56px',
        minWidth: isExpanded ? '320px' : '56px',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -left-3 top-5 w-6 h-6 rounded-full flex items-center justify-center z-30 border border-borderColor bg-bgPanel hover:bg-bgPanelLight hover:border-primary/30 text-textSecondary hover:text-primary transition-all duration-200 shadow-lg"
        title={isExpanded ? 'Collapse Copilot' : 'Open Grant Copilot'}
      >
        {isExpanded ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* ── Collapsed Rail ── */}
      {!isExpanded && (
        <div className="flex flex-col items-center pt-14 gap-4">
          <button
            onClick={toggleCollapse}
            className="group flex flex-col items-center gap-1.5"
            title="Open Grant Copilot"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:shadow-[0_0_16px_rgba(59,130,246,0.2)] transition-all duration-200">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
          </button>
        </div>
      )}

      {/* ── Expanded Content ── */}
      <div
        className="flex flex-col h-full"
        style={{
          opacity: isExpanded ? 1 : 0,
          pointerEvents: isExpanded ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
          transitionDelay: isExpanded ? '0.15s' : '0s',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-borderColor flex items-center bg-bgPanelLight/30 shrink-0">
          <Sparkles className="w-5 h-5 text-primary mr-2" />
          <h2 className="font-bold text-textPrimary">Grant Copilot</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${msg.type === 'user' ? 'bg-primary text-white rounded-l-xl rounded-tr-xl' : 'bg-bgPanel border border-borderColor text-textPrimary rounded-r-xl rounded-tl-xl'} p-3 text-sm shadow-md`}>
                {msg.type === 'agent' && <div className="flex items-center mb-1 text-xs text-primary font-medium"><Bot className="w-3 h-3 mr-1"/> GrantPilot AI</div>}
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-bgPanel border border-borderColor p-3 rounded-r-xl rounded-tl-xl flex space-x-1">
                <span className="w-1.5 h-1.5 bg-textSecondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-textSecondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-textSecondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-borderColor bg-bgPanelLight/30 shrink-0">
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
            onSubmit={handleFormSubmit}
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
    </div>
  );
});
