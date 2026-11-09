import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import NavTabs from '../components/NavTabs';
import api from '../lib/api';

type Tab = 'participants' | 'exclusions' | 'generate' | 'results';

const TAB_PATHS: Record<Tab, string> = {
  participants: '/admin/participants',
  exclusions: '/admin/exclusions',
  generate: '/admin/generate',
  results: '/admin/results',
};

const TAB_LABELS: Record<Tab, string> = {
  participants: 'Participants',
  exclusions: 'Exclusions',
  generate: 'Generate Draw',
  results: 'Results',
};

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('participants');
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the active tab in sync with the URL.
  const path = location.pathname.replace('/admin/', '') as Tab;
  if (path in TAB_PATHS) {
    setActiveTab(path);
  }

  async function handleLogout() {
    localStorage.removeItem('ss_admin_token');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-santa-light">
      <header className="bg-white border-b border-santa-light/40 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-santa-red flex items-center justify-center text-white font-bold text-lg shadow-md">
              🎅
            </div>
            <div>
              <h1 className="text-xl font-bold text-santa-dark tracking-tight">Secret Santa</h1>
              <p className="text-xs text-santa-dark/50">Company Gift Exchange</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-santa-red text-sm font-semibold border border-santa-red/30 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        <NavTabs activeTab={activeTab} onChange={(tab) => navigate(TAB_PATHS[tab])} />
        <Outlet />
      </main>

      <footer className="border-t border-santa-light/40 bg-white/60 py-6 mt-12">
        <p className="text-xs text-santa-dark/40 text-center">
          Secret Santa Generator — assignments are stored securely on the server.
          Participants only see their own recipient.
        </p>
      </footer>
    </div>
  );
}
