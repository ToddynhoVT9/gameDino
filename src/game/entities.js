import { GAME_CONFIG } from './config.js'

function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

export function createPlayer() {
  return {
    x: GAME_CONFIG.player.x,
    y: GAME_CONFIG.groundY - GAME_CONFIG.player.height,
    width: GAME_CONFIG.player.width,
    height: GAME_CONFIG.player.height,
    vy: 0,
    onGround: true,
    isLongJumping: false,
  }
}

export function createGroundShort() {
  const { minWidth, maxWidth, minHeight, maxHeight } = GAME_CONFIG.obstacle.groundShort
  const width = randomBetween(minWidth, maxWidth)
  const height = randomBetween(minHeight, maxHeight)

  return {
    type: 'groundShort',
    x: GAME_CONFIG.canvasWidth + width,
    y: GAME_CONFIG.groundY - height,
    width,
    height,
    speedMultiplier: 1,
  }
}

export function createGroundLong() {
  const { minWidth, maxWidth, minHeight, maxHeight } = GAME_CONFIG.obstacle.groundLong
  const width = randomBetween(minWidth, maxWidth)
  const height = randomBetween(minHeight, maxHeight)

  return {
    type: 'groundLong',
    x: GAME_CONFIG.canvasWidth + width,
    y: GAME_CONFIG.groundY - height,
    width,
    height,
    speedMultiplier: 1,
    hitboxPadding: { left: 2, right: 2, top: 1, bottom: 0 },
  }
}

export function createFloating() {
  const { minWidth, maxWidth, minHeight, maxHeight } = GAME_CONFIG.obstacle.floating
  const width = randomBetween(minWidth, maxWidth)
  const height = randomBetween(minHeight, maxHeight)
  const y = randomBetween(GAME_CONFIG.floatingMinY, GAME_CONFIG.floatingMaxY)

  return {
    type: 'floating',
    x: GAME_CONFIG.canvasWidth + width,
    y,
    width,
    height,
    speedMultiplier: 1,
    hitboxPadding: { left: 1, right: 1, top: 1, bottom: 1 },
  }
}