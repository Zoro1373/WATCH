function authMiddleware(req, res, next) {
  const apiKey = req.header('X-API-KEY');
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Missing X-API-KEY header',
        details: []
      }
    });
  }

  // Check against allowed keys (configured via env variables)
  const validKeys = [
    process.env.API_KEY_FRONTEND,
    process.env.API_KEY_IOT
  ].filter(Boolean); // Filter out undefined if any are missing

  if (!validKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid X-API-KEY provided',
        details: []
      }
    });
  }

  next();
}

module.exports = authMiddleware;
