import React, { useState } from 'react';
import { Radio, Copy, Check, Terminal, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

export const DiscordSetupGuide: React.FC = () => {
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
          <span>Discord Server Connection & Setup Guide</span>
        </h2>
        <p className="text-xs text-slate-300">
          Easily connect your Discord server to send automated event announcements and enable native Discord Slash Commands & Modals with a 1-minute setup!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Channel Announcements Webhook */}
        <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-700/80 pb-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Step 1 (Required for Announcements)</span>
              <h3 className="text-base font-bold text-white">Channel Announcement Webhook</h3>
            </div>
          </div>

          <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2.5 leading-relaxed">
            <li>Open your Discord Server and navigate to <strong>Server Settings</strong> → <strong>Integrations</strong>.</li>
            <li>Click <strong>Webhooks</strong> → <strong>New Webhook</strong>.</li>
            <li>Choose your Secret Santa announcements channel (e.g. <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">#secret-santa</code>).</li>
            <li>Click <strong>Copy Webhook URL</strong>.</li>
            <li>Paste the URL in the <strong>Settings tab</strong> in this Admin Panel and click <strong>Test Webhook</strong>!</li>
          </ol>
        </div>

        {/* Step 2: Native Discord Slash Commands & Modals */}
        <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-700/80 pb-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Step 2 (Optional - In-App Modals)</span>
              <h3 className="text-base font-bold text-white">Slash Commands & Modals</h3>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-300">
              Allow members to run <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">/secret-santa signup</code> directly inside Discord!
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Interactions Endpoint URL
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={interactionsUrl}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-[11px]"
                />
                <button
                  onClick={() => copyText(interactionsUrl, setCopiedUrl)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>Discord Developer Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Slash Command Schema JSON Box */}
      <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Slash Command Registration Schema</span>
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
