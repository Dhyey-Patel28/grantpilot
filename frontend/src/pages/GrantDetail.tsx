import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, FileText, Calendar, DollarSign, Bot, Download, Users, Zap, ExternalLink, Plus, Trash2, ChevronRight } from 'lucide-react';

export function GrantDetail() {
  const { id } = useParams();

  const [checklist, setChecklist] = useState([
    { id: 1, item: 'SF-424 Application for Federal Assistance', done: true },
    { id: 2, item: 'Project Narrative (Max 15 pages)', done: false },
    { id: 3, item: 'Budget Information for Non-Construction Programs', done: false },
    { id: 4, item: 'Environmental Assessment Form', done: true }
  ]);
  
  const [newTask, setNewTask] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Mock data for the view
  const grant = {
    title: 'EPA Clean Water State Revolving Fund',
    agency: 'Environmental Protection Agency',
    amount: '$1.2M - $5M',
    deadline: 'Aug 15, 2026',
    match: 92,
    summary: 'The Clean Water State Revolving Fund (CWSRF) program is a federal-state partnership that provides communities independent and permanent sources of low-cost financing for a wide range of water quality infrastructure projects.',
    whyMatches: [
      'Your recent broadband project in rural areas overlaps with eligible water infrastructure zones.',
      'You meet the "small community" requirement based on your registered population size.',
      'Your organization type (Local Government) is exactly what the EPA is targeting.'
    ]
  };

  const toggleTask = (id: number) => {
    setChecklist(checklist.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTask = (id: number) => {
    setChecklist(checklist.filter(t => t.id !== id));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setChecklist([...checklist, { id: Date.now(), item: newTask, done: false }]);
    setNewTask('');
  };

  const generateChecklist = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setChecklist([
        ...checklist,
        { id: Date.now() + 1, item: 'Letter of Commitment from Local Partners', done: false },
        { id: Date.now() + 2, item: 'Historical Preservation Clearance (Section 106)', done: false }
      ]);
      setIsGenerating(false);
    }, 1500);
  };

  const completedCount = checklist.filter(t => t.done).length;
  const progress = checklist.length === 0 ? 0 : Math.round((completedCount / checklist.length) * 100);
  const strokeDashoffset = 351.8 - (351.8 * progress) / 100;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <Link to="/explorer" className="inline-flex items-center text-sm text-textSecondary hover:text-textPrimary transition-colors mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Explorer
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 rounded-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-primary font-medium mb-2">{grant.agency}</p>
                <h1 className="text-3xl font-bold text-textPrimary leading-tight mb-4">{grant.title}</h1>
              </div>
              <div className="text-right shrink-0 ml-4 cursor-pointer" onClick={() => setShowExplanation(!showExplanation)}>
                <div className="inline-flex flex-col items-center justify-center p-3 rounded-xl bg-bgPanel/80 border border-borderColor hover:border-primary transition-colors">
                  <span className="text-xs text-textSecondary uppercase tracking-wider mb-1">Match</span>
                  <span className="text-2xl font-bold text-secondary">{grant.match}%</span>
                  <span className="text-[10px] text-primary mt-1 flex items-center">Explain <ChevronRight className={`w-3 h-3 ml-0.5 transform transition-transform ${showExplanation ? 'rotate-90' : ''}`} /></span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-borderColor">
              <div>
                <p className="text-textSecondary text-sm mb-1 flex items-center"><DollarSign className="w-4 h-4 mr-1" /> Amount</p>
                <p className="text-textPrimary font-medium">{grant.amount}</p>
              </div>
              <div>
                <p className="text-textSecondary text-sm mb-1 flex items-center"><Calendar className="w-4 h-4 mr-1" /> Deadline</p>
                <p className="text-amber-400 font-medium">{grant.deadline}</p>
              </div>
              <div>
                <p className="text-textSecondary text-sm mb-1 flex items-center"><Users className="w-4 h-4 mr-1" /> Type</p>
                <p className="text-textPrimary font-medium">Local Govt</p>
              </div>
              <div>
                <p className="text-textSecondary text-sm mb-1 flex items-center"><FileText className="w-4 h-4 mr-1" /> Status</p>
                <p className="text-primary font-medium">Open</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="bg-primary hover:bg-primary/90 text-textPrimary px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center">
                <Zap className="w-4 h-4 mr-2" /> Draft Proposal with AI
              </button>
              <button className="bg-bgPanelLight hover:bg-bgPanelLight/80 text-textPrimary border border-borderColor px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center ml-auto">
                <ExternalLink className="w-4 h-4 mr-2" /> Official Site
              </button>
            </div>
          </motion.div>

          {/* AI Summary */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-8 rounded-2xl"
          >
            <h2 className="text-xl font-bold text-textPrimary mb-4 flex items-center">
              <Bot className="w-5 h-5 text-primary mr-2" /> AI Summary & Analysis
            </h2>
            <p className="text-textPrimary leading-relaxed mb-6">{grant.summary}</p>
            
            <AnimatePresence>
              {showExplanation && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-bgPanel/50 border border-primary/20 rounded-xl p-5 mb-6">
                    <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Why this is a {grant.match}% match</h3>
                    <ul className="space-y-3">
                      {grant.whyMatches.map((reason, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 text-secondary mr-3 shrink-0 mt-0.5" />
                          <span className="text-textPrimary text-sm">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="space-y-6">
          {/* Readiness Tracker */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6 rounded-2xl"
          >
            <h2 className="text-lg font-bold text-textPrimary mb-6">Readiness Tracker</h2>
            
            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="transparent" stroke="#1F2937" strokeWidth="12" />
                  <circle cx="64" cy="64" r="56" fill="transparent" stroke="#10B981" strokeWidth="12" strokeDasharray="351.8" strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold text-textPrimary">{progress}%</span>
                  <span className="text-xs text-textSecondary">Ready</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end mb-4">
              <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wider">Required Documents</h3>
              <button 
                onClick={generateChecklist}
                disabled={isGenerating}
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : <><Bot className="w-3 h-3 mr-1" /> Auto-generate</>}
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              <AnimatePresence>
                {checklist.map((item) => (
                  <motion.div 
                    key={item.id} 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-start group p-2 hover:bg-bgPanel/50 rounded-lg transition-colors"
                  >
                    <button 
                      onClick={() => toggleTask(item.id)}
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item.done ? 'bg-secondary text-textPrimary' : 'border border-gray-600 hover:border-primary'}`}
                    >
                      {item.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <span className={`ml-3 text-sm flex-1 ${item.done ? 'text-textSecondary line-through' : 'text-textPrimary'}`}>
                      {item.item}
                    </span>
                    <button 
                      onClick={() => removeTask(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-textSecondary hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <form onSubmit={addTask} className="flex gap-2">
              <input 
                type="text" 
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add new task..."
                className="flex-1 bg-bgPanel border border-borderColor rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary"
              />
              <button type="submit" disabled={!newTask.trim()} className="bg-bgPanelLight hover:bg-bgPanelLight/80 text-textPrimary p-2 rounded-lg transition-colors disabled:opacity-50">
                <Plus className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
