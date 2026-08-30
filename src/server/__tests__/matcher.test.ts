import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateDerangementMatches } from '../matcher.js';
import { Participant } from '../../shared/types.js';

describe('Secret Santa Derangement Matcher', () => {
  const sampleParticipants: Participant[] = [
    { id: '1', discordHandle: 'alice#1234', fullName: 'Alice Smith', address: '123 Elm St', wishlist: 'Books', createdAt: new Date().toISOString() },
    { id: '2', discordHandle: 'bob#5678', fullName: 'Bob Jones', address: '456 Oak St', wishlist: 'Socks', createdAt: new Date().toISOString() },
    { id: '3', discordHandle: 'charlie#9012', fullName: 'Charlie Brown', address: '789 Pine St', wishlist: 'Coffee', createdAt: new Date().toISOString() },
    { id: '4', discordHandle: 'diana#3456', fullName: 'Diana Prince', address: '321 Maple St', wishlist: 'Tea', createdAt: new Date().toISOString() },
  ];

  it('should throw an error if fewer than 2 participants are provided', () => {
    assert.throws(() => generateDerangementMatches([]), /at least 2 participants/i);
    assert.throws(() => generateDerangementMatches([sampleParticipants[0]]), /at least 2 participants/i);
  });

  it('should generate valid derangement matches where no one is assigned to themselves', () => {
    const matches = generateDerangementMatches(sampleParticipants);

    assert.equal(matches.length, 4);

    const givers = new Set(matches.map(m => m.giverId));
    const receivers = new Set(matches.map(m => m.receiverId));

    // Everyone must give once and receive once
    assert.equal(givers.size, 4);
    assert.equal(receivers.size, 4);

    // No self-gifting
    for (const match of matches) {
      assert.notEqual(match.giverId, match.receiverId);
    }
  });

  it('should generate valid matches for odd number of participants (3 participants)', () => {
    const oddParticipants = sampleParticipants.slice(0, 3);
    const matches = generateDerangementMatches(oddParticipants);

    assert.equal(matches.length, 3);
    for (const match of matches) {
      assert.notEqual(match.giverId, match.receiverId);
    }
  });

  it('should support dual giver option when admin designates a participant', () => {
    const oddParticipants = sampleParticipants.slice(0, 3);
    const matches = generateDerangementMatches(oddParticipants, '1'); // Alice is dual giver

    assert.equal(matches.length, 4);
    const aliceMatches = matches.filter(m => m.giverId === '1');
    assert.equal(aliceMatches.length, 2);
    assert.notEqual(aliceMatches[0].receiverId, '1');
    assert.notEqual(aliceMatches[1].receiverId, '1');
    assert.notEqual(aliceMatches[0].receiverId, aliceMatches[1].receiverId);
  });

  it('should correctly populate receiver details (address and wishlist) in matches', () => {
    const matches = generateDerangementMatches(sampleParticipants);

    for (const match of matches) {
      const receiver = sampleParticipants.find(p => p.id === match.receiverId);
      assert.ok(receiver);
      assert.equal(match.receiverName, receiver.fullName);
      assert.equal(match.receiverAddress, receiver.address);
      assert.equal(match.receiverWishlist, receiver.wishlist);
    }
  });
});
