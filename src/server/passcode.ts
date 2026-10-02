import { DatabaseInstance } from './db.js';

interface DbSettingRow {
  value: string;
}

// Passcodes are deliberately case-insensitive: mobile keyboards auto-capitalize,
// insert full-width characters and add stray whitespace. Both the stored code and
// the input are normalized (NFKC, trim, lowercase) here at compare time.
export function normalizePasscode(value: unknown): string {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase();
}

// Single source of truth for checking the current event signup passcode.
export function isValidSignupPasscode(db: DatabaseInstance, input: unknown): boolean {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_passcode') as DbSettingRow | undefined;
  if (!row || !row.value) {
    console.error('🚨 signup_passcode setting is missing or empty; rejecting every event passcode.');
    return false;
  }
  const candidate = normalizePasscode(input);
  return candidate !== '' && candidate === normalizePasscode(row.value);
}
