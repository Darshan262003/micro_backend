function responseFormatter(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    // Keep health endpoint response raw for external monitors.
    if (req.path === '/health') {
      return originalJson(payload);
    }

    if (
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      'statusCode' in payload &&
      !('data' in payload)
    ) {
      return originalJson(payload);
    }

    return originalJson({
      message: 'success',
      statusCode: res.statusCode || 200,
      data: payload ?? null,
    });
  };

  next();
}

module.exports = { responseFormatter };

