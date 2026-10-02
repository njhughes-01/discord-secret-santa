import crypto, { KeyObject } from 'node:crypto';
import request from 'supertest';
import type { createApp } from '../app.js';

export type SignatureHeaders = Record<string, string>;

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

export function rawPublicKeyHex(key: KeyObject): string {
  const spki = key.export({ type: 'spki', format: 'der' });
  return spki.subarray(spki.length - 32).toString('hex');
}

// The env var outranks the discord_public_key setting, so every app built in a test file
// trusts this key whichever database it uses. The test runner gives each file its own process.
process.env.DISCORD_PUBLIC_KEY = rawPublicKeyHex(publicKey);

export function discordSignatureHeaders(rawBody: string, signingKey: KeyObject = privateKey): SignatureHeaders {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.sign(null, Buffer.from(timestamp + rawBody), signingKey).toString('hex');
  return { 'x-signature-ed25519': signature, 'x-signature-timestamp': timestamp };
}

/** Posts an interaction signed with the test key unless explicit headers are given. */
export function postDiscordInteraction(app: ReturnType<typeof createApp>, body: object, headers?: SignatureHeaders) {
  const rawBody = JSON.stringify(body);
  return request(app)
    .post('/api/discord/interactions')
    .set('Content-Type', 'application/json')
    .set(headers ?? discordSignatureHeaders(rawBody))
    .send(rawBody);
}
