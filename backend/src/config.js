const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

module.exports = {
  apiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',
  infinityPayWebhookSecret: process.env.INFINITYPAY_WEBHOOK_SECRET || 'dev-webhook-secret',
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000',
  dbPaths: {
    users: path.join(ROOT, 'database', 'users.json'),
    payments: path.join(ROOT, 'database', 'payments.json'),
    servers: {
      rust1: path.join(ROOT, 'database', 'servers', 'rust1.json'),
      rust2: path.join(ROOT, 'database', 'servers', 'rust2.json')
    }
  },
  validServerIds: ['rust1', 'rust2'],
  vipPlans: {
    vip: { days: 30, role: 'VIP' },
    vip_plus: { days: 30, role: 'VIP+' }
  }
};
