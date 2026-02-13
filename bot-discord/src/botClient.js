const EventEmitter = require('events');

class VipDiscordBot extends EventEmitter {
  constructor({ backendBaseUrl, apiKey, fetchImpl = fetch }) {
    super();
    this.backendBaseUrl = backendBaseUrl;
    this.apiKey = apiKey;
    this.fetch = fetchImpl;
    this.roleCache = new Map();
  }

  async linkSteam({ discord_id, steam_id, server_id }) {
    const response = await this.fetch(`${this.backendBaseUrl}/auth/steam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ discord_id, steam_id, server_id })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Falha ao vincular Steam');
    this.emit('dm', { discord_id, message: 'Conta Steam vinculada com sucesso.' });
    return payload;
  }

  async createPurchase({ discord_id, steam_id, server_id, tipo_vip }) {
    const response = await this.fetch(`${this.backendBaseUrl}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ discord_id, steam_id, server_id, tipo_vip })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Falha ao criar checkout');
    return payload;
  }

  applyRole(discordId, roleName) {
    this.roleCache.set(discordId, roleName);
    this.emit('role.changed', { discord_id: discordId, role: roleName });
  }

  removeRole(discordId) {
    this.roleCache.delete(discordId);
    this.emit('role.removed', { discord_id: discordId });
  }

  handleBackendEvent(event) {
    if (event.type === 'payment_approved') {
      this.applyRole(event.discord_id, event.tipo_vip === 'vip_plus' ? 'VIP+' : 'VIP');
      this.emit('dm', {
        discord_id: event.discord_id,
        message: `Pagamento confirmado. VIP ativo até ${event.expires_at}`
      });
    }

    if (event.type === 'vip_expired' && event.discord_id) {
      this.removeRole(event.discord_id);
    }
  }
}

module.exports = { VipDiscordBot };
