import { DatabaseInstance } from './db.js';
import { AuditLog } from '../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

export function logAudit(
  db: DatabaseInstance,
  action: string,
  details: string,
  ip?: string,
  severity: 'info' | 'warn' | 'error' = 'info'
): AuditLog {
  const log: AuditLog = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    details,
    ip: ip || 'internal',
    severity,
  };

  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, details, ip, severity)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(log.id, log.timestamp, log.action, log.details, log.ip, log.severity);

  // Output to stdout/stderr for docker logs visibility
  const prefix = `[AUDIT ${severity.toUpperCase()}] [${action}]`;
  if (severity === 'error') {
    console.error(`🚨 ${prefix} ${details} (IP: ${log.ip})`);
  } else if (severity === 'warn') {
    console.warn(`⚠️ ${prefix} ${details} (IP: ${log.ip})`);
  } else {
    console.log(`ℹ️ ${prefix} ${details} (IP: ${log.ip})`);
  }

  return log;
}

export function getAuditLogs(db: DatabaseInstance, limit = 100): AuditLog[] {
  const rows = db.prepare(`
    SELECT id, timestamp, action, details, ip, severity
    FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as AuditLog[];

  return rows;
}
