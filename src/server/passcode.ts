import { DatabaseInstance } from './db.js';

interface DbSettingRow {
  value: string;
}

// Normalize an event passcode so mobile keyboards (auto-capitalized first letter,
// full-width characters, stray whitespace) don't cause false rejections.
export function normalizePasscode(value: unknown): string {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase();
}

// Single source of truth for checking the current event signup passcode.
export function isValidSignupPasscode(db: DatabaseInstance, input: unknown): boolean {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_passcode') as DbSettingRow | undefined;
  if (!row || !row.value) return false;
  const candidate = normalizePasscode(input);
  return candidate !== '' && candidate === normalizePasscode(row.value);
}
