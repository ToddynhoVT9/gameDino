export const SCOREBOARD_STORAGE_KEY = 'dino_scoreboard_v1'
export const SCOREBOARD_VERSION = 1
export const MAX_ENTRIES = 50
export const NAME_MIN_LENGTH = 5
export const NAME_MAX_LENGTH = 20

const NAME_PATTERN = /^[A-Za-z0-9_]+$/

function defaultScoreboard() {
  return {
    version: SCOREBOARD_VERSION,
    updatedAt: new Date().toISOString().slice(0, 10),
    entries: [],
  }
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const name = sanitizeName(entry.name ?? '')
  const score = Math.floor(Number(entry.score))
  const date = typeof entry.date === 'string' ? entry.date : new Date().toISOString()

  if (!name || !Number.isFinite(score) || score < 0) {
    return null
  }

  return { name, score, date }
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }

    return a.date.localeCompare(b.date)
  })
}

function normalizeScoreboard(scoreboard) {
  const entries = Array.isArray(scoreboard?.entries)
    ? scoreboard.entries.map(normalizeEntry).filter(Boolean)
    : []

  return {
    version: SCOREBOARD_VERSION,
    updatedAt: new Date().toISOString().slice(0, 10),
    entries: sortEntries(entries).slice(0, MAX_ENTRIES),
  }
}

export function sanitizeName(name) {
  return String(name).trim().slice(0, NAME_MAX_LENGTH)
}

export function isValidPlayerName(name) {
  const safeName = sanitizeName(name)
  return safeName.length >= NAME_MIN_LENGTH && NAME_PATTERN.test(safeName)
}

export function loadScoreboard() {
  const raw = localStorage.getItem(SCOREBOARD_STORAGE_KEY)

  if (!raw) {
    const scoreboard = defaultScoreboard()
    saveScoreboard(scoreboard)
    return scoreboard
  }

  try {
    const parsed = JSON.parse(raw)
    const scoreboard = normalizeScoreboard(parsed)
    saveScoreboard(scoreboard)
    return scoreboard
  } catch {
    const scoreboard = defaultScoreboard()
    saveScoreboard(scoreboard)
    return scoreboard
  }
}

export function saveScoreboard(scoreboard) {
  localStorage.setItem(SCOREBOARD_STORAGE_KEY, JSON.stringify(scoreboard))
}

export function addEntry({ name, score }) {
  if (!isValidPlayerName(name)) {
    return loadScoreboard()
  }

  const scoreboard = loadScoreboard()

  const nextScoreboard = normalizeScoreboard({
    ...scoreboard,
    entries: [
      ...scoreboard.entries,
      {
        name: sanitizeName(name),
        score: Math.max(0, Math.floor(Number(score) || 0)),
        date: new Date().toISOString(),
      },
    ],
  })

  saveScoreboard(nextScoreboard)
  return nextScoreboard
}

export function getTopN(n) {
  const scoreboard = loadScoreboard()
  return scoreboard.entries.slice(0, Math.max(0, n))
}

export function getGlobalHighScore() {
  const scoreboard = loadScoreboard()
  return scoreboard.entries.length > 0 ? scoreboard.entries[0].score : 0
}