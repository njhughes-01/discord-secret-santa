import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { getDb } from '../src/server/db.js';
import Database from 'better-sqlite3';

describe('Playwright & E2E API Verification Suite', () => {
  let db: ReturnType<typeof Database>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = getDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('1. Event Passcode Gate: should reject invalid passcode and accept valid event passcode', async () => {
    const wrongRes = await request(app).post('/api/verify-passcode').send({ passcode: 'wrong' });
    assert.equal(wrongRes.status, 401);
    assert.equal(wrongRes.body.success, false);

    const rightRes = await request(app).post('/api/verify-passcode').send({ passcode: 'santa2026' });
    assert.equal(rightRes.status, 200);
    assert.equal(rightRes.body.success, true);
  });

  it('2. Admin Login: should accept admin123 and allow settings update without triggering honeypot false positives', async () => {
    const loginRes = await request(app).post('/api/admin/login').send({ passcode: 'admin123' });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.success, true);
    assert.ok(loginRes.body.token);

    const adminToken = loginRes.body.token;

    // Test settings update
    const updateRes = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        giftBudget: '$30 - $60',
        discordWebhookUrl: 'https://discord.com/api/webhooks/test/123456789',
      });

    assert.equal(updateRes.status, 200);

    const settingsRes = await request(app).get('/api/settings');
    assert.equal(settingsRes.body.data.giftBudget, '$30 - $60');

    // Test webhook endpoint rejection/mocking
    const webhookRes = await request(app)
      .post('/api/admin/test-webhook')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.ok([200, 400].includes(webhookRes.status));
  });

  it('3. Full Secret Santa Lifecycle: Signup -> Matching -> Recipient Portal -> Package Tracking', async () => {
    // Participant 1 Signup
    const p1Res = await request(app).post('/api/signup').send({
      discordHandle: 'alice#1001',
      fullName: 'Alice Smith',
      address: '100 Candy Cane Lane',
      wishlist: 'Books & Coffee',
      passcode: 'santa2026',
    });
    assert.equal(p1Res.status, 200);

    // Participant 2 Signup
    const p2Res = await request(app).post('/api/signup').send({
      discordHandle: 'bob#2002',
      fullName: 'Bob Jones',
      address: '200 Snowflake Way',
      wishlist: 'Board Games',
      passcode: 'santa2026',
    });
    assert.equal(p2Res.status, 200);

    // Admin Login (admin123)
    const adminLogin = await request(app).post('/api/admin/login').send({ passcode: 'admin123' });
    assert.equal(adminLogin.status, 200);
    const token = adminLogin.body.token;

    // Generate Matches
    const matchRes = await request(app)
      .post('/api/admin/generate-matches')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(matchRes.status, 200);
    assert.equal(matchRes.body.data.length, 2);

    // Participant Portal Login
    const portalRes = await request(app).post('/api/participant/login').send({
      discordHandle: 'alice#1001',
      passcode: 'santa2026',
    });
    assert.equal(portalRes.status, 200);
    assert.ok(portalRes.body.data.assignedRecipient);
    assert.equal(portalRes.body.data.assignedRecipient.receiverName, 'Bob Jones');

    // Package Tracking Upload
    const trackRes = await request(app).post('/api/tracking').send({
      discordHandle: 'alice#1001',
      passcode: 'santa2026',
      carrier: 'USPS Priority',
      trackingNumber: '9400100022223333444455',
    });
    assert.equal(trackRes.status, 200);
    assert.equal(trackRes.body.success, true);
  });

  it('4. Discord Interactions: Slash command /secret-santa status returns ephemeral flags: 64', async () => {
    const statusRes = await request(app).post('/api/discord/interactions').send({
      type: 2,
      member: { user: { id: '999888777', username: 'discordtester', discriminator: '0' } },
      data: { name: 'secret-santa', options: [{ name: 'status' }] },
    });

    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.type, 4);
    assert.equal(statusRes.body.data.flags, 64); // EPHEMERAL
  });
});
