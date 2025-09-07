// Logging module exports
import util from 'util';

// ANSI escape codes for colors
export const COLORS = {
  RESET: "\x1b[0m",
  RED: "\x1b[31m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  CYAN: "\x1b[36m",
  MAGENTA: "\x1b[35m",
  DIM: "\x1b[2m",
}

export const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  DEBUG: 'debug',
  ERROR: 'error'
} as const

const LOG_LEVELS_ORDER = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG] as const;

type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

export interface LogEntry {
  timestamp: number;
  level: LogLevelType;
  message: string;
  context?: Record<string, unknown>;
}

export interface LoggerInterface {
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
  debug(message: string, context?: any): void;
  log?(level: string, message: string, context?: any): void;
}

export interface LogOptions {
  level?: LogLevelType;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private logger: LoggerInterface;
  private logLevel: LogLevelType;


  // default to console logger
  private constructor(logger: LoggerInterface, options: LogOptions = {}) {
    this.logger = logger;
    this.logLevel = options.level || LogLevel.INFO;;
  }

  public static getInstance(logger: LoggerInterface = console, options: LogOptions = {}): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(logger, options);
    }
    return Logger.instance;
  }

  public getLogs(level?: LogLevelType): LogEntry[] {
    return level
      ? this.logs.filter(log => log.level === level)
      : this.logs;
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public exportLogs(format: 'json' | 'text' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    return this.logs.map(log =>
      `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}` +
      (log.context ? ` | ${JSON.stringify(log.context)}` : '')
    ).join('\n');
  }

  public info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }

  public debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  private log(level: LogLevelType, message: string, context?: any): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context
    };
    this.logs.push(entry);
    this.outputLog(entry);
  }

  private outputLog(entry: LogEntry): void {
    if (LOG_LEVELS_ORDER.indexOf(entry.level) <= LOG_LEVELS_ORDER.indexOf(this.logLevel)) {
      const output = this.formatMessage(entry);
      this.logger[entry.level](output);
    }
  }

  private formatMessage(entry: LogEntry): string {
    const formattedTimestamp = new Date(entry.timestamp).toISOString();
    const contextString = entry.context
      ? `${COLORS.DIM} | Context: ${util.inspect(entry.context, { depth: null, colors: true })}${COLORS.RESET}`
      : '';

    let levelColor = COLORS.RESET;
    let levelTag = entry.level.toUpperCase();

    switch (entry.level) {
      case LogLevel.DEBUG:
        levelColor = COLORS.BLUE;
        levelTag = 'DEBUG';
        break;
      case LogLevel.INFO:
        levelColor = COLORS.CYAN;
        levelTag = 'INFO';
        break;
      case LogLevel.WARN:
        levelColor = COLORS.YELLOW;
        levelTag = 'WARN';
        break;
      case LogLevel.ERROR:
        levelColor = COLORS.RED;
        levelTag = 'ERROR';
        break;
    }

    const coloredLevelTag = `${levelColor}[${levelTag}]${COLORS.RESET}`;
    const coloredTimestamp = `${COLORS.DIM}[${formattedTimestamp}]${COLORS.RESET}`;
    return `${coloredTimestamp} ${coloredLevelTag} ${entry.message}${contextString}`
  }
}
