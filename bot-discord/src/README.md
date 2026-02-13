# Bot Discord (camada de UI)

Este módulo expõe uma classe `VipDiscordBot` para:

- vincular Steam no backend;
- iniciar compra (checkout link);
- reagir a notificações do backend (`payment_approved`, `vip_expired`).

Em produção, basta conectar os handlers da classe aos comandos/botões do `discord.js`.
