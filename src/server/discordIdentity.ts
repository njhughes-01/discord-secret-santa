import { DatabaseInstance } from './db.js';
import { logAudit } from './logger.js';

export interface DiscordParticipant {
  id: string;
  discord_id: string | null;
  discord_handle: string;
  full_name: string;
  address: string;
  wishlist: string | null;
}

export interface GiverMatch {
  id: string;
  receiver_name: string;
  receiver_handle: string;
  receiver_address: string;
  receiver_wishlist: string | null;
}

const PARTICIPANT_COLUMNS = 'id, discord_id, discord_handle, full_name, address, wishlist';

const normalizeHandle = (handle: string) => handle.trim().toLowerCase();

export function isHandleTakenByOtherParticipant(db: DatabaseInstance, handle: string, participantId?: string): boolean {
  return !!db.prepare(`
    SELECT id FROM participants
    WHERE LOWER(TRIM(discord_handle)) = LOWER(TRIM(?)) AND id IS NOT ?
  `).get(handle, participantId ?? null);
}

// Matches and tracking rows keep a copy of the handle, so a rename has to rewrite every copy.
export function renameParticipantHandle(db: DatabaseInstance, participantId: string, newHandle: string): void {
  db.prepare('UPDATE participants SET discord_handle = ? WHERE id = ?').run(newHandle, participantId);
  db.prepare('UPDATE matches SET giver_handle = ? WHERE giver_id = ?').run(newHandle, participantId);
  db.prepare('UPDATE matches SET receiver_handle = ? WHERE receiver_id = ?').run(newHandle, participantId);
  db.prepare('UPDATE tracking_info SET giver_handle = ? WHERE match_id IN (SELECT id FROM matches WHERE giver_id = ?)').run(newHandle, participantId);
}

// Web signups have no discord_id, so they are linked to the first Discord account that uses their handle.
// Linked rows are found only by Discord account, never by handle: Discord usernames can be reused after a rename.
export function resolveDiscordParticipant(
  db: DatabaseInstance,
  discordId: string,
  currentHandle: string,
  ip?: string
): DiscordParticipant | undefined {
  if (!discordId) return undefined;

  return db.transaction(() => {
    let participant = db.prepare(`SELECT ${PARTICIPANT_COLUMNS} FROM participants WHERE discord_id = ?`)
      .get(discordId) as DiscordParticipant | undefined;

    if (!participant) {
      participant = db.prepare(`
        SELECT ${PARTICIPANT_COLUMNS} FROM participants
        WHERE (discord_id IS NULL OR TRIM(discord_id) = '') AND LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
      `).get(currentHandle) as DiscordParticipant | undefined;
      if (!participant) return undefined;

      db.prepare('UPDATE participants SET discord_id = ? WHERE id = ?').run(discordId, participant.id);
      participant = { ...participant, discord_id: discordId };
      logAudit(db, 'DISCORD_ACCOUNT_LINKED', `Linked participant ${participant.discord_handle} to Discord ID ${discordId}`, ip);
    }

    const oldHandle = participant.discord_handle;
    if (normalizeHandle(oldHandle) === normalizeHandle(currentHandle)) return participant;

    if (isHandleTakenByOtherParticipant(db, currentHandle, participant.id)) {
      logAudit(
        db,
        'DISCORD_HANDLE_SYNC_SKIPPED',
        `Discord ID ${discordId} is now ${currentHandle}, but another participant already uses that name; kept ${oldHandle}`,
        ip,
        'warn'
      );
      return participant;
    }

    renameParticipantHandle(db, participant.id, currentHandle);
    logAudit(db, 'DISCORD_HANDLE_SYNCED', `Discord ID ${discordId} renamed from ${oldHandle} to ${currentHandle}`, ip);
    return { ...participant, discord_handle: currentHandle };
  })();
}

// The handle fallback only reaches matches whose giver row no longer exists, so a reused
// username can never reveal someone else's assignment.
export function findGiverMatches(db: DatabaseInstance, participant: DiscordParticipant | undefined, currentHandle: string): GiverMatch[] {
  const columns = 'id, receiver_name, receiver_handle, receiver_address, receiver_wishlist';
  if (participant) {
    return db.prepare(`SELECT ${columns} FROM matches WHERE giver_id = ?`).all(participant.id) as GiverMatch[];
  }
  return db.prepare(`
    SELECT ${columns} FROM matches
    WHERE LOWER(TRIM(giver_handle)) = LOWER(TRIM(?)) AND giver_id NOT IN (SELECT id FROM participants)
  `).all(currentHandle) as GiverMatch[];
}
