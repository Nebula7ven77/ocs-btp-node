'use strict'
if (process.env.DB_DISABLED === 'true') {
  console.log('⚠️ Database disabled');

  module.exports = async function () {
    // skip DB init
  };

  return;
}

const fp = require('fastify-plugin')
const Knex = require('knex')

async function databasePlugin(fastify) {
  //
  // FIX #2 — Connexion PostgreSQL sur Railway
  //
  // Railway injecte la connexion PostgreSQL via UNE variable :
  //   DATABASE_URL = postgresql://user:password@host:port/dbname
  //
  // L'ancien code utilisait uniquement DB_HOST, DB_PORT, DB_NAME, etc.
  // Ces variables n'existent pas sur Railway → Knex se connectait à localhost
  // → "SELECT 1" échouait → throw err → crash immédiat.
  //
  // Solution : DATABASE_URL en priorité, variables individuelles en fallback.
  // Railway PostgreSQL exige SSL → détection automatique.
  //

  let connection

  if (process.env.DATABASE_URL) {
    // Railway / Heroku / Render : connexion via URL complète
    connection = {
      connectionString: process.env.DATABASE_URL,
      // Railway exige SSL mais son certificat est auto-signé
      ssl: process.env.DB_SSL === 'false'
        ? false
        : { rejectUnauthorized: false }
    }
    fastify.log.info('📦 PostgreSQL : connexion via DATABASE_URL')
  } else {
    // Développement local : variables individuelles
    connection = {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME     || 'ocs7venhotel',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
    fastify.log.info(`📦 PostgreSQL : connexion via variables individuelles (${process.env.DB_HOST || 'localhost'})`)
  }

  const knex = Knex({
    client: 'pg',
    connection,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10, // réduit pour Railway (limites connexions)
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      idleTimeoutMillis:   30000,
      reapIntervalMillis:  1000,
    },
    acquireConnectionTimeout: 30000
  })

  // Test connexion au démarrage
  try {
    await knex.raw('SELECT 1')
    fastify.log.info('✅ Connexion PostgreSQL établie')
  } catch (err) {
    fastify.log.error({ err }, '❌ Échec connexion PostgreSQL')
    // Re-throw pour que le démarrage échoue clairement avec un message lisible
    throw new Error(`Connexion PostgreSQL impossible : ${err.message}`)
  }

  // Décorer Fastify avec knex
  fastify.decorate('db', knex)

  // Fermeture propre
  fastify.addHook('onClose', async () => {
    await knex.destroy()
    fastify.log.info('Connexion PostgreSQL fermée')
  })
}

module.exports = fp(databasePlugin, {
  name: 'database',
  fastify: '4.x'
})
