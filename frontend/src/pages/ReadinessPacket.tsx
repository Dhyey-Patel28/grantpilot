import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Copy, Send, Save, AlertTriangle, FileCheck, HelpCircle, Activity, Bookmark, XCircle } from 'lucide-react';

const TABS = [
  'Application Starter Fields',
  'Recommended Grant Shortlist',
  'Missing Requirements',
  'Council Memo Draft',
  'Resident FAQ',
  '30-Day Action Plan',
  'Human Review Checklist'
];

export function ReadinessPacket() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [isEditable, setIsEditable] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [status, setStatus] = useState('Draft');

  // Application Starter State
  const [starterData, setStarterData] = useState({
    title: 'Clare County Comprehensive Water and Transportation Infrastructure Rehabilitation Initiative',
    problem: 'Clare County faces severe compounding infrastructure deterioration. Critical municipal pipe failures have led to recurrent localized flooding and water contamination risks. Simultaneously, three primary rural bridges exhibit significant structural deficiency, threatening transportation access and emergency response times. The intersection of these failures creates severe public safety risks and stalls regional economic development, necessitating immediate holistic intervention.',
    benefit: '• Restores reliable transportation access for 15,000+ rural residents\n• Reduces catastrophic flooding risks by 85%\n• Improves emergency response times by an average of 4 minutes\n• Modernizes municipal infrastructure to exceed current EPA standards',
    request: '$4,250,000'
  });

  // Human Review State
  const [reviewItems, setReviewItems] = useState([
    { id: 1, label: 'Verify eligibility', done: true },
    { id: 2, label: 'Confirm deadlines', done: true },
    { id: 3, label: 'Engineering review', done: false },
    { id: 4, label: 'Legal review', done: false },
    { id: 5, label: 'Budget approval', done: false },
    { id: 6, label: 'Final submission review', done: false }
  ]);

  useEffect(() => {
    const localPacket = localStorage.getItem('grantpilot_readiness_packet');
    if (localPacket) {
      try {
        const parsed = JSON.parse(localPacket);
        if (parsed.starterData) setStarterData(parsed.starterData);
        if (parsed.reviewItems) setReviewItems(parsed.reviewItems);
        if (parsed.status) setStatus(parsed.status);
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    setIsEditable(false);
    localStorage.setItem('grantpilot_readiness_packet', JSON.stringify({ starterData, reviewItems, status }));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSendToReview = () => {
    setStatus('Sent for Human Review');
    localStorage.setItem('grantpilot_readiness_packet', JSON.stringify({ starterData, reviewItems, status: 'Sent for Human Review' }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(starterData, null, 2));
    alert('Content copied to clipboard');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Application Starter Fields':
        return (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-sm font-semibold text-textSecondary uppercase tracking-wider mb-2">Project Title</label>
              {isEditable ? (
                <input 
                  value={starterData.title} onChange={e => setStarterData({...starterData, title: e.target.value})}
                  className="w-full bg-bgPanel border border-primary/50 rounded-lg p-3 text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <h3 className="text-xl font-bold text-textPrimary bg-bgPanel/50 p-4 rounded-xl border border-borderColor">{starterData.title}</h3>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-textSecondary uppercase tracking-wider mb-2">Problem Statement</label>
              {isEditable ? (
                <textarea 
                  value={starterData.problem} onChange={e => setStarterData({...starterData, problem: e.target.value})}
                  className="w-full bg-bgPanel border border-primary/50 rounded-lg p-4 text-textPrimary min-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="text-sm text-textPrimary leading-relaxed bg-bgPanel/50 p-4 rounded-xl border border-borderColor">{starterData.problem}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-textSecondary uppercase tracking-wider mb-2">Public Benefit</label>
              {isEditable ? (
                <textarea 
                  value={starterData.benefit} onChange={e => setStarterData({...starterData, benefit: e.target.value})}
                  className="w-full bg-bgPanel border border-primary/50 rounded-lg p-4 text-textPrimary min-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <div className="text-sm text-textPrimary leading-relaxed bg-bgPanel/50 p-4 rounded-xl border border-borderColor whitespace-pre-wrap">{starterData.benefit}</div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-textSecondary uppercase tracking-wider mb-2">Funding Request Amount</label>
              {isEditable ? (
                <input 
                  value={starterData.request} onChange={e => setStarterData({...starterData, request: e.target.value})}
                  className="w-full bg-bgPanel border border-primary/50 rounded-lg p-3 text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="text-xl font-bold text-secondary bg-bgPanel/50 p-4 rounded-xl border border-borderColor inline-block">{starterData.request}</p>
              )}
            </div>
          </div>
        );
      
      case 'Missing Requirements':
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-red-400">Engineering Assessment Missing</h4>
                <p className="text-sm text-textSecondary mt-1">Required for EPA Clean Water State Revolving Fund. Schedule site survey immediately.</p>
              </div>
            </div>
            <div className="bg-amber-400/10 border border-amber-400/20 p-4 rounded-xl flex items-start">
              <Activity className="w-5 h-5 text-amber-400 mr-3 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-400">Budget Estimate Incomplete</h4>
                <p className="text-sm text-textSecondary mt-1">Contractor quotes needed to finalize the $4.25M funding request.</p>
              </div>
            </div>
            <div className="bg-amber-400/10 border border-amber-400/20 p-4 rounded-xl flex items-start">
              <FileCheck className="w-5 h-5 text-amber-400 mr-3 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-400">Council Approval Pending</h4>
                <p className="text-sm text-textSecondary mt-1">Resolution required prior to final DOT submission.</p>
              </div>
            </div>
            <div className="bg-bgPanelLight p-4 rounded-xl flex items-start border border-borderColor">
              <FileText className="w-5 h-5 text-textSecondary mr-3 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-textPrimary">Environmental Review Needed</h4>
                <p className="text-sm text-textSecondary mt-1">Phase 1 Environmental Site Assessment (ESA) must be initiated.</p>
              </div>
            </div>
          </div>
        );

      case 'Recommended Grant Shortlist':
        return (
          <div className="overflow-x-auto animate-fade-in">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderColor">
                  <th className="pb-3 text-xs font-semibold text-textSecondary uppercase">Grant Name</th>
                  <th className="pb-3 text-xs font-semibold text-textSecondary uppercase">Match</th>
                  <th className="pb-3 text-xs font-semibold text-textSecondary uppercase">Amount</th>
                  <th className="pb-3 text-xs font-semibold text-textSecondary uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor">
                {[
                  { name: 'EPA Clean Water State Revolving Fund', match: 95, amount: '$5M max', badge: 'Strong Match', color: 'text-secondary bg-secondary/10 border-secondary/20' },
                  { name: 'USDA Rural Development Water Grants', match: 88, amount: 'Varies', badge: 'Strong Match', color: 'text-secondary bg-secondary/10 border-secondary/20' },
                  { name: 'DOT RAISE Discretionary Grants', match: 65, amount: '$25M max', badge: 'Possible Match', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
                  { name: 'FEMA BRIC', match: 30, amount: '$50M max', badge: 'Poor Match', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
                ].map((g, i) => (
                  <tr key={i} className="hover:bg-bgPanelLight/30 transition-colors">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-textPrimary text-sm">{g.name}</p>
                      <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded border ${g.color}`}>{g.badge}</span>
                    </td>
                    <td className="py-4 text-sm font-bold text-textPrimary">{g.match}%</td>
                    <td className="py-4 text-sm text-textSecondary">{g.amount}</td>
                    <td className="py-4 text-right space-x-2">
                      <button className="p-1.5 rounded bg-bgPanel border border-borderColor hover:text-primary transition-colors"><FileText className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded bg-bgPanel border border-borderColor hover:text-secondary transition-colors"><Bookmark className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded bg-bgPanel border border-borderColor hover:text-red-400 transition-colors"><XCircle className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'Human Review Checklist':
        return (
          <div className="space-y-3 animate-fade-in">
            {reviewItems.map(item => (
              <div key={item.id} className="flex items-center group bg-bgPanelLight/50 p-3 rounded-lg border border-borderColor">
                <button 
                  onClick={() => {
                    const newItems = reviewItems.map(i => i.id === item.id ? { ...i, done: !i.done } : i);
                    setReviewItems(newItems);
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${item.done ? 'bg-secondary border-secondary text-white' : 'border-gray-500 hover:border-primary'}`}
                >
                  {item.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <span className={`ml-3 text-sm transition-colors ${item.done ? 'text-textSecondary line-through' : 'text-textPrimary'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        );

      case '30-Day Action Plan':
        return (
          <div className="space-y-6 animate-fade-in relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-borderColor before:to-transparent">
            {[
              { week: 'Week 1', tasks: ['Gather engineering documents', 'Verify organizational eligibility in SAM.gov'], color: 'bg-primary' },
              { week: 'Week 2', tasks: ['Finalize formalized cost estimates', 'Prepare council memo for approval'], color: 'bg-amber-400' },
              { week: 'Week 3', tasks: ['Complete proposal narrative draft', 'Secure matching fund commitment letters'], color: 'bg-secondary' },
              { week: 'Week 4', tasks: ['Final human review of packet', 'Submit via Grants.gov workspace'], color: 'bg-primary' },
            ].map((plan, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-bgApp ${plan.color} text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10`}>
                  <span className="text-xs font-bold">{i+1}</span>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-4 rounded-xl">
                  <h4 className="font-bold text-textPrimary mb-2">{plan.week}</h4>
                  <ul className="text-sm text-textSecondary space-y-1 list-disc list-inside">
                    {plan.tasks.map((t, idx) => <li key={idx}>{t}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        );

      case 'Resident FAQ':
        return (
          <div className="space-y-4 animate-fade-in">
            {[
              { q: 'Why is this project needed?', a: 'To address severe flooding risks and failing infrastructure that threatens public safety and restricts transportation access in rural zones.' },
              { q: 'How will grant funding help?', a: 'It covers up to 80% of the $4.25M cost, saving local taxpayers millions while enabling comprehensive modernization instead of patchwork fixes.' },
              { q: 'Will roads close during repairs?', a: 'Temporary partial closures will occur, but one lane will remain open on primary routes to maintain emergency access.' },
              { q: 'How much funding is requested?', a: 'We are requesting $4,250,000 across multiple federal and state grants to fully fund the initiative.' }
            ].map((faq, i) => (
              <div key={i} className="bg-bgPanel/50 border border-borderColor p-4 rounded-xl">
                <h4 className="font-bold text-textPrimary flex items-start">
                  <HelpCircle className="w-5 h-5 text-primary mr-2 shrink-0 mt-0.5" />
                  {faq.q}
                </h4>
                <p className="mt-2 text-sm text-textSecondary pl-7">{faq.a}</p>
              </div>
            ))}
          </div>
        );

      case 'Council Memo Draft':
      default:
        return (
          <div className="bg-bgPanel/50 border border-borderColor p-8 rounded-xl font-serif text-textPrimary leading-relaxed animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-center border-b border-borderColor pb-4">MEMORANDUM</h2>
            <div className="mb-8 space-y-2 text-sm">
              <p><span className="font-bold w-20 inline-block">TO:</span> Clare County Board of Commissioners</p>
              <p><span className="font-bold w-20 inline-block">FROM:</span> Infrastructure Planning Department</p>
              <p><span className="font-bold w-20 inline-block">DATE:</span> August 12, 2026</p>
              <p><span className="font-bold w-20 inline-block">SUBJECT:</span> Authorization to Apply for EPA Clean Water SRF Grant</p>
            </div>
            <p className="mb-4">This memorandum requests formal authorization to submit a grant application to the EPA Clean Water State Revolving Fund for the Comprehensive Water and Transportation Infrastructure Rehabilitation Initiative.</p>
            <p className="mb-4">The requested amount of $4,250,000 will address severe infrastructure deterioration, specifically localized flooding events and failing bridges. An estimated 20% local match ($850,000) will be required, allocated from the 2027 Capital Improvements Fund.</p>
            <p className="mb-8">Approval of this resolution is required prior to our final submission deadline of August 15, 2026.</p>
            <div className="border-t border-borderColor pt-4 mt-8">
              <p className="font-bold text-sm mb-4">Proposed Action:</p>
              <p className="text-sm italic">"Motion to approve Resolution 26-04 authorizing the submission of the EPA Clean Water State Revolving Fund grant application and committing to the required 20% local match."</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-8rem)]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-textPrimary tracking-tight">Readiness Packet</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${status === 'Draft' ? 'bg-bgPanelLight text-textSecondary border-borderColor' : 'bg-primary/10 text-primary border-primary/20'}`}>
              {status}
            </span>
          </div>
          <p className="text-textSecondary">AI-generated application materials and strategic funding plans.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button onClick={() => alert("Downloading readiness-packet.pdf...")} className="bg-bgPanel hover:bg-bgPanelLight text-textPrimary border border-borderColor px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <Download className="w-4 h-4 mr-2" /> PDF
          </button>
          <button onClick={() => alert("Downloading readiness-packet.md...")} className="bg-bgPanel hover:bg-bgPanelLight text-textPrimary border border-borderColor px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <FileText className="w-4 h-4 mr-2" /> Markdown
          </button>
          <button onClick={handleCopy} className="bg-bgPanel hover:bg-bgPanelLight text-textPrimary border border-borderColor px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <Copy className="w-4 h-4 mr-2" /> Copy
          </button>
          <button onClick={handleSendToReview} className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Send className="w-4 h-4 mr-2" /> Send to Review
          </button>
          <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
            <Save className="w-4 h-4 mr-2" /> {isSaved ? 'Saved!' : 'Save Project'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* LEFT SIDEBAR */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="glass-panel p-4 rounded-2xl h-full flex flex-col">
            <h2 className="text-sm font-bold text-textSecondary uppercase tracking-wider mb-4 px-2">Packet Contents</h2>
            <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
                    activeTab === tab ? 'text-primary bg-primary/10' : 'text-textSecondary hover:text-textPrimary hover:bg-bgPanelLight/50'
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div className="absolute left-0 top-1/4 h-1/2 w-1 bg-primary rounded-r-full" layoutId="activeTabIndicator" />
                  )}
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden min-h-[500px]">
          <div className="p-5 border-b border-borderColor bg-bgPanelLight/30 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold text-textPrimary">{activeTab}</h2>
            {activeTab === 'Application Starter Fields' && (
              <button 
                onClick={() => setIsEditable(!isEditable)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                  isEditable ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-bgPanel text-textSecondary border-borderColor hover:text-textPrimary'
                }`}
              >
                {isEditable ? 'Done Editing' : 'Edit Content'}
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
