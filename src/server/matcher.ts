import { Participant, Match } from '../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fisher-Yates shuffle helper
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates Secret Santa derangement matches.
 * Guarantees no participant is assigned to themselves.
 * Optionally assigns an extra recipient to a designated dualGiverId.
 */
export function generateDerangementMatches(
  participants: Participant[],
  dualGiverId?: string
): Match[] {
  if (!participants || participants.length < 2) {
    throw new Error('At least 2 participants are required to generate Secret Santa matches.');
  }

  // 1. Randomly shuffle participants to create a single Hamiltonian cycle
  const shuffled = shuffle(participants);
  const n = shuffled.length;
  const now = new Date().toISOString();
  const matches: Match[] = [];

  // 2. Standard 1:1 cycle matching: P[i] gives to P[(i + 1) % n]
  for (let i = 0; i < n; i++) {
    const giver = shuffled[i];
    const receiver = shuffled[(i + 1) % n];

    matches.push({
      id: uuidv4(),
      giverId: giver.id,
      giverHandle: giver.discordHandle,
      giverName: giver.fullName,
      receiverId: receiver.id,
      receiverHandle: receiver.discordHandle,
      receiverName: receiver.fullName,
      receiverAddress: receiver.address,
      receiverWishlist: receiver.wishlist,
      createdAt: now,
    });
  }

  // 3. If a dualGiverId is selected by admin (for odd numbers or bonus giver):
  if (dualGiverId) {
    const dualGiver = participants.find((p) => p.id === dualGiverId || p.discordHandle.toLowerCase() === dualGiverId.toLowerCase());
    if (dualGiver) {
      // Find current assigned recipient for dualGiver
      const existingMatch = matches.find((m) => m.giverId === dualGiver.id);
      const existingReceiverId = existingMatch ? existingMatch.receiverId : null;

      // Select an additional recipient that is not the dualGiver themselves and not already their primary recipient
      const candidates = participants.filter((p) => p.id !== dualGiver.id && p.id !== existingReceiverId);

      if (candidates.length > 0) {
        const extraReceiver = shuffle(candidates)[0];
        matches.push({
          id: uuidv4(),
          giverId: dualGiver.id,
          giverHandle: dualGiver.discordHandle,
          giverName: dualGiver.fullName,
          receiverId: extraReceiver.id,
          receiverHandle: extraReceiver.discordHandle,
          receiverName: extraReceiver.fullName,
          receiverAddress: extraReceiver.address,
          receiverWishlist: extraReceiver.wishlist,
          createdAt: now,
        });
      }
    }
  }

  return matches;
}
