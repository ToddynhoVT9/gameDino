import { useCallback, useState } from "react";
import GameCanvas from "../components/GameCanvas.jsx";
import {
  addEntry,
  isValidPlayerName,
  loadScoreboard,
  sanitizeName,
} from "../game/scoreboard.js";

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString("pt-BR");
}

function Game() {
  const [playerName, setPlayerName] = useState("");
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(0);
  const [runSignal, setRunSignal] = useState(0);
  const [scoreboard, setScoreboard] = useState(() => loadScoreboard());

  const safePlayerName = sanitizeName(playerName);
  const isReady = isValidPlayerName(safePlayerName);
  const globalHighScore =
    scoreboard.entries.length > 0 ? scoreboard.entries[0].score : 0;

  const handleScoreChange = useCallback((nextScore) => {
    setScore(nextScore);
  }, []);

  const handleGameOver = useCallback(
    (finalScore, nextScoreboard) => {
      setStatus("gameOver");
      setScore(finalScore);

      if (nextScoreboard) {
        setScoreboard(nextScoreboard);
        return;
      }

      if (isValidPlayerName(safePlayerName)) {
        setScoreboard(addEntry({ name: safePlayerName, score: finalScore }));
        return;
      }

      setScoreboard(loadScoreboard());
    },
    [safePlayerName],
  );

  const handleStateChange = useCallback((nextState) => {
    setStatus(nextState);
  }, []);

  const handleNameChange = (event) => {
    setPlayerName(sanitizeName(event.target.value));
  };

  const handleStart = () => {
    if (!isReady) {
      return;
    }

    setScore(0);
    setStatus("running");
    setRunSignal((currentSignal) => currentSignal + 1);
  };

  const actionLabel =
    status === "idle"
      ? "Start"
      : status === "gameOver"
        ? "Restart"
        : "Running...";

  return (
    <main className="game-page">
      <header className="game-header">
        <h1>Runner</h1>
        <p>
          Ceta para cima você pula || Ceta para baixo você agacha || Ceta para a
          direita ativa o dash no ar.
        </p>
      </header>

      <section className="pre-game" aria-label="Pre game settings">
        <label htmlFor="player-name">Nome do jogador</label>
        <input
          id="player-name"
          type="text"
          value={playerName}
          onChange={handleNameChange}
          placeholder="Ex.: Matheus_01"
          maxLength={20}
          autoComplete="off"
        />
        <small className={isReady ? "ok" : "error"}>
          {isReady
            ? "Nome valido. Voce pode iniciar."
            : "Use 5-20 caracteres: apenas letras, numeros e underscore."}
        </small>
      </section>

      <section className="game-stats" aria-label="Game stats">
        <div>
          <span>Status</span>
          <strong>{status}</strong>
        </div>
        <div>
          <span>Score</span>
          <strong>{score}</strong>
        </div>
        <div>
          <span>Recorde Local</span>
          <strong>{globalHighScore}</strong>
        </div>
      </section>

      <div className="game-actions">
        <button
          type="button"
          onClick={handleStart}
          disabled={status === "running" || !isReady}
        >
          {actionLabel}
        </button>
      </div>

      <GameCanvas
        playerName={safePlayerName}
        runSignal={runSignal}
        onScoreChange={handleScoreChange}
        onGameOver={handleGameOver}
        onStateChange={handleStateChange}
      />

      <section className="scoreboard" aria-label="Local ranking">
        <h2>Ranking Local</h2>
        {scoreboard.entries.length === 0 ? (
          <p>Nenhuma partida registrada ainda.</p>
        ) : (
          <ol>
            {scoreboard.entries.map((entry, index) => (
              <li key={`${entry.name}-${entry.score}-${entry.date}-${index}`}>
                <span>{entry.name}</span>
                <strong>{entry.score}</strong>
                <time dateTime={entry.date}>{formatDate(entry.date)}</time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

export default Game;
