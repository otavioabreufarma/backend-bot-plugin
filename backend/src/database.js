const fs = require('fs');
const { dbPaths, validServerIds } = require('./config');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function assertServer(serverId) {
  if (!validServerIds.includes(serverId)) {
    throw new Error(`server_id inválido: ${serverId}`);
  }
}

function getUsers() {
  return readJson(dbPaths.users);
}

function saveUsers(data) {
  writeJson(dbPaths.users, data);
}

function upsertUser({ discord_id, steam_id, server_id }) {
  assertServer(server_id);
  const usersDb = getUsers();
  const idx = usersDb.users.findIndex(
    (user) => user.discord_id === discord_id && user.server_id === server_id
  );

  const userEntry = {
    discord_id,
    steam_id,
    server_id,
    linked_at: new Date().toISOString()
  };

  if (idx >= 0) usersDb.users[idx] = userEntry;
  else usersDb.users.push(userEntry);

  saveUsers(usersDb);
  return userEntry;
}

function getPayments() {
  return readJson(dbPaths.payments);
}

function savePayments(data) {
  writeJson(dbPaths.payments, data);
}

function registerPayment(payment) {
  const paymentsDb = getPayments();
  paymentsDb.payments.push(payment);
  savePayments(paymentsDb);
}

function getServerVipDb(serverId) {
  assertServer(serverId);
  return readJson(dbPaths.servers[serverId]);
}

function saveServerVipDb(serverId, payload) {
  assertServer(serverId);
  writeJson(dbPaths.servers[serverId], payload);
}

function upsertVip({ server_id, steam_id, discord_id, tipo_vip, expires_at, source_order_nsu }) {
  const serverDb = getServerVipDb(server_id);
  const nowIso = new Date().toISOString();
  const idx = serverDb.vips.findIndex((vip) => vip.steam_id === steam_id);

  const entry = {
    steam_id,
    discord_id,
    server_id,
    tipo_vip,
    expires_at,
    source_order_nsu,
    updated_at: nowIso
  };

  if (idx >= 0) serverDb.vips[idx] = entry;
  else serverDb.vips.push(entry);

  saveServerVipDb(server_id, serverDb);
  return entry;
}

function getVipStatus({ server_id, steam_id }) {
  const serverDb = getServerVipDb(server_id);
  const vip = serverDb.vips.find((entry) => entry.steam_id === steam_id);
  if (!vip) return null;

  const active = new Date(vip.expires_at).getTime() > Date.now();
  return { ...vip, active };
}

function expireVip({ server_id, steam_id }) {
  const serverDb = getServerVipDb(server_id);
  const idx = serverDb.vips.findIndex((entry) => entry.steam_id === steam_id);
  if (idx < 0) return null;

  serverDb.vips[idx] = {
    ...serverDb.vips[idx],
    expires_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  saveServerVipDb(server_id, serverDb);
  return serverDb.vips[idx];
}

module.exports = {
  assertServer,
  getUsers,
  upsertUser,
  registerPayment,
  upsertVip,
  getVipStatus,
  expireVip
};
