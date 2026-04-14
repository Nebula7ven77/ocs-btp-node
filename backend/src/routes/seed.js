'use strict'

const bcrypt = require('bcryptjs')
const { Client } = require('pg')

module.exports = async function seedRoute(fastify) {

  // Route diagnostic - voir les colonnes de la table utilisateurs
  fastify.post('/seed-init', async (request, reply) => {
    const { secret } = request.body || {}
    if (secret !== 'seed-7venhotel-2026') {
      return reply.status(403).send({ erreur: 'Secret invalide' })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })

    const logs = []

    try {
      await client.connect()
      logs.push('✅ Connecté')

      // Vérifier les colonnes existantes de la table utilisateurs
      const { rows: colonnes } = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'utilisateurs'
        ORDER BY ordinal_position
      `)
      logs.push(`📋 Colonnes utilisateurs: ${colonnes.map(c => c.column_name).join(', ')}`)

      // Ajouter les colonnes manquantes si nécessaire
      const colonnesExistantes = colonnes.map(c => c.column_name)

      const colonnesRequises = [
        { nom: 'langue_preferee', def: `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS langue_preferee VARCHAR(10) DEFAULT 'fr'` },
        { nom: 'avatar_url',      def: `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS avatar_url TEXT` },
        { nom: 'actif',           def: `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT TRUE` },
        { nom: 'derniere_connexion', def: `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS derniere_connexion TIMESTAMPTZ` },
        { nom: 'hotel_id',        def: `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS hotel_id UUID` },
        { nom: 'tenant_id',       def: `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS tenant_id UUID` },
      ]

      for (const col of colonnesRequises) {
        if (!colonnesExistantes.includes(col.nom)) {
          await client.query(col.def)
          logs.push(`✅ Colonne ajoutée : ${col.nom}`)
        }
      }

      // Mettre à jour les utilisateurs
      const adminHash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'Admin@2024!', 12)
      const demoHash  = await bcrypt.hash('demo123', 12)

      const users = [
        ['33333333-3333-3333-3333-333333333333', 'superadmin@demo.com', adminHash, 'Super', 'Admin',    'super_admin'],
        ['44444444-4444-4444-4444-444444444444', 'manager@demo.com',    demoHash,  'Marie', 'Laurent',  'manager'],
        ['55555555-5555-5555-5555-555555555555', 'reception@demo.com',  demoHash,  'Pierre','Moreau',   'reception'],
        ['66666666-6666-6666-6666-666666666666', 'housekeeping@demo.com',demoHash, 'Fatou', 'Diallo',   'housekeeping'],
        ['77777777-7777-7777-7777-777777777777', 'restaurant@demo.com', demoHash,  'Jean',  'Baron',    'restaurant'],
        ['88888888-8888-8888-8888-888888888888', 'accounting@demo.com', demoHash,  'Sophie','Renard',   'comptabilite'],
      ]

      for (const [id, email, hash, prenom, nom, role] of users) {
        await client.query(`
          INSERT INTO utilisateurs (id, tenant_id, hotel_id, email, mot_de_passe_hash, prenom, nom, role, actif)
          VALUES ($1,'11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',$2,$3,$4,$5,$6,true)
          ON CONFLICT (id) DO UPDATE SET mot_de_passe_hash = $3, actif = true
        `, [id, email, hash, prenom, nom, role])
      }
      logs.push(`✅ ${users.length} utilisateurs créés/mis à jour`)

      // Test connexion directe
      const { rows: testUser } = await client.query(
        `SELECT id, email, role, actif, mot_de_passe_hash FROM utilisateurs WHERE email = 'manager@demo.com'`
      )
      if (testUser.length > 0) {
        logs.push(`✅ Test utilisateur: ${testUser[0].email} | role: ${testUser[0].role} | actif: ${testUser[0].actif} | hash: ${testUser[0].mot_de_passe_hash.slice(0,20)}...`)
      } else {
        logs.push('❌ Utilisateur manager non trouvé !')
      }

      await client.end()
      logs.push('🎉 Terminé !')

      reply.send({ succes: true, logs })

    } catch (err) {
      logs.push(`❌ Erreur : ${err.message}`)
      try { await client.end() } catch {}
      reply.status(500).send({ succes: false, erreur: err.message, logs })
    }
  })
}
