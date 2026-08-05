"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ChillIcon, ShieldIcon, SprinkleIcon } from "./GameIcons";
import { SaveTheScoopLogo } from "./SaveTheScoopLogo";
import styles from "./Game.module.css";

type Phase = "intro" | "countdown" | "playing" | "over";
type PowerType = "chill" | "shield" | "sprinkle";

type LeaderboardEntry = {
  id: string;
  display_name: string;
  score: number;
  survival_ms: number;
  created_at: string;
  festival_day: string;
};

type Player = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
};

type Hazard = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
  rotation: number;
  spin: number;
  kind: "drop" | "orb";
};

type PowerUp = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
  type: PowerType;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type Trail = { x: number; y: number; life: number };

type Engine = {
  width: number;
  height: number;
  dpr: number;
  elapsed: number;
  score: number;
  best: number;
  lastFrame: number;
  lastHudUpdate: number;
  hazardTimer: number;
  powerTimer: number;
  shieldUntil: number;
  chillUntil: number;
  sprinkleUntil: number;
  shieldHitCooldown: number;
  shakeUntil: number;
  dragging: boolean;
  keys: Set<string>;
  player: Player;
  hazards: Hazard[];
  powerUps: PowerUp[];
  particles: Particle[];
  trails: Trail[];
};

const POWER_DURATION = 10;
const BEST_SCORE_KEY = "save-the-scoop-best";
const SCORE_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function createEngine(): Engine {
  return {
    width: 0,
    height: 0,
    dpr: 1,
    elapsed: 0,
    score: 0,
    best: 0,
    lastFrame: 0,
    lastHudUpdate: 0,
    hazardTimer: 0.5,
    powerTimer: 7.5,
    shieldUntil: 0,
    chillUntil: 0,
    sprinkleUntil: 0,
    shieldHitCooldown: 0,
    shakeUntil: 0,
    dragging: false,
    keys: new Set(),
    player: { x: 0, y: 0, targetX: 0, targetY: 0, radius: 25 },
    hazards: [],
    powerUps: [],
    particles: [],
    trails: [],
  };
}

function formatScore(value: number) {
  return SCORE_FORMATTER.format(Math.max(0, Math.floor(value)));
}

function normalizeGameKey(event: KeyboardEvent) {
  const key = event.key;
  if (typeof key !== "string" || key.length === 0) return null;
  return key.length === 1 ? key.toLowerCase() : key;
}

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function collides(a: { x: number; y: number; radius: number }, b: { x: number; y: number; radius: number }, padding = 0) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.radius + b.radius - padding;
  return dx * dx + dy * dy < radius * radius;
}

function difficultyAt(seconds: number) {
  const level = 1 + Math.floor(seconds / 15);
  const spawnInterval = Math.max(0.16, 0.82 * Math.exp(-seconds / 76));
  const speed = 185 + seconds * 2.35 + Math.pow(seconds, 1.28) * 0.52;
  const burstChance = Math.min(0.58, Math.max(0, (seconds - 38) / 150));
  return { level, spawnInterval, speed, burstChance };
}

function powerName(type: PowerType) {
  if (type === "chill") return "Chill";
  if (type === "shield") return "Shield";
  return "2× score";
}

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const engineRef = useRef<Engine>(createEngine());
  const phaseRef = useRef<Phase>("intro");
  const finishRef = useRef<() => void>(() => undefined);
  const countdownRunRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState("3");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [activePowers, setActivePowers] = useState<Array<{ type: PowerType; remaining: number }>>([]);
  const [playerName, setPlayerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [submittedId, setSubmittedId] = useState("");
  const [submittedRank, setSubmittedRank] = useState(1);
  const [submissionState, setSubmissionState] = useState<"idle" | "saving" | "saved" | "local">("idle");

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const resetPlayer = useCallback(() => {
    const game = engineRef.current;
    game.player.x = game.width / 2;
    game.player.y = game.height * 0.69;
    game.player.targetX = game.player.x;
    game.player.targetY = game.player.y;
  }, []);

  const resetGame = useCallback(() => {
    const game = engineRef.current;
    game.elapsed = 0;
    game.score = 0;
    game.lastHudUpdate = 0;
    game.hazardTimer = 0.55;
    game.powerTimer = 7.5;
    game.shieldUntil = 0;
    game.chillUntil = 0;
    game.sprinkleUntil = 0;
    game.shieldHitCooldown = 0;
    game.shakeUntil = 0;
    game.hazards.length = 0;
    game.powerUps.length = 0;
    game.particles.length = 0;
    game.trails.length = 0;
    resetPlayer();
    setScore(0);
    setActivePowers([]);
  }, [resetPlayer]);

  const startGame = useCallback(async () => {
    const runId = countdownRunRef.current + 1;
    countdownRunRef.current = runId;
    resetGame();
    changePhase("countdown");

    for (const step of ["3", "2", "1", "Go"]) {
      if (countdownRunRef.current !== runId) return;
      setCountdown(step);
      await new Promise((resolve) => window.setTimeout(resolve, step === "Go" ? 420 : 610));
    }

    if (countdownRunRef.current !== runId) return;
    const game = engineRef.current;
    game.lastFrame = performance.now();
    changePhase("playing");
  }, [changePhase, resetGame]);

  const submitScore = useCallback(async (finalScore: number, survivalMs: number) => {
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: playerName.trim(),
          phoneNumber,
          score: finalScore,
          survivalMs,
        }),
      });
      const result = await response.json() as { entries?: LeaderboardEntry[]; submittedId?: string; submittedRank?: number };
      if (!response.ok || !result.entries) throw new Error("Score submission failed");
      setLeaderboard(result.entries);
      setSubmittedId(result.submittedId ?? "");
      setSubmittedRank(result.submittedRank ?? 1);
      setSubmissionState("saved");
    } catch {
      setSubmissionState("local");
    }
  }, [phoneNumber, playerName]);

  const finishGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const game = engineRef.current;
    const finalScore = Math.floor(game.score);
    const beatBest = finalScore > game.best;
    if (beatBest) {
      game.best = finalScore;
      window.localStorage.setItem(BEST_SCORE_KEY, String(finalScore));
      setBest(finalScore);
    }
    setScore(finalScore);
    setLeaderboard([]);
    setSubmittedId("");
    setSubmittedRank(1);
    setSubmissionState("saving");
    changePhase("over");
    void submitScore(finalScore, Math.floor(game.elapsed * 1000));
  }, [changePhase, submitScore]);

  useEffect(() => {
    finishRef.current = finishGame;
  }, [finishGame]);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(BEST_SCORE_KEY) || 0);
    engineRef.current.best = saved;
    const frame = window.requestAnimationFrame(() => setBest(saved));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const game = engineRef.current;
    const resize = () => {
      const rect = shell.getBoundingClientRect();
      const previousWidth = game.width;
      const previousHeight = game.height;
      game.dpr = Math.min(window.devicePixelRatio || 1, 2);
      game.width = rect.width;
      game.height = rect.height;
      canvas.width = Math.round(rect.width * game.dpr);
      canvas.height = Math.round(rect.height * game.dpr);
      context.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
      if (!previousWidth || !previousHeight || phaseRef.current !== "playing") {
        resetPlayer();
      } else {
        const xRatio = game.width / previousWidth;
        const yRatio = game.height / previousHeight;
        game.player.x *= xRatio;
        game.player.targetX *= xRatio;
        game.player.y *= yRatio;
        game.player.targetY *= yRatio;
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);
    resize();

    let animationFrame = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.034, Math.max(0, (now - game.lastFrame) / 1000 || 0));
      game.lastFrame = now;
      if (phaseRef.current === "playing") updateGame(game, dt, finishRef.current);
      drawGame(context, game, phaseRef.current);
      if (phaseRef.current === "playing" && game.elapsed - game.lastHudUpdate >= 0.1) {
        game.lastHudUpdate = game.elapsed;
        setScore(Math.floor(game.score));
        const powers: Array<{ type: PowerType; remaining: number }> = [];
        if (game.chillUntil > game.elapsed) powers.push({ type: "chill", remaining: Math.ceil(game.chillUntil - game.elapsed) });
        if (game.shieldUntil > game.elapsed) powers.push({ type: "shield", remaining: Math.ceil(game.shieldUntil - game.elapsed) });
        if (game.sprinkleUntil > game.elapsed) powers.push({ type: "sprinkle", remaining: Math.ceil(game.sprinkleUntil - game.elapsed) });
        setActivePowers(powers);
      }
      animationFrame = requestAnimationFrame(loop);
    };
    game.lastFrame = performance.now();
    animationFrame = requestAnimationFrame(loop);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [resetPlayer]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = normalizeGameKey(event);
      if (!key) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"].includes(key)) {
        event.preventDefault();
        engineRef.current.keys.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = normalizeGameKey(event);
      if (key) engineRef.current.keys.delete(key);
    };
    const onVisibilityChange = () => {
      if (document.hidden && phaseRef.current === "playing") finishRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const setPointerTarget = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const game = engineRef.current;
    game.player.targetX = clientX - rect.left;
    game.player.targetY = clientY - rect.top;
  };

  const playing = phase === "playing";

  const handleRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = playerName.trim();
    const digits = phoneNumber.replace(/\D/g, "");
    if (!name) {
      setRegistrationError("Enter your name to play.");
      return;
    }
    if (digits.length < 7 || digits.length > 15) {
      setRegistrationError("Enter a valid phone number.");
      return;
    }
    setRegistrationError("");
    void startGame();
  };

  return (
    <main ref={shellRef} className={`${styles.shell} ${playing ? styles.playing : ""}`}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Save the Scoop game area"
        onPointerDown={(event) => {
          if (phaseRef.current !== "playing") return;
          engineRef.current.dragging = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setPointerTarget(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (phaseRef.current === "playing" && engineRef.current.dragging) {
            setPointerTarget(event.clientX, event.clientY);
          }
        }}
        onPointerUp={() => { engineRef.current.dragging = false; }}
        onPointerCancel={() => { engineRef.current.dragging = false; }}
      />

      <header className={styles.hud} aria-label="Game score">
        <div className={styles.scoreCard}><span>Score</span><strong>{formatScore(score)}</strong></div>
        <SaveTheScoopLogo compact />
        <div className={styles.scoreCard}><span>Device best</span><strong>{formatScore(best)}</strong></div>
      </header>

      <div className={styles.powerBar} aria-live="polite">
        {activePowers.map((power) => (
          <div className={styles.powerChip} key={power.type}>{powerName(power.type)} · {power.remaining}s</div>
        ))}
      </div>

      <section className={`${styles.screen} ${phase === "intro" ? styles.visible : ""}`}>
        <SaveTheScoopLogo />
        <p className={styles.intro}>Drag the gelato away from the heat. One hit ends the run, and the game keeps getting harder.</p>
        <div className={styles.powerPreview} aria-label="Ten-second power-ups">
          <div><ChillIcon /><span>Chill</span><b>10s</b></div>
          <div><ShieldIcon /><span>Shield</span><b>10s</b></div>
          <div><SprinkleIcon /><span>2× score</span><b>10s</b></div>
        </div>
        <form className={styles.playerForm} onSubmit={handleRegistration}>
          <div className={styles.fields}>
            <label>
              <span>Name</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                maxLength={60}
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              <span>Phone number</span>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                maxLength={24}
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="e.g. +961 70 123 456"
                required
              />
            </label>
          </div>
          {registrationError && <p className={styles.formError} role="alert">{registrationError}</p>}
          <button className={styles.button} type="submit">Start game</button>
        </form>
      </section>

      <section className={`${styles.countdown} ${phase === "countdown" ? styles.visible : ""}`} aria-live="assertive">
        <p>Drag to move</p>
        <strong>{countdown}</strong>
      </section>

      <section className={`${styles.screen} ${styles.gameOver} ${phase === "over" ? styles.visible : ""}`}>
        <SaveTheScoopLogo />
        <h1>Game over</h1>
        <div className={styles.finalScore}>
          <span className={styles.scoreLabel}>Your score</span>
          <strong>{formatScore(score)}</strong>
          <span
            className={`${styles.rankBadge} ${submissionState === "saving" ? styles.rankPending : ""}`}
            aria-busy={submissionState === "saving"}
            aria-live="polite"
          >
            {submissionState === "saving" && "Rank: —"}
            {submissionState === "saved" && `Rank: #${submittedRank}`}
            {submissionState === "local" && "Rank: unavailable"}
          </span>
        </div>
        {submissionState === "saved" && (
          <div className={styles.leaderboardSection}>
            <h2 className={styles.leaderboardTitle}>Today&apos;s leaderboard</h2>
            <div className={styles.leaderboard} aria-label="Today's leaderboard">
              <div className={styles.leaderboardHead}><span>Rank</span><span>Player</span><span>Score</span></div>
              <ol>
                {leaderboard.map((entry, index) => (
                  <li className={entry.id === submittedId ? styles.currentPlayer : ""} key={entry.id}>
                    <span>{index + 1}</span>
                    <strong>{entry.display_name}</strong>
                    <b>{formatScore(entry.score)}</b>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
        {submissionState === "local" && (
          <p className={styles.resultError} role="alert">Leaderboard unavailable. Please try again.</p>
        )}
        <button className={styles.button} onClick={startGame}>Play again</button>
      </section>

    </main>
  );
}

function updateGame(game: Engine, dt: number, finish: () => void) {
  game.elapsed += dt;
  const difficulty = difficultyAt(game.elapsed);
  const multiplier = game.sprinkleUntil > game.elapsed ? 2 : 1;
  game.score += dt * (30 + difficulty.level * 1.5) * multiplier;
  game.hazardTimer -= dt;
  game.powerTimer -= dt;
  game.shieldHitCooldown = Math.max(0, game.shieldHitCooldown - dt);

  if (game.hazardTimer <= 0) {
    const count = Math.random() < difficulty.burstChance ? (game.elapsed > 105 && Math.random() < 0.35 ? 3 : 2) : 1;
    for (let i = 0; i < count; i += 1) spawnHazard(game, difficulty.speed, i, count);
    game.hazardTimer += difficulty.spawnInterval * random(0.84, 1.14);
  }

  if (game.powerTimer <= 0) {
    spawnPowerUp(game);
    game.powerTimer += random(12, 15.5);
  }

  const keySpeed = 300 + Math.min(80, game.elapsed);
  if (game.keys.has("ArrowLeft") || game.keys.has("a")) game.player.targetX -= keySpeed * dt;
  if (game.keys.has("ArrowRight") || game.keys.has("d")) game.player.targetX += keySpeed * dt;
  if (game.keys.has("ArrowUp") || game.keys.has("w")) game.player.targetY -= keySpeed * dt;
  if (game.keys.has("ArrowDown") || game.keys.has("s")) game.player.targetY += keySpeed * dt;

  game.player.targetX = Math.max(game.player.radius, Math.min(game.width - game.player.radius, game.player.targetX));
  game.player.targetY = Math.max(116, Math.min(game.height - 34, game.player.targetY));
  game.player.x += (game.player.targetX - game.player.x) * Math.min(1, dt * 16);
  game.player.y += (game.player.targetY - game.player.y) * Math.min(1, dt * 16);

  game.trails.unshift({ x: game.player.x, y: game.player.y, life: 1 });
  if (game.trails.length > 15) game.trails.pop();
  game.trails.forEach((trail) => { trail.life -= dt * 4.6; });

  const speedScale = game.chillUntil > game.elapsed ? 0.48 : 1;
  for (let i = game.hazards.length - 1; i >= 0; i -= 1) {
    const hazard = game.hazards[i];
    hazard.y += hazard.speed * speedScale * dt;
    hazard.x += (hazard.drift + Math.sin(game.elapsed * 3 + hazard.phase) * (hazard.kind === "orb" ? 48 : 17)) * dt;
    hazard.rotation += hazard.spin * dt;
    if (collides(game.player, hazard, 7)) {
      if (game.shieldUntil > game.elapsed) {
        if (game.shieldHitCooldown <= 0) {
          burst(game, hazard.x, hazard.y, ["#4a1f12", "#f6b92d", "#f26a21"], 22);
          game.shieldHitCooldown = 0.18;
        }
        game.hazards.splice(i, 1);
        game.score += 12 * multiplier;
      } else {
        burst(game, hazard.x, hazard.y, ["#f6b92d", "#4a1f12", "#f26a21"], 30);
        game.shakeUntil = game.elapsed + 0.34;
        finish();
        return;
      }
    } else if (hazard.y - hazard.radius > game.height || hazard.x < -80 || hazard.x > game.width + 80) {
      game.hazards.splice(i, 1);
      game.score += 5 * multiplier;
    }
  }

  for (let i = game.powerUps.length - 1; i >= 0; i -= 1) {
    const power = game.powerUps[i];
    power.y += power.speed * dt;
    power.x += Math.sin(game.elapsed * 3 + power.phase) * 25 * dt;
    if (collides(game.player, power, 4)) {
      const expires = game.elapsed + POWER_DURATION;
      if (power.type === "chill") game.chillUntil = expires;
      if (power.type === "shield") game.shieldUntil = expires;
      if (power.type === "sprinkle") game.sprinkleUntil = expires;
      burst(game, power.x, power.y, power.type === "sprinkle" ? ["#f04f78", "#f6b92d", "#4a1f12", "#fff4d9"] : ["#4a1f12", "#fff4d9", "#f04f78"], 26);
      game.powerUps.splice(i, 1);
      game.score += 45 * multiplier;
    } else if (power.y - power.radius > game.height) {
      game.powerUps.splice(i, 1);
    }
  }

  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const particle = game.particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.97;
    particle.vy = particle.vy * 0.97 + 55 * dt;
    particle.life -= dt;
    if (particle.life <= 0) game.particles.splice(i, 1);
  }
}

function spawnHazard(game: Engine, baseSpeed: number, index: number, count: number) {
  const radius = random(14, 23);
  const segment = game.width / count;
  game.hazards.push({
    x: count === 1 ? random(radius + 8, game.width - radius - 8) : segment * index + random(radius + 8, segment - radius - 8),
    y: -radius - random(8, 70),
    radius,
    speed: baseSpeed * random(0.83, 1.18),
    drift: random(-45, 45),
    phase: Math.random() * Math.PI * 2,
    rotation: 0,
    spin: random(-2.6, 2.6),
    kind: game.elapsed > 28 && Math.random() < Math.min(0.42, game.elapsed / 260) ? "orb" : "drop",
  });
}

function spawnPowerUp(game: Engine) {
  const types: PowerType[] = ["chill", "shield", "sprinkle"];
  game.powerUps.push({
    type: types[Math.floor(Math.random() * types.length)],
    x: random(42, game.width - 42),
    y: -34,
    radius: 19,
    speed: 110 + Math.min(55, game.elapsed * 0.4),
    phase: Math.random() * Math.PI * 2,
  });
}

function burst(game: Engine, x: number, y: number, colors: string[], count: number) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = random(45, 185);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: random(0.42, 0.86),
      maxLife: 0.86,
      size: random(2, 6),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function drawGame(context: CanvasRenderingContext2D, game: Engine, phase: Phase) {
  context.clearRect(0, 0, game.width, game.height);
  if (!["playing", "over"].includes(phase)) return;
  context.save();
  if (game.elapsed < game.shakeUntil) context.translate(random(-5, 5), random(-5, 5));
  drawTrail(context, game);
  game.powerUps.forEach((power) => drawPowerUp(context, power, game.elapsed));
  game.hazards.forEach((hazard) => drawHazard(context, hazard));
  drawParticles(context, game);
  drawPlayer(context, game);
  context.restore();
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawTrail(context: CanvasRenderingContext2D, game: Engine) {
  game.trails.forEach((trail, index) => {
    if (trail.life <= 0) return;
    context.save();
    context.globalAlpha = Math.max(0, trail.life) * (0.25 - index * 0.011);
    context.fillStyle = index % 2 ? "#f6b92d" : "#f04f78";
    context.beginPath();
    context.arc(trail.x, trail.y + 12, Math.max(3, 14 - index * 0.65), 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawPlayer(context: CanvasRenderingContext2D, game: Engine) {
  const player = game.player;
  context.save();
  context.translate(player.x, player.y + Math.sin(game.elapsed * 6) * 2);

  if (game.shieldUntil > game.elapsed) {
    context.strokeStyle = "#f04f78";
    context.fillStyle = "rgba(240,79,120,.08)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, 43 + Math.sin(game.elapsed * 5) * 2, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  // Waffle cone
  context.beginPath();
  context.moveTo(-19, 7);
  context.lineTo(19, 7);
  context.lineTo(0, 52);
  context.closePath();
  context.fillStyle = "#f6b92d";
  context.strokeStyle = "#4a1f12";
  context.lineWidth = 2.5;
  context.fill();
  context.stroke();
  context.save();
  context.clip();
  context.strokeStyle = "#c9822d";
  context.lineWidth = 1.4;
  for (let offset = -42; offset <= 42; offset += 10) {
    context.beginPath();
    context.moveTo(offset - 20, 2);
    context.lineTo(offset + 20, 56);
    context.stroke();
    context.beginPath();
    context.moveTo(offset + 20, 2);
    context.lineTo(offset - 20, 56);
    context.stroke();
  }
  context.restore();

  // Strawberry scoop with a melting lower edge
  context.beginPath();
  context.moveTo(-28, 2);
  context.bezierCurveTo(-29, -10, -21, -19, -12, -20);
  context.bezierCurveTo(-8, -31, 7, -35, 14, -23);
  context.bezierCurveTo(25, -21, 31, -11, 28, 2);
  context.bezierCurveTo(27, 10, 20, 13, 14, 11);
  context.bezierCurveTo(10, 10, 10, 19, 4, 18);
  context.bezierCurveTo(-3, 18, 0, 10, -7, 11);
  context.bezierCurveTo(-16, 15, -27, 11, -28, 2);
  context.closePath();
  context.fillStyle = "#f04f78";
  context.strokeStyle = "#4a1f12";
  context.lineWidth = 2.5;
  context.fill();
  context.stroke();

  // Vanilla ribbon gives the scoop the same two-flavour treatment as the logo.
  context.beginPath();
  context.moveTo(-19, -12);
  context.bezierCurveTo(-13, -25, 3, -30, 12, -21);
  context.bezierCurveTo(4, -19, 1, -12, 5, -7);
  context.bezierCurveTo(-3, -10, -11, -7, -17, -2);
  context.bezierCurveTo(-21, -4, -22, -8, -19, -12);
  context.closePath();
  context.fillStyle = "#fff4d9";
  context.strokeStyle = "#4a1f12";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
  context.restore();
}

function drawHazard(context: CanvasRenderingContext2D, hazard: Hazard) {
  context.save();
  context.translate(hazard.x, hazard.y);
  context.strokeStyle = "#4a1f12";
  context.lineWidth = 2.2;
  if (hazard.kind === "drop") {
    // Upright flame silhouette with a separate inner flame.
    context.beginPath();
    context.moveTo(0, -hazard.radius * 1.55);
    context.bezierCurveTo(hazard.radius * 0.12, -hazard.radius, hazard.radius * 0.82, -hazard.radius * 0.72, hazard.radius * 0.55, -hazard.radius * 0.05);
    context.bezierCurveTo(hazard.radius * 1.02, hazard.radius * 0.18, hazard.radius * 0.94, hazard.radius * 0.82, hazard.radius * 0.42, hazard.radius * 1.1);
    context.bezierCurveTo(hazard.radius * 0.08, hazard.radius * 1.3, -hazard.radius * 0.5, hazard.radius * 1.18, -hazard.radius * 0.72, hazard.radius * 0.76);
    context.bezierCurveTo(-hazard.radius * 1.02, hazard.radius * 0.18, -hazard.radius * 0.52, -hazard.radius * 0.08, -hazard.radius * 0.55, -hazard.radius * 0.62);
    context.bezierCurveTo(-hazard.radius * 0.22, -hazard.radius * 0.42, -hazard.radius * 0.12, -hazard.radius * 0.82, 0, -hazard.radius * 1.55);
    context.closePath();
    context.fillStyle = "#f26a21";
    context.fill();
    context.stroke();

    context.beginPath();
    context.moveTo(hazard.radius * 0.1, -hazard.radius * 0.62);
    context.bezierCurveTo(hazard.radius * 0.45, -hazard.radius * 0.18, hazard.radius * 0.55, hazard.radius * 0.38, hazard.radius * 0.25, hazard.radius * 0.72);
    context.bezierCurveTo(-hazard.radius * 0.04, hazard.radius, -hazard.radius * 0.46, hazard.radius * 0.72, -hazard.radius * 0.4, hazard.radius * 0.3);
    context.bezierCurveTo(-hazard.radius * 0.34, -hazard.radius * 0.02, -hazard.radius * 0.04, -hazard.radius * 0.2, hazard.radius * 0.1, -hazard.radius * 0.62);
    context.closePath();
    context.fillStyle = "#f6b92d";
    context.fill();
    context.stroke();
  } else {
    context.rotate(hazard.rotation);
    context.fillStyle = "#f6b92d";
    context.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      const radius = i % 2 ? hazard.radius * 0.7 : hazard.radius * 1.2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(0, 0, hazard.radius * 0.38, 0, Math.PI * 2);
    context.fillStyle = "#f26a21";
    context.fill();
    context.stroke();
    context.strokeStyle = "#4a1f12";
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(0, -hazard.radius * 0.2);
    context.lineTo(0, hazard.radius * 0.08);
    context.stroke();
    context.beginPath();
    context.arc(0, hazard.radius * 0.23, 1.7, 0, Math.PI * 2);
    context.fillStyle = "#4a1f12";
    context.fill();
  }
  context.restore();
}

function drawPowerUp(context: CanvasRenderingContext2D, power: PowerUp, elapsed: number) {
  context.save();
  context.translate(power.x, power.y);
  context.rotate(Math.sin(elapsed * 3 + power.phase) * 0.14);
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#4a1f12";
  context.lineWidth = 2;
  roundedRect(context, -23, -23, 46, 46, 6);
  context.fill();
  context.stroke();
  context.strokeStyle = "#4a1f12";
  context.fillStyle = "#4a1f12";
  context.lineWidth = 2.4;
  if (power.type === "chill") {
    context.fillStyle = "#fff4d9";
    context.beginPath();
    context.moveTo(-16, 9);
    context.quadraticCurveTo(-10, 3, -2, 5);
    context.lineTo(7, 7);
    context.quadraticCurveTo(9, -5, 15, -5);
    context.quadraticCurveTo(20, -4, 18, 3);
    context.quadraticCurveTo(15, 11, 3, 11);
    context.lineTo(-14, 11);
    context.quadraticCurveTo(-19, 11, -16, 9);
    context.closePath();
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(-4, -1, 9, 0, Math.PI * 2);
    context.fillStyle = "#f6b92d";
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(-4, -1, 4, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(12, -4); context.lineTo(13, -10);
    context.moveTo(16, -3); context.lineTo(19, -8);
    context.stroke();
    context.beginPath();
    context.arc(13, -11, 1.2, 0, Math.PI * 2);
    context.arc(20, -9, 1.2, 0, Math.PI * 2);
    context.fillStyle = "#4a1f12";
    context.fill();
  } else if (power.type === "shield") {
    context.beginPath();
    context.moveTo(0, -13); context.lineTo(12, -8); context.lineTo(9, 7); context.quadraticCurveTo(0, 17, -9, 7); context.lineTo(-12, -8); context.closePath(); context.stroke();
  } else {
    const colors = ["#f04f78", "#f6b92d", "#4a1f12", "#fff4d9"];
    for (let i = 0; i < 7; i += 1) {
      context.save(); context.rotate((Math.PI * 2 * i) / 7); context.fillStyle = colors[i % colors.length]; roundedRect(context, 6, -2, 10, 4, 2); context.fill(); context.restore();
    }
    context.fillStyle = "#4a1f12";
    context.font = "900 12px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("2×", 0, 0);
  }
  context.restore();
}

function drawParticles(context: CanvasRenderingContext2D, game: Engine) {
  game.particles.forEach((particle) => {
    context.save();
    context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}
