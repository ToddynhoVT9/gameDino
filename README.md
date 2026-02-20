# Dino React Runner

Projeto base para um jogo estilo Dino Runner com:

- `Vite`
- `React`
- `Canvas 2D`
- Engine desacoplada em JavaScript puro
- Ranking local em JSON via `localStorage`

## Como rodar

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Estrutura

```text
src/
  pages/
    Game.jsx
  components/
    GameCanvas.jsx
  game/
    engine.js
    entities.js
    physics.js
    collision.js
    config.js
    scoreboard.js
  main.jsx
```

## Controles

- `Space` ou `ArrowUp`: pular
- `E`, `D` ou `ArrowRight` no ar: long jump (mais distancia, nao mais altura)
- Clique/toque no canvas: pular

## Regras

- `Start`/`Restart` so habilita com nome valido.
- Nome valido: `5-20` caracteres, apenas letras, numeros e `_`.
- Ranking local persiste entre recarregamentos.
