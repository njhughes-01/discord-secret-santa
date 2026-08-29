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
          <span>Discord Server Integration & Control Center</span>
        </h2>
        <p className="text-xs text-slate-300">
          Configure automated event announcements and enable native Discord Slash Commands & Modals.
        </p>
      </div>

      {/* Architecture Explanation Box */}
      <div className="bg-slate-800/90 border border-amber-500/30 p-5 rounded-2xl flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <h4 className="font-bold text-white text-sm">💡 Do I need to host a separate Discord Bot runner?</h4>
          <p className="leading-relaxed">
            <strong>No!</strong> This Secret Santa server natively handles Discord Webhooks and HTTP Interactions directly. You do <strong>not</strong> need to host a Gateway bot daemon.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pt-1">
            <li><strong>Part 1 (Outbound Webhooks)</strong>: Sends automated match announcements to your Discord channel.</li>
            <li><strong>Part 2 (Inbound Interactions)</strong>: Discord calls <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">{interactionsUrl}</code> when users run <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px]">/secret-santa</code>.</li>
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
              <li>In Discord, go to <strong>Server Settings</strong> → <strong>Integrations</strong> → <strong>Webhooks</strong>.</li>
              <li>Create a Webhook for your announcement channel (e.g. <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">#secret-santa</code>).</li>
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
                <h3 className="text-base font-bold text-white">Slash Commands & Modals</h3>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <p>
                In the <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center space-x-1 font-semibold"><span>Discord Developer Portal</span> <ExternalLink className="w-3 h-3" /></a>:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                <li>Go to <strong>General Information</strong>.</li>
                <li>Paste this URL into <strong>Interactions Endpoint URL</strong>:</li>
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
            🔒 Responses to <code className="text-indigo-300 font-mono">/secret-santa</code> use Discord Ephemeral privacy (visible ONLY to the user).
          </div>
        </div>
      </div>

      {/* Slash Command Schema JSON Box */}
      <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Slash Command Registration Schema (Discord Developer Portal)</span>
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
