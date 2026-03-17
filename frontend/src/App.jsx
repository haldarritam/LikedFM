import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

function App() {
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    fetch('/api/info').then(r => r.json()).then(setServerInfo).catch(() => {});
  }, []);

  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 px-6 py-2 flex justify-between items-center z-50">
          <span className="text-xs text-gray-500">
            {serverInfo ? `${serverInfo.ip}:${serverInfo.port}` : '...'}
          </span>
          <a
            href="/settings"
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition"
            title="Settings"
          >
            ⚙️
          </a>
        </div>
      </div>
    </Router>
  );
}

export default App;
