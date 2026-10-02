import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { Request } from 'express';
import Database from 'better-sqlite3';
import { verifyDiscordRequestSignature } from '../discordInteractions.js';
import { createApp } from '../app.js';
import { getDb } from '../db.js';
import { discordSignatureHeaders, postDiscordInteraction, SignatureHeaders } from './discordTestSigning.js';

const pingBody = JSON.stringify({ type: 1 });

const mockRequest = (headers: SignatureHeaders, rawBody = pingBody) =>
  ({ headers, rawBody: Buffer.from(rawBody), body: JSON.parse(rawBody) }) as unknown as Request;

const signupModal = (id: string, username: string, address: string) => ({
  type: 5,
  member: { user: { id, username, discriminator: '0' } },
  data: {
    custom_id: 'secret_santa_signup_modal',
    components: [
      { components: [{ custom_id: 'full_name', value: `${username} name` }] },
      { components: [{ custom_id: 'address', value: address }] },
      { components: [{ custom_id: 'wishlist', value: '' }] },
    ],
  },
});

describe('verifyDiscordRequestSignature', () => {
  it('accepts a valid Ed25519 signature and rejects a wrong one', async () => {
    const headers = discordSignatureHeaders(pingBody);
    assert.equal(await verifyDiscordRequestSignature(mockRequest(headers)), true);
    assert.equal(
      await verifyDiscordRequestSignature(mockRequest({ ...headers, 'x-signature-ed25519': '00'.repeat(64) })),
      false
    );
  });

  it('rejects requests without signature headers', async () => {
    assert.equal(await verifyDiscordRequestSignature(mockRequest({})), false);
  });

  it('fails closed when no public key is configured', async () => {
    const configuredKey = process.env.DISCORD_PUBLIC_KEY;
    delete process.env.DISCORD_PUBLIC_KEY;
    const db = getDb(':memory:');
    try {
      assert.equal(await verifyDiscordRequestSignature(mockRequest(discordSignatureHeaders(pingBody)), db), false);
      const keyMissing = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE action = ?').get('DISCORD_KEY_MISSING') as { count: number };
      assert.equal(keyMissing.count, 1);
    } finally {
      db.close();
      process.env.DISCORD_PUBLIC_KEY = configuredKey;
    }
  });
});

describe('POST /api/discord/interactions signature enforcement', () => {
  let db: ReturnType<typeof Database>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = getDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  const participantCount = () => (db.prepare('SELECT COUNT(*) as count FROM participants').get() as { count: number }).count;
  const signatureFailures = () =>
    (db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE action = ?').get('DISCORD_SIG_FAILED') as { count: number }).count;

  const assertRejected = (res: { status: number; text: string }) => {
    assert.equal(res.status, 401);
    assert.equal(res.text, 'Invalid request signature');
  };

  it('answers a signed PING with PONG', async () => {
    const res = await postDiscordInteraction(app, { type: 1 });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { type: 1 });
  });

  it('rejects an unsigned PING', async () => {
    assertRejected(await postDiscordInteraction(app, { type: 1 }, {}));
  });

  it('rejects an unsigned signup, creates no participant and logs the failure', async () => {
    assertRejected(await postDiscordInteraction(app, signupModal('100', 'forger', '1 Forged St'), {}));
    assert.equal(participantCount(), 0);
    assert.equal(signatureFailures(), 1);
  });

  it('rejects a request carrying only one of the signature headers', async () => {
    const body = signupModal('100', 'forger', '1 Forged St');
    const headers = discordSignatureHeaders(JSON.stringify(body));
    assertRejected(await postDiscordInteraction(app, body, { 'x-signature-ed25519': headers['x-signature-ed25519'] }));
    assertRejected(await postDiscordInteraction(app, body, { 'x-signature-timestamp': headers['x-signature-timestamp'] }));
    assert.equal(participantCount(), 0);
  });

  it('rejects a request signed with a different key', async () => {
    const body = signupModal('100', 'forger', '1 Forged St');
    const { privateKey: attackerKey } = crypto.generateKeyPairSync('ed25519');
    assertRejected(await postDiscordInteraction(app, body, discordSignatureHeaders(JSON.stringify(body), attackerKey)));
    assert.equal(participantCount(), 0);
  });

  it('rejects a body changed after signing', async () => {
    const signed = signupModal('100', 'forger', '1 Forged St');
    const tampered = signupModal('100', 'forger', '2 Tampered Ave');
    assertRejected(await postDiscordInteraction(app, tampered, discordSignatureHeaders(JSON.stringify(signed))));
    assert.equal(participantCount(), 0);
  });

  it("does not let an unsigned signup modal overwrite another participant's address", async () => {
    const signup = await postDiscordInteraction(app, signupModal('200', 'victim', '10 Real Rd'));
    assert.equal(signup.status, 200);
    assert.match(signup.body.data.content, /Successfully signed up/);

    assertRejected(await postDiscordInteraction(app, signupModal('200', 'victim', '666 Attacker Ln'), {}));
    const victim = db.prepare('SELECT address FROM participants WHERE discord_id = ?').get('200') as { address: string };
    assert.equal(victim.address, '10 Real Rd');
  });
});
