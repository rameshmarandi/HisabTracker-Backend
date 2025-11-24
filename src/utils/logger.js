import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = createLogger({
  level: 'info', // Log levels: error, warn, info, http, verbose, debug, silly
  format: combine(
    colorize(), // Add colors in console output
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // Log stack trace for errors
    logFormat
  ),
  transports: [
    // Console log for development
    new transports.Console(),

    // Write all logs into a file (rotates daily)
    new transports.File({
      filename: 'logs/error.log',
      level: 'error', // Store only error logs
      handleExceptions: true,
      maxsize: 5242880, // 5 MB
      maxFiles: 5, // Keep last 5 log files
    }),

    new transports.File({
      filename: 'logs/combined.log', // Store all logs
      handleExceptions: true,
      maxsize: 5242880, // 5 MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// If you're using Morgan for HTTP logging:
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

export default logger;
