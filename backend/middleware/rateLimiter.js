const requestCounts = new Map();

function sensorRateLimiter(req, res, next) {
  const nodeId = req.body.nodeId;
  if (!nodeId) return next(); // Missing nodeId handled by validation

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  if (!requestCounts.has(nodeId)) {
    requestCounts.set(nodeId, { count: 1, startTime: now });
    return next();
  }

  const record = requestCounts.get(nodeId);
  if (now - record.startTime > windowMs) {
    // Reset window
    record.count = 1;
    record.startTime = now;
    return next();
  }

  record.count++;
  if (record.count > 60) {
    return res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded. Maximum 60 requests per minute per node.",
        details: []
      }
    });
  }

  next();
}

module.exports = sensorRateLimiter;
