"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Search, Bot, CheckCircle2, ArrowRight, XCircle, FileSignature } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function IntakeWorkflow() {
  const [description, setDescription] = useState('Clare County has about 31,400 residents and faces a broken bridge and broken pipes that are causing flooding...');
  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  const [isScoring, setIsScoring] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);

  const router = useRouter();

  const handleGenerateProfile = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/profile-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const data = await res.json();
      setProfile(data);
    } catch (e) {
      console.error(e);
      alert('Failed to generate profile');
    }
    setIsGenerating(false);
  };

  const handleFindMatches = () => {
    setIsScoring(true);
    setTimeout(() => {
      // Mock scoring based on the user instructions
      const good = [
        { id: 101, title: 'Bridge Investment Program', agency: 'DOT', amount: '$5M', match: 96 },
        { id: 102, title: 'Safe Streets and Roads for All', agency: 'DOT', amount: '$2M', match: 91 },
        { id: 103, title: 'Clean Water State Revolving Fund', agency: 'EPA', amount: '$1.5M', match: 88 },
        { id: 104, title: 'Transportation Alternatives Program', agency: 'DOT', amount: '$1M', match: 85 }
      ];
      const bad = [
        { id: 201, title: 'NIH Clinical Trial Grant', agency: 'NIH', reason: 'Health research not infrastructure' },
        { id: 202, title: 'Cancer Center Support Grant', agency: 'NIH', reason: 'Unrelated category' }
      ];
      setMatches(good);
      setRejected(bad);
      setIsScoring(false);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-textPrimary tracking-tight mb-2">Project Intake & Match Engine</h1>
        <p className="text-textSecondary">Describe your community problem and let Watsonx Orchestrate generate a profile and match grants.</p>
      </div>

      {/* Step 1: Intake */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-textPrimary flex items-center mb-4">
          <Bot className="w-5 h-5 text-primary mr-2" /> 1. Project Intake
        </h2>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-bgPanel/50 border border-borderColor rounded-xl p-4 text-sm text-textPrimary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[120px] mb-4"
          placeholder="Describe your community project..."
        />
        <button 
          onClick={handleGenerateProfile}
          disabled={isGenerating || !description.trim()}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center"
        >
          {isGenerating ? 'Generating...' : <><Zap className="w-4 h-4 mr-2" /> Generate Profile</>}
        </button>
      </div>

      {/* Step 2: Project Profile */}
      {profile && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-textPrimary flex items-center mb-4">
            <Search className="w-5 h-5 text-secondary mr-2" /> 2. Generated Project Profile
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-bgPanel p-3 rounded-lg border border-borderColor">
              <p className="text-xs text-textSecondary">Community</p>
              <p className="font-semibold text-textPrimary">{profile.community_name}</p>
            </div>
            <div className="bg-bgPanel p-3 rounded-lg border border-borderColor">
              <p className="text-xs text-textSecondary">Category</p>
              <p className="font-semibold text-textPrimary capitalize">{profile.project_category}</p>
            </div>
            <div className="bg-bgPanel p-3 rounded-lg border border-borderColor">
              <p className="text-xs text-textSecondary">Est. Cost</p>
              <p className="font-semibold text-textPrimary">${profile.estimated_cost?.toLocaleString()}</p>
            </div>
            <div className="bg-bgPanel p-3 rounded-lg border border-borderColor">
              <p className="text-xs text-textSecondary">Population</p>
              <p className="font-semibold text-textPrimary">{profile.population?.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-sm font-semibold mb-2 text-textPrimary">Keywords</p>
            <div className="flex flex-wrap gap-2">
              {profile.impact_keywords?.map((kw: string) => (
                <span key={kw} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded border border-primary/20">{kw}</span>
              ))}
            </div>
          </div>

          <button 
            onClick={handleFindMatches}
            disabled={isScoring}
            className="bg-secondary hover:bg-secondary/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center"
          >
            {isScoring ? 'Scoring Database...' : <><Search className="w-4 h-4 mr-2" /> Find Matching Grants</>}
          </button>
        </motion.div>
      )}

      {/* Step 3: Match Engine */}
      {matches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <h2 className="text-lg font-bold text-textPrimary flex items-center">
            <CheckCircle2 className="w-5 h-5 text-secondary mr-2" /> 3. Match Engine Results
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Matches */}
            <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-secondary">
              <h3 className="font-bold text-textPrimary mb-4">Top Ranked Matches</h3>
              <div className="space-y-3">
                {matches.map(m => (
                  <div key={m.id} className="bg-bgPanel border border-borderColor p-3 rounded-xl flex justify-between items-center group">
                    <div>
                      <p className="text-sm font-bold text-textPrimary group-hover:text-secondary transition-colors">{m.title}</p>
                      <p className="text-xs text-textSecondary">{m.agency} • {m.amount}</p>
                    </div>
                    <div className="text-lg font-bold text-secondary bg-secondary/10 px-3 py-1 rounded-lg">
                      {m.match}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rejected Matches */}
            <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-red-500">
              <h3 className="font-bold text-textPrimary mb-4">Rejected (Poor Fit)</h3>
              <div className="space-y-3">
                {rejected.map(r => (
                  <div key={r.id} className="bg-bgPanel border border-red-500/20 p-3 rounded-xl">
                    <p className="text-sm font-bold text-textPrimary line-through opacity-70">{r.title}</p>
                    <p className="text-xs text-red-400 mt-1 flex items-center">
                      <XCircle className="w-3 h-3 mr-1" /> {r.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              onClick={() => router.push('/packet')}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 flex items-center"
            >
              Build Readiness Packet <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
