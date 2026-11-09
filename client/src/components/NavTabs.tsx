import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

type Tab = 'participants' | 'exclusions' | 'generate' | 'results';

const TABS: Record<Tab, { label: string; path: string; icon: string }> = {
  participants: { label: 'Participants', path: '/admin/participants', icon: '👥' },
  exclusions: { label: 'Exclusions', path: '/admin/exclusions', icon: '⛔' },
  generate: { label: 'Generate Draw', path: '/admin/generate', icon: '🎲' },
  results: { label: 'Results', path: '/admin/results', icon: '🎁' },
};

interface NavTabsProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export default function NavTabs({ activeTab, onChange }: NavTabsProps) {
  const navigate = useNavigate();

  return (
    <nav className="flex flex-wrap gap-1 mb-6 border-b border-santa-light/40 pb-4">
      {Object.entries(TABS).map(([key, tab]) => {
        const t = key as Tab;
        const isActive = activeTab === t;
        return (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              onChange(t);
              navigate(tab.path);
            }}
            className={`px-5 py-3 rounded-t-xl font-medium text-sm transition-all border-b-2 ${
              isActive
                ? 'bg-santa-red text-white border-santa-red shadow-md'
                : 'bg-white text-santa-dark/60 border-transparent hover:text-santa-red hover:bg-santa-light/20'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>{tab.label}
          </button>
        );
      })}
    </nav>
  );
}
