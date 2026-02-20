# Dino React Game — Planejamento Futuro (Mecânicas e Placar Local)

Este documento descreve **extensões planejadas** para o jogo estilo Dino (React + Canvas 2D), mantendo a filosofia do projeto: **UI em React** e **engine do jogo em JS puro**, sem servidor.

---

## 1) Novos Requisitos (Resumo)

1. **Obstáculo flutuante**: aparece no ar (altura fixa/variável) e o player precisa **passar por baixo** (ou seja, “não pular” ou “agachar”, dependendo da implementação).
2. **Placar local em `.json`**: salvar e ler ranking local (sem backend).
3. **Nome obrigatório antes de iniciar**: o jogador deve inserir um nome para habilitar o “Start”.
4. **Tecla `E` para pular mais longe (não mais alto)**: um “long jump” que aumenta a distância horizontal percorrida durante o salto.
5. **Terceiro obstáculo terrestre mais longo**: uma variação de obstáculo no chão com largura maior (ex.: tronco longo / barreira extensa).

---

## 2) Observações Técnicas Importantes

### 2.1 Sobre “placar em .json” no navegador

O browser **não consegue escrever diretamente** em um arquivo `.json` no disco do usuário de forma transparente, por razões de segurança.

- armazenar o JSON no `localStorage` como string.
  - “É um JSON”, mas persistido no storage do navegador.
  - Permite ler/escrever sempre, sem pedir permissões.

---

## 3) Mudanças na UI (React)

### 3.1 Tela/Seção “Pré-jogo”

Antes de iniciar:

- Campo de texto: **Nome do jogador**
- Botão **Start** desabilitado até:
  - nome ter pelo menos 5 caracteres
  - sem caracteres proibidos, deve ter apenas letras/números/underscore
- Exibir:
  - recorde global local (maior score no ranking)
  - e uma lista com todos os jogadores

### 3.2 Estados sugeridos (React)

- `playerName` (string)
- `isReady` (boolean)
- `gameState` (“idle” | “running” | “gameOver”)
- `score` (number)
- `highscores` (array)

O React continua sem renderizar jogo: apenas UI.

---

## 4) Placar Local em JSON

### 4.1 Modelo de dados (JSON)

Estrutura sugerida:

```json
{
  "version": 1,
  "updatedAt": "2026-02-20",
  "entries": [
    { "name": "Matheus", "score": 1234, "date": "2026-02-20T00:00:00.000Z" }
  ]
}
```

Regras:

- `entries` ordenado por `score` desc.
- manter no máximo `MAX_ENTRIES` (ex.: 50)
- sanitizar `name` (tamanho máximo: 20 caracteres, caracteres permitidos: apenas letras/números/underscore)

### 4.2 Persistência

Chave sugerida:

- `localStorage["dino_scoreboard_v1"]`

Funções (módulo `src/game/scoreboard.js`):

- `loadScoreboard()` → retorna objeto scoreboard (cria default se não existir)
- `saveScoreboard(scoreboard)` → persiste
- `addEntry({ name, score })` → adiciona, ordena, corta, salva
- `getTopN(n)` → retorna top N

---

## 5) Engine: Novas Mecânicas e Obstáculos

### 5.1 Entidades (tipos de obstáculos)

Passaremos a ter **três tipos**:

1. **GroundShort**: obstáculo terrestre normal (cacto curto)
2. **GroundLong**: obstáculo terrestre longo (barreira comprida)
3. **Floating**: obstáculo flutuante (passar por baixo)

#### Propriedades comuns

- `x, y, width, height`
- `type`
- `speedMultiplier` (opcional)
- `hitboxPadding` (opcional)

#### Configuração sugerida (em `config.js`)

- `floatingMinY`, `floatingMaxY` (se quiser variar)
- `groundLongWidthMin`, `groundLongWidthMax`
- `spawnWeights`: pesos por tipo (ex.: mais comum groundShort, menos comum floating/long)

---

## 6) Obstáculo Flutuante: “Passar por baixo”

Existem duas formas corretas e simples:

### 6.1 Com “agachar” (mais fiel a runners)

Adicionar mecânica de “abaixar” (ex.: `S` ou `ArrowDown`) para reduzir hitbox do player e passar por baixo.

- **Pró**: clássico e intuitivo.
- **Contra**: adiciona mais controle e estado.

---

## 7) Tecla `D` ou `ArrowRight` para “Pular Mais Longe” (não mais alto)

Objetivo: `D` ou `ArrowRight` altera a **componente horizontal** do movimento durante o salto, sem aumentar a altura máxima.

### 7.1 Proposta de implementação (simples e controlável)

Durante o salto, aplicar um “boost” horizontal controlado por tempo.

Variáveis sugeridas no player:

- `isJumping` (bool)
- `isLongJumping` (bool)
- `longJumpTimeLeft` (float, segundos)
- `baseSpeedX` (velocidade horizontal do mundo/obstáculos)
- `longJumpBoost` (quanto aumenta a “distância relativa”)

Como o Dino normalmente fica “parado” e o mundo vem até ele, o long jump pode ser simulado assim:

**mais fácil de sentir:**  
Quando `D` ou `ArrowRight` é acionado no ar, reduzir temporariamente a velocidade do mundo (obstáculos) por um curto período, como se o player “avançasse” relativo a eles.

- `worldSpeed = baseSpeed * (1 - longJumpWorldSlowdown)` por `t` segundos.

Isso aumenta a chance de “passar” por gaps longos sem mudar altura.

### 7.2 Regras de uso do long jump

- Só pode ativar se:
  - player estiver no ar **d**
  - não estiver em cooldown **d**
  - não estiver já long-jumpando
- `D` não altera `vy` nem `jumpStrength` (altura).

### 7.3 Configuração (config.js)

- `longJumpDuration` (ex.: 0.18s ~ 0.30s)
- `longJumpWorldSlowdown` (ex.: 0.25 → reduz 25% a velocidade do mundo)
- `longJumpCooldown` (ex.: 1.0s)

---

## 8) Terceiro Obstáculo Terrestre Longo (GroundLong)

### 8.1 Função no gameplay

- Força o jogador a **pular no timing certo**, com janela menor (porque o obstáculo ocupa mais espaço).
- Combina bem com long jump (pode ser usado para corrigir timing).

### 8.2 Geração

- Largura variável (`width` maior)
- Mesmo `y` do chão
- Pode ter hitbox um pouco “perdoável” com padding, se necessário.

---

## 9) Spawn e Balanceamento

### 9.1 Spawn baseado em pesos

Exemplo:

```js
spawnWeights = {
  groundShort: 0.55,
  groundLong: 0.25,
  floating: 0.2,
};
```

### 9.2 Restrições de sequência (evitar injustiça)

- Não spawnar `floating` imediatamente após outro `floating` (ou usar cooldown de tipo).
- Garantir distância mínima entre obstáculos, especialmente se `floating` exige “não pular”.
- Evitar combinações impossíveis:
  - `floating` muito baixo + `groundLong` colado pode virar “morte garantida”.

Regras simples:

- `minGap` base + fator da velocidade
- `typeCooldowns` por tipo (em segundos)

---

## 10) Atualizações de Código (Plano de Arquivos)

### 10.1 Novos/atualizados módulos

- `src/game/config.js`
  - adicionar configs para long jump, obstáculos flutuantes, ground long, weights, etc.

- `src/game/scoreboard.js` (**novo**)
  - load/save/addEntry/topN

- `src/game/entities.js`
  - adicionar factory para tipos de obstáculos:
    - `createGroundShort()`
    - `createGroundLong()`
    - `createFloating()`

- `src/game/engine.js`
  - input: Space (jump), E ou ArrowRight (long jump)
  - lógica de `worldSpeed` variável no long jump
  - spawn com pesos e restrições
  - onGameOver: enviar score + name para scoreboard

- `src/components/GameCanvas.jsx`
  - receber `playerName`
  - receber callbacks:
    - `onScoreChange(score)`
    - `onGameOver(finalScore)`
  - bloquear start sem nome (ou React bloqueia e só chama start quando ok)

- `src/pages/Game.jsx`
  - UI do nome + placar
  - exibir ranking local

---

## 11) Fluxo do Usuário (UX)

1. Usuário abre página do jogo.
2. Vê input “Digite seu nome”.
3. Botão Start desabilitado até nome válido.
4. Ao iniciar:
   - começa score
   - jogo roda
5. Se morrer:
   - aparece tela “Game Over”
   - mostra score final
   - mostra ranking atualizado (incluindo a entrada do usuário)
   - botão Restart (mantém nome preenchido)

---

## 12) Critérios de Aceite (Para essas features)

### Nome obrigatório

- Não inicia sem nome válido.
- Nome é mostrado na tela de ranking.

### Obstáculo flutuante

- Pelo menos um obstáculo aparece acima do chão.
- Se o player pular quando ele passa, colide (quando aplicável).
- Se o player ficar “baixo” (não pular), passa.

### Placar local em JSON

- Ranking persiste após recarregar a página.
- Entradas ordenadas por score.
- Mantém limite máximo (ex.: top 50).

### Long jump com `D` ou `ArrowRight`

- Ao apertar `D` ou `ArrowRight` no ar, o personagem **não sobe mais alto**, mas “alcança” mais distância (mecânica perceptível).
- Possui cooldown para evitar spam.

### Obstáculo terrestre longo

- Aparece com largura maior do que o curto.
- Colisão funciona corretamente.

---

## 13) Testes Manuais Recomendados

- Iniciar com nome inválido:
  - vazio
  - espaços
  - muito longo
  - caracteres estranhos
- Verificar se Start fica habilitado corretamente.
- Jogar 5 vezes e ver ranking persistir.
- Garantir que long jump não aumenta altura (comparar pulo normal vs com `D` ou `ArrowRight`).
- Verificar spawn injusto (floating seguido de floating etc.).
- Verificar colisão com groundLong em diferentes velocidades.

---

## 14) Roadmap de Implementação (Passos Curto e Seguro)

1. **UI do nome + gating do Start** (React)
2. **Scoreboard localStorage JSON** (módulo e UI básica do ranking)
3. **Obstáculo groundLong**
4. **Obstáculo floating**
5. **Long jump (`D` ou `ArrowRight`)** com slowdown do mundo + cooldown
6. Ajuste fino: weights, gaps, type cooldowns, “feel” da mecânica

---

## 15) Notas de Design (pra ficar “bonito” sem complicar)

- Obstáculo flutuante deve ter silhueta clara (ex.: drone, pássaro, placa).
- GroundLong deve ser visualmente “comprido” (barra, tronco, cerca).
- Long jump pode ter feedback sutil:
  - pequena “trilha” no chão
  - leve mudança no som (se tiver)
  - micro shake (opcional)

Sem efeitos, ainda funciona — mas o feedback torna a mecânica “E” muito mais legível.

---

**Fim do documento.**
