using System;
using Newtonsoft.Json;
using Oxide.Core;
using Oxide.Core.Libraries.Covalence;

namespace Oxide.Plugins
{
    [Info("VipBridge", "BackendTeam", "1.0.0")]
    [Description("Consulta backend central para aplicar/remover VIP no Rust")]
    public class VipBridge : CovalencePlugin
    {
        private const string PermissionVip = "vipbridge.vip";
        private const string PermissionVipPlus = "vipbridge.vipplus";

        private PluginConfig _config;

        private class PluginConfig
        {
            [JsonProperty("BackendBaseUrl")]
            public string BackendBaseUrl = "https://seu-subdominio.discloud.app";

            [JsonProperty("ApiKey")]
            public string ApiKey = "trocar-api-key";

            [JsonProperty("ServerId")]
            public string ServerId = "rust1";
        }

        private class VipCheckResponse
        {
            [JsonProperty("active")]
            public bool Active;

            [JsonProperty("tipo_vip")]
            public string TipoVip;
        }

        protected override void LoadDefaultConfig()
        {
            _config = new PluginConfig();
            SaveConfig();
        }

        protected override void LoadConfig()
        {
            base.LoadConfig();
            _config = Config.ReadObject<PluginConfig>();
            if (_config == null)
            {
                PrintWarning("Config inválida, regenerando padrão.");
                LoadDefaultConfig();
            }
        }

        private void Init()
        {
            permission.RegisterPermission(PermissionVip, this);
            permission.RegisterPermission(PermissionVipPlus, this);
        }

        private void OnUserConnected(IPlayer player)
        {
            CheckAndApplyVip(player);
        }

        private void CheckAndApplyVip(IPlayer player)
        {
            var steamId = player.Id;
            var url = $"{_config.BackendBaseUrl}/rust/check-vip?steam_id={steamId}&server_id={_config.ServerId}";

            webrequest.Enqueue(url, null, (code, response) =>
            {
                if (code != 200 || string.IsNullOrEmpty(response))
                {
                    PrintWarning($"Falha ao consultar VIP para {steamId}. HTTP={code}");
                    return;
                }

                var vipResponse = JsonConvert.DeserializeObject<VipCheckResponse>(response);
                if (vipResponse == null)
                {
                    PrintWarning("Resposta inválida do backend VIP.");
                    return;
                }

                ApplyPermissions(player, vipResponse);
            }, this, Core.Libraries.RequestMethod.GET, new System.Collections.Generic.Dictionary<string, string>
            {
                { "x-api-key", _config.ApiKey }
            });
        }

        private void ApplyPermissions(IPlayer player, VipCheckResponse vip)
        {
            permission.RevokeUserPermission(player.Id, PermissionVip);
            permission.RevokeUserPermission(player.Id, PermissionVipPlus);

            if (!vip.Active) return;

            if (vip.TipoVip == "vip_plus")
            {
                permission.GrantUserPermission(player.Id, PermissionVipPlus, this);
            }
            else
            {
                permission.GrantUserPermission(player.Id, PermissionVip, this);
            }
        }
    }
}
