import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { getDb } from '../db.js';
import Database from 'better-sqlite3';

describe('Secret Santa API Integration & Security Tests', () => {
  let db: ReturnType<typeof Database>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = getDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should include anti-robot security headers and disallow robots.txt', async () => {
    const res = await request(app).get('/robots.txt');
    assert.equal(res.status, 200);
    assert.ok(res.headers['x-robots-tag'].includes('noindex'));
    assert.ok(res.text.includes('Disallow: /'));
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  it('should verify event passcode via /api/verify-passcode', async () => {
    const wrongRes = await request(app).post('/api/verify-passcode').send({ passcode: 'wrongcode' });
    assert.equal(wrongRes.status, 401);
    assert.equal(wrongRes.body.success, false);

    const rightRes = await request(app).post('/api/verify-passcode').send({ passcode: 'santa2026' });
    assert.equal(rightRes.status, 200);
    assert.equal(rightRes.body.success, true);
  });

  it('should handle Discord PING interaction type 1', async () => {
    const res = await request(app).post('/api/discord/interactions').send({ type: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.type, 1);
  });

  it('should handle Discord Modal Signup interaction with ephemeral flag 64 and save participant', async () => {
    const res = await request(app).post('/api/discord/interactions').send({
      type: 5,
      member: { user: { id: '123456789', username: 'discorduser', discriminator: '0' } },
      data: {
        custom_id: 'secret_santa_signup_modal',
        components: [
          { components: [{ custom_id: 'full_name', value: 'Discord User' }] },
          { components: [{ custom_id: 'address', value: '777 Discord Way' }] },
          { components: [{ custom_id: 'wishlist', value: 'Gaming Mouse' }] },
          { components: [{ custom_id: 'passcode', value: 'santa2026' }] },
        ],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.type, 4);
    assert.equal(res.body.data.flags, 64); // EPHEMERAL
    assert.ok(res.body.data.content.includes('Successfully signed up'));

    const settingsRes = await request(app).get('/api/settings');
    assert.equal(settingsRes.body.data.totalParticipants, 1);
  });

  it('should return ephemeral response (flags: 64) for /secret-santa status command', async () => {
    const res = await request(app).post('/api/discord/interactions').send({
      type: 2,
      member: { user: { id: '123456789', username: 'discorduser', discriminator: '0' } },
      data: { name: 'secret-santa', options: [{ name: 'status' }] },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.type, 4);
    assert.equal(res.body.data.flags, 64);
    assert.ok(res.body.data.content.includes('Secret Santa Status'));
  });

  it('should reject bot trap payload when honeypot field is filled', async () => {
    const res = await request(app).post('/api/signup').send({
      discordHandle: 'botuser#999',
      fullName: 'Bot User',
      address: '123 Bot St',
      passcode: 'santa2026',
      confirm_email_field: 'http://spam-bot.com',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'Invalid request payload.');
  });

  it('should enforce rate limits on login routes (5 attempts per window)', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/admin/login').send({ passcode: 'wrong' });
      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Invalid admin passcode.');
    }

    const blockedRes = await request(app).post('/api/admin/login').send({ passcode: 'wrong' });
    assert.equal(blockedRes.status, 429);
    assert.match(blockedRes.body.error, /too many login attempts/i);
  });
});
