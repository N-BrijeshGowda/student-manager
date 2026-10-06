const { rateLimit } = require('express-rate-limit');

function limiter(windowMinutes, max, message, options = {}) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    ...options,
  });
}

// Counts only failed attempts, so a real user is not locked out by logging in normally
const loginLimiter = limiter(15, 10, 'Too many login attempts. Try again in 15 minutes.', {
  skipSuccessfulRequests: true,
});

// Limits visitors creating accounts from one address
const signupLimiter = limiter(60, 20, 'Too many sign-ups from this address. Try again later.');

// Limits guessing the current password while changing a password or email
const profileEditLimiter = limiter(15, 10, 'Too many failed attempts. Try again in 15 minutes.', {
  skipSuccessfulRequests: true,
});

module.exports = { loginLimiter, signupLimiter, profileEditLimiter };
