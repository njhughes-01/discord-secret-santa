import { DatabaseInstance } from './db.js';

interface DbSettingRow {
  value: string;
}

// An unset or unparsable deadline never counts as passed, so signups stay open.
export function isSignupDeadlinePassed(db: DatabaseInstance): boolean {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_deadline') as DbSettingRow | undefined;
  return row?.value ? new Date() > new Date(row.value) : false;
}
