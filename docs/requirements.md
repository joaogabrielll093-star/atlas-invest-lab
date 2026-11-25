# Requisitos e regras de negócio

Contrato do produto. Atualize sempre que um requisito mudar ou for descoberto (com data).

## Dados de mercado
- Ativos: dólar, euro e libra (BRL); Ibovespa; S&P 500, Nasdaq, Dow Jones; Bitcoin e Ethereum (USD,
  com conversão aproximada em R$). Macro: Selic meta (SGS 432), CDI (4389), IPCA mensal (433),
  IPCA 12 meses (13522), PTAX dólar (1) e euro (21619). Juro real = (1+Selic)/(1+IPCA12) − 1.
- A série 432 traz datas futuras: filtrar `data <= hoje`. A série 4389 vem em ordem decrescente: ordenar.
- Cada cotação carrega fonte, horário e tipo. Selos (`freshness()` em `assets/js/data.js`):
  Ao vivo; Atraso ~N min; Fechamento; PTAX oficial; Desatualizado (snapshot com mais de 3 h);
  Último dado válido (fonte ao vivo velha); Indisponível.
- Falha de fonte: mostrar o último dado válido salvo (`atlas.cache.v1`) com horário original, ou
  "indisponível". Fonte que falha espera 1, 2, 4… até 15 min antes de nova tentativa.
- AwesomeAPI aceita chave opcional (`?token=`), guardada só no aparelho (Configurações).

## Indicadores
- EMA: semente = SMA dos `n` primeiros; k = 2/(n+1). RSI: Wilder (média simples inicial, depois
  suavização). Calcular no histórico completo e só depois recortar o período exibido.

## Backtest (`assets/js/backtest.js`)
- Sinal no fechamento do candle t; execução na abertura de t+1 com slippage contra o operador.
- Compra: EMA rápida cruza acima da lenta e RSI dentro da faixa. Venda: cruzamento contrário ou RSI de
  saída (opcional). Só compra, uma posição por vez, sem reentrada sem novo cruzamento.
- Taxa por lado sobre o valor financeiro. Drawdown sobre o patrimônio marcado no fechamento.
  Profit factor = lucro bruto ÷ prejuízo bruto.
- Posição aberta no fim: avaliada no último fechamento, já com custos de saída.
- Buy and hold: mesmo dia de início e mesmos custos. Candle do dia em andamento é descartado.
- `tradeFrom`: candles anteriores só aquecem indicadores (aquecimento = max(60, 3 × EMA lenta)).
- Resultado sempre rotulado como simulação histórica.

## Diário (`assets/js/journal.js`)
- Campos: data, data de saída, ativo, direção (long/short), entrada, saída (vazia = aberta),
  quantidade, taxas, moeda (BRL/USD), setup, observações. Resultado = (saída − entrada) × qtd × direção − taxas.
- Persistência em `localStorage` na chave `atlas.journal.v1`.
- CSV no padrão Excel pt-BR: separador `;`, vírgula decimal, BOM UTF-8.
- Backup JSON `{format: "atlas-invest-lab-backup", schema: 1, trades}`; restauração aceita também lista
  simples com campos em português; opções "Juntar" (por id) ou "Substituir tudo".
- Números aceitam formato brasileiro: "10.000" = 10000; "5,4321" = 5.4321; "1.234,56" = 1234.56.

## Interface
- Mobile-first, iPhone: campos com fonte ≥ 16 px, alvos de toque ≥ 32×44 px, sem rolagem horizontal.
- Primeira tela do iPhone 13 (390×844): dólar com gráfico, seletor de período e topo da primeira cédula
  acima da barra de abas.
- Faixas mínima–máxima nunca arredondam para fora da faixa real (3 casas no celular, para dentro).
- Estados obrigatórios: carregando, atualizado, desatualizado, erro de conexão, sem dados.
