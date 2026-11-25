# Roadmap

## Consolidado
Histórico do que está implementado e estável. Nunca apagar; só acrescentar.

- **2026-11-25 · v2.0.0 — Atlas Invest Lab construído do zero** (o HTML original não existia no repositório).
  Painel, análise técnica, backtest, diário com CSV/JSON, PWA, snapshot do Yahoo via GitHub Actions,
  26 testes unitários e teste e2e com 35 verificações (incluindo APIs fora do ar).
- **2026-11-25 · Publicação no GitHub Pages** em https://joaogabrielll093-star.github.io/atlas-invest-lab/
  via `pages.yml`; workflow do Jekyll removido (publicação duplicada com dados antigos).
- **2026-11-25 · Skill impeccable instalada** (`.claude/skills/impeccable`, v4.11.0).
- **2026-11-25 · v2.1.0 — Visual "Cédulas do Real"** (skill impeccable): tintas das cédulas por grupo,
  numerais Archivo, cédulas com três faces viradas por arrasto/pontos/seletor, guilhoché em SVG.
  Revisão independente concluída com "ship". `PRODUCT.md`, `DESIGN.md` e `.impeccable/` adicionados.
  e2e passou a 39 verificações.
- **2026-11-25 · CLAUDE.md como índice modular** (skill `claude-md-index`): `docs/` e `.claude/rules/`.

## Em andamento
- Nada.

## Backlog
- Ler o `DESIGN.md` com o usuário e ajustar nomes e descrições (o documentador não pôde fazer perguntas).
- Rodar `/impeccable doctor`: o hook de design do impeccable não está instalado no projeto.
- Validar o câmbio ao vivo da AwesomeAPI no aparelho do usuário (no IP da nuvem a cota estava esgotada).
- Testar o visual novo direto no endereço publicado e num iPhone físico.
- Primeira tela no iPhone SE (375×667): o seletor fica abaixo da barra de abas até rolar.
