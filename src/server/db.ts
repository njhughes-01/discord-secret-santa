import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

export type DatabaseInstance = ReturnType<typeof Database>;

let dbInstance: DatabaseInstance | null = null;

export function getDb(customPath?: string): DatabaseInstance {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || process.env.DB_PATH || path.join(process.cwd(), 'data', 'secret_santa.db');

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Initialize Schema
  db.exec(`
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
  `);

  // Initialize Default Settings if not present
  const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');

  if (!getSetting.get('signup_passcode')) {
    const defaultSignupPasscode = process.env.SIGNUP_PASSCODE || 'santa2026';
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('signup_passcode', defaultSignupPasscode);
  }

  if (!getSetting.get('admin_passcode_hash')) {
    const defaultAdminPasscode = process.env.ADMIN_PASSCODE || 'admin123';
    const hash = bcrypt.hashSync(defaultAdminPasscode, 10);
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('admin_passcode_hash', hash);
  }

  if (!getSetting.get('signup_deadline')) {
    const defaultDeadline = process.env.SIGNUP_DEADLINE || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('signup_deadline', defaultDeadline);
  }

  if (!getSetting.get('is_matching_complete')) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('is_matching_complete', 'false');
  }

  if (!getSetting.get('gift_budget')) {
    const defaultBudget = process.env.GIFT_BUDGET || '$25 - $50';
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('gift_budget', defaultBudget);
  }

  if (!getSetting.get('discord_webhook_url')) {
    const defaultWebhook = process.env.DISCORD_WEBHOOK_URL || '';
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('discord_webhook_url', defaultWebhook);
  }

  if (!getSetting.get('discord_public_key')) {
    const defaultPublicKey = process.env.DISCORD_PUBLIC_KEY || '';
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('discord_public_key', defaultPublicKey);
  }

  if (!getSetting.get('discord_app_id')) {
    const defaultAppId = process.env.DISCORD_APPLICATION_ID || '';
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('discord_app_id', defaultAppId);
  }

  if (!getSetting.get('discord_bot_token')) {
    const defaultBotToken = process.env.DISCORD_BOT_TOKEN || '';
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('discord_bot_token', defaultBotToken);
  }

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
