import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Paperclip, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

interface Message {
  id: number;
  type: 'user' | 'agent';
  agentRole?: 'Discovery' | 'Translator' | 'Eligibility' | 'Proposal';
  content: string | React.ReactNode;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'agent',
      agentRole: 'Discovery',
      content: 'Hello! I am your GrantPilot AI Assistant. How can I help you accelerate your funding journey today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: userMsg }]);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      
      let responseContent: React.ReactNode = '';
      let role: Message['agentRole'] = 'Discovery';

      if (userMsg.toLowerCase().includes('broadband')) {
        role = 'Eligibility';
        responseContent = (
          <div>
            <p className="mb-3">I've analyzed your profile against the latest broadband grants. You have a strong match for the <strong>USDA ReConnect Program</strong>.</p>
            <div className="bg-bgPanel/50 border border-borderColor rounded-lg p-3 text-sm">
              <div className="flex items-center mb-2 text-secondary">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Match Score: 88%
              </div>
              <ul className="space-y-1 text-textPrimary">
                <li>• Eligible entity type (Local Gov)</li>
                <li>• Rural area requirement met</li>
                <li>• Missing: Network Architecture Plan</li>
              </ul>
            </div>
            <p className="mt-3 text-xs text-textSecondary italic">Citation: USDA ReConnect NOFO 2026, Section 4.1</p>
          </div>
        );
      } else {
        responseContent = "I can certainly help with that. Would you like me to scan the database for relevant grants or help draft a specific proposal?";
      }

      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'agent',
        agentRole: role,
        content: responseContent
      }]);
    }, 1500);
  };

  const getAgentColor = (role?: string) => {
    switch(role) {
      case 'Discovery': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'Translator': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'Eligibility': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Proposal': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-primary bg-primary/10 border-primary/20';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto">
      {/* Workflow Visualization */}
      <div className="glass-panel p-4 rounded-t-2xl border-b border-borderColor flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 overflow-x-auto hide-scrollbar">
          {['User', 'Discovery Agent', 'Eligibility Agent', 'Translator Agent', 'Proposal Agent'].map((node, idx) => (
            <div key={node} className="flex items-center shrink-0">
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${idx === 2 ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-bgPanel border-borderColor text-textSecondary'}`}>
                {node}
              </div>
              {idx < 4 && (
                <div className="w-6 h-0.5 mx-1 relative overflow-hidden bg-black/5 dark:bg-white/5">
                  <div className={`absolute top-0 left-0 h-full w-full ${idx < 2 ? 'bg-primary/50' : ''}`} />
                  {idx === 1 && (
                    <motion.div 
                      className="absolute top-0 left-0 h-full w-full bg-primary"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="text-xs text-textSecondary hover:text-textPrimary flex items-center">
          <FileText className="w-3 h-3 mr-1" /> View Context
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-panel border-y-0 rounded-none overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                msg.type === 'user' ? 'bg-primary/20 text-primary ml-3' : 'bg-bgPanel border border-borderColor mr-3'
              }`}>
                {msg.type === 'user' ? <User className="w-4 h-4" /> : <Bot className={`w-4 h-4 ${getAgentColor(msg.agentRole).split(' ')[0]}`} />}
              </div>
              
              <div>
                {msg.type === 'agent' && (
                  <div className="flex items-center mb-1">
                    <span className="text-xs font-medium text-textSecondary mr-2">GrantPilot AI</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getAgentColor(msg.agentRole)}`}>
                      {msg.agentRole} Agent
                    </span>
                  </div>
                )}
                <div className={`p-4 rounded-2xl ${
                  msg.type === 'user' 
                    ? 'bg-primary text-textPrimary rounded-tr-none' 
                    : 'bg-bgPanel text-textPrimary border border-borderColor rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-bgPanel border border-borderColor flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-bgPanel border border-borderColor p-4 rounded-2xl rounded-tl-none flex space-x-1">
                <motion.div className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                <motion.div className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                <motion.div className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="glass-panel p-4 rounded-b-2xl shrink-0">
        <div className="mb-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {['Find broadband grants in Texas', 'Summarize requirements for EPA CWSRF', 'Draft a project narrative'].map(suggestion => (
            <button 
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="text-xs bg-bgPanelLight hover:bg-bgPanel border border-borderColor text-textPrimary px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleSend} className="relative flex items-center">
          <button type="button" className="absolute left-3 text-textSecondary hover:text-textPrimary transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything or command an AI agent..."
            className="w-full bg-bgPanel border border-borderColor rounded-xl py-3 pl-11 pr-12 text-textPrimary placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-textPrimary p-1.5 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
