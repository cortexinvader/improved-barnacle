type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private minLevel: LogLevel = this.isDevelopment ? 'debug' : 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };

    let output = `${timestamp} ${emoji[level]} [${level.toUpperCase()}] ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      output += ` ${JSON.stringify(context)}`;
    }

    return output;
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        ...(error instanceof Error ? {
          error: error.message,
          stack: error.stack,
        } : { error }),
      };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  http(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this[level](`HTTP ${method} ${path} ${statusCode}`, { duration: `${duration}ms`, ...context });
  }
}

export const logger = new Logger();
