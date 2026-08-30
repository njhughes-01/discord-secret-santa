import React, { useState } from 'react';
import {
  UserCheck,
  Lock,
  User,
  Gift,
  MapPin,
  Heart,
  Truck,
  Copy,
  Check,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar
} from 'lucide-react';
import { ParticipantPortalData } from '../../shared/types';

export const ParticipantPortal: React.FC = () => {
  const [discordHandle, setDiscordHandle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [hpWebsite, setHpWebsite] = useState('');
  const [portalData, setPortalData] = useState<ParticipantPortalData | null>(null);
  const [loginStatus, setLoginStatus] = useState<{ type: 'idle' | 'loading' | 'error'; message?: string }>({ type: 'idle' });

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWishlist, setEditWishlist] = useState('');
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // Tracking form state
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippedAt, setShippedAt] = useState('');
  const [trackingStatus, setTrackingStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginStatus({ type: 'loading' });

    try {
      const res = await fetch('/api/participant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordHandle: discordHandle.trim(),
          passcode: passcode.trim(),
          confirm_email_field: hpWebsite,
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setPortalData(data.data);
        setEditName(data.data.participant.fullName);
        setEditAddress(data.data.participant.address);
        setEditWishlist(data.data.participant.wishlist || '');
        if (data.data.trackingInfo) {
          setCarrier(data.data.trackingInfo.carrier || '');
          setTrackingNumber(data.data.trackingInfo.trackingNumber || '');
          setShippedAt(data.data.trackingInfo.shippedAt || '');
        }
        setLoginStatus({ type: 'idle' });
      } else {
        setLoginStatus({ type: 'error', message: data.error || 'Invalid handle or passcode.' });
      }
    } catch (err) {
      setLoginStatus({ type: 'error', message: 'Failed to connect to server.' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateStatus(null);

    try {
      const res = await fetch('/api/participant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordHandle: discordHandle.trim(),
          passcode: passcode.trim(),
          fullName: editName.trim(),
          address: editAddress.trim(),
          wishlist: editWishlist.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUpdateStatus('Profile updated successfully!');
        setIsEditing(false);
        if (portalData) {
          setPortalData({
            ...portalData,
            participant: {
              ...portalData.participant,
              fullName: editName.trim(),
              address: editAddress.trim(),
              wishlist: editWishlist.trim(),
            },
          });
        }
      } else {
        setUpdateStatus('Error: ' + data.error);
      }
    } catch (err) {
      setUpdateStatus('Failed to update profile.');
    }
  };

  const handleSubmitTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingStatus({ type: 'loading' });

    try {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordHandle: discordHandle.trim(),
          passcode: passcode.trim(),
          carrier: carrier.trim(),
          trackingNumber: trackingNumber.trim(),
          shippedAt: shippedAt.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTrackingStatus({ type: 'success', message: data.message });
      } else {
        setTrackingStatus({ type: 'error', message: data.error || 'Failed to submit tracking.' });
      }
    } catch (err) {
      setTrackingStatus({ type: 'error', message: 'Network error.' });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!portalData) {
    return (
      <div className="max-w-md mx-auto my-10 space-y-6">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white">My Secret Santa Portal</h2>
            <p className="text-sm text-slate-400">Log in to view your assignment, update your address, or add tracking info</p>
          </div>

          {loginStatus.type === 'error' && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{loginStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
                Discord Handle
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Username#1234"
                  value={discordHandle}
                  onChange={(e) => setDiscordHandle(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Signup Passcode
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="Passcode used when signing up"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginStatus.type === 'loading'}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{loginStatus.type === 'loading' ? 'Authenticating...' : 'Access My Santa Page'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { participant, assignedRecipient, assignedRecipients, isMatchingComplete, isDeadlinePassed } = portalData;
  const recipientsList = (assignedRecipients && assignedRecipients.length > 0)
    ? assignedRecipients
    : assignedRecipient
    ? [assignedRecipient]
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Welcome Back</span>
          <h2 className="text-2xl font-bold text-white">{participant.fullName}</h2>
          <p className="text-xs text-slate-400 font-mono">{participant.discordHandle}</p>
        </div>

        <button
          onClick={() => setPortalData(null)}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-all"
        >
          Sign Out Portal
        </button>
      </div>

      {/* Assigned Secret Santa Recipient Cards */}
      {isMatchingComplete && recipientsList.length > 0 ? (
        <div className="space-y-6">
          {recipientsList.map((rec, idx) => (
            <div key={idx} className="bg-gradient-to-r from-red-950/90 via-slate-800 to-slate-800 border-2 border-red-500/80 p-6 sm:p-8 rounded-2xl space-y-4 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-600/30 text-red-400 rounded-xl">
                  <Gift className="w-8 h-8 animate-bounce" />
                </div>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                      {recipientsList.length > 1 ? `Your Assigned Recipient #${idx + 1}` : 'Your Assigned Recipient'}
                    </span>
                    <h3 className="text-2xl font-extrabold text-white">{rec.receiverName}</h3>
                    <p className="text-sm text-emerald-400 font-medium">Discord: {rec.receiverHandle}</p>
                  </div>
                  <div className="px-3 py-1 bg-amber-950/80 text-amber-300 border border-amber-700/60 rounded-xl text-xs font-bold self-start sm:self-center">
                    🎁 Gift Budget: {portalData.giftBudget}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>Shipping Address</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(`${rec.receiverName}\n${rec.receiverAddress}`, `rec-addr-${idx}`)}
                    className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    {copiedId === `rec-addr-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === `rec-addr-${idx}` ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-sm text-slate-100 font-mono whitespace-pre-line leading-relaxed">
                  {rec.receiverAddress}
                </p>
              </div>

              {rec.receiverWishlist && (
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-sm text-slate-300 space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase flex items-center space-x-1">
                    <Heart className="w-3.5 h-3.5 text-pink-400" />
                    <span>Wishlist & Preferences</span>
                  </span>
                  <p className="text-slate-200">{rec.receiverWishlist}</p>
                </div>
              )}
            </div>
          ))}

          {/* Package Tracking Form inside Portal */}
          <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Submit Shipping & Package Tracking</span>
            </h4>

            {trackingStatus.type === 'success' && (
              <div className="p-3 bg-emerald-950 border border-emerald-600 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{trackingStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTracking} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Carrier (Optional)</label>
                <input
                  type="text"
                  placeholder="USPS, UPS, FedEx, Amazon..."
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Tracking Link (Optional)</label>
                <input
                  type="text"
                  placeholder="1Z999... or URL"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Ship Date (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-12-20 or Shipped Today"
                  value={shippedAt}
                  onChange={(e) => setShippedAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={trackingStatus.type === 'loading'}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2"
                >
                  <Package className="w-4 h-4" />
                  <span>Update Package Shipping & Tracking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/80 p-6 rounded-2xl text-center space-y-3">
          <Calendar className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Secret Santa Matching Pending</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isDeadlinePassed
              ? 'Signups have closed! The admin will generate matches shortly.'
              : 'Signups are still open. Once closed, your Secret Santa recipient details will appear right here!'}
          </p>
        </div>
      )}

      {/* Profile Details & Edit Card */}
      <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Your Shipping & Profile Details</span>
          </h3>

          {!isMatchingComplete && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>
          )}
        </div>

        {updateStatus && (
          <div className="p-3 bg-slate-900 border border-emerald-500/50 rounded-xl text-xs text-emerald-300">
            {updateStatus}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Shipping Address</label>
              <textarea
                required
                rows={3}
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Wishlist / Preferences</label>
              <textarea
                rows={2}
                value={editWishlist}
                onChange={(e) => setEditWishlist(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs"
            >
              Save Profile Changes
            </button>
          </form>
        ) : (
          <div className="space-y-3 text-xs text-slate-300">
            <div>
              <span className="text-slate-400 font-semibold block">Full Name:</span>
              <span className="text-white text-sm font-medium">{participant.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Shipping Address:</span>
              <span className="text-slate-200 font-mono whitespace-pre-line bg-slate-900/60 p-3 rounded-xl block border border-slate-700/60 mt-1">
                {participant.address}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Wishlist:</span>
              <span className="text-slate-200 block mt-0.5">{participant.wishlist || 'None specified'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
