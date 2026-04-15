const crypto = require('crypto');

const ITERATION_KEY = 'scrypt';

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${ITERATION_KEY}$${salt}$${hash}`;
};

const verifyPassword = (password, storedValue) => {
  if (!storedValue || typeof storedValue !== 'string') {
    return false;
  }

  const [scheme, salt, expectedHash] = storedValue.split('$');

  if (scheme !== ITERATION_KEY || !salt || !expectedHash) {
    return password === storedValue;
  }

  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
};

module.exports = {
  hashPassword,
  verifyPassword,
};
