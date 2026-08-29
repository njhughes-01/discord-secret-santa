import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SignupForm } from './components/SignupForm';
import { ParticipantPortal } from './components/ParticipantPortal';
import { TrackingForm } from './components/TrackingForm';
import { AdminDashboard } from './components/AdminDashboard';
import { PasscodeGate } from './components/PasscodeGate';
import { AppSettings } from '../shared/types';
import { HeartHandshake, Lock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'signup' | 'portal' | 'tracking' | 'admin'>('signup');
  const [eventPasscode, setEventPasscode] = useState<string | null>(() => localStorage.getItem('event_passcode'));
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch app settings', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handlePasscodeSuccess = (code: string) => {
    setEventPasscode(code);
    localStorage.setItem('event_passcode', code);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        participantCount={settings?.totalParticipants || 0}
        isMatchingComplete={!!settings?.isMatchingComplete}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!eventPasscode && activeTab !== 'admin' ? (
          <PasscodeGate
            onSuccess={handlePasscodeSuccess}
            onAdminClick={() => setActiveTab('admin')}
          />
        ) : (
          <>
            {activeTab === 'signup' && (
              <SignupForm settings={settings} onSignupSuccess={fetchSettings} />
            )}

            {activeTab === 'portal' && (
              <ParticipantPortal />
            )}

            {activeTab === 'tracking' && (
              <TrackingForm />
            )}

            {activeTab === 'admin' && (
              <AdminDashboard />
            )}
          </>
        )}
      </main>

      <footer className="bg-slate-950 border-t border-slate-800 py-6 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center space-x-4">
          <span className="flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Passcode Protected • Anti-Robot Headers Active</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <HeartHandshake className="w-3.5 h-3.5 text-red-400" />
            <span>Hosted at santa.lightmedia.club</span>
          </span>
        </div>
        <p>© 2026 Discord Secret Santa • Built with Node 24 & Docker</p>
      </footer>
    </div>
  );
}
