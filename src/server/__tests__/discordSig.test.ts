import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { verifyDiscordRequestSignature } from '../discordInteractions.js';

test('Discord Ed25519 Signature Verification via discord-interactions', async (t) => {
  await t.test('should verify valid Ed25519 request signature using discord-interactions', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

    const exportedSpki = publicKey.export({ type: 'spki', format: 'der' });
    const rawPublicKeyBuffer = exportedSpki.subarray(exportedSpki.length - 32);
    const publicKeyHex = rawPublicKeyBuffer.toString('hex');

    const timestamp = '1700000000';
    const bodyString = JSON.stringify({ type: 1 });
    const bodyBuffer = Buffer.from(bodyString, 'utf-8');
    const message = Buffer.concat([Buffer.from(timestamp, 'utf-8'), bodyBuffer]);

    const signatureBuffer = crypto.sign(null, message, privateKey);
    const signatureHex = signatureBuffer.toString('hex');

    process.env.DISCORD_PUBLIC_KEY = publicKeyHex;

    const mockReq: any = {
      headers: {
        'x-signature-ed25519': signatureHex,
        'x-signature-timestamp': timestamp,
      },
      rawBody: bodyBuffer,
      body: { type: 1 },
    };

    const isValid = await verifyDiscordRequestSignature(mockReq);
    assert.strictEqual(isValid, true, 'Signature verification should succeed for valid signature');

    const invalidReq: any = {
      headers: {
        'x-signature-ed25519': '00'.repeat(64),
        'x-signature-timestamp': timestamp,
      },
      rawBody: bodyBuffer,
      body: { type: 1 },
    };
    const isInvalidValid = await verifyDiscordRequestSignature(invalidReq);
    assert.strictEqual(isInvalidValid, false, 'Signature verification should fail for invalid signature');
  });
});
