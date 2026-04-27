fastify.get('/test-php', async (req, reply) => {
  const start = Date.now();

  try {
    const tenantId = 1;
    const alertes = await phpApi.getAlertes(tenantId);

    return {
      success: true,
      duration_ms: Date.now() - start,
      count: alertes.length,
      data: alertes
    };

  } catch (err) {
    return {
      error: true,
      duration_ms: Date.now() - start,
      message: err.message
    };
  }
});