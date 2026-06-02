const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function formatLog(level, source, message, extra = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    ...extra
  });
}

export const logger = {
  debug(source, message, extra) {
    if (LOG_LEVELS.debug >= (LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info)) {
      console.debug(formatLog('debug', source, message, extra));
    }
  },
  info(source, message, extra) {
    if (LOG_LEVELS.info >= (LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info)) {
      console.log(formatLog('info', source, message, extra));
    }
  },
  warn(source, message, extra) {
    console.warn(formatLog('warn', source, message, extra));
  },
  error(source, message, extra) {
    console.error(formatLog('error', source, message, extra));
  }
};
