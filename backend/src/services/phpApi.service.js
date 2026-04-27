const axios = require('axios');

const client = axios.create({
  baseURL: process.env.PHP_API_URL,
  timeout: 8000,
  headers: {
    'X-Node-Secret': process.env.PHP_API_SECRET
  }
});

async function getAlertes() {
  const res = await client.get('/api/alertes');
  return res.data;
}

async function getKpis() {
  const res = await client.get('/api/kpis/dashboard');
  return res.data;
}

module.exports = {
  getAlertes,
  getKpis
};