const crypto = require('crypto');
const { vipPlans } = require('./config');
const db = require('./database');

function makeOrderNsu({ discord_id, steam_id, server_id, tipo_vip }) {
  const payload = { discord_id, steam_id, server_id, tipo_vip, ts: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeOrderNsu(order_nsu) {
  try {
    const parsed = JSON.parse(Buffer.from(order_nsu, 'base64url').toString('utf8'));
    return parsed;
  } catch (error) {
    return null;
  }
}

function calculateExpiration(tipo_vip) {
  const plan = vipPlans[tipo_vip];
  if (!plan) throw new Error('tipo_vip inválido');
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + plan.days);
  return now.toISOString();
}

function createCheckoutLink(input) {
  db.assertServer(input.server_id);
  if (!vipPlans[input.tipo_vip]) throw new Error('tipo_vip inválido');

  const order_nsu = makeOrderNsu(input);
  return {
    checkout_url: `https://pay.infinitepay.io/mock/${order_nsu}`,
    order_nsu
  };
}

function activateVipFromApprovedPayment({ order_nsu, transaction_id, gross_amount }) {
  const decoded = decodeOrderNsu(order_nsu);
  if (!decoded) throw new Error('order_nsu inválido');

  const { discord_id, steam_id, server_id, tipo_vip } = decoded;
  db.assertServer(server_id);

  const expires_at = calculateExpiration(tipo_vip);
  const vip = db.upsertVip({
    server_id,
    steam_id,
    discord_id,
    tipo_vip,
    expires_at,
    source_order_nsu: order_nsu
  });

  db.registerPayment({
    transaction_id,
    order_nsu,
    steam_id,
    discord_id,
    server_id,
    tipo_vip,
    gross_amount,
    status: 'approved',
    paid_at: new Date().toISOString()
  });

  return vip;
}

function signWebhookPayload(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

module.exports = {
  createCheckoutLink,
  activateVipFromApprovedPayment,
  decodeOrderNsu,
  signWebhookPayload
};
