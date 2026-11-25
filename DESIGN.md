---
name: Atlas Invest Lab
description: Painel pessoal de mercado em forma de maço de cédulas do Real, no verso noturno azul-tinta.
colors:
  ground: "oklch(17% .05 262)"
  ground-2: "oklch(20% .055 262)"
  surface: "oklch(23% .058 262)"
  surface-2: "oklch(27% .062 262)"
  rule: "oklch(33% .065 262)"
  rule-2: "oklch(41% .07 262)"
  text: "#eef2fb"
  text-2: "#b9c4dc"
  muted: "#98a6c6"
  ink-100: "#3dbfa8"
  ink-5: "#b07cf0"
  ink-2: "#7fa6cc"
  ink-20: "#f4c23a"
  ink-50: "#f08a3e"
  ink-10: "#e463b6"
  up: "#3ad08c"
  down: "#ff6b5e"
  warn: "#f6b53d"
  on-ink: "#04121a"
typography:
  display:
    fontFamily: "Archivo Atlas, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(46px, 13vw, 76px)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\", \"lnum\""
    fontVariation: "\"wdth\" 125"
  numeral:
    fontFamily: "Archivo Atlas, Arial Narrow, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\", \"lnum\""
    fontVariation: "\"wdth\" 125"
  headline:
    fontFamily: "Archivo Atlas, Arial Narrow, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    letterSpacing: "-0.015em"
    fontVariation: "\"wdth\" 112"
  title:
    fontFamily: "Archivo Atlas, Arial Narrow, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 800
    letterSpacing: "-0.01em"
    fontVariation: "\"wdth\" 112"
  data:
    fontFamily: "Archivo Atlas, Arial Narrow, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 750
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 110"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  input:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 500
rounded:
  tag: "6px"
  field: "10px"
  button: "11px"
  tile: "12px"
  note: "14px"
  dialog: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "10px"
  card: "14px"
  gutter: "16px"
  section: "18px"
  tab-bar: "64px"
components:
  note-dollar:
    backgroundColor: "color-mix(in oklab, #3dbfa8 16%, oklch(23% .058 262))"
    textColor: "{colors.text}"
    rounded: "{rounded.note}"
    padding: "18px 16px 14px"
  note-asset:
    backgroundColor: "color-mix(in oklab, #e463b6 16%, oklch(23% .058 262))"
    textColor: "{colors.text}"
    rounded: "{rounded.note}"
    padding: "4px 14px 8px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.note}"
    padding: "14px"
  stat:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.data}"
    rounded: "{rounded.tile}"
    padding: "10px 12px"
  button:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.ink-100}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.down}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "44px"
  segmented:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.tile}"
    padding: "3px"
  segmented-selected:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ground}"
    rounded: "9px"
    padding: "8px 14px"
    height: "38px"
  chip:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "6px 13px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "6px 13px"
    height: "36px"
  input:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.text}"
    typography: "{typography.input}"
    rounded: "{rounded.field}"
    padding: "10px 11px"
    height: "44px"
  tab-bar:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.muted}"
    height: "{spacing.tab-bar}"
---

# Design System: Atlas Invest Lab

## Overview

**Creative North Star: "Cédulas do Real"**

O painel é um maço de cédulas do Real visto no verso noturno. O chão é azul-tinta de verdade, não o navy genérico de fintech, e cada grupo de mercado ganha a tinta da sua cédula: R$100 garoupa verde-azulado para o dólar, R$5 violeta para juros e inflação, R$2 azul-acinzentado para moedas, R$20 amarelo-mico para a bolsa brasileira, R$50 laranja-onça para o mercado internacional, R$10 rosa-arara para cripto. A tinta não é um acento pontual: ela tinge o campo inteiro da cédula, a borda, o título do canteiro, o guilhoché, a linha do gráfico e o marcador da faixa.

O valor é o protagonista, como na nota impressa: numerais em Archivo larga (wdth 125) e pesada (800), tabulares e alinhados, com o símbolo da moeda menor e na tinta da cédula. Atrás do numeral corre o guilhoché, linhas finas geradas em SVG na cor da tinta, sempre em baixa opacidade, como segurança gráfica que não compete com o dado. A densidade é de ferramenta de estudo: sessões longas, procedência de cada número sempre à vista, controles padrão da web.

O movimento pertence ao gesto da cédula: arrastar vira a face (Hoje, 1 mês, 12 meses) com snap horizontal, e o seletor global vira todas juntas. A recusa explícita do mundo é o default de fintech escura com um único acento neon sobre cartões cinza iguais.

**Key Characteristics:**
- Chão azul-tinta em OKLCH (matiz 262) com quatro degraus tonais de superfície e dois de fio.
- Seis tintas de cédula, uma por grupo de mercado, aplicadas como campo de cor via `data-ink`.
- Numerais Archivo largos e pesados, tabulares, como o valor impresso na nota.
- Guilhoché em linha fina (0,7) na tinta da cédula, opacidade 0,2 a 0,3.
- Cédulas de ativo com três faces deslizáveis e pontos indicadores na tinta.
- Estados (alta, queda, aviso) fora da família das cédulas, usados só com significado.

## Colors

Uma noite azul-tinta tonal, sobre a qual seis tintas de cédula saturadas marcam território, e três cores de estado falam só quando há o que dizer.

### Primary
- **Verde-Garoupa (R$100)** (`ink-100`): a tinta do dólar, a cédula-herói, e também o acento de interface (`--accent`): foco, links, botão primário, aba ativa, cursor e seleção de texto.

### Secondary
- **Violeta-Garça (R$5)** (`ink-5`): juros e inflação (canteiro macro, série da Selic) e a EMA 21 nos gráficos.
- **Azul-Tartaruga (R$2)** (`ink-2`): canteiro de moedas.
- **Amarelo-Mico (R$20)** (`ink-20`): bolsa brasileira e a EMA 9 nos gráficos.
- **Laranja-Onça (R$50)** (`ink-50`): mercado internacional.
- **Rosa-Arara (R$10)** (`ink-10`): criptomoedas.

### Tertiary
- **Verde-Alta** (`up`): variação positiva, fonte funcionando, marcador de compra, dado ao vivo.
- **Coral-Queda** (`down`): variação negativa, erro, marcador de venda, botão de perigo.
- **Âmbar-Aviso** (`warn`): dado desatualizado e avisos; o fundo do aviso mistura 10% de âmbar na superfície.

### Neutral
- **Azul-Tinta Noturno** (`ground`): fundo da página, barra do seletor de período, texto sobre controle selecionado.
- **Tinta Funda** (`ground-2`): fundo de campos, chips e da barra de abas.
- **Superfície** (`surface`) e **Superfície Alta** (`surface-2`): cartões, estatísticas, diálogos, botões neutros, toasts.
- **Fio** (`rule`) e **Fio Forte** (`rule-2`): divisórias, bordas de cartão, bordas de campo e de chip.
- **Papel** (`text`), **Papel Velho** (`text-2`) e **Grafite Claro** (`muted`): texto principal, texto de apoio e procedência, e texto terciário.
- **Tinta sobre Cédula** (`on-ink`): texto escuro sobre o botão primário e o link de pular conteúdo.

### Named Rules
**The Uma Cédula, Uma Tinta Rule.** Cada grupo de mercado tem exatamente uma tinta, atribuída por `data-ink` no contêiner (que define `--ink`); tudo dentro herda dela. Nenhum componente escolhe a tinta por conta própria.

**The Campo de Tinta Rule.** A tinta ocupa região: o fundo da cédula é `color-mix(in oklab, var(--ink) 16%, var(--surface))` (14% no canteiro macro) e a borda é a tinta a 34% (30% no macro) sobre o fio. A tinta pura fica para título do canteiro, nome do ativo, símbolo da moeda, linha do gráfico e marcador.

**The Estado Não É Cédula Rule.** Alta, queda e aviso vivem fora da família das cédulas e só aparecem com significado (variação, saúde da fonte, frescor). Uma tinta de cédula nunca indica estado.

## Typography

**Display Font:** Archivo Atlas (Archivo variável, OFL, wght 100–900, wdth 62–125, em `assets/fonts/archivo-var.woff2`), com Arial Narrow de reserva
**Body Font:** pilha de sistema (-apple-system, SF Pro Text, Segoe UI, Roboto)

**Character:** a Archivo larga e pesada faz o papel do valor gravado na cédula; a fonte de sistema cuida de tudo o que é leitura e controle, para a interface parecer nativa no iPhone.

### Hierarchy
- **Display** (800, clamp de 46 a 76px; 50px abaixo de 600px; 80px a partir de 960px; altura de linha 0,95; wdth 125): o numeral da cédula do dólar.
- **Numeral** (800, 30px; 32px na análise; 26px no macro; wdth 125): o valor de cada cédula de ativo e de cada indicador.
- **Headline** (800, 26px, wdth 112): título das telas Análise, Backtest e Diário.
- **Title** (800, 21px, wdth 112): nome do canteiro, na tinta da cédula. O título da cédula-herói usa 750, 17px.
- **Data** (750, 20px, wdth 110): valor das estatísticas do backtest e do diário.
- **Body** (400, 15px, 1,45): texto corrido; notas de rodapé limitadas a 75ch.
- **Label** (600, 12px a 12,5px): rótulos de fatos, faces, campos e procedência, em `text-2`.

### Named Rules
**The Valor Gravado Rule.** Todo número de mercado em destaque é Archivo com `font-stretch: 125%`, peso 800, `tabular-nums lining-nums` e entreletra −0,025em. O símbolo da moeda cai para 0,46em (0,42em no herói), largura 100%, peso 700, na tinta da cédula.

**The Algarismo Tabular Rule.** Tabelas, estatísticas, fatos, faixas, eixos e dicas de gráfico usam `font-variant-numeric: tabular-nums`; números nunca dançam ao atualizar.

**The Campo de 16 Rule.** Campos de formulário usam 16px para o iPhone não aplicar zoom automático.

## Layout

Coluna única no celular com calha de 16px e conteúdo limitado a 1180px no computador. A barra de abas fica fixa no rodapé (64px mais a área segura) até 960px, quando sobe para baixo da barra superior como abas horizontais com sublinhado. O seletor de período (Hoje / 1 mês / 12 meses) é pegajoso logo abaixo da barra superior, colado às cédulas que ele vira.

No Painel, a cédula do dólar ocupa a largura; a partir de 960px ela vira grade de duas colunas (cabeçalho e fatos à esquerda até 420px, gráfico à direita, 28px de vão). Os canteiros entram numa grade de quatro colunas em que cada canteiro declara quantas ocupa (`data-span` 1, 2 ou 3) e suas cédulas se dividem nessas colunas; abaixo disso, as cédulas fluem em `auto-fill` com mínimo de 260px. Fatos do herói: duas colunas, quatro a partir de 640px, três abaixo de 600px. Indicadores macro: duas colunas, cinco a partir de 640px.

Ritmo de espaço: vãos de 8 a 10px entre cédulas e controles, 14px de respiro interno em cartões, 16px de calha, 18px entre canteiros. Pontos de quebra observados: 599/600px, 640px e 960px.

## Elevation & Depth

A profundidade vem de camadas tonais do azul-tinta (`ground` → `ground-2` → `surface` → `surface-2`) e de fios de 1px, não de sombras. Sombras existem só onde algo flutua sobre o conteúdo: a barra do seletor de período ao grudar, a dica do gráfico, os toasts e o marcador da faixa. A barra superior e a barra de abas usam vidro fosco (`backdrop-filter: blur(14px)`) sobre o chão a 90 a 94%.

### Shadow Vocabulary
- **Borda de rolagem** (`box-shadow: 0 10px 14px -8px rgba(0,0,0,.6)`): sob a barra pegajosa do seletor de período.
- **Flutuante** (`box-shadow: 0 8px 22px rgba(0,0,0,.45)`): dica do gráfico.
- **Toast** (`box-shadow: 0 10px 30px rgba(0,0,0,.45)`): avisos temporários.
- **Marcador** (`box-shadow: 0 1px 4px rgba(0,0,0,.45)`): bolinha de posição na faixa mínima–máxima.

### Named Rules
**The Plano por Tinta Rule.** Cédulas e cartões repousam planos; a separação vem da tinta e do fio. Sombra só para o que flutua.

## Shapes

Cantos suavemente arredondados e consistentes: 14px nas cédulas e cartões (`--radius`), 12px em estatísticas, seletor e toasts, 11px em botões, 10px em campos e botões de ícone, 16px em diálogos, 6px em etiquetas, pílula em chips, status e badges. A cédula recorta seu conteúdo (`overflow: hidden`) para que o guilhoché sangre pela borda superior direita como numa nota impressa. O guilhoché é uma família de 14 curvas fechadas moduladas por senos, gerada por semente; cada ativo tem a sua.

## Components

### Buttons
- **Shape:** cantos suaves (11px), altura mínima de 44px; a variante pequena tem 34px.
- **Neutro:** superfície alta com fio forte, texto papel, peso 650, 14px.
- **Primário:** verde-garoupa cheio com texto `on-ink`; no hover clareia 15% para o branco.
- **Perigo:** fundo transparente, borda coral a 55%, texto coral.
- **Hover / Focus:** transição de fundo e borda em 0,2s; foco por contorno de 2px na cor de acento com afastamento de 2px.
- **Ícone:** 40×40px, transparente, ganha superfície no hover; traço de 1,8.

### Chips
- **Style:** pílula em `ground-2` com fio forte, 13,5px, peso 600, altura mínima 36px.
- **State:** selecionado inverte para fundo papel e texto azul-tinta; dentro de um contexto com `data-ink`, o selecionado ganha a tinta da cédula. A variante com rolagem horizontal sangra até a calha.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** `surface` para cartões de ferramenta (Análise, Backtest, Diário); campo de tinta para cédulas.
- **Shadow Strategy:** plano (ver Elevation & Depth).
- **Border:** 1px de fio; nas cédulas, a tinta misturada ao fio; no hover de uma cédula de ativo, a tinta sobe para 60%.
- **Internal Padding:** 14px.

### Inputs / Fields
- **Style:** `ground-2`, fio forte, cantos de 10px, 16px de texto, altura mínima 44px; selects com seta desenhada por gradiente.
- **Focus:** borda na cor de acento e halo de 3px do acento a 25%.
- **Error / Disabled:** mensagem em coral, 13px; botões desabilitados a 45% de opacidade.

### Navigation
- **Barra superior:** pegajosa, vidro fosco, marca Atlas em Archivo 800 com wdth 118, pílula de status com ponto colorido pela saúde das fontes.
- **Abas:** quatro abas com ícone e rótulo (11,5px, 600) em `muted`; a ativa fica em papel com o ícone na cor de acento. A partir de 960px, abas horizontais de 14px com sublinhado de 2px no acento.

### Segmented Control (seletor de período)
Trilho de superfície com fio, cantos de 12px e 3px de respiro; cada botão ocupa a mesma largura, 14px, peso 650, altura mínima 38px. O selecionado vira papel com texto azul-tinta, com transição de 0,25s na curva da casa.

### Cédula de Ativo (assinatura)
A cédula é um `article` com `data-ink` da família do ativo, guilhoché de 170px sangrando à direita, nome na tinta com chevron, e uma trilha de três faces em rolagem horizontal com snap obrigatório: **Hoje** (numeral, badge de variação, frescor, faixa do dia), **1 mês** (variação, minigráfico de 36px, mínima e máxima) e **12 meses** (variação e posição na faixa de 52 semanas). O rodapé traz a fonte e três pontos; o ponto ativo alarga de 7 para 16px e ganha a tinta. Arrastar com o mouse ou o dedo vira a face, setas do teclado também, e o seletor global vira todas juntas. Toque encolhe a cédula para 0,985.

### Cédula do Dólar (herói)
Mesma pele da cédula de ativo em escala maior: guilhoché de 300px (420px no computador) a 0,3 de opacidade, título em Archivo 750 na tinta, numeral Display, fatos em grade com divisórias tingidas, e gráfico de área com gradiente da tinta (28% a 0%) em que arrastar o dedo mostra o valor do dia.

### Badges e frescor
Badge de variação em pílula, 13px, peso 700, fundo do estado a 17%. A etiqueta de frescor é um ponto de 7px mais texto de 12px: verde ao vivo, papel velho no fechamento, âmbar desatualizado, coral sem dado.

## Do's and Don'ts

### Do:
- **Do** atribuir a tinta pelo contêiner (`data-ink="100|5|2|20|50|10"`) e deixar filhos herdarem `--ink`.
- **Do** compor o fundo da cédula como mistura da tinta a 16% na superfície e a borda como tinta a 34% no fio.
- **Do** escrever todo valor de mercado em destaque em Archivo wdth 125, peso 800, algarismos tabulares e alinhados.
- **Do** desenhar o guilhoché em linha de 0,7 com `vector-effect: non-scaling-stroke`, na tinta, entre 0,2 e 0,3 de opacidade, atrás do conteúdo.
- **Do** mostrar ao lado de cada número a fonte e o frescor com a etiqueta de ponto.
- **Do** manter alvos de toque de pelo menos 44px em botões e campos, e campos com 16px de texto.
- **Do** usar a curva `cubic-bezier(.16, 1, .3, 1)` nas transições de estado e respeitar `prefers-reduced-motion`.

### Don't:
- **Don't** cair no default de fintech escura com um único acento neon sobre cartões cinza iguais.
- **Don't** usar o navy genérico no lugar do azul-tinta `oklch(17% .05 262)`.
- **Don't** usar uma tinta de cédula para indicar alta, queda ou aviso, nem uma cor de estado como tinta de grupo.
- **Don't** dar a duas famílias de mercado a mesma tinta, nem trocar a tinta de um grupo entre telas.
- **Don't** pôr sombra em cédulas ou cartões em repouso.
- **Don't** usar a Archivo larga em texto corrido ou rótulos; ela é para valores e títulos.
