const phpApi = require('../services/phpApi.service');

module.exports = async function (fastify) {
  fastify.get('/test-php', async (req, reply) => {
    try {
      const tenantId = 1; // TEMP pour test

      const alertes = await phpApi.getAlertes(tenantId);

      return {
        success: true,
        source: 'NODE → PHP',
        count: alertes.length,
        data: alertes
      };

    } catch (err) {
      return {
        error: true,
        message: err.message,
        status: err.statusCode || 500
      };
    }
  });
};