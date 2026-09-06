export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const MAX_BUFFER_SIZE = 150;
const logBuffer: LogEntry[] = [];

// Sensitive field keys that should never appear in logs
const SENSITIVE_KEYS = new Set(['password', 'passwordhash', 'token', 'apikey', 'secret', 'ssn', 'taxid', 'pin']);

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = sanitizeValue(v);
      }
    }
    return sanitized;
  }

  return String(value);
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';
  }

  private log(level: LogLevel, tag: string, message: string, metadata?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      tag: tag.toUpperCase(),
      message,
      metadata: metadata ? (sanitizeValue(metadata) as Record<string, unknown>) : undefined
    };

    // Store in circular buffer
    if (logBuffer.length >= MAX_BUFFER_SIZE) {
      logBuffer.shift();
    }
    logBuffer.push(entry);

    // Development console formatting
    const prefix = `[${entry.timestamp.slice(11, 19)}] [${entry.level}] [${entry.tag}]`;
    switch (level) {
      case 'DEBUG':
        if (this.isDevelopment) {
          console.debug(prefix, message, entry.metadata || '');
        }
        break;
      case 'INFO':
        console.info(prefix, message, entry.metadata || '');
        break;
      case 'WARN':
        console.warn(prefix, message, entry.metadata || '');
        break;
      case 'ERROR':
        console.error(prefix, message, entry.metadata || '');
        break;
    }

    return entry;
  }

  debug(tag: string, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log('DEBUG', tag, message, metadata);
  }

  info(tag: string, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log('INFO', tag, message, metadata);
  }

  warn(tag: string, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log('WARN', tag, message, metadata);
  }

  error(tag: string, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log('ERROR', tag, message, metadata);
  }

  getRecentLogs(limit = 50): LogEntry[] {
    return logBuffer.slice(-limit);
  }

  clearLogs(): void {
    logBuffer.length = 0;
  }
}

export const logger = new Logger();
