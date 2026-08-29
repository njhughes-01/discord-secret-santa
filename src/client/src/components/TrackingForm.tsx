import React, { useState } from 'react';
import { Truck, Lock, User, CheckCircle2, AlertCircle, Package } from 'lucide-react';

export const TrackingForm: React.FC = () => {
  const [discordHandle, setDiscordHandle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading' });

    try {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordHandle: discordHandle.trim(),
          passcode: passcode.trim(),
          carrier: carrier.trim(),
          trackingNumber: trackingNumber.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus({ type: 'success', message: data.message });
        setCarrier('');
        setTrackingNumber('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to submit tracking info.' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Upload Package Tracking</h2>
            <p className="text-sm text-slate-400">
              Shipped your Secret Santa gift? Add the tracking details here.
            </p>
          </div>
        </div>

        {status.type === 'error' && (
          <div className="p-4 mb-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        {status.type === 'success' && (
          <div className="p-4 mb-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Your Discord Handle *
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="Username#1234"
                value={discordHandle}
                onChange={(e) => setDiscordHandle(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Event Passcode *
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="Signup passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Shipping Carrier *
            </label>
            <input
              type="text"
              required
              placeholder="USPS, UPS, FedEx, DHL, Amazon, etc."
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Tracking Code / Link *
            </label>
            <div className="relative">
              <Package className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="9400 1000 0000 0000 0000 00"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status.type === 'loading'}
            className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Truck className="w-5 h-5" />
            <span>{status.type === 'loading' ? 'Saving...' : 'Submit Tracking Info'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
