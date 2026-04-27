'use strict';

const phpApi = require('../services/phpApi.service');

module.exports = async function (app) {

  app.get('/test-php', async (req, reply) => {
    const start = Date.now();

    try {
      const tenantId = 1;

      const alertes = await phpApi.getAlertes(tenantId);

      return {
        success: true,
        duration_ms: Date.now() - start,
        count: Array.isArray(alertes) ? alertes.length : 0,
        data: alertes
      };

    } catch (err) {
      return {
        error: true,
        duration_ms: Date.now() - start,
        message: err.message,
        status: err.statusCode || 500
      };
    }
  });

};