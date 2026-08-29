import process from 'node:process';

const appId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID; // Optional: Guild ID for instant development testing

if (!appId || !botToken) {
  console.log(`
🤖 Discord Slash Command Auto-Registration CLI

Usage:
  DISCORD_APPLICATION_ID="your_app_id" DISCORD_BOT_TOKEN="your_bot_token" npm run register-discord-commands

Optional:
  DISCORD_GUILD_ID="your_guild_id" (registers commands instantly in specific server for testing)
`);
  process.exit(0);
}

const url = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

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
  ],
};

console.log(`🚀 Registering /secret-santa slash command with Discord API v10...`);
console.log(`Target: ${guildId ? `Guild (${guildId})` : 'Global Commands'}`);

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commandPayload),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(`✅ Success! Command /secret-santa registered with ID: ${data.id}`);
  } else {
    const errorText = await res.text();
    console.error(`❌ Discord API returned error (${res.status}): ${errorText}`);
  }
} catch (err) {
  console.error(`❌ Network error registering slash command:`, err);
}
