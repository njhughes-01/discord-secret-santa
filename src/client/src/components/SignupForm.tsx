import React, { useState } from 'react';
import { Gift, Lock, User, MapPin, Heart, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { AppSettings } from '../../shared/types';

interface SignupFormProps {
  settings: AppSettings | null;
  onSignupSuccess: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ settings, onSignupSuccess }) => {
  const [discordHandle, setDiscordHandle] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [wishlist, setWishlist] = useState('');
  const [passcode, setPasscode] = useState('');
  const [hpWebsite, setHpWebsite] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  const isDeadlinePassed = settings?.signupDeadline ? new Date() > new Date(settings.signupDeadline) : false;
  const isMatchingDone = settings?.isMatchingComplete;
  const isLocked = isDeadlinePassed || isMatchingDone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setStatus({ type: 'loading' });

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordHandle: discordHandle.trim(),
          fullName: fullName.trim(),
          address: address.trim(),
          wishlist: wishlist.trim(),
          passcode: passcode.trim(),
          hp_website: hpWebsite,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus({ type: 'success', message: data.message });
        onSignupSuccess();
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to sign up.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    }
  };

  const formattedDeadline = settings?.signupDeadline
    ? new Date(settings.signupDeadline).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-red-900/40 via-slate-800 to-emerald-900/40 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
            <Gift className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Join Server Secret Santa</h2>
            <p className="text-sm text-slate-300">
              Exchange gifts with your server friends! Fill in your details below.
            </p>
          </div>
        </div>

        {formattedDeadline && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5 mb-6 text-amber-300">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Signup Deadline: <strong className="font-semibold">{formattedDeadline}</strong></span>
            </div>
            {settings?.giftBudget && (
              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-lg text-xs font-bold">
                🎁 Budget: {settings.giftBudget}
              </span>
            )}
          </div>
        )}

        {isLocked ? (
          <div className="p-6 bg-slate-900/90 border border-amber-500/40 rounded-xl text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-lg font-bold text-amber-300">Signups are Currently Closed</h3>
            <p className="text-sm text-slate-300">
              {isMatchingDone
                ? 'Secret Santa assignments have already been generated!'
                : 'The signup deadline has passed. Contact the server admin for details.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot Bot Trap Field */}
            <input
              type="text"
              name="confirm_email_field"
              tabIndex={-1}
              autoComplete="off"
              data-lpignore="true"
              className="hidden"
              aria-hidden="true"
              value={hpWebsite}
              onChange={(e) => setHpWebsite(e.target.value)}
            />

            {status.type === 'error' && (
              <div className="p-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span>{status.message}</span>
              </div>
            )}

            {status.type === 'success' && (
              <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>{status.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Discord Handle *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Username#1234 or @username"
                    value={discordHandle}
                    onChange={(e) => setDiscordHandle(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name / Recipient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Shipping Address *
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                <textarea
                  required
                  rows={3}
                  placeholder="123 Santa Lane, Suite 100&#10;North Pole, NP 99999&#10;Country"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                🔒 Shipping addresses are strictly private and kept secure. Never indexed by search engines.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Wishlist / Gift Preferences (Optional)
              </label>
              <div className="relative">
                <Heart className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  placeholder="Favorite colors, sizes, hobbies, Steam wishlist link, or allergies..."
                  value={wishlist}
                  onChange={(e) => setWishlist(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Signup Passcode *
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="Provided by server mod / admin"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status.type === 'loading'}
              className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-red-900/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Gift className="w-5 h-5" />
              <span>{status.type === 'loading' ? 'Saving...' : 'Submit Secret Santa Signup'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
