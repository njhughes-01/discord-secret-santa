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
 * Generates a valid Secret Santa derangement match list where no participant is assigned to themselves.
 */
export function generateDerangementMatches(participants: Participant[]): Match[] {
  if (!participants || participants.length < 2) {
    throw new Error('At least 2 participants are required to generate Secret Santa matches.');
  }

  const givers = [...participants];
  let receivers: Participant[] = [];
  let isDerangement = false;
  let attempts = 0;
  const maxAttempts = 1000;

  while (!isDerangement && attempts < maxAttempts) {
    attempts++;
    receivers = shuffle(givers);
    isDerangement = givers.every((giver, index) => giver.id !== receivers[index].id);
  }

  // Fallback cyclic shift if random shuffle didn't produce a derangement within maxAttempts
  if (!isDerangement) {
    receivers = [...givers.slice(1), givers[0]];
  }

  const now = new Date().toISOString();
  return givers.map((giver, index) => {
    const receiver = receivers[index];
    return {
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
    };
  });
}
