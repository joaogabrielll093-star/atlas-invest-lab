---
paths:
  - "index.html"
  - "assets/css/**"
  - "assets/js/app.js"
  - "assets/js/chart.js"
---
# Regras de interface
- O visual segue `DESIGN.md` ("Cédulas do Real"): cores só por token (`--ink-*`, `--ground`, `--up`,
  `--down`…), uma tinta de cédula por grupo, estado (alta/baixa/atraso) nunca usa tinta de cédula.
- Para trabalho de design, use a skill `impeccable` (contrato em `.impeccable/surfaces/index-html.md`).
- Seletores usados pelo e2e (`tests/e2e/smoke.cjs`): `.asset`, `.px`, `#macro .m`, `#period`, `.faces`,
  `.dots`, `#hero-chart`, `#usd-hero .big`, ids dos formulários. Renomeou? Atualize o teste.
- Números em pt-BR via `Atlas.fmt`; entradas numéricas com `inputmode="decimal"` e `fmt.parseNum`.
- Texto da interface em português do Brasil; sem emoji ou caractere Unicode no lugar de ícone.
- Depois de mudar arquivos servidos, suba a versão do cache em `sw.js`.
