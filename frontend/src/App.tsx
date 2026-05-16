import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { GrantExplorer } from './pages/GrantExplorer';
import { GrantDetail } from './pages/GrantDetail';
import { Translator } from './pages/Translator';
import { AIAssistant } from './pages/AIAssistant';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Documents } from './pages/Documents';
import { Agents } from './pages/Agents';
import { ReadinessPacket } from './pages/ReadinessPacket';

import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const savedSettings = localStorage.getItem('grantpilot_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.theme === 'light') {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }
      } catch(e) {}
    }
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/explorer" element={<GrantExplorer />} />
          <Route path="/explorer/:id" element={<GrantDetail />} />
          <Route path="/translator" element={<Translator />} />
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/packet" element={<ReadinessPacket />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
