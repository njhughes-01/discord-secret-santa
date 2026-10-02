import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { getDb } from '../db.js';
import { postDiscordInteraction } from './discordTestSigning.js';
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
    const res = await postDiscordInteraction(app, { type: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.type, 1);
  });

  it('should handle Discord Modal Signup without a passcode, with ephemeral flag 64, and save participant', async () => {
    const res = await postDiscordInteraction(app, {
      type: 5,
      member: { user: { id: '123456789', username: 'discorduser', discriminator: '0' } },
      data: {
        custom_id: 'secret_santa_signup_modal',
        components: [
          { components: [{ custom_id: 'full_name', value: 'Discord User' }] },
          { components: [{ custom_id: 'address', value: '777 Discord Way' }] },
          { components: [{ custom_id: 'wishlist', value: 'Gaming Mouse' }] },
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
    const res = await postDiscordInteraction(app, {
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

  const adminToken = async () => {
    const res = await request(app).post('/api/admin/login').send({ passcode: 'admin123' });
    assert.equal(res.status, 200);
    return res.body.token as string;
  };

  const signup = (handle: string, passcode: string) =>
    request(app).post('/api/signup').send({ discordHandle: handle, fullName: handle, address: '1 Test St', passcode });

  const setDeadline = (token: string, offsetMs: number) =>
    request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ signupDeadline: new Date(Date.now() + offsetMs).toISOString() });

  const HOUR_MS = 60 * 60 * 1000;

  const matchCount = () => (db.prepare('SELECT COUNT(*) as count FROM matches').get() as { count: number }).count;

  it('should only accept the current signup passcode after an admin changes it', async () => {
    const token = await adminToken();
    assert.equal((await signup('alice', 'santa2026')).status, 200);

    const update = await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send({ signupPasscode: 'NewCode' });
    assert.equal(update.status, 200);

    assert.equal((await signup('bob', 'santa2026')).status, 401);
    assert.equal((await signup('bob', 'newcode')).status, 200);

    const oldLogin = await request(app).post('/api/participant/login').send({ discordHandle: 'alice', passcode: 'santa2026' });
    assert.equal(oldLogin.status, 401);
    const newLogin = await request(app).post('/api/participant/login').send({ discordHandle: 'alice', passcode: 'NewCode' });
    assert.equal(newLogin.status, 200);

    const gen = await request(app).post('/api/admin/generate-matches').set('Authorization', `Bearer ${token}`).send({});
    assert.equal(gen.status, 200);

    const oldTracking = await request(app).post('/api/tracking').send({ discordHandle: 'alice', passcode: 'santa2026' });
    assert.equal(oldTracking.status, 401);
    const newTracking = await request(app).post('/api/tracking').send({ discordHandle: 'alice', passcode: 'newcode' });
    assert.equal(newTracking.status, 200);
  });

  it('should accept passcodes regardless of case and surrounding whitespace', async () => {
    assert.equal((await request(app).post('/api/verify-passcode').send({ passcode: '  Santa2026 ' })).status, 200);
    assert.equal((await signup('carol', 'SANTA2026')).status, 200);
    assert.equal((await signup('dave', 'santa2027')).status, 401);
  });

  it('should accept Discord signups without the event passcode even after an admin changes it', async () => {
    const token = await adminToken();
    const update = await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send({ signupPasscode: 'NewCode' });
    assert.equal(update.status, 200);

    const res = await postDiscordInteraction(app, {
      type: 5,
      member: { user: { id: '42', username: 'mobileuser', discriminator: '0' } },
      data: {
        custom_id: 'secret_santa_signup_modal',
        components: [
          { components: [{ custom_id: 'full_name', value: 'Mobile User' }] },
          { components: [{ custom_id: 'address', value: '2 Phone Rd' }] },
          { components: [{ custom_id: 'wishlist', value: '' }] },
        ],
      },
    });
    assert.equal(res.status, 200);
    assert.match(res.body.data.content, /Successfully signed up/);
    assert.ok(db.prepare('SELECT id FROM participants WHERE discord_id = ?').get('42'));
  });

  it('should let an admin reopen signups and redraw matches', async () => {
    assert.equal((await request(app).post('/api/admin/reopen-signups')).status, 401);

    const token = await adminToken();
    assert.equal((await setDeadline(token, HOUR_MS)).status, 200);
    assert.equal((await signup('alice', 'santa2026')).status, 200);
    assert.equal((await signup('bob', 'santa2026')).status, 200);

    const gen = await request(app).post('/api/admin/generate-matches').set('Authorization', `Bearer ${token}`).send({});
    assert.equal(gen.status, 200);
    assert.equal((await request(app).post('/api/tracking').send({ discordHandle: 'alice', passcode: 'santa2026' })).status, 200);
    assert.equal((await signup('carol', 'santa2026')).status, 400);

    const updateProfile = () =>
      request(app)
        .put('/api/participant/profile')
        .send({ discordHandle: 'alice', passcode: 'SANTA2026', fullName: 'alice', address: '9 New Address Ln' });
    assert.equal((await updateProfile()).status, 400);

    const reopen = await request(app).post('/api/admin/reopen-signups').set('Authorization', `Bearer ${token}`);
    assert.equal(reopen.status, 200);
    assert.equal(reopen.body.success, true);
    assert.equal(reopen.body.isDeadlinePassed, false);

    const trackingCount = db.prepare('SELECT COUNT(*) as count FROM tracking_info').get() as { count: number };
    assert.equal(matchCount(), 0);
    assert.equal(trackingCount.count, 0);

    const settings = await request(app).get('/api/settings');
    assert.equal(settings.body.data.isMatchingComplete, false);

    assert.equal((await updateProfile()).status, 200);
    const alice = db.prepare('SELECT address FROM participants WHERE discord_handle = ?').get('alice') as { address: string };
    assert.equal(alice.address, '9 New Address Ln');

    assert.equal((await signup('carol', 'santa2026')).status, 200);

    const redraw = await request(app).post('/api/admin/generate-matches').set('Authorization', `Bearer ${token}`).send({});
    assert.equal(redraw.status, 200);
    assert.equal(redraw.body.data.length, 3);
  });

  it('should delete submitted tracking info when an admin redraws matches', async () => {
    const token = await adminToken();
    assert.equal((await signup('alice', 'santa2026')).status, 200);
    assert.equal((await signup('bob', 'santa2026')).status, 200);
    const generate = () => request(app).post('/api/admin/generate-matches').set('Authorization', `Bearer ${token}`).send({});
    const trackingCount = () => (db.prepare('SELECT COUNT(*) as count FROM tracking_info').get() as { count: number }).count;

    assert.equal((await generate()).status, 200);
    assert.equal((await request(app).post('/api/tracking').send({ discordHandle: 'alice', passcode: 'santa2026' })).status, 200);
    assert.equal(trackingCount(), 1);

    assert.equal((await generate()).status, 200);
    assert.equal(trackingCount(), 0);
  });

  it('should keep the current draw when reopening signups fails part-way', async () => {
    const token = await adminToken();
    assert.equal((await signup('alice', 'santa2026')).status, 200);
    assert.equal((await signup('bob', 'santa2026')).status, 200);
    assert.equal((await request(app).post('/api/admin/generate-matches').set('Authorization', `Bearer ${token}`).send({})).status, 200);
    const drawnMatches = matchCount();

    db.exec('DROP TABLE audit_logs');
    const reopen = await request(app).post('/api/admin/reopen-signups').set('Authorization', `Bearer ${token}`);
    assert.equal(reopen.status, 500);

    assert.equal(matchCount(), drawnMatches);
    const matchingComplete = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as { value: string };
    assert.equal(matchingComplete.value, 'true');
  });

  it('should name changed passcode keys in the settings audit log without recording their values', async () => {
    const token = await adminToken();
    const newSignupPasscode = 'SignupSecretXyz123';
    const newAdminPasscode = 'AdminSecretQrs456';
    const update = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ signupPasscode: newSignupPasscode, adminPasscode: newAdminPasscode });
    assert.equal(update.status, 200);

    const settingsLog = db.prepare('SELECT details FROM audit_logs WHERE action = ?').get('SETTINGS_UPDATED') as { details: string };
    assert.match(settingsLog.details, /signup_passcode/);
    assert.match(settingsLog.details, /admin_passcode/);

    const allDetails = (db.prepare('SELECT details FROM audit_logs').all() as { details: string }[]).map((row) => row.details.toLowerCase());
    for (const secret of [newSignupPasscode, newAdminPasscode]) {
      assert.ok(allDetails.every((details) => !details.includes(secret.toLowerCase())), `audit log leaked ${secret}`);
    }
  });

  it('should warn that signups stay closed when reopening after the deadline has passed', async () => {
    const token = await adminToken();
    assert.equal((await signup('alice', 'santa2026')).status, 200);
    assert.equal((await signup('bob', 'santa2026')).status, 200);
    assert.equal((await request(app).post('/api/admin/generate-matches').set('Authorization', `Bearer ${token}`).send({})).status, 200);
    assert.ok(matchCount() > 0);

    assert.equal((await setDeadline(token, -HOUR_MS)).status, 200);

    const reopen = await request(app).post('/api/admin/reopen-signups').set('Authorization', `Bearer ${token}`);
    assert.equal(reopen.status, 200);
    assert.equal(reopen.body.isDeadlinePassed, true);
    assert.match(reopen.body.message, /deadline has passed/i);
    assert.equal(matchCount(), 0);
  });

  it('should reject Discord signups once the signup deadline has passed', async () => {
    const discordUser = { user: { id: '555', username: 'lateuser', discriminator: '0' } };
    const signupCommand = () =>
      postDiscordInteraction(app, {
        type: 2,
        member: discordUser,
        data: { name: 'secret-santa', options: [{ name: 'signup' }] },
      });
    const signupModal = () =>
      postDiscordInteraction(app, {
        type: 5,
        member: discordUser,
        data: {
          custom_id: 'secret_santa_signup_modal',
          components: [
            { components: [{ custom_id: 'full_name', value: 'Late User' }] },
            { components: [{ custom_id: 'address', value: '3 Late Ave' }] },
            { components: [{ custom_id: 'wishlist', value: '' }] },
          ],
        },
      });
    const participantCount = () => (db.prepare('SELECT COUNT(*) as count FROM participants').get() as { count: number }).count;

    const token = await adminToken();
    assert.equal((await setDeadline(token, -HOUR_MS)).status, 200);

    const lateCommand = await signupCommand();
    assert.equal(lateCommand.body.type, 4);
    assert.equal(lateCommand.body.data.flags, 64);
    assert.match(lateCommand.body.data.content, /deadline has passed/i);

    const lateModal = await signupModal();
    assert.equal(lateModal.body.type, 4);
    assert.equal(lateModal.body.data.flags, 64);
    assert.match(lateModal.body.data.content, /deadline has passed/i);
    assert.equal(participantCount(), 0);

    assert.equal((await setDeadline(token, HOUR_MS)).status, 200);

    const openCommand = await signupCommand();
    assert.equal(openCommand.body.type, 9);
    assert.equal(openCommand.body.data.custom_id, 'secret_santa_signup_modal');
    const modalFieldIds = openCommand.body.data.components.flatMap((row: { components: { custom_id: string }[] }) =>
      row.components.map((field) => field.custom_id)
    );
    assert.deepEqual(modalFieldIds, ['full_name', 'address', 'wishlist']);

    const openModal = await signupModal();
    assert.match(openModal.body.data.content, /Successfully signed up/);
    assert.equal(participantCount(), 1);
  });
});
