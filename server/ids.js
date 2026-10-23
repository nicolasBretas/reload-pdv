const { randomUUID } = require('node:crypto');

function generateId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

module.exports = { generateId };
