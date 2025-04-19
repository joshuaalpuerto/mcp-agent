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

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private currentLogLevel: LogLevel = LogLevel.INFO;

  private constructor() { }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  public log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Only log if the current log level allows it
    const logLevels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    if (logLevels.indexOf(level) >= logLevels.indexOf(this.currentLogLevel)) {
      const entry: LogEntry = {
        timestamp: Date.now(),
        level,
        message,
        context
      };

      this.logs.push(entry);
      this.outputLog(entry);
    }
  }

  private outputLog(entry: LogEntry): void {
    const formattedTimestamp = new Date(entry.timestamp).toISOString();
    const contextString = entry.context
      ? `${COLORS.DIM} | Context: ${util.inspect(entry.context, { depth: null, colors: true })}${COLORS.RESET}`
      : '';

    let levelColor = COLORS.RESET;
    let levelTag = entry.level.toUpperCase();
    let consoleMethod: (...data: any[]) => void = console.log;

    switch (entry.level) {
      case LogLevel.DEBUG:
        levelColor = COLORS.BLUE;
        levelTag = 'DEBUG';
        consoleMethod = console.debug;
        break;
      case LogLevel.INFO:
        levelColor = COLORS.CYAN;
        levelTag = 'INFO';
        consoleMethod = console.info;
        break;
      case LogLevel.WARN:
        levelColor = COLORS.YELLOW;
        levelTag = 'WARN';
        consoleMethod = console.warn;
        break;
      case LogLevel.ERROR:
        levelColor = COLORS.RED;
        levelTag = 'ERROR';
        consoleMethod = console.error;
        break;
    }

    const coloredLevelTag = `${levelColor}[${levelTag}]${COLORS.RESET}`;
    const coloredTimestamp = `${COLORS.DIM}[${formattedTimestamp}]${COLORS.RESET}`;

    consoleMethod(`${coloredTimestamp} ${coloredLevelTag} ${entry.message}${contextString}`);
  }

  public getLogs(level?: LogLevel): LogEntry[] {
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
}
