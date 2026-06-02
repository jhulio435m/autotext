export function createInMemoryRateLimiter({
  maxRequests,
  windowMs,
  keyFn,
  onLimitReached
}) {
  const hits = new Map();

  function prune(now) {
    for (const [key, entry] of hits.entries()) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }

  return function rateLimit(req, res, next) {
    const now = Date.now();
    prune(now);

    const key = String((keyFn ? keyFn(req) : req.ip) || 'anonymous');
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      if (onLimitReached) {
        onLimitReached(req, res, { retryAfterSeconds, key });
        return;
      }
      res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' });
      return;
    }

    current.count += 1;
    next();
  };
}
