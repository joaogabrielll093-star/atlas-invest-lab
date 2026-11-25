# Atlas Invest Lab

Painel financeiro pessoal (pt-BR) para operar e estudar setups: dólar, juros, inflação, bolsas e cripto,
com análise técnica (EMA 9/21, RSI 14), backtest e diário de operações. Publicado no GitHub Pages.

## Stack
- HTML, CSS e JavaScript puro, sem build e sem dependências; gráficos em SVG próprio
- Dados: Banco Central (SGS), AwesomeAPI, Binance, CoinGecko no navegador; Yahoo Finance via snapshot
  `data/market.json` gerado pelo GitHub Actions (`scripts/fetch-market.mjs`)
- Diário e cache no `localStorage`; PWA (`sw.js`); deploy por `.github/workflows/pages.yml`

## Comandos
- Testes unitários: `npm test` (um arquivo: `node --test tests/backtest.test.js`)
- Servir local: `python3 -m http.server 8765` (abrir o `index.html` direto bloqueia o `data/market.json`)
- Teste e2e (Playwright): `node tests/e2e/smoke.cjs http://localhost:8765/`
- Snapshot local: `node scripts/fetch-market.mjs` (atrás de proxy: `NODE_USE_ENV_PROXY=1`)

## Contexto do Projeto
- Visão, propósito e o que o projeto não é → `docs/project.md`
- Requisitos e regras de negócio (dados, backtest, diário) → `docs/requirements.md`
- Histórico e próximos passos → `docs/roadmap.md`
- Estado da última sessão → `docs/state.md`
- Produto e usuário (formato da skill impeccable) → `PRODUCT.md`
- Sistema visual "Cédulas do Real" (tokens, regras) → `DESIGN.md`
- Regras por área, carregadas só ao mexer nos arquivos → `.claude/rules/`

## Arquitetura em uma linha por arquivo
`assets/js/`: `core.js` (formatação pt-BR, storage, DOM) → `indicators.js` e `backtest.js` (puros, UMD,
testados no Node) → `journal.js` (diário, CSV, backup) → `chart.js` (SVG, guilhoché) → `data.js`
(fontes, cache, reservas, selo de atualização) → `app.js` (interface das 4 abas). Ordem de `<script>`
no `index.html` importa: scripts clássicos com namespace `window.Atlas`, para funcionar sem módulos.

## Regras Absolutas
- Nunca exibir cotação inventada nem dado antigo como atual; todo número mostra fonte e horário
- Nunca executar ordens, conectar corretoras, pedir senhas ou prometer rentabilidade
- Não quebrar a chave `atlas.journal.v1` do diário; mudança de formato exige migração e backup compatível
- Rodar `npm test` e o e2e antes de commitar mudanças de lógica ou de interface
- Ao mudar arquivos do app, aumentar a versão do cache em `sw.js` (`atlas-vX.Y.Z`)
- Nenhuma chave de API no repositório; chaves pessoais ficam só no `localStorage` do usuário

## Fluxo de Trabalho
1. Leia `docs/state.md` antes de qualquer ação
2. Ao concluir uma task, mova-a para `## Consolidado` em `docs/roadmap.md`
3. Ao encerrar a sessão, sobrescreva `docs/state.md` com o checkpoint
