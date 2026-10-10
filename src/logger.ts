/**
 * @iamdual/html2pdf
 * Structured logger utility with timestamps and log levels
 */

const formatTimestamp = (): string => new Date().toISOString();

const logger = {
  info: (message: string, ...args: any[]): void => {
    console.log(`[${formatTimestamp()}] [INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]): void => {
    console.warn(`[${formatTimestamp()}] [WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]): void => {
    console.error(`[${formatTimestamp()}] [ERROR] ${message}`, ...args);
  },
};

export default logger;
