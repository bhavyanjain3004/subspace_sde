const logger = require('./logger');

async function withRetry(fn, maxAttempts = 3, baseDelay = 5000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        logger.error(`Failed after ${maxAttempts} attempts: ${err.message}`);
        return null;
      }
      const delay = baseDelay * attempt;
      logger.log(`Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  withRetry
};
