import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb, DatabaseInstance } from './db.js';
import { logAudit, getAuditLogs } from './logger.js';
import { antiRobotMiddleware, robotsTxtHandler } from './middleware/robots.js';
import { createAdminSession, invalidateAdminSession, requireAdminAuth } from './middleware/auth.js';
import { generateDerangementMatches } from './matcher.js';
import { sendDiscordAnnouncement } from './webhook.js';
import { handleDiscordInteractions } from './discordInteractions.js';
import { registerDiscordCommandsWithApi } from './discordCommandRegister.js';
import {
  Participant,
  Match,
  TrackingInfo,
  AppSettings,
  ParticipantPortalData,
  AssignedRecipient
} from '../shared/types.js';

interface DbSettingRow {
  value: string;
}

interface CountRow {
  count: number;
}

// Dummy hash for constant-time comparison when handle/user is not found
const DUMMY_HASH = '$2a$10$e7f0/bKxJbH7k9J1L6W8.e1vJ3Q9Z2M4X7Y5Z8A1B3C5D7E9F1G3H';

export function createApp(customDb?: DatabaseInstance) {
  const app = express();

  // Trust 1 hop proxy (Cloudflare Tunnel / reverse proxy) for express-rate-limit client IP extraction
  app.set('trust proxy', 1);

  // Hide Node/Express fingerprinting
  app.disable('x-powered-by');

  // Security Middleware & Shield Headers
  const enableStrictSecurity = process.env.ENABLE_STRICT_SECURITY_HEADERS === 'true';

  app.use(helmet({
    contentSecurityPolicy: enableStrictSecurity ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Vite React client SPA bundle
        styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind inline styles
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    } : false, // Disabled for local HTTP LAN testing to prevent mobile asset blocking
    referrerPolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: enableStrictSecurity ? { policy: 'same-origin' } : false,
    crossOriginResourcePolicy: enableStrictSecurity ? { policy: 'same-origin' } : false,
  }));

  // Extra Security Headers (Permissions Policy & COEP)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    if (enableStrictSecurity) {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    }
    next();
  });

  // Real-time Container Request Logger for Docker Logs
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`🌐 [HTTP ${req.method}] ${req.originalUrl || req.url} -> Status: ${res.statusCode} (${duration}ms) IP: ${req.ip}`);
    });
    next();
  });

  app.use(antiRobotMiddleware);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(cookieParser());

  // General API Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', generalLimiter);

  // Strict Authentication Rate Limiter (5 attempts per 15 mins per IP)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Too many login attempts from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/admin/login', authLimiter);
  app.use('/api/participant/login', authLimiter);

  // Strict Signup Rate Limiter (10 per hour per IP)
  const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Signup rate limit exceeded for this IP. Please try again later.' },
  });
  app.use('/api/signup', signupLimiter);

  // Helper to get active database instance
  const getAppDb = (): DatabaseInstance => customDb || getDb();

  // Honeypot Bot Trap Middleware for User Forms (Excludes Admin Login to prevent autofill false positives)
  const honeypotTrap = (req: Request, res: Response, next: NextFunction) => {
    if (req.body && req.body.confirm_email_field && String(req.body.confirm_email_field).trim() !== '') {
      const db = getAppDb();
      logAudit(db, 'BOT_TRAP_TRIGGERED', `Automated bot trap triggered by IP on ${req.originalUrl}`, req.ip, 'warn');
      return res.status(400).json({ success: false, error: 'Invalid request payload.' });
    }
    next();
  };

  // Robots.txt
  app.get('/robots.txt', robotsTxtHandler);

  // Discord Interactions Webhook Endpoint (Slash Commands & Modals)
  app.post('/api/discord/interactions', (req: Request, res: Response) => {
    handleDiscordInteractions(req, res, getAppDb());
  });

  // Public API: Verify Event Passcode
  app.post('/api/verify-passcode', honeypotTrap, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const { passcode } = req.body;

      if (!passcode) {
        return res.status(400).json({ success: false, error: 'Passcode is required.' });
      }

      const passcodeRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_passcode') as DbSettingRow;
      if (!passcodeRow || String(passcode).trim() !== passcodeRow.value) {
        logAudit(db, 'PASSCODE_VERIFY_FAILED', 'Failed event passcode verification', req.ip, 'warn');
        return res.status(401).json({ success: false, error: 'Invalid event passcode.' });
      }

      res.json({ success: true, message: 'Event passcode verified.' });
    } catch (err) {
      next(err);
    }
  });

  // Public API: Get App Settings & Info
  app.get('/api/settings', (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const getSetting = (key: string) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as DbSettingRow | undefined;

      const signupDeadline = getSetting('signup_deadline')?.value || '';
      const isMatchingComplete = getSetting('is_matching_complete')?.value === 'true';
      const giftBudget = getSetting('gift_budget')?.value || '$25 - $50';
      const discordWebhookUrl = getSetting('discord_webhook_url')?.value || '';
      const countRow = db.prepare('SELECT COUNT(*) as count FROM participants').get() as CountRow;

      const settings: AppSettings = {
        signupPasscode: '***',
        signupDeadline,
        isMatchingComplete,
        giftBudget,
        discordWebhookUrl: discordWebhookUrl ? '***' : '',
        totalParticipants: countRow?.count || 0,
      };

      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  });

  // Public API: Participant Signup
  app.post('/api/signup', honeypotTrap, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const { discordHandle, fullName, address, wishlist, passcode } = req.body;

      if (!discordHandle || !fullName || !address || !passcode) {
        return res.status(400).json({ success: false, error: 'Discord handle, full name, address, and passcode are required.' });
      }

      // Check passcode
      const actualPasscodeRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_passcode') as DbSettingRow;
      if (!actualPasscodeRow || String(passcode).trim() !== actualPasscodeRow.value) {
        logAudit(db, 'SIGNUP_FAILED', `Invalid signup attempt for handle ${discordHandle}`, req.ip, 'warn');
        return res.status(401).json({ success: false, error: 'Invalid signup credentials.' });
      }

      // Check deadline
      const deadlineRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_deadline') as DbSettingRow;
      if (deadlineRow && deadlineRow.value) {
        const deadlineDate = new Date(deadlineRow.value);
        if (new Date() > deadlineDate) {
          logAudit(db, 'SIGNUP_FAILED', `Signup attempted after deadline by ${discordHandle}`, req.ip, 'warn');
          return res.status(400).json({ success: false, error: 'Signups are now closed.' });
        }
      }

      // Check matching complete
      const matchingCompleteRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow;
      if (matchingCompleteRow && matchingCompleteRow.value === 'true') {
        return res.status(400).json({ success: false, error: 'Secret Santa matches have already been generated. Signups are locked.' });
      }

      // Save participant
      const existing = db.prepare('SELECT id FROM participants WHERE LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))').get(discordHandle);
      const now = new Date().toISOString();

      if (existing) {
        db.prepare(`
          UPDATE participants
          SET full_name = ?, address = ?, wishlist = ?
          WHERE LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
        `).run(fullName, address, wishlist || '', discordHandle);

        logAudit(db, 'PARTICIPANT_UPDATED', `Updated details for ${discordHandle}`, req.ip);
        return res.json({ success: true, message: 'Signup details successfully updated!' });
      } else {
        const id = uuidv4();
        db.prepare(`
          INSERT INTO participants (id, discord_handle, full_name, address, wishlist, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, discordHandle, fullName, address, wishlist || '', now);

        logAudit(db, 'PARTICIPANT_REGISTERED', `Registered new participant ${discordHandle}`, req.ip);
        return res.json({ success: true, message: 'Successfully signed up for Secret Santa!' });
      }
    } catch (err) {
      next(err);
    }
  });

  // Check if handle is already registered for pre-populating Web form
  app.get('/api/participant/check-handle', (req: Request, res: Response, next: NextFunction) => {
    try {
      const handle = String(req.query.handle || '').trim();
      if (!handle || handle.length < 2) return res.json({ success: true, exists: false });

      const db = getAppDb();

      const matchingCompleteRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow;
      const isMatchingComplete = matchingCompleteRow?.value === 'true';

      if (isMatchingComplete) {
        return res.json({ success: true, exists: false, isLocked: true });
      }

      const existing = db.prepare(`
        SELECT full_name as fullName, address, wishlist
        FROM participants
        WHERE LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
      `).get(handle) as { fullName: string; address: string; wishlist: string } | undefined;

      if (existing) {
        return res.json({
          success: true,
          exists: true,
          data: {
            fullName: existing.fullName,
            address: existing.address,
            wishlist: existing.wishlist,
          },
        });
      }

      return res.json({ success: true, exists: false });
    } catch (err) {
      next(err);
    }
  });

  // Participant Portal: Login / View Personal Dashboard
  app.post('/api/participant/login', honeypotTrap, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const { discordHandle, passcode } = req.body;

      if (!discordHandle || !passcode) {
        return res.status(400).json({ success: false, error: 'Discord handle and passcode are required.' });
      }

      // Verify passcode
      const passcodeRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_passcode') as DbSettingRow;
      const isPasscodeValid = passcodeRow && String(passcode).trim() === passcodeRow.value;

      const participant = db.prepare(`
        SELECT id, discord_handle as discordHandle, full_name as fullName, address, wishlist, created_at as createdAt
        FROM participants
        WHERE LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
      `).get(discordHandle) as Participant | undefined;

      if (!isPasscodeValid || !participant) {
        logAudit(db, 'PARTICIPANT_LOGIN_FAILED', `Failed portal login attempt for ${discordHandle}`, req.ip, 'warn');
        return res.status(401).json({ success: false, error: 'Invalid handle or passcode.' });
      }

      const matchingCompleteRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow;
      const isMatchingComplete = matchingCompleteRow?.value === 'true';

      const deadlineRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_deadline') as DbSettingRow;
      const isDeadlinePassed = deadlineRow?.value ? new Date() > new Date(deadlineRow.value) : false;

      const budgetRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('gift_budget') as DbSettingRow;
      const giftBudget = budgetRow?.value || '$25 - $50';

      let assignedRecipient: AssignedRecipient | null = null;
      let assignedRecipients: AssignedRecipient[] = [];
      let trackingInfo: TrackingInfo | null = null;

      if (isMatchingComplete) {
        const matchesList = db.prepare(`
          SELECT id, receiver_name as receiverName, receiver_handle as receiverHandle,
                 receiver_address as receiverAddress, receiver_wishlist as receiverWishlist
          FROM matches
          WHERE LOWER(TRIM(giver_handle)) = LOWER(TRIM(?))
        `).all(discordHandle) as (AssignedRecipient & { id: string })[];

        if (matchesList && matchesList.length > 0) {
          assignedRecipients = matchesList.map((match) => ({
            receiverName: match.receiverName,
            receiverHandle: match.receiverHandle,
            receiverAddress: match.receiverAddress,
            receiverWishlist: match.receiverWishlist,
          }));
          assignedRecipient = assignedRecipients[0];

          const track = db.prepare(`
            SELECT id, match_id as matchId, giver_handle as giverHandle, carrier, tracking_number as trackingNumber, shipped_at as shippedAt
            FROM tracking_info
            WHERE match_id = ?
          `).get(matchesList[0].id) as TrackingInfo | undefined;

          if (track) {
            trackingInfo = track;
          }
        }
      }

      const portalData: ParticipantPortalData = {
        participant,
        assignedRecipient,
        assignedRecipients,
        trackingInfo,
        isMatchingComplete,
        isDeadlinePassed,
        giftBudget,
      };

      res.json({ success: true, data: portalData });
    } catch (err) {
      next(err);
    }
  });

  // Participant Portal: Update Profile Details
  app.put('/api/participant/profile', honeypotTrap, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const { discordHandle, passcode, fullName, address, wishlist } = req.body;

      if (!discordHandle || !passcode || !fullName || !address) {
        return res.status(400).json({ success: false, error: 'Discord handle, passcode, full name, and address are required.' });
      }

      const passcodeRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_passcode') as DbSettingRow;
      if (!passcodeRow || String(passcode).trim() !== passcodeRow.value) {
        return res.status(401).json({ success: false, error: 'Invalid handle or passcode.' });
      }

      const matchingCompleteRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('is_matching_complete') as DbSettingRow;
      if (matchingCompleteRow && matchingCompleteRow.value === 'true') {
        return res.status(400).json({ success: false, error: 'Matches have been generated. Profile details are locked.' });
      }

      db.prepare(`
        UPDATE participants
        SET full_name = ?, address = ?, wishlist = ?
        WHERE LOWER(TRIM(discord_handle)) = LOWER(TRIM(?))
      `).run(fullName, address, wishlist || '', discordHandle);

      logAudit(db, 'PARTICIPANT_PROFILE_UPDATED', `Participant ${discordHandle} updated profile`, req.ip);
      res.json({ success: true, message: 'Profile details updated successfully!' });
    } catch (err) {
      next(err);
    }
  });

  // Public API: Submit Tracking Info
  app.post('/api/tracking', honeypotTrap, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const { discordHandle, passcode, carrier, trackingNumber } = req.body;

      if (!discordHandle || !passcode || !carrier || !trackingNumber) {
        return res.status(400).json({ success: false, error: 'Discord handle, passcode, carrier, and tracking number are required.' });
      }

      // Verify passcode
      const passcodeRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('signup_passcode') as DbSettingRow;
      if (!passcodeRow || String(passcode).trim() !== passcodeRow.value) {
        return res.status(401).json({ success: false, error: 'Invalid passcode.' });
      }

      // Find match record for this giver
      const match = db.prepare('SELECT id FROM matches WHERE LOWER(TRIM(giver_handle)) = LOWER(TRIM(?))').get(discordHandle) as { id: string } | undefined;
      if (!match) {
        return res.status(404).json({ success: false, error: 'No Secret Santa assignment found for this Discord handle yet.' });
      }

      const existingTracking = db.prepare('SELECT id FROM tracking_info WHERE match_id = ?').get(match.id) as { id: string } | undefined;
      const now = new Date().toISOString();

      if (existingTracking) {
        db.prepare(`
          UPDATE tracking_info
          SET carrier = ?, tracking_number = ?, shipped_at = ?
          WHERE id = ?
        `).run(carrier, trackingNumber, now, existingTracking.id);

        logAudit(db, 'TRACKING_UPDATED', `Tracking updated by ${discordHandle}`, req.ip);
      } else {
        const id = uuidv4();
        db.prepare(`
          INSERT INTO tracking_info (id, match_id, giver_handle, carrier, tracking_number, shipped_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, match.id, discordHandle, carrier, trackingNumber, now);

        logAudit(db, 'TRACKING_ADDED', `Tracking added by ${discordHandle}`, req.ip);
      }

      res.json({ success: true, message: 'Tracking information submitted successfully!' });
    } catch (err) {
      next(err);
    }
  });

  // Admin Login (NOTE: Honeypot check excluded here to prevent password managers from triggering false positives)
  app.post('/api/admin/login', (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const { passcode } = req.body;

      if (!passcode) {
        return res.status(400).json({ success: false, error: 'Passcode is required.' });
      }

      const hashRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_passcode_hash') as DbSettingRow;
      const targetHash = hashRow ? hashRow.value : DUMMY_HASH;

      const isMatch = bcrypt.compareSync(String(passcode), targetHash);

      if (!hashRow || !isMatch) {
        logAudit(db, 'ADMIN_LOGIN_FAILED', 'Failed admin login attempt', req.ip, 'warn');
        return res.status(401).json({ success: false, error: 'Invalid admin passcode.' });
      }

      const token = createAdminSession();
      res.cookie('admin_session', token, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
      });

      logAudit(db, 'ADMIN_LOGIN_SUCCESS', 'Admin logged in successfully', req.ip);
      res.json({ success: true, token, message: 'Admin login successful.' });
    } catch (err) {
      next(err);
    }
  });

  // Admin Logout
  app.post('/api/admin/logout', requireAdminAuth, (req: Request, res: Response) => {
    const token = req.cookies?.admin_session;
    invalidateAdminSession(token);
    res.clearCookie('admin_session');
    res.json({ success: true, message: 'Logged out.' });
  });

  // Admin: Get All Participants
  app.get('/api/admin/participants', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const rows = db.prepare(`
        SELECT id, discord_id as discordId, discord_handle as discordHandle, full_name as fullName, address, wishlist, created_at as createdAt
        FROM participants
        ORDER BY created_at ASC
      `).all() as Participant[];

      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  });

  // Admin: Export Participants CSV
  app.get('/api/admin/export/participants', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const rows = db.prepare(`
        SELECT discord_handle, full_name, address, wishlist, created_at
        FROM participants
        ORDER BY created_at ASC
      `).all() as any[];

      const header = 'Discord Handle,Full Name,Address,Wishlist,Signed Up At\n';
      const body = rows.map(r =>
        `"${r.discord_handle.replace(/"/g, '""')}","${r.full_name.replace(/"/g, '""')}","${r.address.replace(/"/g, '""')}","${(r.wishlist || '').replace(/"/g, '""')}","${r.created_at}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=participants.csv');
      res.send(header + body);
    } catch (err) {
      next(err);
    }
  });

  // Admin: Get Matches
  app.get('/api/admin/matches', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const rows = db.prepare(`
        SELECT id, giver_id as giverId, giver_handle as giverHandle, giver_name as giverName,
               receiver_id as receiverId, receiver_handle as receiverHandle, receiver_name as receiverName,
               receiver_address as receiverAddress, receiver_wishlist as receiverWishlist, created_at as createdAt
        FROM matches
        ORDER BY giver_handle ASC
      `).all() as Match[];

      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  });

  // Admin: Export Matches CSV
  app.get('/api/admin/export/matches', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const rows = db.prepare(`
        SELECT giver_handle, giver_name, receiver_handle, receiver_name, receiver_address, receiver_wishlist, created_at
        FROM matches
        ORDER BY giver_handle ASC
      `).all() as any[];

      const header = 'Giver Handle,Giver Name,Receiver Handle,Receiver Name,Receiver Address,Receiver Wishlist,Matched At\n';
      const body = rows.map(r =>
        `"${r.giver_handle.replace(/"/g, '""')}","${r.giver_name.replace(/"/g, '""')}","${r.receiver_handle.replace(/"/g, '""')}","${r.receiver_name.replace(/"/g, '""')}","${r.receiver_address.replace(/"/g, '""')}","${(r.receiver_wishlist || '').replace(/"/g, '""')}","${r.created_at}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=secret_santa_matches.csv');
      res.send(header + body);
    } catch (err) {
      next(err);
    }
  });

  // Admin: Generate Secret Santa Matches
  app.post('/api/admin/generate-matches', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const { dualGiverId } = req.body || {};

      const participants = db.prepare(`
        SELECT id, discord_handle as discordHandle, full_name as fullName, address, wishlist, created_at as createdAt
        FROM participants
      `).all() as Participant[];

      if (participants.length < 2) {
        return res.status(400).json({ success: false, error: 'Need at least 2 participants to generate matches.' });
      }

      const matches = generateDerangementMatches(participants, dualGiverId);

      const insertMatch = db.prepare(`
        INSERT INTO matches (id, giver_id, giver_handle, giver_name, receiver_id, receiver_handle, receiver_name, receiver_address, receiver_wishlist, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      db.transaction(() => {
        db.prepare('DELETE FROM matches').run();
        db.prepare('DELETE FROM tracking_info').run();
        for (const m of matches) {
          insertMatch.run(
            m.id,
            m.giverId,
            m.giverHandle,
            m.giverName,
            m.receiverId,
            m.receiverHandle,
            m.receiverName,
            m.receiverAddress,
            m.receiverWishlist,
            m.createdAt
          );
        }
        db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('true', 'is_matching_complete');
      })();

      logAudit(db, 'MATCHES_GENERATED', `Generated ${matches.length} Secret Santa matches`, req.ip);

      // Dispatch Discord Webhook Announcement if configured
      const webhookRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('discord_webhook_url') as DbSettingRow | undefined;
      if (webhookRow && webhookRow.value) {
        sendDiscordAnnouncement(
          webhookRow.value,
          'Secret Santa Matches Have Been Generated! 🎅',
          `Secret Santa assignments for **${matches.length} participants** have been generated! Log into **My Santa Page** on https://santa.lightmedia.club to reveal who you are gifting to!`,
          0xd42426
        ).catch(err => console.error('Discord webhook error:', err));
      }

      res.json({ success: true, message: `Successfully generated ${matches.length} Secret Santa matches!`, data: matches });
    } catch (err) {
      next(err);
    }
  });

  // Admin: Get Tracking Info
  app.get('/api/admin/tracking', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const rows = db.prepare(`
        SELECT id, match_id as matchId, giver_handle as giverHandle, carrier, tracking_number as trackingNumber, shipped_at as shippedAt
        FROM tracking_info
        ORDER BY shipped_at DESC
      `).all() as TrackingInfo[];

      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  });

  // Admin: Get Audit Logs
  app.get('/api/admin/audit-logs', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const logs = getAuditLogs(db, 200);
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  });

  // Admin: Test Discord Webhook
  app.post('/api/admin/test-webhook', requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const webhookRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('discord_webhook_url') as DbSettingRow | undefined;

      if (!webhookRow || !webhookRow.value) {
        return res.status(400).json({ success: false, error: 'No Discord Webhook URL configured in Settings.' });
      }

      const success = await sendDiscordAnnouncement(
        webhookRow.value,
        'Discord Secret Santa Test Connection 🎄',
        'Your Discord Webhook connection to **santa.lightmedia.club** is working perfectly! You will receive automated event announcements here.',
        0x165b33
      );

      if (success) {
        logAudit(db, 'DISCORD_WEBHOOK_TEST_SUCCESS', 'Admin sent test Discord webhook announcement', req.ip);
        res.json({ success: true, message: 'Test announcement successfully sent to your Discord channel!' });
      } else {
        logAudit(db, 'DISCORD_WEBHOOK_TEST_FAILED', 'Failed sending test Discord webhook announcement', req.ip, 'warn');
        res.status(400).json({ success: false, error: 'Failed to send webhook message. Please verify your Discord Webhook URL.' });
      }
    } catch (err) {
      next(err);
    }
  });

  // Admin: Get Raw Settings
  app.get('/api/admin/settings', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const getSetting = (key: string) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as DbSettingRow | undefined;

      res.json({
        success: true,
        data: {
          signupPasscode: getSetting('signup_passcode')?.value || '',
          signupDeadline: getSetting('signup_deadline')?.value || '',
          giftBudget: getSetting('gift_budget')?.value || '$25 - $50',
          discordWebhookUrl: getSetting('discord_webhook_url')?.value || '',
          discordPublicKey: getSetting('discord_public_key')?.value || '',
          discordAppId: getSetting('discord_app_id')?.value || '',
          discordBotToken: getSetting('discord_bot_token')?.value || '',
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // Admin: Update App Settings
  app.put('/api/admin/settings', requireAdminAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const { signupPasscode, adminPasscode, signupDeadline, giftBudget, discordWebhookUrl, discordPublicKey, discordAppId, discordBotToken } = req.body;

      const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

      db.transaction(() => {
        if (signupPasscode !== undefined && String(signupPasscode).trim() !== '') {
          upsert.run('signup_passcode', String(signupPasscode).trim());
        }
        if (adminPasscode !== undefined && String(adminPasscode).trim() !== '') {
          const hash = bcrypt.hashSync(String(adminPasscode).trim(), 10);
          upsert.run('admin_passcode_hash', hash);
        }
        if (signupDeadline !== undefined && String(signupDeadline).trim() !== '') {
          upsert.run('signup_deadline', String(signupDeadline).trim());
        }
        if (giftBudget !== undefined && String(giftBudget).trim() !== '') {
          upsert.run('gift_budget', String(giftBudget).trim());
        }
        if (discordWebhookUrl !== undefined) {
          upsert.run('discord_webhook_url', String(discordWebhookUrl).trim());
        }
        if (discordPublicKey !== undefined) {
          upsert.run('discord_public_key', String(discordPublicKey).trim());
        }
        if (discordAppId !== undefined) {
          upsert.run('discord_app_id', String(discordAppId).trim());
        }
        if (discordBotToken !== undefined) {
          upsert.run('discord_bot_token', String(discordBotToken).trim());
        }
      })();

      logAudit(db, 'SETTINGS_UPDATED', 'Admin updated application settings', req.ip);
      res.json({ success: true, message: 'Settings updated successfully.' });
    } catch (err) {
      next(err);
    }
  });

  // Admin: 1-Click Register Discord Slash Commands with Discord API v10
  app.post('/api/admin/register-discord-commands', requireAdminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getAppDb();
      const { appId, botToken } = req.body;

      const result = await registerDiscordCommandsWithApi(appId, botToken, db);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (err) {
      next(err);
    }
  });

  // Serve static client in production
  const clientDistPath = path.join(process.cwd(), 'dist', 'client');
  app.use(express.static(clientDistPath));
  app.get(new RegExp('^/(.*)$'), (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
        if (err) {
          res.status(404).send('Not Found');
        }
      });
    }
  });

  // Global Error Handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const db = getAppDb();
    const errorMsg = err.message || 'Unknown internal server error';
    logAudit(db, 'SERVER_ERROR', `Error on ${req.method} ${req.url}: ${errorMsg}`, req.ip, 'error');

    res.status(500).json({
      success: false,
      error: 'An internal server error occurred.',
    });
  });

  return app;
}
