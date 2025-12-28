/**
 * Security Module - Główny eksport funkcji bezpieczeństwa
 */

// Rate Limiting
export {
  checkRateLimit,
  generateRateLimitKey,
  cleanupExpiredRateLimits,
  getClientIp,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limiter';

// Audit Logging
export {
  logAuditEvent,
  logSuccess,
  logFailure,
  extractRequestInfo,
  type AuditAction,
  type AuditStatus,
  type AuditLogEntry,
} from './audit-logger';

// Project Access (Data Isolation)
export {
  checkProjectAccess,
  checkProjectAccessBySlug,
  addUserToProject,
  removeUserFromProject,
  getProjectMembers,
  type ProjectAccessResult,
} from './project-access';

// CSRF Protection
export {
  generateCSRFToken,
  verifyCSRFToken,
  verifyOrigin,
  getAllowedOrigins,
  requireValidOrigin,
} from './csrf';

// Redirect URI Validation
export {
  validateRedirectUri,
  isRedirectUriAllowed,
} from './redirect-uri';

// PKCE
export {
  generatePKCEPair,
  verifyPKCE,
  isValidCodeChallenge,
  isValidCodeVerifier,
  type PKCEPair,
} from './pkce';

// Brute Force Detection
export {
  checkBruteForce,
  checkBruteForceByIp,
  checkBruteForceByEmail,
  cleanupOldAuditLogs,
  type BruteForceCheck,
} from './brute-force-detector';
