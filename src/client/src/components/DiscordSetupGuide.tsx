import React, { useState } from 'react';
import { Radio, Copy, Check, Terminal, ExternalLink, ShieldCheck, Zap, Send, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface DiscordSetupGuideProps {
  newWebhookUrl: string;
  setNewWebhookUrl: (url: string) => void;
  onSaveWebhook: (e: React.FormEvent) => void;
  onTestWebhook: () => void;
  testWebhookStatus: string | null;
  settingsStatus: string | null;
}

export const DiscordSetupGuide: React.FC<DiscordSetupGuideProps> = ({
  newWebhookUrl,
  setNewWebhookUrl,
  onSaveWebhook,
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
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-800 to-slate-800 border border-indigo-500/40 p-6 rounded-2xl space-y-2">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Radio className="w-6 h-6 text-indigo-400" />
          <span>Discord Server Integration & Slash Command Guide</span>
        </h2>
        <p className="text-xs text-slate-300">
          Complete guide to setting up Webhook Announcements and native Discord <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">/secret-santa</code> Slash Commands.
        </p>
      </div>

      {/* Architecture Explanation Box */}
      <div className="bg-slate-800/90 border border-amber-500/30 p-5 rounded-2xl flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <h4 className="font-bold text-white text-sm">💡 Do I need to host a separate Discord Bot process?</h4>
          <p className="leading-relaxed">
            <strong>No!</strong> This Secret Santa application server handles both outbound Webhooks and inbound HTTP Interactions directly. No separate bot runner or gateway daemon is required.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pt-1">
            <li><strong>Part 1 (Outbound Webhooks)</strong>: Post match announcements directly to your channel.</li>
            <li><strong>Part 2 (Inbound Interactions)</strong>: Discord sends HTTP POST requests to <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">{interactionsUrl}</code> when users run <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">/secret-santa</code>.</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Channel Announcements Webhook */}
        <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 border-b border-slate-700/80 pb-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Part 1: Webhook Announcements</span>
                <h3 className="text-base font-bold text-white">Channel Webhook URL</h3>
              </div>
            </div>

            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>In Discord, right-click your channel → <strong>Edit Channel</strong> → <strong>Integrations</strong> → <strong>Webhooks</strong>.</li>
              <li>Click <strong>New Webhook</strong> for your announcement channel (e.g. <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">#secret-santa</code>).</li>
              <li>Copy the Webhook URL and paste it below:</li>
            </ol>
          </div>

          <form onSubmit={onSaveWebhook} className="space-y-3 pt-2">
            {settingsStatus && (
              <div className="p-2 bg-emerald-950 border border-emerald-600 rounded-lg text-emerald-300 text-xs flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{settingsStatus}</span>
              </div>
            )}

            {testWebhookStatus && (
              <div className="p-2 bg-slate-900 border border-indigo-500/60 rounded-lg text-indigo-300 text-xs flex items-center space-x-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-400" />
                <span>{testWebhookStatus}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Discord Webhook URL
              </label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all"
              >
                Save Webhook URL
              </button>

              <button
                type="button"
                onClick={onTestWebhook}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center space-x-1 transition-all"
                title="Send test embed message to Discord channel"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test Webhook</span>
              </button>
            </div>
          </form>
        </div>

        {/* Step 2: Native Discord Slash Commands & Modals */}
        <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 border-b border-slate-700/80 pb-3">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Part 2: In-App Interactions</span>
                <h3 className="text-base font-bold text-white">Interactions Endpoint Setup</h3>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>Log into the <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center space-x-1 font-semibold"><span>Discord Developer Portal</span> <ExternalLink className="w-3 h-3" /></a> and select your Application.</li>
                <li>In the left menu under <strong>SETTINGS</strong>, click <strong>General Information</strong> (the top menu item).</li>
                <li>Scroll to <strong>INTERACTIONS ENDPOINT URL</strong>, paste the URL below, and click <strong>Save Changes</strong>:</li>
              </ol>
            </div>

            <div>
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
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 text-[11px] text-slate-400">
            🔒 Slash command responses use Discord Ephemeral privacy (<code className="text-indigo-300 font-mono">flags: 64</code>)—visible ONLY to the user.
          </div>
        </div>
      </div>

      {/* Step 3: OAuth2 Bot Scopes & Slash Command Registration */}
      <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-700/80 pb-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Part 3: Authorization & Slash Command Registration</span>
            <h3 className="text-base font-bold text-white">OAuth2 Scopes & 1-Command Slash Command Installer</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 space-y-2">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <span>1. Enable OAuth2 Scopes</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              In Discord Developer Portal → <strong>OAuth2</strong> → <strong>URL Generator</strong>:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-1 font-semibold">
              <li>Check <code className="text-amber-300">bot</code></li>
              <li>Check <code className="text-amber-300">applications.commands</code></li>
            </ul>
            <p className="text-slate-400 text-[11px] pt-1">
              Copy the generated invite URL to authorize <code className="text-indigo-300 font-mono">/secret-santa</code> in your server!
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 space-y-2">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <span>2. Register /secret-santa Command</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Run this 1-line CLI command from your terminal to register the slash command with Discord API v10:
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                readOnly
                value={cliCommand}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-amber-300 font-mono text-[10px]"
              />
              <button
                onClick={() => copyText(cliCommand, setCopiedCli)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 flex-shrink-0"
              >
                {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCli ? 'Copied' : 'Copy'}</span>
              </button>
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
