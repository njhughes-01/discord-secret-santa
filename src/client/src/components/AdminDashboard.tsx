import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Users,
  Shuffle,
  Truck,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Download,
  Search,
  Copy,
  Check,
  DollarSign,
  Radio,
  Send
} from 'lucide-react';
import { Participant, Match, TrackingInfo, AuditLog } from '../../shared/types';
import { DiscordSetupGuide } from './DiscordSetupGuide';

export const AdminDashboard: React.FC = () => {
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [adminPasscode, setAdminPasscode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'matches' | 'participants' | 'tracking' | 'audit' | 'discord' | 'settings'>('matches');

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [trackingList, setTrackingList] = useState<TrackingInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings form state
  const [newSignupPasscode, setNewSignupPasscode] = useState('');
  const [newAdminPasscode, setNewAdminPasscode] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newGiftBudget, setNewGiftBudget] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newPublicKey, setNewPublicKey] = useState('');
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: adminPasscode }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        setAdminToken(data.token);
        localStorage.setItem('admin_token', data.token);
        setAdminPasscode('');
      } else {
        setLoginError(data.error || 'Invalid admin passcode.');
      }
    } catch (err) {
      setLoginError('Failed to connect to server.');
    }
  };

  const handleLogout = () => {
    if (adminToken) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
    setAdminToken(null);
    localStorage.removeItem('admin_token');
  };

  const fetchAdminData = async () => {
    if (!adminToken) return;
    setLoading(true);

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      // Fetch current settings for settings/discord tabs
      if (activeTab === 'settings' || activeTab === 'discord') {
        const sRes = await fetch('/api/admin/settings', { headers });
        const sData = await sRes.json();
        if (sData.success) {
          setNewWebhookUrl(sData.data.discordWebhookUrl || '');
          setNewPublicKey(sData.data.discordPublicKey || '');
          setNewDeadline(sData.data.signupDeadline || '');
          setNewGiftBudget(sData.data.giftBudget || '');
        }
      }

      if (activeTab === 'matches' || activeTab === 'participants') {
        const pRes = await fetch('/api/admin/participants', { headers });
        const pData = await pRes.json();
        if (pData.success) setParticipants(pData.data);

        const mRes = await fetch('/api/admin/matches', { headers });
        const mData = await mRes.json();
        if (mData.success) setMatches(mData.data);
      } else if (activeTab === 'tracking') {
        const tRes = await fetch('/api/admin/tracking', { headers });
        const tData = await tRes.json();
        if (tData.success) setTrackingList(tData.data);
      } else if (activeTab === 'audit') {
        const aRes = await fetch('/api/admin/audit-logs', { headers });
        const aData = await aRes.json();
        if (aData.success) setAuditLogs(aData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMatches = async () => {
    if (!adminToken) return;
    if (!window.confirm('Are you sure you want to generate Secret Santa matches? This will pair all registered participants randomly!')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/generate-matches', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAdminData();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to generate matches.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          signupPasscode: newSignupPasscode || undefined,
          adminPasscode: newAdminPasscode || undefined,
          signupDeadline: newDeadline || undefined,
          giftBudget: newGiftBudget || undefined,
          discordWebhookUrl: newWebhookUrl !== undefined ? newWebhookUrl : undefined,
          discordPublicKey: newPublicKey !== undefined ? newPublicKey : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSettingsStatus('Settings updated successfully!');
        setNewSignupPasscode('');
        setNewAdminPasscode('');
      } else {
        setSettingsStatus('Error: ' + data.error);
      }
    } catch (err) {
      setSettingsStatus('Failed to update settings.');
    }
  };

  const handleTestWebhook = async () => {
    if (!adminToken) return;
    setTestWebhookStatus('Sending test message...');

    try {
      const res = await fetch('/api/admin/test-webhook', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data = await res.json();
      if (data.success) {
        setTestWebhookStatus('✅ ' + data.message);
      } else {
        setTestWebhookStatus('❌ Error: ' + data.error);
      }
    } catch (err) {
      setTestWebhookStatus('❌ Network error testing webhook.');
    }
  };

  const downloadCsv = async (endpoint: string, filename: string) => {
    if (!adminToken) return;
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Export failed.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredParticipants = participants.filter(
    (p) =>
      p.discordHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMatches = matches.filter(
    (m) =>
      m.giverHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.receiverHandle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto my-12">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white">Admin Dashboard Login</h2>
            <p className="text-sm text-slate-400">Enter the admin passcode to manage Secret Santa</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Admin Passcode
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="Passcode"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-900/40 transition-all flex items-center justify-center space-x-2 text-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Authenticate Admin</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>Secret Santa Admin Control Panel</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage participants, generate matches, and track package status</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadCsv('/api/admin/export/participants', 'participants.csv')}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5"
            title="Export Participants CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleGenerateMatches}
            disabled={loading || participants.length < 2}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md flex items-center space-x-2 disabled:opacity-50"
          >
            <Shuffle className="w-4 h-4" />
            <span>Generate Secret Santa Matches</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-all"
            title="Log Out Admin"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Admin Navigation Sub-Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-700 pb-3">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'matches' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            <span>Matches ({matches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('participants')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'participants' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Participants ({participants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'tracking' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Tracking ({trackingList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('discord')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'discord' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-4 h-4 text-indigo-300" />
            <span>Discord Integration & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'audit' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit & Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Event Settings</span>
          </button>
        </div>

        {(activeTab === 'matches' || activeTab === 'participants') && (
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search handle or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-700/60">
              <Shuffle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-300">No Secret Santa Matches Generated Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Once signups close, click the <strong>Generate Secret Santa Matches</strong> button above to pair everyone up.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.map((m) => (
                <div key={m.id} className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                    <div className="text-sm font-bold text-red-400 flex items-center space-x-1">
                      <span>🎅 Secret Santa:</span>
                      <span className="text-white">{m.giverHandle}</span>
                    </div>
                    <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                      Assigned
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="text-xs text-slate-400 uppercase font-semibold">🎁 Gifting To:</div>
                    <div className="font-bold text-emerald-300">{m.receiverName} ({m.receiverHandle})</div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60 relative space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Shipping Address:</span>
                      <button
                        onClick={() => copyToClipboard(`${m.receiverName}\n${m.receiverAddress}`, m.id)}
                        className="text-slate-400 hover:text-white flex items-center space-x-1"
                        title="Copy Address"
                      >
                        {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-slate-200 whitespace-pre-line font-mono text-[11px]">{m.receiverAddress}</p>
                  </div>

                  {m.receiverWishlist && (
                    <div className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 font-semibold">Wishlist / Preferences: </span>
                      {m.receiverWishlist}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Discord Handle</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Shipping Address</th>
                  <th className="px-4 py-3">Wishlist</th>
                  <th className="px-4 py-3">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-semibold text-white">{p.discordHandle}</td>
                    <td className="px-4 py-3 text-slate-200">{p.fullName}</td>
                    <td className="px-4 py-3 whitespace-pre-line font-mono text-xs text-slate-300">{p.address}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{p.wishlist || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden">
          {trackingList.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No package tracking numbers submitted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Giver Discord Handle</th>
                    <th className="px-4 py-3">Carrier</th>
                    <th className="px-4 py-3">Tracking Code</th>
                    <th className="px-4 py-3">Shipped Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {trackingList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-semibold text-emerald-400">{t.giverHandle}</td>
                      <td className="px-4 py-3 text-white font-medium">{t.carrier}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-200">{t.trackingNumber}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(t.shippedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'discord' && (
        <DiscordSetupGuide
          newWebhookUrl={newWebhookUrl}
          setNewWebhookUrl={setNewWebhookUrl}
          newPublicKey={newPublicKey}
          setNewPublicKey={setNewPublicKey}
          onSaveDiscordSettings={handleUpdateSettings}
          onTestWebhook={handleTestWebhook}
          testWebhookStatus={testWebhookStatus}
          settingsStatus={settingsStatus}
        />
      )}

      {activeTab === 'audit' && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden space-y-4 p-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>System Audit & Debug Logs</span>
          </h3>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Details</th>
                  <th className="px-3 py-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30">
                    <td className="px-3 py-2 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.severity === 'error' ? 'bg-red-950 text-red-400 border border-red-800' :
                        log.severity === 'warn' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-slate-900 text-slate-300'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold text-amber-300">{log.action}</td>
                    <td className="px-3 py-2 text-slate-200">{log.details}</td>
                    <td className="px-3 py-2 text-slate-500">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-amber-400" />
            <span>Event & Passcode Settings</span>
          </h3>

          {settingsStatus && (
            <div className="p-3 bg-emerald-950 border border-emerald-600 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{settingsStatus}</span>
            </div>
          )}

          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                New Participant Signup Passcode
              </label>
              <input
                type="text"
                placeholder="Leave blank to keep current"
                value={newSignupPasscode}
                onChange={(e) => setNewSignupPasscode(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                New Admin Passcode
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep current"
                value={newAdminPasscode}
                onChange={(e) => setNewAdminPasscode(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gift Spending Limit / Budget</span>
              </label>
              <input
                type="text"
                placeholder="e.g. $25 - $50"
                value={newGiftBudget}
                onChange={(e) => setNewGiftBudget(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Signup Deadline Date & Time (ISO format)
              </label>
              <input
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Discord Application Public Key (Required for Slash Command Verification)
              </label>
              <input
                type="text"
                placeholder="64-character hex string from Discord Developer Portal"
                value={newPublicKey}
                onChange={(e) => setNewPublicKey(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs placeholder-slate-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Found in Discord Developer Portal → <strong>General Information</strong> → <strong>PUBLIC KEY</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Discord Webhook URL (Announcements)
              </label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs placeholder-slate-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl shadow-md text-sm transition-all"
            >
              Save Settings
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
