import React from 'react';
import { Gift, Truck, ShieldCheck, UserCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'signup' | 'portal' | 'tracking' | 'admin';
  setActiveTab: (tab: 'signup' | 'portal' | 'tracking' | 'admin') => void;
  participantCount: number;
  isMatchingComplete: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  participantCount,
  isMatchingComplete,
}) => {
  return (
    <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-red-900/30">
            <Gift className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
              Discord Secret Santa
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">santa.lightmedia.club</p>
          </div>
        </div>

        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'signup'
                ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Signup</span>
            {participantCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-900/60 text-emerald-400 font-bold">
                {participantCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('portal')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'portal'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>My Santa Page</span>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'tracking'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/40'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span> Tracking
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'admin'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
