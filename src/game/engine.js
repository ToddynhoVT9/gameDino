import { isAabbCollision } from './collision.js'
import { GAME_CONFIG } from './config.js'
import { createFloating, createGroundLong, createGroundShort, createPlayer } from './entities.js'
import { applyGravity, resolveGroundCollision, tryJump } from './physics.js'
import { addEntry, sanitizeName } from './scoreboard.js'

function randomSpawnInterval() {
  const { spawnIntervalMin, spawnIntervalMax } = GAME_CONFIG
  return Math.random() * (spawnIntervalMax - spawnIntervalMin) + spawnIntervalMin
}

function pickWeightedType(candidates) {
  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0)

  if (totalWeight <= 0) {
    return 'groundShort'
  }

  let roll = Math.random() * totalWeight
  for (const candidate of candidates) {
    roll -= candidate.weight
    if (roll <= 0) {
      return candidate.type
    }
  }

  return candidates[candidates.length - 1]?.type ?? 'groundShort'
}

function applyHitboxPadding(entity) {
  const padding = entity.hitboxPadding

  if (!padding) {
    return entity
  }

  return {
    x: entity.x + (padding.left ?? 0),
    y: entity.y + (padding.top ?? 0),
    width: entity.width - (padding.left ?? 0) - (padding.right ?? 0),
    height: entity.height - (padding.top ?? 0) - (padding.bottom ?? 0),
  }
}

export class GameEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.callbacks = callbacks

    this.rafId = 0
    this.lastTime = 0
    this.state = 'idle'
    this.playerName = ''

    this.player = createPlayer()
    this.obstacles = []
    this.lastSpawnType = null
    this.typeCooldowns = {
      groundShort: 0,
      groundLong: 0,
      floating: 0,
    }

    this.score = 0
    this.visibleScore = 0
    this.elapsed = 0
    this.speed = GAME_CONFIG.gameSpeed
    this.longJumpTimeLeft = 0
    this.longJumpCooldownLeft = 0
    this.spawnTimer = randomSpawnInterval()

    this.setupCanvas()
    this.render()
  }

  setupCanvas() {
    this.canvas.width = GAME_CONFIG.canvasWidth
    this.canvas.height = GAME_CONFIG.canvasHeight
  }

  setPlayerName(playerName) {
    this.playerName = sanitizeName(playerName)
  }

  start(playerName = this.playerName) {
    this.stopLoop()
    this.setPlayerName(playerName)
    this.resetWorld()
    this.state = 'running'
    this.lastTime = performance.now()

    this.callbacks.onStateChange?.(this.state)
    this.callbacks.onScoreChange?.(this.visibleScore)

    this.rafId = requestAnimationFrame(this.loop)
  }

  destroy() {
    this.stopLoop()
  }

  stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  resetWorld() {
    this.player = createPlayer()
    this.obstacles = []
    this.lastSpawnType = null
    this.typeCooldowns = {
      groundShort: 0,
      groundLong: 0,
      floating: 0,
    }

    this.score = 0
    this.visibleScore = 0
    this.elapsed = 0
    this.speed = GAME_CONFIG.gameSpeed
    this.longJumpTimeLeft = 0
    this.longJumpCooldownLeft = 0
    this.spawnTimer = randomSpawnInterval()

    this.render()
  }

  jump() {
    if (this.state !== 'running') {
      return
    }

    tryJump(this.player, GAME_CONFIG.jumpStrength)
  }

  longJump() {
    if (this.state !== 'running') {
      return
    }

    if (this.player.onGround || this.longJumpCooldownLeft > 0 || this.longJumpTimeLeft > 0) {
      return
    }

    this.longJumpTimeLeft = GAME_CONFIG.longJumpDuration
    this.longJumpCooldownLeft = GAME_CONFIG.longJumpCooldown
    this.player.isLongJumping = true
  }

  loop = (timestamp) => {
    if (this.state !== 'running') {
      return
    }

    const dtRaw = (timestamp - this.lastTime) / 1000
    const dt = Math.min(dtRaw, GAME_CONFIG.maxDeltaTime)
    this.lastTime = timestamp

    this.update(dt)
    this.render()

    if (this.state === 'running') {
      this.rafId = requestAnimationFrame(this.loop)
    }
  }

  update(dt) {
    this.elapsed += dt
    this.speed = GAME_CONFIG.gameSpeed + this.elapsed * GAME_CONFIG.speedIncreasePerSecond

    this.longJumpCooldownLeft = Math.max(0, this.longJumpCooldownLeft - dt)
    this.longJumpTimeLeft = Math.max(0, this.longJumpTimeLeft - dt)

    if (this.longJumpTimeLeft === 0) {
      this.player.isLongJumping = false
    }

    applyGravity(this.player, GAME_CONFIG.gravity, dt)
    resolveGroundCollision(this.player, GAME_CONFIG.groundY)

    if (this.player.onGround && this.player.isLongJumping) {
      this.player.isLongJumping = false
      this.longJumpTimeLeft = 0
    }

    const worldSpeedMultiplier = this.longJumpTimeLeft > 0 ? 1 - GAME_CONFIG.longJumpWorldSlowdown : 1
    const worldSpeed = this.speed * worldSpeedMultiplier

    this.updateObstacles(dt, worldSpeed)
    this.updateScore(dt)

    if (this.hasCollision()) {
      this.finishGame()
    }
  }

  canSpawnByGap() {
    if (this.obstacles.length === 0) {
      return true
    }

    const rightMost = this.obstacles.reduce((latest, obstacle) => {
      if (!latest || obstacle.x > latest.x) {
        return obstacle
      }

      return latest
    }, null)

    if (!rightMost) {
      return true
    }

    const gap = GAME_CONFIG.canvasWidth - (rightMost.x + rightMost.width)
    const minGap = GAME_CONFIG.minObstacleGapBase + this.speed * GAME_CONFIG.minObstacleGapSpeedFactor
    return gap >= minGap
  }

  pickObstacleType() {
    const entries = Object.entries(GAME_CONFIG.spawnWeights).map(([type, weight]) => ({ type, weight }))

    const available = entries.filter(({ type, weight }) => {
      if (weight <= 0) {
        return false
      }

      if (this.typeCooldowns[type] > 0) {
        return false
      }

      if (type === 'floating' && this.lastSpawnType === 'floating') {
        return false
      }

      return true
    })

    return pickWeightedType(available.length > 0 ? available : entries)
  }

  createObstacleByType(type) {
    if (type === 'groundLong') {
      return createGroundLong()
    }

    if (type === 'floating') {
      return createFloating()
    }

    return createGroundShort()
  }

  updateObstacles(dt, worldSpeed) {
    this.spawnTimer -= dt

    Object.keys(this.typeCooldowns).forEach((type) => {
      this.typeCooldowns[type] = Math.max(0, this.typeCooldowns[type] - dt)
    })

    if (this.spawnTimer <= 0 && this.canSpawnByGap()) {
      const nextType = this.pickObstacleType()
      const nextObstacle = this.createObstacleByType(nextType)
      this.obstacles.push(nextObstacle)
      this.lastSpawnType = nextType
      this.typeCooldowns[nextType] = GAME_CONFIG.typeCooldowns[nextType] ?? 0
      this.spawnTimer = randomSpawnInterval()
    }

    this.obstacles = this.obstacles
      .map((obstacle) => ({
        ...obstacle,
        x: obstacle.x - worldSpeed * (obstacle.speedMultiplier ?? 1) * dt,
      }))
      .filter((obstacle) => obstacle.x + obstacle.width >= -2)
  }

  updateScore(dt) {
    this.score += dt * GAME_CONFIG.scorePerSecond
    const nextVisibleScore = Math.floor(this.score)

    if (nextVisibleScore !== this.visibleScore) {
      this.visibleScore = nextVisibleScore
      this.callbacks.onScoreChange?.(this.visibleScore)
    }
  }

  hasCollision() {
    const playerHitbox = applyHitboxPadding(this.player)
    return this.obstacles.some((obstacle) => isAabbCollision(playerHitbox, applyHitboxPadding(obstacle)))
  }

  finishGame() {
    this.state = 'gameOver'
    this.stopLoop()

    const scoreboard = addEntry({
      name: this.playerName,
      score: this.visibleScore,
    })

    this.callbacks.onStateChange?.(this.state)
    this.callbacks.onGameOver?.(this.visibleScore, scoreboard)
    this.render()
  }

  render() {
    const ctx = this.ctx
    const { canvasWidth, canvasHeight, groundY, palette, player, obstacleStyles } = GAME_CONFIG

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    ctx.fillStyle = palette.background
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.strokeStyle = palette.accent
    ctx.lineWidth = 2
    for (let x = 0; x < canvasWidth; x += 48) {
      ctx.beginPath()
      ctx.moveTo(x, groundY + 8)
      ctx.lineTo(x + 20, groundY + 8)
      ctx.stroke()
    }

    ctx.fillStyle = palette.ground
    ctx.fillRect(0, groundY, canvasWidth, canvasHeight - groundY)

    ctx.fillStyle = player.color
    ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height)

    this.obstacles.forEach((item) => {
      ctx.fillStyle = obstacleStyles[item.type] ?? obstacleStyles.groundShort
      ctx.fillRect(item.x, item.y, item.width, item.height)
    })

    if (this.state === 'idle') {
      this.drawCenterText('Press Start')
    }

    if (this.state === 'gameOver') {
      this.drawCenterText('Game Over')
    }

    if (this.longJumpTimeLeft > 0) {
      ctx.fillStyle = '#0369a1'
      ctx.font = '700 14px Verdana, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('LONG JUMP', 16, 28)
    }
  }

  drawCenterText(label) {
    const ctx = this.ctx
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 36px Verdana, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, GAME_CONFIG.canvasWidth / 2, GAME_CONFIG.canvasHeight / 2)
  }
}