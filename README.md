# Atlas Invest Lab

Painel financeiro pessoal, focado no **dólar** como indicador econômico e proteção patrimonial, com acompanhamento de juros, inflação, bolsas e criptomoedas, análise técnica (EMA 9, EMA 21, RSI 14), **backtest** e **diário de operações**.

Site estático (HTML + CSS + JavaScript puro), sem build e sem dependências. Funciona no celular (layout mobile-first, testado na emulação de iPhone) e pode ser instalado na tela inicial (PWA).

> Ferramenta de acompanhamento e estudo. Não executa ordens, não se conecta a corretoras, não pede senhas e não é recomendação de investimento.

## O que tem

| Aba | Conteúdo |
|---|---|
| **Painel** | Dólar comercial em destaque (cotação, variação, máx./mín. do dia, PTAX oficial, variação 1 mês e 12 meses, faixa de 52 semanas, volatilidade, gráfico). Selic, CDI, IPCA do mês, IPCA 12 meses e juro real. Euro, libra, Ibovespa, S&P 500, Nasdaq, Dow Jones, Bitcoin e Ethereum. |
| **Análise** | Gráfico de qualquer ativo (1M a 2A) com EMA 9/21, RSI 14, variações, volatilidade e leitura técnica neutra. |
| **Backtest** | Cruzamento EMA 9 × EMA 21 com filtro de RSI; capital, taxa e slippage configuráveis; comparação com buy and hold. |
| **Diário** | Registro manual de operações, filtros, edição, exportação CSV, backup e restauração em JSON. |

Cada cotação mostra **fonte, horário e tipo**: *Ao vivo*, *Atraso ~N min*, *Fechamento*, *PTAX oficial* ou *Desatualizado*. Quando uma fonte falha, aparece o último dado válido salvo no aparelho, com o horário original. Nenhum valor é inventado.

## Fontes de dados

| Dado | Fonte | Como chega |
|---|---|---|
| Selic (série 432), CDI (4389), IPCA (433), IPCA 12m (13522), PTAX (1, 21619) | Banco Central do Brasil (SGS) | Direto no navegador |
| Dólar, euro, libra ao vivo | AwesomeAPI | Direto no navegador (chave opcional) |
| Bitcoin, Ethereum ao vivo e histórico | Binance (`data-api.binance.vision`, dados públicos) | Direto no navegador |
| Reserva para BTC/ETH | CoinGecko | Direto no navegador |
| Ibovespa, S&P 500, Nasdaq, Dow Jones, histórico OHLC do câmbio | Yahoo Finance | **Snapshot no servidor** (`data/market.json`) |

O Yahoo Finance não permite acesso direto pelo navegador (bloqueio de CORS). Por isso o GitHub Actions roda `scripts/fetch-market.mjs` e publica `data/market.json` junto com o site: a cada 15 min em horário de pregão (seg–sex, 9h–19h de Brasília) e a cada hora fora dele. O GitHub pode atrasar execuções agendadas; o painel sempre mostra o horário real do dado.

Ordem de reserva do dólar: AwesomeAPI (ao vivo) → snapshot Yahoo → PTAX do Banco Central (identificada como "PTAX oficial").

### Chave da AwesomeAPI (opcional)

Sem chave, a AwesomeAPI tem um limite gratuito de consultas por IP. Se ele acabar, o painel usa automaticamente o snapshot ou a PTAX. Para aumentar o limite, crie uma chave gratuita no site da AwesomeAPI e cole em **⚙ Configurações → Chave da AwesomeAPI**. A chave fica só no seu aparelho (localStorage) e nunca vai para o repositório.

## Abrir no computador

Por ser um site com arquivos de dados, abra com um servidor local (abrir o `index.html` com dois cliques bloqueia a leitura do `data/market.json`):

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

Para atualizar o snapshot localmente: `node scripts/fetch-market.mjs` (Node 20+).

## Publicar no GitHub Pages

1. No GitHub, abra **Settings → Pages** do repositório.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Confirme que o branch com estes arquivos é o **branch padrão** (Settings → General → Default branch). O workflow só publica a partir dele.
4. Vá em **Actions → "Publicar no GitHub Pages" → Run workflow** (ou faça qualquer push no branch padrão).
5. Ao terminar, o endereço aparece no próprio workflow e em Settings → Pages, normalmente `https://<usuário>.github.io/atlas-invest-lab/`.

No iPhone: abra o endereço no Safari → Compartilhar → **Adicionar à Tela de Início**.

> O GitHub desativa workflows agendados de repositórios sem atividade por 60 dias. Se o snapshot parar de atualizar, reative em Actions.

## Seus dados

O diário fica no **localStorage** do navegador (chave `atlas.journal.v1`), só no aparelho em que você registrou. Ele sobrevive a fechar e reabrir o navegador, mas some se você limpar os dados do site ou usar outro aparelho. **Faça backups em JSON** pela aba Diário. A restauração aceita o backup do Atlas ou uma lista JSON simples com campos em português (`ativo`, `data`, `entrada`, `saida`, `quantidade`, `taxas`…).

O CSV usa o padrão do Excel em português: separador `;`, vírgula decimal e acentos corretos.

## Backtest: regras

- Sinal calculado no **fechamento** do dia; execução na **abertura do dia seguinte** (sem look-ahead).
- Compra no cruzamento de alta das EMAs com RSI dentro da faixa; venda no cruzamento de baixa (ou RSI de saída, opcional).
- Só compra, uma posição por vez, sem reentrada até um novo cruzamento.
- Taxa por lado sobre o valor financeiro + slippage em cada execução.
- Drawdown sobre o patrimônio marcado a mercado no fechamento diário. Profit factor = lucro bruto ÷ prejuízo bruto.
- Buy and hold começa no mesmo dia, com os mesmos custos. O candle do dia em andamento é descartado.

## Testes

```bash
npm test                    # 26 testes: indicadores, backtest, diário (Node 20+, sem dependências)

# ponta a ponta, em navegador real (requer Playwright)
python3 -m http.server 8765 &
node tests/e2e/smoke.cjs http://localhost:8765/
```

O teste de ponta a ponta cobre: abertura do painel, atualização, gráficos, conferência de EMA/RSI, backtest em 3 ativos, registro e persistência do diário, CSV, backup e restauração, layout no iPhone (sem rolagem horizontal, campos sem zoom), recarregamento e comportamento com todas as APIs fora do ar.

## Estrutura

```
index.html                 página única
assets/css/app.css         tema escuro, mobile-first
assets/js/core.js          formatação pt-BR, armazenamento, utilitários
assets/js/indicators.js    EMA, RSI (Wilder), volatilidade
assets/js/backtest.js      motor de backtest
assets/js/journal.js       diário: regras, CSV, backup
assets/js/chart.js         gráficos SVG (sem bibliotecas)
assets/js/data.js          fontes de dados, cache e reservas
assets/js/app.js           interface
data/market.json           snapshot (atualizado pelo GitHub Actions)
scripts/fetch-market.mjs   gerador do snapshot
sw.js, manifest.webmanifest  PWA / uso offline
.github/workflows/pages.yml  publicação + snapshot agendado
tests/                     testes
```
