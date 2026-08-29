import React, { useState } from 'react';
import { Lock, ShieldAlert, Gift, ArrowRight } from 'lucide-react';

interface PasscodeGateProps {
  onSuccess: (passcode: string) => void;
  onAdminClick: () => void;
}

export const PasscodeGate: React.FC<PasscodeGateProps> = ({ onSuccess, onAdminClick }) => {
  const [passcode, setPasscode] = useState('');
  const [hpWebsite, setHpWebsite] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'error'; message?: string }>({ type: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading' });

    try {
      const res = await fetch('/api/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode: passcode.trim(),
          hp_website: hpWebsite,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(passcode.trim());
      } else {
        setStatus({ type: 'error', message: data.error || 'Invalid event passcode.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to verify passcode.' });
    }
  };

  return (
    <div className="max-w-md mx-auto my-12">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-red-600 to-emerald-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-red-900/30">
            <Gift className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white">Private Event Access Gate</h2>
          <p className="text-xs text-slate-400">
            This Secret Santa event is private. Enter the passcode provided by your server moderator to view and join the event.
          </p>
        </div>

        {status.type === 'error' && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="hp_website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
            value={hpWebsite}
            onChange={(e) => setHpWebsite(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Event Passcode
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="Enter event passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status.type === 'loading'}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-red-900/40 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
          >
            <span>{status.type === 'loading' ? 'Verifying...' : 'Unlock Event'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-700/80 text-center">
          <button
            onClick={onAdminClick}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium"
          >
            Are you the event moderator? Log into Admin Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
};
