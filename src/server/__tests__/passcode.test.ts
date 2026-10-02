import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, DatabaseInstance } from '../db.js';
import { normalizePasscode, isValidSignupPasscode } from '../passcode.js';

describe('normalizePasscode', () => {
  it('folds full-width characters, surrounding whitespace and case', () => {
    assert.equal(normalizePasscode('ＳＡＮＴＡ２０２６'), 'santa2026');
    assert.equal(normalizePasscode('  Santa2026\t\n'), 'santa2026');
    assert.equal(normalizePasscode('sAnTa2026'), 'santa2026');
  });

  it('turns empty and non-string input into a string', () => {
    assert.equal(normalizePasscode(''), '');
    assert.equal(normalizePasscode(undefined), '');
    assert.equal(normalizePasscode(null), '');
    assert.equal(normalizePasscode(2026), '2026');
  });
});

describe('isValidSignupPasscode', () => {
  let db: DatabaseInstance;

  beforeEach(() => {
    db = getDb(':memory:');
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('Santa2026', 'signup_passcode');
  });

  afterEach(() => {
    db.close();
  });

  it('accepts the stored code regardless of width, whitespace and case', () => {
    assert.equal(isValidSignupPasscode(db, 'ＳＡＮＴＡ２０２６'), true);
    assert.equal(isValidSignupPasscode(db, '  santa2026 '), true);
    assert.equal(isValidSignupPasscode(db, 'SANTA2026'), true);
  });

  it('rejects wrong, empty, whitespace-only and non-string input', () => {
    assert.equal(isValidSignupPasscode(db, 'santa2027'), false);
    assert.equal(isValidSignupPasscode(db, ''), false);
    assert.equal(isValidSignupPasscode(db, '   '), false);
    assert.equal(isValidSignupPasscode(db, undefined), false);
    assert.equal(isValidSignupPasscode(db, { passcode: 'santa2026' }), false);
  });

  it('rejects everything and logs an error when the signup_passcode setting row is missing', () => {
    db.prepare('DELETE FROM settings WHERE key = ?').run('signup_passcode');
    const consoleError = mock.method(console, 'error', () => {});
    try {
      assert.equal(isValidSignupPasscode(db, 'santa2026'), false);
      assert.equal(consoleError.mock.callCount(), 1);
      assert.match(String(consoleError.mock.calls[0].arguments[0]), /signup_passcode/);
    } finally {
      consoleError.mock.restore();
    }
  });
});
