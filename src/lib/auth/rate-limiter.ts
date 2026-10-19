interface AttemptRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, AttemptRecord>();

// Clean up stale entries every 10 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

export interface RateLimitStatus {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

/**
 * Checks if a key (e.g. IP + normalized email) has exceeded rate limits.
 * Default: 5 attempts per 15 minutes.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): RateLimitStatus {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - record.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Records a failed attempt for the specified key.
 */
export function recordFailedAttempt(
  key: string,
  windowMs: number = 15 * 60 * 1000
): void {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
  } else {
    record.count += 1;
  }
}

/**
 * Resets the rate limit upon successful authentication.
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
