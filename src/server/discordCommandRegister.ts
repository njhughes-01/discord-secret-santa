import { DatabaseInstance } from './db.js';
import { logAudit } from './logger.js';

interface DbSettingRow {
  value: string;
}

export async function registerDiscordCommandsWithApi(
  appId?: string,
  botToken?: string,
  db?: DatabaseInstance
): Promise<{ success: boolean; message: string }> {
  const targetAppId = (appId || process.env.DISCORD_APPLICATION_ID || (db ? (db.prepare('SELECT value FROM settings WHERE key = ?').get('discord_app_id') as DbSettingRow)?.value : '') || '').trim();
  const targetBotToken = (botToken || process.env.DISCORD_BOT_TOKEN || (db ? (db.prepare('SELECT value FROM settings WHERE key = ?').get('discord_bot_token') as DbSettingRow)?.value : '') || '').trim();

  if (!targetAppId || !targetBotToken) {
    return {
      success: false,
      message: 'Both Discord Application ID and Bot Token are required to auto-register Slash Commands with Discord.'
    };
  }

  const url = `https://discord.com/api/v10/applications/${targetAppId}/commands`;
  const commandPayload = {
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
    ],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${targetBotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandPayload),
    });

    if (res.ok) {
      const data = await res.json();
      const msg = `Successfully registered /secret-santa slash command with Discord API v10 (Command ID: ${data.id})`;
      console.log(`✅ [DISCORD COMMAND REGISTER] ${msg}`);
      if (db) {
        logAudit(db, 'DISCORD_COMMAND_REGISTER_SUCCESS', msg, 'internal');
      }
      return { success: true, message: msg };
    } else {
      const errorText = await res.text();
      const msg = `Discord API returned HTTP ${res.status}: ${errorText}`;
      console.error(`🚨 [DISCORD COMMAND REGISTER] ${msg}`);
      if (db) {
        logAudit(db, 'DISCORD_COMMAND_REGISTER_FAILED', msg, 'internal', 'error');
      }
      return { success: false, message: msg };
    }
  } catch (err: any) {
    const msg = `Failed to connect to Discord API: ${err?.message || err}`;
    console.error(`🚨 [DISCORD COMMAND REGISTER] ${msg}`);
    return { success: false, message: msg };
  }
}
