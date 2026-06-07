function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

function log(message) {
  console.log(`[${getTimestamp()}] ${message}`);
}

function success(message) {
  console.log(`[${getTimestamp()}] ✓ ${message}`);
}

function error(message) {
  console.error(`[${getTimestamp()}] ✗ ${message}`);
}

module.exports = {
  log,
  success,
  error
};
