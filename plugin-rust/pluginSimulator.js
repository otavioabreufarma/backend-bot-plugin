class RustPluginSimulator {
  constructor({ backendBaseUrl, apiKey, server_id, fetchImpl = fetch }) {
    this.backendBaseUrl = backendBaseUrl;
    this.apiKey = apiKey;
    this.server_id = server_id;
    this.fetch = fetchImpl;
    this.lastApplied = null;
  }

  async onPlayerConnected(steam_id) {
    const response = await this.fetch(
      `${this.backendBaseUrl}/rust/check-vip?steam_id=${steam_id}&server_id=${this.server_id}`,
      { headers: { 'x-api-key': this.apiKey } }
    );
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Erro no backend');

    this.lastApplied = payload.active ? payload.tipo_vip : 'none';
    return this.lastApplied;
  }
}

module.exports = { RustPluginSimulator };
