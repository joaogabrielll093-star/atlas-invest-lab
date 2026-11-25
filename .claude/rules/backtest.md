---
paths:
  - "assets/js/backtest.js"
  - "assets/js/indicators.js"
  - "tests/backtest.test.js"
  - "tests/indicators.test.js"
---
# Regras de indicadores e backtest
- Nada de look-ahead: o sinal usa dados até o fechamento de t; execução sempre na abertura de t+1.
  O teste "sem look-ahead" altera o futuro e exige as mesmas operações passadas; ele tem de continuar passando.
- Funções puras e UMD (`module.exports` no Node, `window.AtlasIndicators`/`AtlasBacktest` no navegador).
  Não usar DOM nem `Atlas.*` aqui.
- O RSI segue Wilder; o teste compara com a tabela clássica (tolerância 0,1 por arredondamento da tabela)
  e confere o 1º e o 2º valor exatamente.
- Toda mudança de regra do backtest atualiza `docs/requirements.md` e o texto "Como a simulação funciona"
  no `index.html`.
