---
paths:
  - "assets/js/data.js"
  - "scripts/**"
  - "data/**"
  - ".github/workflows/**"
---
# Regras de dados de mercado
- Nunca inventar cotação nem preencher lacuna com valor fictício; sem dado, mostrar "indisponível".
- Toda cotação nova precisa de `source`, `time`, `fetchedAt` e `kind` para o selo de `freshness()`.
- Fonte do navegador precisa de CORS: Yahoo, Stooq e brapi não servem direto (brapi exige token).
  O que não tem CORS entra pelo snapshot `scripts/fetch-market.mjs`.
- Use `data-api.binance.vision`, não `api.binance.com` (bloqueio geográfico, HTTP 451).
- Mudou o formato de `data/market.json`? Mantenha leitura do formato antigo: o cache local dos usuários
  (`atlas.cache.v1`) e o snapshot do repositório podem estar no formato anterior.
- Rodar `node scripts/fetch-market.mjs` localmente antes de mudar o workflow.
