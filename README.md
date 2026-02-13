# Sistema VIP Unificado (Rust + Discord + Backend)

Este repositório implementa **um único sistema** com 3 módulos integrados:

- `backend/` → fonte de verdade para vínculos Steam, pagamentos e status VIP.
- `bot-discord/` → camada de UI/automação Discord (sem lógica de pagamento).
- `plugin-rust/` → consulta backend no login do jogador e aplica VIP/VIP+.

## Análise de viabilidade e melhorias aplicadas

A proposta original é viável, mas exigia alguns ajustes para produção segura:

1. **OpenID Steam no backend**
   - Mantido no backend por segurança.
   - Implementado endpoint de vínculo preparado para ser chamado após callback OpenID.

2. **InfinityPay webhook assinado**
   - Melhoria aplicada: validação criptográfica HMAC em `/payment/webhook`.
   - Evita ativação fraudulenta por chamadas forjadas.

3. **Order NSU rastreável**
   - Melhoria aplicada: `order_nsu` contém (discord_id, steam_id, server_id, tipo_vip) serializados em base64url.

4. **Separação de responsabilidades**
   - Bot não decide VIP.
   - Plugin não processa pagamentos.
   - Backend centraliza validação, ativação e expiração.

5. **Autenticação interna entre serviços**
   - API key obrigatória entre backend ↔ bot e backend ↔ plugin.

## Estrutura

```
/backend
/bot-discord
/plugin-rust
/database
  ├─ users.json
  ├─ payments.json
  └─ servers
      ├─ rust1.json
      └─ rust2.json
/tests
```

## Endpoints implementados

- `POST /auth/steam`
- `POST /payment/create`
- `POST /payment/webhook`
- `GET /vip/status`
- `POST /vip/expire`
- `POST /bot/notify`
- `GET /rust/check-vip`

## Executar localmente

```bash
npm install
npm test
npm run start:backend
```

## Variáveis importantes

- `INTERNAL_API_KEY`
- `INFINITYPAY_WEBHOOK_SECRET`
- `BACKEND_PUBLIC_URL`

## Discloud

1. Suba o backend com subdomínio público.
2. Configure variáveis de ambiente.
3. Aponte o bot e o plugin para o backend público.
