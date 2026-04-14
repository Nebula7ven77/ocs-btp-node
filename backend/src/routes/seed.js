'use strict'

const bcrypt = require('bcryptjs')
const { Client } = require('pg')

module.exports = async function seedRoute(fastify) {

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

      // 1. Tenant
      await client.query(`
        INSERT INTO tenants (id, nom, slug, email_contact, devise_defaut)
        VALUES ('11111111-1111-1111-1111-111111111111','Groupe Hôtelier Royal Cameroun','royal-cameroun','admin@royalcameroun.cm','XAF')
        ON CONFLICT (id) DO NOTHING
      `)
      logs.push('✅ Tenant')

      // 2. Abonnement
      await client.query(`
        INSERT INTO abonnements (tenant_id, plan, statut, date_debut, max_hotels, max_chambres, max_utilisateurs)
        VALUES ('11111111-1111-1111-1111-111111111111','enterprise','actif',CURRENT_DATE,5,500,50)
        ON CONFLICT DO NOTHING
      `)
      logs.push('✅ Abonnement')

      // 3. Hôtel
      await client.query(`
        INSERT INTO hotels (id, tenant_id, nom, slug, adresse, ville, pays, telephone, email, nombre_etoiles, nombre_chambres, nombre_etages)
        VALUES ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Hôtel Royal Yaoundé','hotel-royal-yaounde','Avenue Kennedy','Yaoundé','Cameroun','+237 222 123 456','reception@royalyaounde.cm',5,142,5)
        ON CONFLICT (id) DO NOTHING
      `)
      logs.push('✅ Hôtel')

      // 4. Paramètres hôtel
      await client.query(`
        INSERT INTO parametres_hotel (hotel_id, devise, fuseau_horaire, heure_arrivee, heure_depart)
        VALUES ('22222222-2222-2222-2222-222222222222','XAF','Africa/Douala','14:00:00','12:00:00')
        ON CONFLICT (hotel_id) DO NOTHING
      `)
      logs.push('✅ Paramètres hôtel')

      // 5. Utilisateurs
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
          INSERT INTO utilisateurs (id, tenant_id, hotel_id, email, mot_de_passe_hash, prenom, nom, role)
          VALUES ($1,'11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',$2,$3,$4,$5,$6)
          ON CONFLICT (id) DO UPDATE SET mot_de_passe_hash = $3
        `, [id, email, hash, prenom, nom, role])
      }
      logs.push(`✅ ${users.length} utilisateurs créés/mis à jour`)

      // 6. Taxes
      await client.query(`
        INSERT INTO taxes (hotel_id, nom, code, type_taxe, valeur, s_applique_a, active, ordre)
        VALUES
          ('22222222-2222-2222-2222-222222222222','TVA Hôtellerie','TVA_HOTEL','pourcentage',19.25,'hebergement',true,1),
          ('22222222-2222-2222-2222-222222222222','Taxe de séjour','TAXE_SEJOUR','fixe',500,'hebergement',true,2),
          ('22222222-2222-2222-2222-222222222222','Service','SERVICE','pourcentage',10,'restaurant',true,3)
        ON CONFLICT DO NOTHING
      `)
      logs.push('✅ Taxes')

      // 7. Types de chambre
      await client.query(`
        INSERT INTO types_chambre (hotel_id, nom, description, capacite_adultes, superficie_m2, tarif_base, devise)
        VALUES
          ('22222222-2222-2222-2222-222222222222','Standard','Chambre confortable',2,18,22000,'XAF'),
          ('22222222-2222-2222-2222-222222222222','Deluxe','Vue piscine et balcon',2,32,38000,'XAF'),
          ('22222222-2222-2222-2222-222222222222','Suite Royale','Suite panoramique',4,72,98000,'XAF')
        ON CONFLICT DO NOTHING
      `)
      logs.push('✅ Types de chambre')

      // 8. Permissions
      await client.query(`
        INSERT INTO permissions (code, description, module, action) VALUES
          ('reservations.lire','Voir les réservations','reservations','lire'),
          ('reservations.creer','Créer une réservation','reservations','creer'),
          ('reservations.modifier','Modifier une réservation','reservations','modifier'),
          ('chambres.lire','Voir les chambres','chambres','lire'),
          ('clients.lire','Voir les clients','clients','lire'),
          ('clients.creer','Créer un client','clients','creer'),
          ('menage.lire','Voir le ménage','menage','lire'),
          ('maintenance.lire','Voir la maintenance','maintenance','lire'),
          ('restaurant.lire','Voir le restaurant','restaurant','lire'),
          ('restaurant.creer','Créer une commande','restaurant','creer'),
          ('facturation.lire','Voir la facturation','facturation','lire'),
          ('analytics.lire','Voir les stats','analytics','lire'),
          ('parametres.lire','Voir les paramètres','parametres','lire'),
          ('parametres.modifier','Modifier les paramètres','parametres','modifier'),
          ('staff.administrer','Gérer le personnel','staff','administrer'),
          ('plateforme.administrer','Administrer la plateforme','plateforme','administrer')
        ON CONFLICT (code) DO NOTHING
      `)
      logs.push('✅ Permissions')

      await client.end()
      logs.push('🎉 Base de données initialisée avec succès !')

      reply.send({ succes: true, logs })

    } catch (err) {
      logs.push(`❌ Erreur : ${err.message}`)
      try { await client.end() } catch {}
      reply.status(500).send({ succes: false, erreur: err.message, logs })
    }
  })
}
