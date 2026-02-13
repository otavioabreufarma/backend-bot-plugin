const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, events } = require('../backend/src/app');
const { VipDiscordBot } = require('../bot-discord/src/botClient');
const { bindBackendEventsToBot } = require('../bot-discord/src/integration');
const { RustPluginSimulator } = require('../plugin-rust/pluginSimulator');
const config = require('../backend/src/config');
const vipService = require('../backend/src/vipService');

const steamid = '76561198130758449';


function resetDatabase() {
  const root = path.resolve(__dirname, '..');
  fs.writeFileSync(path.join(root, 'database', 'users.json'), JSON.stringify({ users: [] }, null, 2));
  fs.writeFileSync(path.join(root, 'database', 'payments.json'), JSON.stringify({ payments: [] }, null, 2));
  fs.writeFileSync(
    path.join(root, 'database', 'servers', 'rust1.json'),
    JSON.stringify({ server_id: 'rust1', vips: [] }, null, 2)
  );
  fs.writeFileSync(
    path.join(root, 'database', 'servers', 'rust2.json'),
    JSON.stringify({ server_id: 'rust2', vips: [] }, null, 2)
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('forced flow: payment approved activates backend, notifies bot and plugin applies vip', async () => {
  resetDatabase();
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const bot = new VipDiscordBot({ backendBaseUrl: baseUrl, apiKey: config.apiKey });
  bindBackendEventsToBot(events, bot);

  const dms = [];
  bot.on('dm', (message) => dms.push(message));

  await bot.linkSteam({ discord_id: '123456789', steam_id: steamid, server_id: 'rust1' });
  const checkout = await bot.createPurchase({
    discord_id: '123456789',
    steam_id: steamid,
    server_id: 'rust1',
    tipo_vip: 'vip'
  });

  const webhookPayload = {
    status: 'approved',
    order_nsu: checkout.order_nsu,
    transaction_id: 'txn-forced-001',
    gross_amount: 29.9,
    server_id: 'rust1'
  };

  const signature = vipService.signWebhookPayload(
    JSON.stringify(webhookPayload),
    config.infinityPayWebhookSecret
  );

  const webhookResp = await fetch(`${baseUrl}/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-infinitypay-signature': signature
    },
    body: JSON.stringify(webhookPayload)
  });

  assert.equal(webhookResp.status, 200);

  await sleep(50);

  const plugin = new RustPluginSimulator({
    backendBaseUrl: baseUrl,
    apiKey: config.apiKey,
    server_id: 'rust1'
  });

  const applied = await plugin.onPlayerConnected(steamid);

  assert.equal(applied, 'vip');
  assert.equal(bot.roleCache.get('123456789'), 'VIP');
  assert.ok(dms.some((dm) => dm.message.includes('Pagamento confirmado')));

  await new Promise((resolve) => server.close(resolve));
});
