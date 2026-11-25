# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Uso pessoal de uma única pessoa, investidora no Brasil, que opera e estuda setups de curto prazo. Usa no iPhone (app instalado na tela inicial) e no computador. As sessões são longas: analisa gráficos, roda backtests e registra operações no diário.

## Product Purpose

Painel financeiro pessoal para operar e estudar setups. Junta num lugar só o dólar (indicador econômico e proteção patrimonial), juros e inflação do Brasil, bolsas brasileira e americanas e criptomoedas, com análise técnica (EMA 9, EMA 21, RSI 14), backtest de estratégia e diário de operações. Sucesso: entender rápido o que o mercado está fazendo, testar uma ideia com honestidade e registrar o que foi feito.

## Positioning

Ferramenta pessoal, sem corretora e sem anúncios, que mostra a procedência de cada número: fonte, horário e tipo (ao vivo, com atraso, fechamento, PTAX oficial ou desatualizado). O backtest é transparente nas regras (sinal no fechamento, execução na abertura seguinte, custos incluídos) e nunca vende resultado.

## Operating Context

- Quatro áreas: Painel, Análise, Backtest e Diário.
- Dados de Banco Central (SGS), AwesomeAPI, Binance, CoinGecko e um snapshot do Yahoo Finance gerado pelo GitHub Actions.
- O diário vive no localStorage do aparelho; backup e restauração em JSON, exportação CSV para Excel em português.
- Publicado no GitHub Pages; funciona como PWA, inclusive offline com os últimos dados.

## Capabilities and Constraints

- Site estático: HTML, CSS e JavaScript puro, sem build e sem dependências. Gráficos em SVG próprio.
- Idioma pt-BR, números no padrão brasileiro (vírgula decimal, ponto de milhar).
- Não executa ordens, não conecta corretoras, não pede senhas, não promete rentabilidade.
- Nunca exibir valor inventado ou dado antigo como atual.

## Brand Commitments

- Nome: Atlas Invest Lab ("Atlas").
- Ícone atual: letra A com linha de gráfico (assets/icons/icon.svg).

## Evidence on Hand

Dados reais de mercado via APIs públicas. Não há depoimentos, clientes ou métricas de desempenho, e nenhum deve ser criado.

## Product Principles

1. Procedência visível: todo número diz de onde veio e de quando é.
2. Honestidade sobre risco: simulação é simulação, sinal técnico não é garantia.
3. Feito para sessões longas de estudo: densidade de informação com leitura confortável.
4. Funciona igual no iPhone e no computador.

## Accessibility & Inclusion

Uso no iPhone com toque: alvos de toque confortáveis, campos sem zoom automático (fonte ≥ 16 px), contraste legível no tema escuro.
