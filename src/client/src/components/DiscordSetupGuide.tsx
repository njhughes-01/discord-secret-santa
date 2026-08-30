import React, { useState } from 'react';
import { Radio, Copy, Check, Terminal, ExternalLink, ShieldCheck, Zap, Send, Info, CheckCircle2, Key, HelpCircle, Sparkles } from 'lucide-react';

interface DiscordSetupGuideProps {
  newWebhookUrl: string;
  setNewWebhookUrl: (url: string) => void;
  newPublicKey: string;
  setNewPublicKey: (key: string) => void;
  newAppId: string;
  setNewAppId: (id: string) => void;
  newBotToken: string;
  setNewBotToken: (token: string) => void;
  newChannelId: string;
  setNewChannelId: (id: string) => void;
  onSaveDiscordSettings: (e: React.FormEvent) => void;
  onTestWebhook: () => void;
  onRegisterCommands: () => void;
  testWebhookStatus: string | null;
  registerStatus: string | null;
  settingsStatus: string | null;
}

export const DiscordSetupGuide: React.FC<DiscordSetupGuideProps> = ({
  newWebhookUrl,
  setNewWebhookUrl,
  newPublicKey,
  setNewPublicKey,
  newAppId,
  setNewAppId,
  newBotToken,
  setNewBotToken,
  newChannelId,
  setNewChannelId,
  onSaveDiscordSettings,
  onTestWebhook,
  onRegisterCommands,
  testWebhookStatus,
  registerStatus,
  settingsStatus,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const interactionsUrl = 'https://santa.lightmedia.club/api/discord/interactions';

  const slashCommandJson = JSON.stringify(
    {
      name: 'secret-santa',
      description: 'Secret Santa Event Management & Status',
      options: [
        {
          name: 'signup',
          description: 'Open Secret Santa signup form directly inside Discord',
          type: 1,
        },
        {
          name: 'status',
          description: 'Privately check your assigned Secret Santa recipient',
          type: 1,
        },
        {
          name: 'tracking',
          description: 'Submit package tracking code and ship date for your gift recipient',
          type: 1,
        },
        {
          name: 'info',
          description: 'View event details, budget, signup deadline, and total participants',
          type: 1,
        },
      ],
    },
    null,
    2
  );

  const copyInteractionsUrl = () => {
    navigator.clipboard.writeText(interactionsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyJsonPayload = () => {
    navigator.clipboard.writeText(slashCommandJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. App Credentials & Configuration Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-7 backdrop-blur shadow-2xl space-y-5">
        <div className="flex items-center space-x-3 pb-2 border-b border-slate-700/60">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Discord Integration Settings</span>
            <h3 className="text-base font-bold text-white">Application Credentials & Webhook URL</h3>
          </div>
        </div>

        <form onSubmit={onSaveDiscordSettings} className="space-y-4">
          {settingsStatus && (
            <div className="p-3 bg-emerald-950 border border-emerald-600 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{settingsStatus}</span>
            </div>
          )}

          {testWebhookStatus && (
            <div className="p-3 bg-slate-900 border border-indigo-500/60 rounded-xl text-indigo-300 text-xs flex items-center space-x-2">
              <Send className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{testWebhookStatus}</span>
            </div>
          )}

          {registerStatus && (
            <div className="p-3 bg-slate-900 border border-amber-500/60 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{registerStatus}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Discord Webhook URL (Channel Announcements)</span>
              </label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Discord Public Key (Ed25519 Request Verification)</span>
              </label>
              <input
                type="text"
                placeholder="64-character hex string from Discord Developer Portal"
                value={newPublicKey}
                onChange={(e) => setNewPublicKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Discord Application ID (Client ID)</span>
              </label>
              <input
                type="text"
                placeholder="18-19 digit numeric ID from General Information"
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>Discord Bot Token (Required for 1-Click Command Setup)</span>
              </label>
              <input
                type="password"
                placeholder="Bot Token from Developer Portal ➔ Bot tab"
                value={newBotToken}
                onChange={(e) => setNewBotToken(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Allowed Discord Channel ID (Optional Single-Channel Restriction)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789012345678 (Leave blank to allow all channels)"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Right-click your #secret-santa channel in Discord and select <strong>Copy Channel ID</strong>. If set, Santa commands will only work inside that channel!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Discord Integration Settings</span>
            </button>

            {newWebhookUrl && (
              <button
                type="button"
                onClick={onTestWebhook}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-indigo-300 font-semibold rounded-xl text-xs transition-all flex items-center space-x-2 border border-indigo-500/30"
              >
                <Send className="w-4 h-4 text-indigo-400" />
                <span>Test Webhook Announcement</span>
              </button>
            )}

            {newAppId && newBotToken && (
              <button
                type="button"
                onClick={onRegisterCommands}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-900/30 transition-all flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>⚡ 1-Click Register /secret-santa Slash Command</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 2. Step-by-Step Setup Guide */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-7 backdrop-blur shadow-2xl space-y-6">
        <div className="flex items-center space-x-3 pb-2 border-b border-slate-700/60">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Interactive Discord Setup Walkthrough</h3>
            <p className="text-xs text-slate-400">Follow these 5 steps to configure Discord Slash Commands and Announcements</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Step 1 Box */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                <Radio className="w-4 h-4" />
                <span>Step 1: Set Interactions Endpoint URL</span>
              </div>
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center space-x-1"
              >
                <span>Discord Developer Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p>
              In the Discord Developer Portal under <strong>General Information</strong>, copy your <strong>PUBLIC KEY</strong> and paste it above. Then paste this exact URL into the <strong>INTERACTIONS ENDPOINT URL</strong> field and click <strong>Save Changes</strong>:
            </p>

            <div className="flex items-center space-x-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <code className="text-emerald-400 font-mono text-[11px] flex-1 truncate">{interactionsUrl}</code>
              <button
                onClick={copyInteractionsUrl}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] flex items-center space-x-1 transition-all"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Step 2 Box */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-purple-400 font-bold">
              <Key className="w-4 h-4" />
              <span>Step 2: Generate OAuth2 Invite URL</span>
            </div>
            <p>
              Under <strong>OAuth2</strong> ➔ <strong>URL Generator</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-300">
              <li>Select Scopes: <code className="text-amber-300 font-mono bg-slate-950 px-1 py-0.5 rounded">bot</code> and <code className="text-amber-300 font-mono bg-slate-950 px-1 py-0.5 rounded">applications.commands</code></li>
              <li>Bot Permissions: Check <code className="text-emerald-300 font-mono bg-slate-950 px-1 py-0.5 rounded">Send Messages</code>, <code className="text-emerald-300 font-mono bg-slate-950 px-1 py-0.5 rounded">Embed Links</code>, and <code className="text-emerald-300 font-mono bg-slate-950 px-1 py-0.5 rounded">Use Slash Commands</code></li>
              <li>Copy the generated URL and open it in your browser to invite the bot to your Discord server!</li>
            </ul>
          </div>

          {/* Step 3 Box */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-amber-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>Step 3: Enable Discord Webhook Announcements</span>
            </div>
            <p>
              In your Discord Server, right-click your announcements channel ➔ <strong>Edit Channel</strong> ➔ <strong>Integrations</strong> ➔ <strong>Webhooks</strong> ➔ <strong>New Webhook</strong>. Copy the Webhook URL, paste it into the field above, and click <strong>Save Discord Integration Settings</strong>.
            </p>
          </div>

          {/* Step 4 Box */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Step 4: Auto-Register /secret-santa Slash Command (1-Click)</span>
              </div>
            </div>

            <p>
              To enable <strong><code>/secret-santa signup</code></strong>, <strong><code>/secret-santa status</code></strong>, <strong><code>/secret-santa tracking</code></strong>, and <strong><code>/secret-santa info</code></strong> in Discord, fill in your <strong>Application ID</strong> and <strong>Bot Token</strong> above, then click the glowing <strong>⚡ 1-Click Register</strong> button!
            </p>

            {newAppId && newBotToken ? (
              <button
                type="button"
                onClick={onRegisterCommands}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-900/40 transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>⚡ 1-Click Register /secret-santa Slash Command Now</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-950 rounded-lg text-[11px] text-amber-300/80 flex items-center space-x-2 border border-amber-500/20">
                <Info className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>Enter your Application ID & Bot Token above to enable 1-Click Auto-Registration.</span>
              </div>
            )}
          </div>

          {/* Step 5 Box: Channel Restriction Guide */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-blue-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Step 5: Restrict Bot Commands to a Single Channel</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              To guarantee that the Secret Santa bot only works inside one designated channel (e.g. <code>#secret-santa</code>):
            </p>
            <div className="bg-slate-950 p-3 rounded-lg text-xs space-y-2 text-slate-300 font-mono">
              <div><strong>Method A (Discord Native Permissions - Recommended)</strong>:</div>
              <div className="text-slate-400 pl-3">
                1. Go to <strong>Server Settings</strong> ➔ <strong>Integrations</strong> ➔ <strong>Bots and Apps</strong> ➔ Select <strong>Secret Santa Bot</strong>.<br/>
                2. Under <strong>Command Permissions</strong>, set <code>@everyone</code> / All Channels to <strong>Disabled</strong>.<br/>
                3. Click <strong>Add Channels</strong>, pick <code>#secret-santa</code>, and set it to <strong>Enabled</strong>!
              </div>
              <div className="pt-2"><strong>Method B (Software Channel Lock)</strong>:</div>
              <div className="text-slate-400 pl-3">
                Enter your designated Channel ID in the <strong>Allowed Discord Channel ID</strong> field above and click <strong>Save Discord Integration Settings</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
