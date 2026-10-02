import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../app.js';
import { getDb } from '../db.js';

type DiscordMember = { user: { id: string; username: string; discriminator: string } };

const discordMember = (id: string, username: string): DiscordMember => ({ user: { id, username, discriminator: '0' } });

const modalFields = (fields: Record<string, string>) =>
  Object.entries(fields).map(([custom_id, value]) => ({ components: [{ custom_id, value }] }));

const HOUR_MS = 60 * 60 * 1000;

describe('Discord identity: renames, account linking and admin name edits', () => {
  let db: ReturnType<typeof Database>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = getDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  const interact = (body: object) => request(app).post('/api/discord/interactions').send(body);
  const command = (member: DiscordMember, subCommand: string) =>
    interact({ type: 2, member, data: { name: 'secret-santa', options: [{ name: subCommand }] } });
  const button = (member: DiscordMember, customId: string) => interact({ type: 3, member, data: { custom_id: customId } });
  const signupModal = (member: DiscordMember, address = `${member.user.username} address`) =>
    interact({
      type: 5,
      member,
      data: {
        custom_id: 'secret_santa_signup_modal',
        components: modalFields({ full_name: `${member.user.username} name`, address, wishlist: '' }),
      },
    });
  const trackingModal = (member: DiscordMember, trackingNumber: string) =>
    interact({
      type: 5,
      member,
      data: {
        custom_id: 'secret_santa_tracking_modal',
        components: modalFields({ carrier: 'USPS', tracking_number: trackingNumber, shipped_at: '2026-12-01' }),
      },
    });
  const webSignup = (handle: string) =>
    request(app).post('/api/signup').send({ discordHandle: handle, fullName: `${handle} name`, address: `${handle} address`, passcode: 'santa2026' });

  const adminToken = async () => {
    const res = await request(app).post('/api/admin/login').send({ passcode: 'admin123' });
    assert.equal(res.status, 200);
    return res.body.token as string;
  };
  const generateMatches = async (token: string) => {
    const res = await request(app).post('/api/admin/generate-matches').set('Authorization', `Bearer ${token}`).send({});
    assert.equal(res.status, 200);
  };
  const editName = (token: string | null, participantId: string, discordHandle: unknown) => {
    const req = request(app).put(`/api/admin/participants/${participantId}`);
    return (token ? req.set('Authorization', `Bearer ${token}`) : req).send({ discordHandle });
  };

  type ParticipantRow = { id: string; discord_id: string | null; discord_handle: string; full_name: string };
  const participantByDiscordId = (discordId: string) =>
    db.prepare('SELECT id, discord_id, discord_handle, full_name FROM participants WHERE discord_id = ?').get(discordId) as ParticipantRow;
  const participantByHandle = (handle: string) =>
    db.prepare('SELECT id, discord_id, discord_handle, full_name FROM participants WHERE discord_handle = ?').get(handle) as ParticipantRow;
  const participantCount = () => (db.prepare('SELECT COUNT(*) as count FROM participants').get() as { count: number }).count;
  const trackingCount = () => (db.prepare('SELECT COUNT(*) as count FROM tracking_info').get() as { count: number }).count;
  const handleCopies = (participantId: string) => ({
    giverHandles: (db.prepare('SELECT giver_handle FROM matches WHERE giver_id = ?').all(participantId) as { giver_handle: string }[]).map((r) => r.giver_handle),
    receiverHandles: (db.prepare('SELECT receiver_handle FROM matches WHERE receiver_id = ?').all(participantId) as { receiver_handle: string }[]).map((r) => r.receiver_handle),
    trackingHandles: (db.prepare(`
      SELECT t.giver_handle FROM tracking_info t JOIN matches m ON m.id = t.match_id WHERE m.giver_id = ?
    `).all(participantId) as { giver_handle: string }[]).map((r) => r.giver_handle),
  });
  const auditActions = (action: string) =>
    db.prepare('SELECT details, severity FROM audit_logs WHERE action = ?').all(action) as { details: string; severity: string }[];

  it('follows a Discord signup through a username change after matching', async () => {
    const token = await adminToken();
    const alice = discordMember('1', 'alice');
    const bob = discordMember('2', 'bob');
    assert.match((await signupModal(alice)).body.data.content, /Successfully signed up/);
    assert.match((await signupModal(bob)).body.data.content, /Successfully signed up/);
    await generateMatches(token);
    assert.match((await trackingModal(alice, 'TRACK-1')).body.data.content, /saved/);
    const aliceId = participantByDiscordId('1').id;

    const renamedAlice = discordMember('1', 'alice_new');
    const trackingCommand = await command(renamedAlice, 'tracking');
    assert.equal(trackingCommand.body.type, 9);
    assert.equal(trackingCommand.body.data.custom_id, 'secret_santa_tracking_modal');
    assert.equal(trackingCommand.body.data.components[1].components[0].value, 'TRACK-1');

    const status = await command(renamedAlice, 'status');
    assert.match(status.body.data.content, /Private Secret Santa Assignment/);
    assert.match(status.body.data.content, /bob name \(@bob\)/);

    const saved = await trackingModal(renamedAlice, 'TRACK-2');
    assert.match(saved.body.data.content, /updated/);
    assert.equal(trackingCount(), 1);
    const tracking = db.prepare('SELECT tracking_number FROM tracking_info').get() as { tracking_number: string };
    assert.equal(tracking.tracking_number, 'TRACK-2');

    assert.equal(participantByDiscordId('1').discord_handle, 'alice_new');
    assert.deepEqual(handleCopies(aliceId), { giverHandles: ['alice_new'], receiverHandles: ['alice_new'], trackingHandles: ['alice_new'] });
    assert.match((await command(bob, 'status')).body.data.content, /\(@alice_new\)/);
    assert.equal(auditActions('DISCORD_HANDLE_SYNCED').length, 1);
    assert.match(auditActions('DISCORD_HANDLE_SYNCED')[0].details, /from alice to alice_new/);
  });

  it('refreshes the stored name when a renamed Discord user resubmits the signup modal', async () => {
    assert.match((await signupModal(discordMember('1', 'dan'))).body.data.content, /Successfully signed up/);
    const update = await signupModal(discordMember('1', 'danny'), 'New Address');
    assert.match(update.body.data.content, /updated/);
    assert.equal(participantCount(), 1);
    assert.equal(participantByDiscordId('1').discord_handle, 'danny');
  });

  it('links a web signup to the Discord account that uses its name instead of duplicating it', async () => {
    assert.equal((await webSignup('carol')).status, 200);
    assert.equal(participantByHandle('carol').discord_id, null);

    const carol = discordMember('9', 'Carol');
    const signupCommand = await command(carol, 'signup');
    assert.match(signupCommand.body.data.content, /already registered/);
    assert.equal(participantByHandle('carol').discord_id, '9');
    assert.equal(auditActions('DISCORD_ACCOUNT_LINKED').length, 1);

    const updateButton = await button(carol, 'update_info_yes');
    assert.equal(updateButton.body.type, 9);
    assert.equal(updateButton.body.data.components[0].components[0].value, 'carol name');

    assert.match((await signupModal(carol, 'Moved Address')).body.data.content, /updated/);
    assert.equal(participantCount(), 1);
    const row = db.prepare('SELECT discord_handle, address FROM participants').get() as { discord_handle: string; address: string };
    assert.deepEqual(row, { discord_handle: 'carol', address: 'Moved Address' });
  });

  it("never gives a renamed user's old name, details or assignment to a new Discord account", async () => {
    const token = await adminToken();
    assert.match((await signupModal(discordMember('1', 'alice'), 'Alice Secret Address')).body.data.content, /Successfully signed up/);
    assert.match((await signupModal(discordMember('2', 'bob'), 'Bob Secret Address')).body.data.content, /Successfully signed up/);

    // The real alice changed her name on Discord to alice2 but has not used the bot since.
    const impostor = discordMember('3', 'alice');
    assert.match((await command(impostor, 'info')).body.data.content, /You have not registered yet/);
    assert.match((await command(impostor, 'status')).body.data.content, /You are not signed up yet/);
    const signupCommand = await command(impostor, 'signup');
    assert.match(signupCommand.body.data.content, /already registered to a different Discord account/);
    assert.doesNotMatch(signupCommand.body.data.content, /Alice Secret Address/);
    assert.match((await signupModal(impostor)).body.data.content, /already registered to a different Discord account/);
    assert.match((await signupModal(discordMember('4', 'ALICE'))).body.data.content, /already registered to a different Discord account/);
    assert.equal(participantCount(), 2);
    assert.deepEqual(
      { discord_id: participantByHandle('alice').discord_id, full_name: participantByHandle('alice').full_name },
      { discord_id: '1', full_name: 'alice name' }
    );

    await generateMatches(token);
    const impostorStatus = await command(impostor, 'status');
    assert.match(impostorStatus.body.data.content, /No Secret Santa assignment found/);
    assert.doesNotMatch(impostorStatus.body.data.content, /Secret Address/);
    assert.match((await command(impostor, 'tracking')).body.data.content, /No Secret Santa assignment found/);
    assert.match((await trackingModal(impostor, 'FAKE')).body.data.content, /No active Secret Santa match/);
    assert.equal(trackingCount(), 0);

    const realAliceStatus = await command(discordMember('1', 'alice2'), 'status');
    assert.match(realAliceStatus.body.data.content, /Bob Secret Address/);
    assert.equal(participantByDiscordId('1').discord_handle, 'alice2');
  });

  it('still finds a match by name when its giver no longer has a participant row', async () => {
    db.prepare(`
      INSERT INTO matches (id, giver_id, giver_handle, giver_name, receiver_id, receiver_handle, receiver_name, receiver_address, receiver_wishlist, created_at)
      VALUES ('m1', 'deleted-participant', 'ghost', 'Ghost', 'r1', 'receiver', 'Receiver Name', 'Receiver Address', '', '2026-01-01')
    `).run();
    db.prepare("UPDATE settings SET value = 'true' WHERE key = 'is_matching_complete'").run();

    assert.match((await command(discordMember('8', 'ghost'), 'status')).body.data.content, /Receiver Address/);
  });

  it('keeps the existing name when a Discord rename collides with another participant', async () => {
    const token = await adminToken();
    assert.match((await signupModal(discordMember('1', 'alice'))).body.data.content, /Successfully signed up/);
    assert.equal((await webSignup('alice2')).status, 200);

    const renamedAlice = discordMember('1', 'Alice2');
    const status = await command(renamedAlice, 'status');
    assert.equal(status.status, 200);
    assert.match(status.body.data.content, /You are signed up/);
    assert.equal(participantByDiscordId('1').discord_handle, 'alice');
    assert.equal(participantByHandle('alice2').discord_id, null);
    const skipped = auditActions('DISCORD_HANDLE_SYNC_SKIPPED');
    assert.equal(skipped.length, 1);
    assert.equal(skipped[0].severity, 'warn');

    await generateMatches(token);
    assert.match((await command(renamedAlice, 'status')).body.data.content, /Private Secret Santa Assignment/);
    assert.match((await trackingModal(renamedAlice, 'TRACK-1')).body.data.content, /saved/);
    const tracking = db.prepare('SELECT giver_handle FROM tracking_info').get() as { giver_handle: string };
    assert.equal(tracking.giver_handle, 'alice');
  });

  it('lets an admin edit a participant name and carries it into matches and tracking', async () => {
    assert.equal((await editName(null, 'anything', 'new')).status, 401);

    const token = await adminToken();
    assert.equal((await editName(token, 'no-such-id', 'new')).status, 404);

    assert.equal((await webSignup('webby')).status, 200);
    assert.equal((await webSignup('other')).status, 200);
    assert.match((await signupModal(discordMember('7', 'discordo'))).body.data.content, /Successfully signed up/);
    const webbyId = participantByHandle('webby').id;

    const duplicate = await editName(token, webbyId, '  OTHER ');
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.success, false);
    assert.equal((await editName(token, webbyId, '   ')).status, 400);
    assert.equal((await editName(token, webbyId, 'x'.repeat(65))).status, 400);
    assert.equal((await request(app).put(`/api/admin/participants/${webbyId}`).set('Authorization', `Bearer ${token}`)).status, 400);

    const beforeMatching = await editName(token, webbyId, ' webby_new ');
    assert.equal(beforeMatching.status, 200);
    assert.equal(beforeMatching.body.success, true);
    assert.equal(participantByHandle('webby_new').id, webbyId);

    await generateMatches(token);
    assert.equal((await request(app).post('/api/tracking').send({ discordHandle: 'webby_new', passcode: 'santa2026', trackingNumber: 'T1' })).status, 200);

    assert.equal((await editName(token, webbyId, 'webby_final')).status, 200);
    assert.deepEqual(handleCopies(webbyId), { giverHandles: ['webby_final'], receiverHandles: ['webby_final'], trackingHandles: ['webby_final'] });
    assert.equal(participantByHandle('webby_final').discord_id, null);
    assert.equal((await editName(token, webbyId, 'Webby_Final')).status, 200);

    const login = await request(app).post('/api/participant/login').send({ discordHandle: 'Webby_Final', passcode: 'santa2026' });
    assert.equal(login.status, 200);
    assert.ok(login.body.data.assignedRecipient);
    assert.equal(login.body.data.trackingInfo.trackingNumber, 'T1');

    const discordoId = participantByDiscordId('7').id;
    assert.equal((await editName(token, discordoId, 'discordo_renamed')).status, 200);
    assert.equal(participantByDiscordId('7').discord_handle, 'discordo_renamed');
    assert.equal(auditActions('PARTICIPANT_HANDLE_EDITED').length, 4);
  });

  it('says signups are closed in info and status once the deadline passes', async () => {
    const token = await adminToken();
    const member = discordMember('1', 'alice');
    assert.match((await command(member, 'info')).body.data.content, /Signups Open/);
    assert.match((await command(member, 'status')).body.data.content, /Signups are currently open/);

    const update = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ signupDeadline: new Date(Date.now() - HOUR_MS).toISOString() });
    assert.equal(update.status, 200);

    const info = await command(member, 'info');
    assert.match(info.body.data.content, /Signups Closed/);
    assert.doesNotMatch(info.body.data.content, /Signups Open/);
    const status = await command(member, 'status');
    assert.match(status.body.data.content, /Signups are closed because the signup deadline has passed/);
    assert.doesNotMatch(status.body.data.content, /currently open/);
  });
});

// The exact schema production databases were created with before Discord identity syncing existed.
const PRODUCTION_SCHEMA = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    discord_id TEXT,
    discord_handle TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    address TEXT NOT NULL,
    wishlist TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    giver_id TEXT NOT NULL,
    giver_handle TEXT NOT NULL,
    giver_name TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    receiver_handle TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    receiver_address TEXT NOT NULL,
    receiver_wishlist TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tracking_info (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    giver_handle TEXT NOT NULL,
    carrier TEXT NOT NULL,
    tracking_number TEXT NOT NULL,
    shipped_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    ip TEXT,
    severity TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  );
`;

describe('Existing production database compatibility', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'santa-prod-'));
    dbPath = path.join(tempDir, 'secret_santa.db');

    const prod = new Database(dbPath);
    prod.exec(PRODUCTION_SCHEMA);
    const setting = prod.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    setting.run('signup_passcode', 'ProdCode');
    setting.run('is_matching_complete', 'true');
    setting.run('signup_deadline', '2026-01-01T00:00:00.000Z');

    const participant = prod.prepare('INSERT INTO participants (id, discord_id, discord_handle, full_name, address, wishlist, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    participant.run('p-web', null, 'webuser', 'Web User', '1 Web St', 'Books', '2025-11-01T00:00:00.000Z');
    participant.run('p-discord', '111', 'discorduser', 'Discord User', '2 Discord Ave', '', '2025-11-02T00:00:00.000Z');

    const match = prod.prepare(`
      INSERT INTO matches (id, giver_id, giver_handle, giver_name, receiver_id, receiver_handle, receiver_name, receiver_address, receiver_wishlist, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    match.run('m-1', 'p-web', 'webuser', 'Web User', 'p-discord', 'discorduser', 'Discord User', '2 Discord Ave', '', '2025-12-01T00:00:00.000Z');
    match.run('m-2', 'p-discord', 'discorduser', 'Discord User', 'p-web', 'webuser', 'Web User', '1 Web St', 'Books', '2025-12-01T00:00:00.000Z');

    prod.prepare('INSERT INTO tracking_info (id, match_id, giver_handle, carrier, tracking_number, shipped_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('t-1', 'm-1', 'webuser', 'UPS', '1Z999', '2025-12-10');
    prod.close();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const snapshot = (db: ReturnType<typeof Database>) => ({
    schema: db.prepare("SELECT name, sql FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY name").all(),
    participants: db.prepare('SELECT * FROM participants ORDER BY id').all(),
    matches: db.prepare('SELECT * FROM matches ORDER BY id').all(),
    tracking: db.prepare('SELECT * FROM tracking_info ORDER BY id').all(),
  });

  it('opens an existing database without changing its schema or data, and web signups can still log in', async () => {
    const before = new Database(dbPath, { readonly: true });
    const original = snapshot(before);
    before.close();
    assert.equal(original.participants.length, 2);
    assert.equal(original.matches.length, 2);
    assert.equal(original.tracking.length, 1);

    const db = getDb(dbPath);
    try {
      const app = createApp(db);
      assert.deepEqual(snapshot(db), original);

      const login = await request(app).post('/api/participant/login').send({ discordHandle: 'WebUser ', passcode: 'prodcode' });
      assert.equal(login.status, 200);
      assert.equal(login.body.data.participant.id, 'p-web');
      assert.equal(login.body.data.assignedRecipient.receiverHandle, 'discorduser');
      assert.equal(login.body.data.trackingInfo.trackingNumber, '1Z999');

      assert.deepEqual(snapshot(db), original);
    } finally {
      db.close();
    }
  });

  it('links and renames existing production rows lazily on their first Discord command', async () => {
    const db = getDb(dbPath);
    try {
      const app = createApp(db);
      const interact = (member: DiscordMember) =>
        request(app).post('/api/discord/interactions').send({ type: 2, member, data: { name: 'secret-santa', options: [{ name: 'status' }] } });

      assert.match((await interact(discordMember('222', 'webuser'))).body.data.content, /Discord User \(@discorduser\)/);
      assert.match((await interact(discordMember('111', 'discorduser_2026'))).body.data.content, /Web User \(@webuser\)/);

      const participants = db.prepare('SELECT id, discord_id, discord_handle FROM participants ORDER BY id').all();
      assert.deepEqual(participants, [
        { id: 'p-discord', discord_id: '111', discord_handle: 'discorduser_2026' },
        { id: 'p-web', discord_id: '222', discord_handle: 'webuser' },
      ]);
      const matches = db.prepare('SELECT id, giver_handle, receiver_handle FROM matches ORDER BY id').all();
      assert.deepEqual(matches, [
        { id: 'm-1', giver_handle: 'webuser', receiver_handle: 'discorduser_2026' },
        { id: 'm-2', giver_handle: 'discorduser_2026', receiver_handle: 'webuser' },
      ]);
      assert.equal((db.prepare('SELECT COUNT(*) as count FROM tracking_info').get() as { count: number }).count, 1);
    } finally {
      db.close();
    }
  });
});
