# Projeto: North Star

## Objetivo
Ser o painel pessoal de uma pessoa que opera e estuda setups no mercado brasileiro e internacional:
entender rápido o que o mercado está fazendo, testar uma ideia com honestidade e registrar o que foi feito.
O dólar é o foco, como indicador econômico e proteção patrimonial.

## Para quem
Uma única pessoa, no iPhone (app na tela inicial) e no computador, em sessões longas de estudo.
Detalhes de usuário e princípios de produto em `PRODUCT.md`.

## Decisões arquiteturais já tomadas
- **Site estático sem build.** Scripts clássicos (não ES modules) para abrir também via `file://`.
- **Yahoo Finance só no servidor.** O Yahoo não libera CORS; o GitHub Actions gera `data/market.json`
  a cada 15 min no pregão (seg–sex, 12h–22h UTC) e a cada hora fora dele, e publica junto com o site.
  O snapshot também guarda séries do Banco Central como reserva.
- **Reservas em cadeia.** Dólar: AwesomeAPI ao vivo → snapshot Yahoo → PTAX do BCB. Cripto: Binance
  (`data-api.binance.vision`; `api.binance.com` bloqueia alguns países) → CoinGecko → snapshot.
- **Gráficos em SVG próprio** (`assets/js/chart.js`), sem biblioteca.
- **Visual "Cédulas do Real"**, escolhido pelo usuário com a skill impeccable; documentado em `DESIGN.md`
  e no contrato `.impeccable/surfaces/index-html.md`. Tema escuro é requisito do usuário.
- **Um só workflow de publicação** (`pages.yml`). O workflow do Jekyll foi removido porque terminava
  depois e publicava o snapshot antigo do repositório.

## O que o projeto NÃO é
- Não é corretora nem robô: não envia ordens nem se conecta a contas.
- Não é recomendação de investimento: sinais técnicos e backtests são estudo, sempre com aviso.
- Não é multiusuário nem tem backend próprio: dados pessoais ficam no aparelho.
- Não é um painel com dezenas de indicadores: EMA 9, EMA 21 e RSI 14 bastam.
