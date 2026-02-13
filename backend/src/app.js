const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const EventEmitter = require('events');
const config = require('./config');
const db = require('./database');
const vipService = require('./vipService');

const events = new EventEmitter();

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function requireApiKey(req, res) {
  const received = req.headers['x-api-key'];
  if (!received || received !== config.apiKey) {
    sendJson(res, 401, { error: 'unauthorized' });
    return false;
  }
  return true;
}

async function handler(req, res) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const method = req.method;
  const pathname = requestUrl.pathname;

  try {
    if (method === 'POST' && pathname === '/auth/steam') {
      if (!requireApiKey(req, res)) return;
      const { discord_id, steam_id, server_id } = await readBody(req);
      if (!discord_id || !steam_id || !server_id) {
        return sendJson(res, 400, { error: 'discord_id, steam_id e server_id são obrigatórios' });
      }
      if (!/^\d{17}$/.test(String(steam_id))) {
        return sendJson(res, 400, { error: 'steam_id inválido' });
      }
      const user = db.upsertUser({ discord_id, steam_id: String(steam_id), server_id });
      events.emit('bot.notify', { type: 'steam_linked', discord_id, server_id, steam_id: String(steam_id) });
      return sendJson(res, 200, { ok: true, user });
    }

    if (method === 'POST' && pathname === '/payment/create') {
      if (!requireApiKey(req, res)) return;
      const { discord_id, steam_id, server_id, tipo_vip } = await readBody(req);
      if (!discord_id || !steam_id || !server_id || !tipo_vip) {
        return sendJson(res, 400, { error: 'campos obrigatórios ausentes' });
      }
      const data = vipService.createCheckoutLink({ discord_id, steam_id, server_id, tipo_vip });
      return sendJson(res, 200, { ...data, webhook_url: `${config.backendPublicUrl}/payment/webhook` });
    }

    if (method === 'POST' && pathname === '/payment/webhook') {
      const body = await readBody(req);
      const signature = req.headers['x-infinitypay-signature'];
      const rawBody = JSON.stringify(body);
      const expected = vipService.signWebhookPayload(rawBody, config.infinityPayWebhookSecret);

      if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return sendJson(res, 401, { error: 'invalid signature' });
      }

      const { status, order_nsu, transaction_id, gross_amount } = body;
      if (status !== 'approved') return sendJson(res, 200, { ok: true, ignored: true });

      const vip = vipService.activateVipFromApprovedPayment({ order_nsu, transaction_id, gross_amount });
      events.emit('bot.notify', {
        type: 'payment_approved',
        discord_id: vip.discord_id,
        steam_id: vip.steam_id,
        server_id: vip.server_id,
        tipo_vip: vip.tipo_vip,
        expires_at: vip.expires_at
      });
      return sendJson(res, 200, { ok: true, vip });
    }

    if (method === 'GET' && pathname === '/vip/status') {
      if (!requireApiKey(req, res)) return;
      const steam_id = requestUrl.searchParams.get('steam_id');
      const server_id = requestUrl.searchParams.get('server_id');
      if (!steam_id || !server_id) return sendJson(res, 400, { error: 'steam_id e server_id são obrigatórios' });
      const vip = db.getVipStatus({ steam_id: String(steam_id), server_id: String(server_id) });
      return sendJson(res, 200, { active: !!vip?.active, vip });
    }

    if (method === 'POST' && pathname === '/vip/expire') {
      if (!requireApiKey(req, res)) return;
      const { steam_id, server_id } = await readBody(req);
      if (!steam_id || !server_id) return sendJson(res, 400, { error: 'steam_id e server_id são obrigatórios' });
      const vip = db.expireVip({ steam_id: String(steam_id), server_id: String(server_id) });
      events.emit('bot.notify', { type: 'vip_expired', steam_id: String(steam_id), server_id: String(server_id) });
      return sendJson(res, 200, { ok: true, vip });
    }

    if (method === 'POST' && pathname === '/bot/notify') {
      if (!requireApiKey(req, res)) return;
      const body = await readBody(req);
      events.emit('bot.notify', body);
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'GET' && pathname === '/rust/check-vip') {
      if (!requireApiKey(req, res)) return;
      const steam_id = requestUrl.searchParams.get('steam_id');
      const server_id = requestUrl.searchParams.get('server_id');
      if (!steam_id || !server_id) return sendJson(res, 400, { error: 'steam_id e server_id são obrigatórios' });
      const vip = db.getVipStatus({ steam_id: String(steam_id), server_id: String(server_id) });
      return sendJson(res, 200, {
        steam_id,
        server_id,
        active: !!vip?.active,
        tipo_vip: vip?.active ? vip.tipo_vip : null,
        expires_at: vip?.expires_at || null
      });
    }

    return sendJson(res, 404, { error: 'not_found' });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

const app = {
  listen(port, host, callback) {
    const server = http.createServer(handler);
    return server.listen(port, host, callback);
  }
};

module.exports = { app, events };
