const phpApi = require('../services/phpApi.service');

async function testPhp(req, reply) {
  try {
    const data = await phpApi.getAlertes();

    return {
      success: true,
      source: 'PHP',
      data
    };

  } catch (err) {
    return {
      error: true,
      message: err.message
    };
  }
}

module.exports = async function (fastify) {
  fastify.get('/test-php', testPhp);
};