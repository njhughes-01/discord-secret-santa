import { Request, Response } from 'express';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseInstance } from './db.js';
import { logAudit } from './logger.js';

interface DbSettingRow {
  value: string;
}

interface DbParticipantRow {
  id: string;
  discord_id?: string;
  discord_handle: string;
  full_name: string;
  address: string;
  wishlist?: string;
}

export async function verifyDiscordRequestSignature(req: Request, db?: DatabaseInstance): Promise<boolean> {
  const dbPublicKey = db ? (db.prepare('SELECT value FROM settings WHERE key = ?').get('discord_public_key') as DbSettingRow)?.value : undefined;
  const publicKeyHex = (process.env.DISCORD_PUBLIC_KEY || dbPublicKey || '').trim();

  const signature = req.headers['x-signature-ed25519'] as string;
  const timestamp = req.headers['x-signature-timestamp'] as string;

  console.log(`🔍 [DISCORD INTERACTION REQUEST] Incoming interaction check from IP: ${req.ip}`);
  console.log(`   ├─ Signature Header: ${signature ? signature.substring(0, 12) + '...' : 'MISSING'}`);
  console.log(`   ├─ Timestamp Header: ${timestamp || 'MISSING'}`);
  console.log(`   └─ Configured Public Key: ${publicKeyHex ? publicKeyHex.substring(0, 12) + '... (Length: ' + publicKeyHex.length + ')' : 'NONE (MISSING!)'}`);

  // If request does NOT have Discord signature headers (e.g. internal local test), bypass verification
  if (!signature && !timestamp) {
    console.log('   └─ No Discord signature headers present. Bypassing signature check for local test.');
    return true;
  }

  const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

  if (!signature || !timestamp || !rawBody) {
    console.warn('⚠️ [DISCORD INTERACTION CHECK] Missing signature, timestamp, or raw body.');
    return false;
  }

  if (!publicKeyHex) {
    const errorMsg = 'DISCORD_PUBLIC_KEY is not configured in Admin Settings or VPS .env file!';
    console.error(`🚨 [DISCORD INTERACTION CHECK] ${errorMsg}`);
    if (db) {
      logAudit(db, 'DISCORD_KEY_MISSING', errorMsg, req.ip, 'error');
    }
    return false;
  }

  try {
    const isValid = await verifyKey(rawBody, signature, timestamp, publicKeyHex);
    console.log(`   └─ Ed25519 Verification Result: ${isValid ? '✅ VALID SIGNATURE (HTTP 200)' : '❌ INVALID SIGNATURE (HTTP 401)'}`);
    return isValid;
  } catch (err: any) {
    console.error(`🚨 [DISCORD INTERACTION CHECK] Exception during verifyKey: ${err?.message || err}`);
    return false;
  }
}

function buildSignupModal(existing?: DbParticipantRow) {
  return {
    type: InteractionResponseType.MODAL || 9,
    data: {
      custom_id: 'secret_santa_signup_modal',
      title: existing ? 'Update Secret Santa Info 🎁' : 'Secret Santa Signup 🎁',
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
              value: existing?.full_name || '',
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
              value: existing?.address || '',
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
              value: existing?.wishlist || '',
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
  };
}

function buildTrackingModal(existing?: { carrier: string; tracking_number: string; shipped_at: string }) {
  return {
    type: InteractionResponseType.MODAL || 9,
    data: {
      custom_id: 'secret_santa_tracking_modal',
      title: 'Submit Package Tracking 📦',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'carrier',
              label: 'Shipping Carrier (e.g. USPS, UPS, FedEx)',
              style: 1,
              required: false,
              placeholder: 'USPS, UPS, FedEx, Amazon, Hand Delivered...',
              value: existing?.carrier || '',
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'tracking_number',
              label: 'Tracking Number / Package Link',
              style: 1,
              required: false,
              placeholder: '1Z9999999999999999 or tracking URL',
              value: existing?.tracking_number || '',
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'shipped_at',
              label: 'Ship Date / Est Delivery Date',
              style: 1,
              required: false,
              placeholder: 'e.g. 2026-12-20 or Shipped Today',
              value: existing?.shipped_at || '',
            },
          ],
        },
      ],
    },
  };
}

export async function handleDiscordInteractions(req: Request, res: Response, db: DatabaseInstance) {
  // 1. Ed25519 signature verification MUST run first on all incoming requests (including PING)
  if (!(await verifyDiscordRequestSignature(req, db))) {
    logAudit(db, 'DISCORD_SIG_FAILED', 'Invalid Discord interaction Ed25519 request signature', req.ip, 'warn');
    return res.status(401).send('Invalid request signature');
  }

  const { type, data, member, user } = req.body;

  // 2. Type 1 (PING): Respond with HTTP 200 { type: 1 } (PONG) for Discord Developer Portal verification
  if (type === InteractionType.PING || type === 1) {
    logAudit(db, 'DISCORD_PING', 'Discord Developer Portal interactions endpoint PING verified', req.ip);
    return res.json({ type: InteractionResponseType.PONG || 1 });
  }

  const discordUser = member?.user || user;
  const discordId = discordUser?.id || '';
  const discordHandle = discordUser
    ? `${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`
    : 'Unknown';

  // 3. Optional Allowed Channel ID enforcement
  const allowedChannelId = (db ? (db.prepare('SELECT value FROM settings WHERE key = ?').get('discord_channel_id') as DbSettingRow)?.value : '') || '';
  const currentChannelId = req.body.channel_id || req.body.channel?.id;

  if (allowedChannelId && currentChannelId && currentChannelId !== allowedChannelId) {
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
      data: {
        flags: 64, // EPHEMERAL
        content: `🔒 **Secret Santa commands can only be used in <#${allowedChannelId}>!** Please head over to <#${allowedChannelId}> to participate in Secret Santa. 🎅`,
      },
    });
  }

  // Type 2 (APPLICATION_COMMAND): Slash Commands (/secret-santa)
  if (type === InteractionType.APPLICATION_COMMAND || type === 2) {
    const commandName = data?.name;
    const subCommand = data?.options?.[0]?.name;

    if (commandName === 'secret-santa' || commandName === 'santa') {
      if (subCommand === 'signup') {
        // Check if matches have already been generated for this year
        const matchingCompleteRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow;
        if (matchingCompleteRow && matchingCompleteRow.value === 'true') {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
            data: {
              flags: 64, // EPHEMERAL
              content: '🔒 Secret Santa matches have already been generated for this event! Registrations and updates are now locked.',
            },
          });
        }

        // Check if user is already registered
        const existing = db.prepare(`
          SELECT id, discord_id, discord_handle, full_name, address, wishlist
          FROM participants
          WHERE (discord_id IS NOT NULL AND discord_id = ?)
             OR LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
        `).get(discordId, discordHandle) as DbParticipantRow | undefined;

        if (!existing) {
          // Not registered yet -> Open blank modal directly
          return res.json(buildSignupModal());
        } else {
          // Already registered -> Prompt with ephemeral confirmation message & interactive buttons
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
            data: {
              flags: 64, // EPHEMERAL
              content: `🔒 **You are already registered for Secret Santa!**\n\nHere is your current registration information:\n• **Name**: ${existing.full_name}\n• **Address**: ${existing.address}\n• **Wishlist**: ${existing.wishlist || 'None'}\n\nWould you like to update your registration information?`,
              components: [
                {
                  type: 1, // Action Row
                  components: [
                    {
                      type: 2, // Button
                      custom_id: 'update_info_yes',
                      label: 'Yes, Update My Info ✏️',
                      style: 1, // Primary (Blurple/Blue)
                    },
                    {
                      type: 2, // Button
                      custom_id: 'update_info_no',
                      label: 'No, Keep Existing Details 🔒',
                      style: 2, // Secondary (Grey)
                    },
                  ],
                },
              ],
            },
          });
        }
      }

      if (subCommand === 'tracking' || subCommand === 'ship') {
        const matchingCompleteRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow;
        if (!matchingCompleteRow || matchingCompleteRow.value !== 'true') {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
            data: {
              flags: 64, // EPHEMERAL
              content: '🔒 Secret Santa matches have not been generated yet! Package tracking can be submitted once matches are assigned.',
            },
          });
        }

        const match = db.prepare(`
          SELECT id FROM matches
          WHERE (giver_id IS NOT NULL AND giver_id = ?)
             OR LOWER(TRIM(giver_handle)) = LOWER(TRIM(?))
        `).get(discordId, discordHandle) as { id: string } | undefined;

        if (!match) {
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
            data: {
              flags: 64, // EPHEMERAL
              content: '🔒 No Secret Santa assignment found for your account.',
            },
          });
        }

        const existingTracking = db.prepare('SELECT carrier, tracking_number, shipped_at FROM tracking_info WHERE match_id = ?').get(match.id) as any;

        return res.json(buildTrackingModal(existingTracking));
      }

      if (subCommand === 'info' || subCommand === 'details' || subCommand === 'help') {
        const countRow = db.prepare('SELECT COUNT(*) as count FROM participants').get() as { count: number };
        const budgetRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('gift_budget') as DbSettingRow | undefined;
        const deadlineRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_deadline') as DbSettingRow | undefined;
        const matchingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow | undefined;

        const totalParticipants = countRow?.count || 0;
        const giftBudget = budgetRow?.value || '$25 - $50';
        const isMatchingComplete = matchingRow?.value === 'true';

        let deadlineStr = 'Not set';
        if (deadlineRow && deadlineRow.value) {
          const unixSec = Math.floor(new Date(deadlineRow.value).getTime() / 1000);
          if (!isNaN(unixSec)) {
            deadlineStr = `<t:${unixSec}:F> (<t:${unixSec}:R>)`;
          }
        }

        const isUserRegistered = !!db.prepare(`
          SELECT id FROM participants
          WHERE (discord_id IS NOT NULL AND discord_id = ?)
             OR LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
        `).get(discordId, discordHandle);

        const statusLabel = isMatchingComplete
          ? '🔒 **Matches Generated** (Signups & updates locked)'
          : '🟢 **Signups Open**';

        const userStatusLabel = isUserRegistered
          ? '✅ You are registered!'
          : '⚠️ You have not registered yet. Use `/secret-santa signup` to join!';

        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
          data: {
            flags: 64, // EPHEMERAL
            content: `🎅 **Server Secret Santa 2026 Event Info**\n\n💰 **Gift Budget**: ${giftBudget}\n📅 **Signup Deadline**: ${deadlineStr}\n👥 **Total Registered Participants**: **${totalParticipants} server members**\n🎯 **Event Status**: ${statusLabel}\n\n👤 **Your Status**: ${userStatusLabel}\n🌐 **Web Portal**: https://santa.lightmedia.club\n\n💡 **Available Commands**:\n• \`/secret-santa signup\` — Register or update your shipping info\n• \`/secret-santa status\` — View your assigned gift recipient (private)\n• \`/secret-santa tracking\` — Submit package tracking code & ship date\n• \`/secret-santa info\` — View event details & participant count`,
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

      const userMatches = isMatchingComplete
        ? db.prepare('SELECT receiver_name, receiver_handle, receiver_address, receiver_wishlist FROM matches WHERE LOWER(TRIM(giver_handle)) = LOWER(TRIM(?))').all(effectiveHandle) as any[]
        : [];

      if (userMatches && userMatches.length > 0) {
        const recipientTexts = userMatches.map((match, idx) => {
          const prefix = userMatches.length > 1 ? `🎁 **Recipient #${idx + 1}**:` : `🎁 **Recipient**:`;
          return `${prefix} ${match.receiver_name} (@${match.receiver_handle})\n📍 **Shipping Address**:\n\`\`\`\n${match.receiver_address}\n\`\`\`\n❤️ **Wishlist & Preferences**: ${match.receiver_wishlist || 'None specified'}`;
        }).join('\n\n---\n\n');

        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
          data: {
            flags: 64, // EPHEMERAL (Only caller sees this message)
            content: `🔒 **Private Secret Santa Assignment** (Only visible to you):\n\n${recipientTexts}`,
          },
        });
      } else if (isMatchingComplete) {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
          data: {
            flags: 64, // EPHEMERAL
            content: '🔒 No Secret Santa assignment found for your account.',
          },
        });
      } else {
        const deadlineRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_deadline') as DbSettingRow | undefined;
        let deadlineMsg = '';
        if (deadlineRow && deadlineRow.value) {
          const unixSec = Math.floor(new Date(deadlineRow.value).getTime() / 1000);
          if (!isNaN(unixSec)) {
            deadlineMsg = `\n📅 **Signup Deadline**: <t:${unixSec}:F> (<t:${unixSec}:R>)`;
          }
        }

        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
          data: {
            flags: 64, // EPHEMERAL
            content: `🔒 **Secret Santa Status**: ${participant ? '✅ You are signed up!' : '⚠️ You are not signed up yet.'}${deadlineMsg}\n\nSecret Santa matches have not been generated yet. Signups are currently open!`,
          },
        });
      }
    }
  }

  // Type 3 (MESSAGE_COMPONENT): Interactive Button Clicks
  if (type === InteractionType.MESSAGE_COMPONENT || type === 3) {
    const customId = data?.custom_id;

    if (customId === 'update_info_no') {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
        data: {
          flags: 64, // EPHEMERAL
          content: '🔒 Your Secret Santa registration details remain unchanged. Happy Holidays! 🎅',
        },
      });
    }

    if (customId === 'update_info_yes') {

      // Check if matches have already been generated for this year
      const matchingCompleteRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow;
      if (matchingCompleteRow && matchingCompleteRow.value === 'true') {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
          data: {
            flags: 64, // EPHEMERAL
            content: '🔒 Secret Santa matches have already been generated for this event! Profile updates are now locked.',
          },
        });
      }

      const existing = db.prepare(`
        SELECT id, discord_id, discord_handle, full_name, address, wishlist
        FROM participants
        WHERE (discord_id IS NOT NULL AND discord_id = ?)
           OR LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
      `).get(discordId, discordHandle) as DbParticipantRow | undefined;

      return res.json(buildSignupModal(existing));
    }
  }

  // Type 5 (MODAL_SUBMIT): Modal Submits
  if (type === InteractionType.MODAL_SUBMIT || type === 5) {
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
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
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
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
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
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
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
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
          data: {
            flags: 64, // EPHEMERAL
            content: '🔒 🎉 Successfully signed up for Secret Santa directly inside Discord! Your details are stored securely.',
          },
        });
      }
    }

    if (customId === 'secret_santa_tracking_modal') {
      const getVal = (cid: string) => {
        for (const row of data.components || []) {
          for (const comp of row.components || []) {
            if (comp.custom_id === cid) return comp.value;
          }
        }
        return '';
      };

      const carrier = String(getVal('carrier')).trim() || 'Standard Delivery / Hand Delivered';
      const trackingNumber = String(getVal('tracking_number')).trim() || 'N/A';
      const shippedAt = String(getVal('shipped_at')).trim() || new Date().toISOString().split('T')[0];

      const match = db.prepare(`
        SELECT id FROM matches
        WHERE (giver_id IS NOT NULL AND giver_id = ?)
           OR LOWER(TRIM(giver_handle)) = LOWER(TRIM(?))
      `).get(discordId, discordHandle) as { id: string } | undefined;

      if (!match) {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
          data: {
            flags: 64, // EPHEMERAL
            content: '🔒 ❌ No active Secret Santa match assignment found for your account.',
          },
        });
      }

      const existing = db.prepare('SELECT id FROM tracking_info WHERE match_id = ?').get(match.id);

      if (existing) {
        db.prepare('UPDATE tracking_info SET carrier = ?, tracking_number = ?, shipped_at = ? WHERE match_id = ?').run(carrier, trackingNumber, shippedAt, match.id);
        logAudit(db, 'DISCORD_TRACKING_UPDATE', `Participant ${discordHandle} (ID: ${discordId}) updated tracking via Discord Modal`, req.ip);
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
          data: {
            flags: 64, // EPHEMERAL
            content: `🔒 ✅ Package tracking details updated directly inside Discord!\n📦 **Carrier**: ${carrier}\n🚚 **Tracking**: \`${trackingNumber}\` \n📅 **Ship Date**: ${shippedAt}`,
          },
        });
      } else {
        const id = uuidv4();
        db.prepare('INSERT INTO tracking_info (id, match_id, giver_handle, carrier, tracking_number, shipped_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, match.id, discordHandle, carrier, trackingNumber, shippedAt);
        logAudit(db, 'DISCORD_TRACKING_ADD', `Participant ${discordHandle} (ID: ${discordId}) submitted tracking via Discord Modal`, req.ip);
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4,
          data: {
            flags: 64, // EPHEMERAL
            content: `🔒 🎉 Package tracking details saved directly inside Discord!\n📦 **Carrier**: ${carrier}\n🚚 **Tracking**: \`${trackingNumber}\` \n📅 **Ship Date**: ${shippedAt}`,
          },
        });
      }
    }
  }

  res.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE || 4, data: { flags: 64, content: '🔒 Unknown interaction request.' } });
}
