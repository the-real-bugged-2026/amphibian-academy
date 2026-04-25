import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PROFILE_KEY = "amphibianAcademyReactState";
const STARTING_HP = 10;
const ROUND_SECONDS = 30;
const COUNTDOWN_SECONDS = 3;

const DIFFICULTIES = ["easy", "medium", "hard"];

const BOT_CONFIG = {
  easy: { accuracy: 0.65, intervalMs: 1900 },
  medium: { accuracy: 0.78, intervalMs: 1400 },
  hard: { accuracy: 0.88, intervalMs: 980 }
};

const REWARD_FLIES = {
  player: 40,
  bot: 15,
  draw: 25
};

function loadProfile() {
  const fallback = {
    flies: 0,
    wins: 0,
    settings: {
      difficulty: "easy"
    }
  };

  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      settings: {
        ...fallback.settings,
        ...(parsed.settings || {})
      }
    };
  } catch {
    return fallback;
  }
}

function createBattleState(seconds = ROUND_SECONDS) {
  return {
    phase: "idle",
    round: 0,
    countdown: COUNTDOWN_SECONDS,
    timeLeft: seconds,
    playerHp: STARTING_HP,
    botHp: STARTING_HP,
    playerPoints: 0,
    botPoints: 0,
    question: null,
    answerInput: "",
    netDamage: 0,
    winner: null,
    rewardApplied: false,
    rewardText: "",
    statusLine: "Press Start Battle to begin.",
    statusTone: "neutral"
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isNear(left, right) {
  return Math.abs(left - right) < 0.0001;
}

function formatValue(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2);
}

function difficultyLabel(value) {
  if (value === "easy") return "Easy";
  if (value === "medium") return "Medium";
  return "Hard";
}

function chooseOperation(difficulty) {
  if (difficulty === "easy") {
    return Math.random() < 0.55 ? "add" : "subtract";
  }

  if (difficulty === "medium") {
    const pool = ["add", "subtract", "multiply"];
    return pool[randomInt(0, pool.length - 1)];
  }

  const pool = ["add", "subtract", "multiply", "divide"];
  return pool[randomInt(0, pool.length - 1)];
}

function generateQuestion(difficulty) {
  const op = chooseOperation(difficulty);

  if (op === "add") {
    const max = difficulty === "hard" ? 80 : difficulty === "medium" ? 45 : 20;
    const left = randomInt(0, max);
    const right = randomInt(0, max);
    return {
      prompt: `${left} + ${right} = ?`,
      answer: left + right
    };
  }

  if (op === "subtract") {
    const max = difficulty === "hard" ? 90 : difficulty === "medium" ? 50 : 20;
    const right = randomInt(0, max);
    const left = randomInt(right, right + max);
    return {
      prompt: `${left} - ${right} = ?`,
      answer: left - right
    };
  }

  if (op === "multiply") {
    const max = difficulty === "hard" ? 12 : difficulty === "medium" ? 10 : 8;
    const left = randomInt(0, max);
    const right = randomInt(0, max);
    return {
      prompt: `${left} x ${right} = ?`,
      answer: left * right
    };
  }

  const divisorMax = difficulty === "hard" ? 12 : difficulty === "medium" ? 10 : 8;
  const quotientMax = difficulty === "hard" ? 14 : difficulty === "medium" ? 12 : 10;
  const right = randomInt(1, divisorMax);
  const answer = randomInt(1, quotientMax);
  const left = right * answer;

  return {
    prompt: `${left} / ${right} = ?`,
    answer
  };
}

function resolveRound(prev) {
  const net = prev.playerPoints - prev.botPoints;

  let nextPlayerHp = prev.playerHp;
  let nextBotHp = prev.botHp;

  if (net > 0) {
    nextBotHp = Math.max(0, prev.botHp - net);
  } else if (net < 0) {
    nextPlayerHp = Math.max(0, prev.playerHp - Math.abs(net));
  }

  const gameOver = nextPlayerHp === 0 || nextBotHp === 0;

  let winner = null;
  if (gameOver) {
    if (nextPlayerHp === 0 && nextBotHp === 0) {
      winner = "draw";
    } else if (nextBotHp === 0) {
      winner = "player";
    } else {
      winner = "bot";
    }
  }

  let roundSummary = `Round ${prev.round}: You ${prev.playerPoints} - Bot ${prev.botPoints}. `;
  if (net > 0) {
    roundSummary += `You dealt ${net} damage.`;
  } else if (net < 0) {
    roundSummary += `Bot dealt ${Math.abs(net)} damage.`;
  } else {
    roundSummary += "No damage this round.";
  }

  if (gameOver) {
    if (winner === "player") {
      roundSummary += " You won the battle.";
    } else if (winner === "bot") {
      roundSummary += " Bot won the battle.";
    } else {
      roundSummary += " Draw.";
    }
  }

  return {
    ...prev,
    phase: gameOver ? "gameOver" : "resolve",
    timeLeft: 0,
    playerHp: nextPlayerHp,
    botHp: nextBotHp,
    netDamage: net,
    winner,
    rewardApplied: false,
    question: null,
    answerInput: "",
    statusLine: roundSummary,
    statusTone: net > 0 ? "good" : net < 0 ? "bad" : "neutral"
  };
}

function HpBar({ hp }) {
  const safeHp = Math.max(0, Math.min(STARTING_HP, hp));
  const fillPercent = (safeHp / STARTING_HP) * 100;
  return (
    <div className="hp-track" role="img" aria-label={`HP ${safeHp} of ${STARTING_HP}`}>
      <div className="hp-fill" style={{ width: `${fillPercent}%` }} />
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [profile, setProfile] = useState(() => loadProfile());
  const [battle, setBattle] = useState(() => createBattleState(ROUND_SECONDS));

  const botModel = useMemo(
    () => BOT_CONFIG[profile.settings.difficulty] || BOT_CONFIG.easy,
    [profile.settings.difficulty]
  );

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (battle.phase !== "countdown") {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setBattle((prev) => {
        if (prev.phase !== "countdown") {
          return prev;
        }

        const nextCount = prev.countdown - 1;
        if (nextCount <= 0) {
          return {
            ...prev,
            phase: "live",
            countdown: 0,
            timeLeft: ROUND_SECONDS,
            playerPoints: 0,
            botPoints: 0,
            question: generateQuestion(profile.settings.difficulty),
            answerInput: "",
            statusLine: `Round ${prev.round} live. Solve as fast as you can.`,
            statusTone: "neutral"
          };
        }

        return {
          ...prev,
          countdown: nextCount,
          statusLine: `Round ${prev.round} starts in ${nextCount}...`,
          statusTone: "neutral"
        };
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [battle.phase, profile.settings.difficulty]);

  useEffect(() => {
    if (battle.phase !== "live") {
      return undefined;
    }

    const timerId = setInterval(() => {
      setBattle((prev) => {
        if (prev.phase !== "live") {
          return prev;
        }

        const nextTime = prev.timeLeft - 1;
        if (nextTime <= 0) {
          return resolveRound(prev);
        }

        return {
          ...prev,
          timeLeft: nextTime
        };
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [battle.phase]);

  useEffect(() => {
    if (battle.phase !== "live") {
      return undefined;
    }

    const botId = setInterval(() => {
      setBattle((prev) => {
        if (prev.phase !== "live") {
          return prev;
        }

        if (Math.random() > botModel.accuracy) {
          return prev;
        }

        return {
          ...prev,
          botPoints: prev.botPoints + 1
        };
      });
    }, botModel.intervalMs);

    return () => clearInterval(botId);
  }, [battle.phase, botModel]);

  useEffect(() => {
    if (battle.phase !== "gameOver" || battle.rewardApplied !== false) {
      return;
    }

    const reward = REWARD_FLIES[battle.winner || "draw"];

    setProfile((prev) => ({
      ...prev,
      flies: prev.flies + reward,
      wins: prev.wins + (battle.winner === "player" ? 1 : 0)
    }));

    setBattle((prev) => ({
      ...prev,
      rewardApplied: true,
      rewardText: `Battle reward: +${reward} flies`
    }));
  }, [battle.phase, battle.rewardApplied, battle.winner]);

  const startBattle = () => {
    setBattle({
      ...createBattleState(ROUND_SECONDS),
      phase: "countdown",
      round: 1,
      countdown: COUNTDOWN_SECONDS,
      statusLine: `Round 1 starts in ${COUNTDOWN_SECONDS}...`,
      statusTone: "neutral"
    });
  };

  const nextRound = () => {
    setBattle((prev) => {
      if (prev.phase !== "resolve") {
        return prev;
      }

      const nextRoundNumber = prev.round + 1;
      return {
        ...prev,
        phase: "countdown",
        round: nextRoundNumber,
        countdown: COUNTDOWN_SECONDS,
        timeLeft: ROUND_SECONDS,
        playerPoints: 0,
        botPoints: 0,
        question: null,
        answerInput: "",
        netDamage: 0,
        statusLine: `Round ${nextRoundNumber} starts in ${COUNTDOWN_SECONDS}...`,
        statusTone: "neutral"
      };
    });
  };

  const submitAnswer = (event) => {
    event.preventDefault();

    setBattle((prev) => {
      if (prev.phase !== "live" || !prev.question) {
        return prev;
      }

      const trimmed = prev.answerInput.trim();
      if (trimmed.length === 0) {
        return prev;
      }

      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) {
        return {
          ...prev,
          answerInput: "",
          statusLine: "Please enter a valid number.",
          statusTone: "bad"
        };
      }

      if (isNear(numeric, prev.question.answer)) {
        return {
          ...prev,
          playerPoints: prev.playerPoints + 1,
          question: generateQuestion(profile.settings.difficulty),
          answerInput: "",
          statusLine: "Correct! Next question.",
          statusTone: "good"
        };
      }

      return {
        ...prev,
        answerInput: "",
        statusLine: `${formatValue(numeric)} is not correct.`,
        statusTone: "bad"
      };
    });
  };

  const updateAnswer = (value) => {
    setBattle((prev) => ({
      ...prev,
      answerInput: value
    }));
  };

  const updateDifficulty = (value) => {
    setProfile((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        difficulty: value
      }
    }));
  };

  const currentScreen = useMemo(() => {
    if (screen === "welcome") {
      return (
        <motion.section
          key="welcome"
          className="screen welcome-screen"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
        >
          <p className="eyebrow">BroncoHacks 2026</p>
          <h2>Welcome To The Battle Pond</h2>
          <p>
            Race the bot in timed math rounds. Win points by solving equations,
            then deal damage based on the point difference.
          </p>
          <div className="button-row">
            <button className="btn btn-primary" onClick={() => setScreen("subjects")}>Start Adventure</button>
            <button className="btn btn-ghost" onClick={() => setScreen("mathHub")}>Skip To Math</button>
          </div>
        </motion.section>
      );
    }

    if (screen === "subjects") {
      return (
        <motion.section
          key="subjects"
          className="screen"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
        >
          <div className="screen-head">
            <button className="btn btn-ghost" onClick={() => setScreen("welcome")}>Back</button>
            <div>
              <p className="eyebrow">Choose Subject</p>
              <h2>Subject Portal</h2>
            </div>
          </div>
          <div className="cards-3">
            <article className="card card-playable">
              <h3>Math Marsh</h3>
              <p>Battle-race equation rounds against an AI bot.</p>
              <button className="btn btn-primary" onClick={() => setScreen("mathHub")}>Open Math</button>
            </article>
            <article className="card card-locked">
              <h3>Science Swamp</h3>
              <p>Coming soon.</p>
              <button className="btn" disabled>Coming Soon</button>
            </article>
            <article className="card card-locked">
              <h3>Reading Reeds</h3>
              <p>Coming soon.</p>
              <button className="btn" disabled>Coming Soon</button>
            </article>
          </div>
        </motion.section>
      );
    }

    if (screen === "mathHub") {
      return (
        <motion.section
          key="mathHub"
          className="screen"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
        >
          <div className="screen-head">
            <button className="btn btn-ghost" onClick={() => setScreen("subjects")}>Back</button>
            <div>
              <p className="eyebrow">Math Games</p>
              <h2>Pick A Game</h2>
            </div>
          </div>

          <div className="cards-3">
            <article className="card card-playable">
              <h3>Battle Equation Duel</h3>
              <p>Pokemon-style round battle: solve quickly to deal damage.</p>
              <button className="btn btn-primary" onClick={() => setScreen("battleGame")}>Play</button>
            </article>
            <article className="card card-locked">
              <h3>Swamp Typing Rush</h3>
              <p>Coming soon.</p>
              <button className="btn" disabled>Locked</button>
            </article>
            <article className="card card-locked">
              <h3>Boss Arena</h3>
              <p>Coming soon.</p>
              <button className="btn" disabled>Locked</button>
            </article>
          </div>
        </motion.section>
      );
    }

    return (
      <motion.section
        key="battleGame"
        className="screen"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
      >
        <div className="screen-head">
          <button className="btn btn-ghost" onClick={() => setScreen("mathHub")}>Back To Games</button>
          <div>
            <p className="eyebrow">Battle Equation Duel</p>
            <h2>Race, Score, Deal Damage</h2>
          </div>
        </div>

        <div className="battle-layout">
          <aside className="panel battle-side-panel">
            <h3>Battle Settings</h3>
            <label htmlFor="difficultySelect">Difficulty</label>
            <select
              id="difficultySelect"
              value={profile.settings.difficulty}
              onChange={(event) => updateDifficulty(event.target.value)}
              disabled={battle.phase === "live" || battle.phase === "countdown"}
            >
              {DIFFICULTIES.map((option) => (
                <option key={option} value={option}>
                  {difficultyLabel(option)}
                </option>
              ))}
            </select>

            <p>Round Time: <strong>{ROUND_SECONDS}s</strong></p>
            <p>Round: <strong>{battle.round || 0}</strong></p>

            <div className="button-row compact">
              {(battle.phase === "idle" || battle.phase === "gameOver") && (
                <button className="btn btn-primary" onClick={startBattle}>
                  {battle.phase === "gameOver" ? "Play Again" : "Start Battle"}
                </button>
              )}

              {battle.phase === "resolve" && (
                <button className="btn btn-primary" onClick={nextRound}>Next Round</button>
              )}
            </div>

            {battle.rewardText && <p className="reward-text">{battle.rewardText}</p>}
          </aside>

          <section className="panel battle-main-panel">
            <div className="battle-stage">
              <div className="fighter fighter-bot">
                <div className="fighter-card">
                  <div className="fighter-meta">
                    <strong>Pond Bot</strong>
                    <span>Points: {battle.botPoints}</span>
                  </div>
                  <HpBar hp={battle.botHp} />
                  <div className="hp-label">HP: {battle.botHp}/{STARTING_HP}</div>
                </div>
                <div className="sprite sprite-bot" aria-hidden="true">BOT</div>
              </div>

              <div className="battle-center">
                <div className="timer">Time: {battle.phase === "live" ? battle.timeLeft : ROUND_SECONDS}s</div>
                {battle.phase === "countdown" && <div className="countdown">{battle.countdown}</div>}
              </div>

              <div className="fighter fighter-player">
                <div className="sprite sprite-player" aria-hidden="true">YOU</div>
                <div className="fighter-card">
                  <div className="fighter-meta">
                    <strong>Your Frog</strong>
                    <span>Points: {battle.playerPoints}</span>
                  </div>
                  <HpBar hp={battle.playerHp} />
                  <div className="hp-label">HP: {battle.playerHp}/{STARTING_HP}</div>
                </div>
              </div>
            </div>

            <form className="command-box" onSubmit={submitAnswer}>
              <p className="command-title">Math Command Box</p>
              <p className="question">
                {battle.phase === "live" && battle.question
                  ? battle.question.prompt
                  : "Battle not live yet."}
              </p>

              <div className="answer-row">
                <input
                  className="answer-input"
                  type="text"
                  inputMode="decimal"
                  value={battle.answerInput}
                  onChange={(event) => updateAnswer(event.target.value)}
                  disabled={battle.phase !== "live"}
                  placeholder="Type answer and press Enter"
                />
                <button className="btn btn-primary" type="submit" disabled={battle.phase !== "live"}>
                  Submit
                </button>
              </div>

              <p className={`status-line ${battle.statusTone}`}>{battle.statusLine}</p>
            </form>
          </section>
        </div>
      </motion.section>
    );
  }, [screen, battle, profile.settings.difficulty]);

  return (
    <div className="app">
      <div className="bg-lights" aria-hidden="true" />

      <header className="topbar">
        <h1>Amphibian Academy</h1>
        <div className="stat-row">
          <span>Flies: <strong>{profile.flies}</strong></span>
          <span>Wins: <strong>{profile.wins}</strong></span>
        </div>
      </header>

      <AnimatePresence mode="wait">{currentScreen}</AnimatePresence>
    </div>
  );
}
