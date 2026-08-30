import React, { useState } from 'react';
import { Radio, Copy, Check, Terminal, ExternalLink, ShieldCheck, Zap, Send, Info, CheckCircle2, Key, HelpCircle } from 'lucide-react';

interface DiscordSetupGuideProps {
  newWebhookUrl: string;
  setNewWebhookUrl: (url: string) => void;
  newPublicKey: string;
  setNewPublicKey: (key: string) => void;
  onSaveDiscordSettings: (e: React.FormEvent) => void;
  onTestWebhook: () => void;
  testWebhookStatus: string | null;
  settingsStatus: string | null;
}

export const DiscordSetupGuide: React.FC<DiscordSetupGuideProps> = ({
  newWebhookUrl,
  setNewWebhookUrl,
  newPublicKey,
  setNewPublicKey,
  onSaveDiscordSettings,
  onTestWebhook,
  testWebhookStatus,
  settingsStatus,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  const interactionsUrl = 'https://santa.lightmedia.club/api/discord/interactions';
  const cliCommand = 'DISCORD_APPLICATION_ID="your_app_id" DISCORD_BOT_TOKEN="your_bot_token" npm run register-discord-commands';

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
      ],
    },
    null,
    2
  );

  const copyText = (text: string, setCopiedFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-800 to-slate-800 border border-indigo-500/40 p-6 rounded-2xl space-y-2">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Radio className="w-6 h-6 text-indigo-400" />
          <span>Discord Server Integration & Configuration Center</span>
        </h2>
        <p className="text-xs text-slate-300">
          Manage your Discord Webhook Announcements, Application Public Key, and native <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">/secret-santa</code> Slash Commands all in one place.
        </p>
      </div>

      {/* Primary Configuration Form */}
      <div className="bg-slate-800/90 border border-indigo-500/50 p-6 rounded-2xl space-y-4 shadow-lg">
        <div className="flex items-center space-x-3 border-b border-slate-700/80 pb-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Discord Integration Settings</span>
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

          <div className="space-y-4">
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
              <p className="text-[11px] text-slate-400 mt-1">
                Used to post automated event match announcements directly to your Discord channel.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Discord Application Public Key (Interaction Verification)</span>
              </label>
              <input
                type="text"
                placeholder="64-character hex string from Discord Developer Portal"
                value={newPublicKey}
                onChange={(e) => setNewPublicKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Required by Discord to authenticate Ed25519 signatures for incoming <code className="text-amber-300 font-mono">/secret-santa</code> slash commands and signup modals.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Discord Integration Settings</span>
            </button>

            <button
              type="button"
              onClick={onTestWebhook}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md"
              title="Send test announcement message to Discord channel"
            >
              <Send className="w-4 h-4" />
              <span>Test Webhook</span>
            </button>
          </div>
        </form>
      </div>

      {/* Complete Step-by-Step Setup Guide */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <span>Step-by-Step Setup Instructions</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Guide Step 1: Webhooks */}
          <div className="bg-slate-800/90 border border-slate-700 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                <span>Step 1: Webhook Announcements</span>
              </div>
              <h4 className="text-sm font-bold text-white">Create Announcement Webhook</h4>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed pt-1">
                <li>In Discord, right-click your channel (e.g. <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">#secret-santa</code>).</li>
                <li>Select <strong>Edit Channel</strong> → <strong>Integrations</strong> → <strong>Webhooks</strong>.</li>
                <li>Click <strong>New Webhook</strong>, set a name, and click <strong>Copy Webhook URL</strong>.</li>
                <li>Paste the URL into the <strong>Discord Webhook URL</strong> field above and click <strong>Save Settings</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Guide Step 2: Public Key */}
          <div className="bg-slate-800/90 border border-slate-700 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Step 2: Obtain Application Public Key</span>
              </div>
              <h4 className="text-sm font-bold text-white">Find Your Discord Public Key</h4>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed pt-1">
                <li>Log into the <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center space-x-0.5 font-semibold"><span>Discord Developer Portal</span> <ExternalLink className="w-3 h-3" /></a>.</li>
                <li>Click your **Application**.</li>
                <li>Under **SETTINGS** in the left menu, select **General Information** (the top item).</li>
                <li>Locate **PUBLIC KEY** (a 64-character hex string), copy it, and paste it into the field above.</li>
              </ol>
            </div>
          </div>

          {/* Guide Step 3: Interactions Endpoint URL */}
          <div className="bg-slate-800/90 border border-slate-700 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Terminal className="w-4 h-4" />
                <span>Step 3: Interactions Endpoint URL</span>
              </div>
              <h4 className="text-sm font-bold text-white">Save Interactions Endpoint URL</h4>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed pt-1">
                <li>In Developer Portal → **General Information**, scroll to **INTERACTIONS ENDPOINT URL**.</li>
                <li>Paste the URL below and click **Save Changes**:</li>
              </ol>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={interactionsUrl}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-[11px]"
                />
                <button
                  onClick={() => copyText(interactionsUrl, setCopiedUrl)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 flex-shrink-0"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-700 text-[11px] text-slate-400">
              🔒 Endpoint responses use Discord Ephemeral privacy (<code className="text-indigo-300 font-mono">flags: 64</code>)—visible ONLY to the user.
            </div>
          </div>

          {/* Guide Step 4: OAuth2 & Command Registration */}
          <div className="bg-slate-800/90 border border-slate-700 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Radio className="w-4 h-4" />
                <span>Step 4: Bot OAuth2 & Slash Commands</span>
              </div>
              <h4 className="text-sm font-bold text-white">Authorize Bot & Register Commands</h4>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed pt-1">
                <li>In Developer Portal → **OAuth2** → **URL Generator**: Check <code className="text-amber-300 font-semibold">bot</code> and <code className="text-amber-300 font-semibold">applications.commands</code>.</li>
                <li>Copy the generated invite link to authorize the bot in your Discord server.</li>
                <li>To register <code className="text-indigo-300 font-mono">/secret-santa</code> with Discord API v10, run:</li>
              </ol>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={cliCommand}
                  className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-300 font-mono text-[10px]"
                />
                <button
                  onClick={() => copyText(cliCommand, setCopiedCli)}
                  className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 flex-shrink-0"
                >
                  {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slash Command Schema JSON Box */}
      <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Slash Command Registration Schema (JSON Payload)</span>
          </h4>
          <button
            onClick={() => copyText(slashCommandJson, setCopiedJson)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedJson ? 'Copied Schema' : 'Copy JSON'}</span>
          </button>
        </div>
        <pre className="bg-slate-900/90 p-4 rounded-xl text-[11px] font-mono text-indigo-300 overflow-x-auto border border-slate-700/80">
          {slashCommandJson}
        </pre>
      </div>
    </div>
  );
};
