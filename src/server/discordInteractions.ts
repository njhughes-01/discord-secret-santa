import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseInstance } from './db.js';
import { logAudit } from './logger.js';

interface DbSettingRow {
  value: string;
}

export function handleDiscordInteractions(req: Request, res: Response, db: DatabaseInstance) {
  const { type, data, member, user } = req.body;
  const discordUser = member?.user || user;
  const discordId = discordUser?.id || '';
  const discordHandle = discordUser
    ? `${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`
    : 'Unknown';

  // Type 1: Discord PING verification
  if (type === 1) {
    return res.json({ type: 1 });
  }

  // Type 2: Slash Commands (/secret-santa)
  if (type === 2) {
    const commandName = data?.name;
    const subCommand = data?.options?.[0]?.name;

    if (commandName === 'secret-santa' || commandName === 'santa') {
      if (subCommand === 'signup') {
        // Return Modal popup to Discord user
        return res.json({
          type: 9, // MODAL
          data: {
            custom_id: 'secret_santa_signup_modal',
            title: 'Secret Santa Signup 🎁',
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: 'full_name',
                    label: 'Full Name / Shipping Recipient Name',
                    style: 1,
                    required: true,
                    placeholder: 'John Doe',
                  },
                ],
              },
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: 'address',
                    label: 'Full Shipping Address',
                    style: 2,
                    required: true,
                    placeholder: '123 Elm St, Apt 4, City, State, Zip, Country',
                  },
                ],
              },
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: 'wishlist',
                    label: 'Wishlist & Preferences (Optional)',
                    style: 2,
                    required: false,
                    placeholder: 'Favorite colors, sizes, Steam wishlist link...',
                  },
                ],
              },
              {
                type: 1,
                components: [
                  {
                    type: 4,
                    custom_id: 'passcode',
                    label: 'Event Signup Passcode',
                    style: 1,
                    required: true,
                    placeholder: 'Passcode provided by mod',
                  },
                ],
              },
            ],
          },
        });
      }

      // Default or /secret-santa status: Private Ephemeral Assignment Check
      const matchingCompleteRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow;
      const isMatchingComplete = matchingCompleteRow?.value === 'true';

      const participant = db.prepare(`
        SELECT discord_handle FROM participants
        WHERE (discord_id IS NOT NULL AND discord_id = ?)
           OR LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
      `).get(discordId, discordHandle) as { discord_handle: string } | undefined;

      const effectiveHandle = participant ? participant.discord_handle : discordHandle;

      const match = isMatchingComplete
        ? db.prepare('SELECT receiver_name, receiver_handle, receiver_address, receiver_wishlist FROM matches WHERE LOWER(TRIM(giver_handle)) = LOWER(TRIM(?))').get(effectiveHandle) as any
        : null;

      if (match) {
        return res.json({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            flags: 64, // EPHEMERAL (Only caller sees this message)
            content: `🔒 **Private Secret Santa Assignment** (Only visible to you):\n\n🎁 **Recipient**: ${match.receiver_name} (@${match.receiver_handle})\n📍 **Shipping Address**:\n\`\`\`\n${match.receiver_address}\n\`\`\`\n❤️ **Wishlist & Preferences**: ${match.receiver_wishlist || 'None specified'}`,
          },
        });
      } else if (isMatchingComplete) {
        return res.json({
          type: 4,
          data: {
            flags: 64, // EPHEMERAL
            content: '🔒 No Secret Santa assignment found for your account.',
          },
        });
      } else {
        return res.json({
          type: 4,
          data: {
            flags: 64, // EPHEMERAL
            content: `🔒 **Secret Santa Status**: ${participant ? '✅ You are signed up!' : '⚠️ You are not signed up yet.'} Secret Santa matches have not been generated yet. Signups are currently open!`,
          },
        });
      }
    }
  }

  // Type 5: Modal Submits
  if (type === 5) {
    const customId = data?.custom_id;

    if (customId === 'secret_santa_signup_modal') {
      const getVal = (cid: string) => {
        for (const row of data.components || []) {
          for (const comp of row.components || []) {
            if (comp.custom_id === cid) return comp.value;
          }
        }
        return '';
      };

      const fullName = String(getVal('full_name')).trim();
      const address = String(getVal('address')).trim();
      const wishlist = String(getVal('wishlist')).trim();
      const passcode = String(getVal('passcode')).trim();

      // Check passcode
      const passcodeRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_passcode') as DbSettingRow;
      if (!passcodeRow || passcode !== passcodeRow.value) {
        return res.json({
          type: 4,
          data: {
            flags: 64, // EPHEMERAL
            content: '🔒 ❌ Invalid signup passcode. Please check with your server mod.',
          },
        });
      }

      // Check deadline / lock
      const matchingCompleteRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow;
      if (matchingCompleteRow && matchingCompleteRow.value === 'true') {
        return res.json({
          type: 4,
          data: {
            flags: 64, // EPHEMERAL
            content: '🔒 ❌ Secret Santa signups are locked because matches have already been generated.',
          },
        });
      }

      const existing = db.prepare(`
        SELECT id FROM participants
        WHERE (discord_id IS NOT NULL AND discord_id = ?)
           OR LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
      `).get(discordId, discordHandle);

      const now = new Date().toISOString();

      if (existing) {
        db.prepare('UPDATE participants SET discord_id = ?, full_name = ?, address = ?, wishlist = ? WHERE LOWER(TRIM(discord_handle)) = LOWER(TRIM(?)) OR (discord_id IS NOT NULL AND discord_id = ?)').run(discordId, fullName, address, wishlist || '', discordHandle, discordId);
        logAudit(db, 'DISCORD_MODAL_UPDATE', `Participant ${discordHandle} (ID: ${discordId}) updated profile via Discord Modal`, req.ip);
        return res.json({
          type: 4,
          data: {
            flags: 64, // EPHEMERAL
            content: '🔒 ✅ Your Secret Santa shipping details have been updated directly inside Discord!',
          },
        });
      } else {
        const id = uuidv4();
        db.prepare('INSERT INTO participants (id, discord_id, discord_handle, full_name, address, wishlist, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, discordId, discordHandle, fullName, address, wishlist || '', now);
        logAudit(db, 'DISCORD_MODAL_SIGNUP', `Participant ${discordHandle} (ID: ${discordId}) registered via Discord Modal`, req.ip);
        return res.json({
          type: 4,
          data: {
            flags: 64, // EPHEMERAL
            content: '🔒 🎉 Successfully signed up for Secret Santa directly inside Discord! Your details are stored securely.',
          },
        });
      }
    }
  }

  res.json({ type: 4, data: { flags: 64, content: '🔒 Unknown interaction request.' } });
}
