"use client";

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Point = { x: number; y: number };
type Direction = Point;
type FoodType = "simit" | "doner" | "baklava" | "cay" | "ayran" | "kahve";
type TrafficState = "none" | "red" | "green";
type GamePhase = "ready" | "running" | "game_over";
type ToneKey = "eat" | "boost" | "danger" | "dead" | "fortune" | "start";

type Food = Point & { type: FoodType };
type GameState = {
  phase: GamePhase;
  bestScore: number;
  snake: Point[];
  direction: Direction;
  pendingDirection: Direction;
  food: Food;
  nazar: Point | null;
  score: number;
  lastStepAt: number;
  nowMs: number;
  speedBoostUntil: number;
  slowUntil: number;
  reverseUntil: number;
  freezeUntil: number;
  teaStreak: number;
  trafficState: TrafficState;
  trafficUntil: number;
  nextTrafficAt: number;
  nextNazarAt: number;
  gameOverLine: string;
  voiceLine: string;
  eventId: number;
  eventTone: ToneKey | null;
};

const GRID_COLS = 22;
const GRID_ROWS = 14;
const CELL_SIZE = 18;
const BOARD_WIDTH = GRID_COLS * CELL_SIZE;
const BOARD_HEIGHT = GRID_ROWS * CELL_SIZE;
const BEST_SCORE_KEY = "snake_doner_best_score_v1";
const GROUND_DARK = "#122832";
const GROUND_MID = "#183544";
const GROUND_LINE = "rgba(109, 240, 194, 0.12)";
const SNAKE_DARK = "#572513";
const SNAKE_MID = "#b95a28";
const SNAKE_LIGHT = "#f4ad5c";
const SNAKE_HOT = "#ffd990";

const FOOD_META: Record<
  FoodType,
  { label: string; score: number; grow: number; hint: string }
> = {
  simit: {
    label: "Simit",
    score: 8,
    grow: 1,
    hint: "Susam etkisi: kisa sure hizlanma.",
  },
  doner: {
    label: "Doner",
    score: 12,
    grow: 2,
    hint: "Ekmek arasi mi olsun? Yilan uzar.",
  },
  baklava: {
    label: "Baklava",
    score: 16,
    grow: 1,
    hint: "Serbet komasi: kisa sure yavaslama.",
  },
  cay: {
    label: "Cay",
    score: 7,
    grow: 1,
    hint: "Kafein patlamasi: hizlanma (5'te mola).",
  },
  ayran: {
    label: "Ayran",
    score: 9,
    grow: 1,
    hint: "Kopuk soku: kontroller kisa sure ters.",
  },
  kahve: {
    label: "Turk Kahvesi",
    score: 10,
    grow: 1,
    hint: "Fal bonusu: rastgele yorum.",
  },
};

const FOOD_POOL: FoodType[] = [
  "simit",
  "simit",
  "simit",
  "doner",
  "doner",
  "baklava",
  "cay",
  "cay",
  "ayran",
  "kahve",
];

const EAT_LINES = [
  "Afiyet olsun abi.",
  "Eline saglik.",
  "Bir cay daha?",
  "Cok iyi gidiyorsun.",
];

const DEATH_LINES = [
  "Of be abi yine mi?",
  "Yandi gulum keten helva.",
  "Hayat devam ediyor.",
  "Duvara girdin, canin sag olsun.",
];

const FORTUNE_LINES = [
  "Fal: kismetin aciliyor.",
  "Fal: dikkat, trafikte yavasla.",
  "Fal: bugun sans senden yana.",
  "Fal: sabirli olursan skor patlar.",
];

const DIRECTIONS: Record<"up" | "down" | "left" | "right", Direction> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(values: T[]): T {
  return values[randomInt(0, values.length - 1)];
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function makeBlockedKey(point: Point): string {
  return `${point.x}:${point.y}`;
}

function randomCell(excluded: Set<string>): Point {
  const maxCells = GRID_COLS * GRID_ROWS;
  for (let i = 0; i < maxCells * 2; i += 1) {
    const point = {
      x: randomInt(0, GRID_COLS - 1),
      y: randomInt(0, GRID_ROWS - 1),
    };
    if (!excluded.has(makeBlockedKey(point))) {
      return point;
    }
  }

  for (let y = 0; y < GRID_ROWS; y += 1) {
    for (let x = 0; x < GRID_COLS; x += 1) {
      const point = { x, y };
      if (!excluded.has(makeBlockedKey(point))) {
        return point;
      }
    }
  }

  return { x: 0, y: 0 };
}

function pickFoodType(): FoodType {
  return randomFrom(FOOD_POOL);
}

function getSpeedMs(state: GameState, now: number): number {
  let speed = 138;
  if (now < state.speedBoostUntil) {
    speed -= 28;
  }
  if (now < state.slowUntil) {
    speed += 36;
  }
  if (state.trafficState === "green" && now < state.trafficUntil) {
    speed -= 18;
  }
  return Math.max(70, Math.min(240, speed));
}

function drawFood(ctx: CanvasRenderingContext2D, food: Food) {
  const px = food.x * CELL_SIZE;
  const py = food.y * CELL_SIZE;
  const c = CELL_SIZE;

  if (food.type === "simit") {
    ctx.fillStyle = "#412014";
    ctx.fillRect(px + 1, py + 1, c - 2, c - 2);
    ctx.fillStyle = "#ce7f2a";
    ctx.fillRect(px + 3, py + 3, c - 6, c - 6);
    ctx.fillStyle = "#7b3c1f";
    ctx.fillRect(px + 6, py + 6, c - 12, c - 12);
    ctx.fillStyle = "#f0cb8e";
    ctx.fillRect(px + 4, py + 4, c - 8, 2);
    return;
  }

  if (food.type === "doner") {
    ctx.fillStyle = "#3f2216";
    ctx.fillRect(px + 2, py + 1, c - 4, c - 2);
    ctx.fillStyle = "#8e4d2b";
    ctx.fillRect(px + 3, py + 2, c - 6, c - 4);
    ctx.fillStyle = "#cb7a36";
    ctx.fillRect(px + 5, py + 4, c - 10, c - 8);
    ctx.fillStyle = "#6a341e";
    ctx.fillRect(px + 8, py + 2, 2, c - 4);
    return;
  }

  if (food.type === "baklava") {
    ctx.fillStyle = "#5d4c20";
    ctx.fillRect(px + 2, py + 2, c - 4, c - 4);
    ctx.fillStyle = "#c8a448";
    ctx.fillRect(px + 3, py + 3, c - 6, c - 6);
    ctx.fillStyle = "#f0d37f";
    ctx.fillRect(px + 5, py + 5, c - 10, c - 10);
    ctx.fillStyle = "#6f5d24";
    ctx.fillRect(px + 8, py + 2, 2, c - 4);
    ctx.fillRect(px + 2, py + 8, c - 4, 2);
    return;
  }

  if (food.type === "cay") {
    ctx.fillStyle = "#3d4852";
    ctx.fillRect(px + 4, py + 1, c - 8, c - 2);
    ctx.fillStyle = "#b01f1f";
    ctx.fillRect(px + 5, py + 4, c - 10, c - 6);
    ctx.fillStyle = "#d8ecf2";
    ctx.fillRect(px + 4, py + 2, c - 8, 2);
    ctx.fillRect(px + 4, py + c - 3, c - 8, 2);
    return;
  }

  if (food.type === "ayran") {
    ctx.fillStyle = "#5f7683";
    ctx.fillRect(px + 3, py + 3, c - 6, c - 4);
    ctx.fillStyle = "#dfeef3";
    ctx.fillRect(px + 4, py + 4, c - 8, c - 6);
    ctx.fillStyle = "#98b9c8";
    ctx.fillRect(px + 5, py + 3, c - 10, 2);
    ctx.fillRect(px + 5, py + c - 3, c - 10, 2);
    return;
  }

  ctx.fillStyle = "#2f1d14";
  ctx.fillRect(px + 3, py + 3, c - 6, c - 5);
  ctx.fillStyle = "#5b3524";
  ctx.fillRect(px + 4, py + 4, c - 8, c - 6);
  ctx.fillStyle = "#9c6a4a";
  ctx.fillRect(px + 5, py + 3, c - 10, 2);
  ctx.fillStyle = "#f0dfcb";
  ctx.fillRect(px + 6, py + 6, c - 12, 2);
}

function drawNazar(ctx: CanvasRenderingContext2D, point: Point) {
  const px = point.x * CELL_SIZE;
  const py = point.y * CELL_SIZE;
  const c = CELL_SIZE;
  ctx.fillStyle = "#0b2a63";
  ctx.fillRect(px + 1, py + 1, c - 2, c - 2);
  ctx.fillStyle = "#123f91";
  ctx.fillRect(px + 3, py + 3, c - 6, c - 6);
  ctx.fillStyle = "#e4f2ff";
  ctx.fillRect(px + 6, py + 6, c - 12, c - 12);
  ctx.fillStyle = "#1e58c2";
  ctx.fillRect(px + 8, py + 8, c - 16, c - 16);
}

function drawSnake(ctx: CanvasRenderingContext2D, snake: Point[], direction: Direction) {
  snake.forEach((segment, index) => {
    const px = segment.x * CELL_SIZE;
    const py = segment.y * CELL_SIZE;
    const c = CELL_SIZE;
    const isHead = index === 0;
    const isTail = index === snake.length - 1;

    if (isHead) {
      ctx.fillStyle = "rgba(5, 10, 13, 0.22)";
      ctx.fillRect(px + 2, py + c - 2, c - 4, 2);

      ctx.fillStyle = SNAKE_DARK;
      ctx.fillRect(px + 1, py + 1, c - 2, c - 2);
      ctx.fillStyle = "#8e4f2b";
      ctx.fillRect(px + 2, py + 2, c - 4, c - 4);
      ctx.fillStyle = SNAKE_MID;
      ctx.fillRect(px + 4, py + 3, c - 8, c - 6);
      ctx.fillStyle = SNAKE_LIGHT;
      ctx.fillRect(px + 4, py + 3, c - 10, 2);
      ctx.fillStyle = SNAKE_HOT;
      ctx.fillRect(px + 5, py + 5, c - 12, 1);

      const eyeX =
        direction.x === 1 ? px + c - 6 : direction.x === -1 ? px + 4 : px + 7;
      const eyeY =
        direction.y === 1 ? py + c - 6 : direction.y === -1 ? py + 4 : py + 6;
      ctx.fillStyle = "#ffeab4";
      ctx.fillRect(eyeX, eyeY, 3, 3);
      ctx.fillStyle = "#2a170e";
      ctx.fillRect(eyeX + 1, eyeY + 1, 1, 1);

      ctx.fillStyle = "#dadada";
      if (direction.x === 1) {
        ctx.fillRect(px - 3, py + 6, 4, 5);
      } else if (direction.x === -1) {
        ctx.fillRect(px + c - 1, py + 6, 4, 5);
      } else if (direction.y === 1) {
        ctx.fillRect(px + 6, py - 3, 5, 4);
      } else {
        ctx.fillRect(px + 6, py + c - 1, 5, 4);
      }
      return;
    }

    ctx.fillStyle = "rgba(5, 10, 13, 0.2)";
    ctx.fillRect(px + 2, py + c - 2, c - 4, 2);

    ctx.fillStyle = SNAKE_DARK;
    ctx.fillRect(px + 1, py + 1, c - 2, c - 2);
    ctx.fillStyle = index % 2 === 0 ? SNAKE_MID : "#a85223";
    ctx.fillRect(px + 2, py + 2, c - 4, c - 4);
    ctx.fillStyle = "#6e3a1c";
    ctx.fillRect(px + 6, py + 2, 2, c - 4);
    ctx.fillRect(px + 10, py + 2, 2, c - 4);
    ctx.fillStyle = SNAKE_LIGHT;
    ctx.fillRect(px + 3, py + 2, c - 6, 2);
    ctx.fillStyle = SNAKE_HOT;
    ctx.fillRect(px + 4, py + 4, c - 10, 1);

    if (isTail) {
      ctx.fillStyle = "#f0d08a";
      ctx.fillRect(px + 5, py + c - 2, 5, 2);
      ctx.fillRect(px + 6, py + c, 2, 2);
      ctx.fillRect(px + 8, py + c + 1, 1, 2);
    }
  });
}

function readBestScoreFromStorage(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  const stored = window.localStorage.getItem(BEST_SCORE_KEY);
  if (!stored) {
    return 0;
  }
  const parsed = Number.parseInt(stored, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function createInitialGame(now = Date.now(), bestScore = 0): GameState {
  const snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  const blocked = new Set(snake.map(makeBlockedKey));
  const firstFoodPoint = randomCell(blocked);

  return {
    phase: "ready",
    bestScore,
    snake,
    direction: { ...DIRECTIONS.right },
    pendingDirection: { ...DIRECTIONS.right },
    food: { ...firstFoodPoint, type: pickFoodType() },
    nazar: null,
    score: 0,
    lastStepAt: now,
    nowMs: now,
    speedBoostUntil: 0,
    slowUntil: 0,
    reverseUntil: 0,
    freezeUntil: 0,
    teaStreak: 0,
    trafficState: "none",
    trafficUntil: 0,
    nextTrafficAt: now + randomInt(9000, 13000),
    nextNazarAt: now + randomInt(10000, 16000),
    gameOverLine: "",
    voiceLine: "Yilan doner hazir. Baslayalim.",
    eventId: 0,
    eventTone: null,
  };
}

export function SnakeDonerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const swipeStartRef = useRef<Point | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [game, setGame] = useState<GameState>(() =>
    createInitialGame(Date.now(), readBestScoreFromStorage())
  );

  const speedLabel = useMemo(() => {
    const speed = getSpeedMs(game, game.nowMs);
    if (speed <= 85) {
      return "Cok hizli";
    }
    if (speed <= 120) {
      return "Hizli";
    }
    if (speed <= 160) {
      return "Normal";
    }
    return "Yavas";
  }, [game]);

  const isReversed = game.nowMs < game.reverseUntil;
  const isFreeze = game.nowMs < game.freezeUntil;
  const trafficText =
    game.trafficState === "red"
      ? "Kirmizi isik: DUR"
      : game.trafficState === "green"
        ? "Yesil isik: Bas gaza"
        : "Trafik normal";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(BEST_SCORE_KEY, String(game.bestScore));
  }, [game.bestScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    for (let y = 0; y < GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLS; x += 1) {
        const laneBand = y % 4 === 1;
        const light = (x + y) % 2 === 0;
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        ctx.fillStyle = light ? GROUND_MID : GROUND_DARK;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        if (laneBand) {
          ctx.fillStyle = "rgba(255, 211, 115, 0.08)";
          ctx.fillRect(px, py + 2, CELL_SIZE, 1);
        }

        if (x % 5 === 0) {
          ctx.fillStyle = GROUND_LINE;
          ctx.fillRect(px, py, 1, CELL_SIZE);
        }
      }
    }

    ctx.fillStyle = "rgba(4, 9, 12, 0.18)";
    ctx.fillRect(0, 0, BOARD_WIDTH, 10);
    ctx.fillRect(0, BOARD_HEIGHT - 10, BOARD_WIDTH, 10);

    if (game.nazar) {
      drawNazar(ctx, game.nazar);
    }
    drawFood(ctx, game.food);
    drawSnake(ctx, game.snake, game.direction);

    if (game.trafficState === "red") {
      ctx.fillStyle = "rgba(150, 0, 0, 0.15)";
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    }
  }, [game]);

  const playTone = useCallback((tone: ToneKey | null) => {
    if (!tone || typeof window === "undefined") {
      return;
    }
    try {
      const context =
        audioContextRef.current ??
        new (window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)();
      audioContextRef.current = context;

      if (context.state === "suspended") {
        void context.resume();
      }

      const now = context.currentTime;
      const notes: Record<ToneKey, number[]> = {
        start: [240, 320],
        eat: [440],
        boost: [520, 680],
        danger: [210, 170],
        dead: [300, 220, 130],
        fortune: [390, 520, 690],
      };

      notes[tone].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "square";
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.0001;
        oscillator.connect(gain);
        gain.connect(context.destination);
        const startAt = now + index * 0.07;
        gain.gain.exponentialRampToValueAtTime(0.04, startAt + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.08);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.09);
      });
    } catch {
      // Audio unavailable; game keeps running without sound.
    }
  }, []);

  useEffect(() => {
    if (!game.eventId) {
      return;
    }
    playTone(game.eventTone);
  }, [game.eventId, game.eventTone, playTone]);

  const startNewRun = useCallback(() => {
    const now = Date.now();
    setGame((prev) => ({
      ...createInitialGame(now, prev.bestScore),
      phase: "running",
      eventId: prev.eventId + 1,
      eventTone: "start",
      voiceLine: "Afiyet olsun abi, basladik.",
    }));
  }, []);

  const queueTurn = useCallback((requested: Direction) => {
    setGame((prev) => {
      if (prev.phase === "game_over") {
        return prev;
      }
      const now = Date.now();
      const desired =
        now < prev.reverseUntil
          ? { x: -requested.x, y: -requested.y }
          : requested;
      if (
        desired.x === -prev.direction.x &&
        desired.y === -prev.direction.y
      ) {
        return prev;
      }
      return {
        ...prev,
        pendingDirection: desired,
      };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && game.phase !== "running") {
        event.preventDefault();
        startNewRun();
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "w") {
        event.preventDefault();
        queueTurn(DIRECTIONS.up);
      } else if (key === "arrowdown" || key === "s") {
        event.preventDefault();
        queueTurn(DIRECTIONS.down);
      } else if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        queueTurn(DIRECTIONS.left);
      } else if (key === "arrowright" || key === "d") {
        event.preventDefault();
        queueTurn(DIRECTIONS.right);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game.phase, queueTurn, startNewRun]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setGame((prev) => {
        const now = Date.now();
        let line: string | null = null;
        let tone: ToneKey | null = null;
        const applyEvent = (state: GameState) => {
          if (!line || !tone) {
            return state;
          }
          return {
            ...state,
            eventId: prev.eventId + 1,
            eventTone: tone,
            voiceLine: line,
          };
        };

        if (prev.phase !== "running") {
          return {
            ...prev,
            nowMs: now,
            eventTone: null,
          };
        }

        let next: GameState = {
          ...prev,
          nowMs: now,
          eventTone: null,
        };

        if (next.trafficState !== "none" && now >= next.trafficUntil) {
          next = {
            ...next,
            trafficState: "none",
            trafficUntil: 0,
            nextTrafficAt: now + randomInt(9000, 14000),
          };
        }

        if (next.trafficState === "none" && now >= next.nextTrafficAt) {
          const goesRed = Math.random() < 0.55;
          if (goesRed) {
            next = {
              ...next,
              trafficState: "red",
              trafficUntil: now + 2400,
              nextTrafficAt: now + randomInt(9000, 14000),
            };
            line = "Kirmizi isik. Dur!";
            tone = "danger";
          } else {
            next = {
              ...next,
              trafficState: "green",
              trafficUntil: now + 4200,
              nextTrafficAt: now + randomInt(9000, 14000),
            };
            line = "Yesil yandi. Bas gaza!";
            tone = "boost";
          }
        }

        if (!next.nazar && now >= next.nextNazarAt) {
          const blocked = new Set<string>(next.snake.map(makeBlockedKey));
          blocked.add(makeBlockedKey(next.food));
          next = {
            ...next,
            nazar: randomCell(blocked),
            nextNazarAt: now + randomInt(12000, 18000),
          };
        }

        if (next.trafficState === "red" && now < next.trafficUntil) {
          return applyEvent(next);
        }
        if (now < next.freezeUntil) {
          return applyEvent(next);
        }

        const speed = getSpeedMs(next, now);
        if (now - next.lastStepAt < speed) {
          return applyEvent(next);
        }

        const direction = next.pendingDirection;
        const head = next.snake[0];
        const newHead = { x: head.x + direction.x, y: head.y + direction.y };
        const outOfBounds =
          newHead.x < 0 ||
          newHead.y < 0 ||
          newHead.x >= GRID_COLS ||
          newHead.y >= GRID_ROWS;
        const hitSelf = next.snake.some((part) => samePoint(part, newHead));

        if (outOfBounds || hitSelf) {
          const overLine = randomFrom(DEATH_LINES);
          line = overLine;
          tone = "dead";
          return applyEvent({
            ...next,
            phase: "game_over",
            gameOverLine: overLine,
            bestScore: Math.max(next.bestScore, next.score),
          });
        }

        const snake = [newHead, ...next.snake];
        let score = next.score;
        let speedBoostUntil = next.speedBoostUntil;
        let slowUntil = next.slowUntil;
        let reverseUntil = next.reverseUntil;
        let freezeUntil = next.freezeUntil;
        let teaStreak = next.teaStreak;
        let food = next.food;
        let nazar = next.nazar;

        if (nazar && samePoint(newHead, nazar)) {
          speedBoostUntil = Math.max(speedBoostUntil, now + 3600);
          score += 4;
          nazar = null;
          line = "Nazar enerjisi. Hizlandin!";
          tone = "boost";
        }

        if (samePoint(newHead, next.food)) {
          const eaten = next.food.type;
          const meta = FOOD_META[eaten];
          score += meta.score;

          if (meta.grow > 1) {
            const tail = next.snake[next.snake.length - 1];
            for (let i = 1; i < meta.grow; i += 1) {
              snake.push({ ...tail });
            }
          }

          if (eaten === "simit") {
            speedBoostUntil = Math.max(speedBoostUntil, now + 4200);
            line = "Simit etkisi. Hizlandin.";
            tone = "boost";
            teaStreak = 0;
          } else if (eaten === "doner") {
            line = "Ekmek arasi mi olsun?";
            tone = "eat";
            teaStreak = 0;
          } else if (eaten === "baklava") {
            slowUntil = Math.max(slowUntil, now + 5200);
            line = "Serbet komasi. Biraz yavas.";
            tone = "eat";
            teaStreak = 0;
          } else if (eaten === "cay") {
            speedBoostUntil = Math.max(speedBoostUntil, now + 3000);
            teaStreak += 1;
            line = "Cay geldi. Kafein patlamasi.";
            tone = "boost";
            if (teaStreak >= 5) {
              teaStreak = 0;
              freezeUntil = now + 3000;
              line = "5 cay oldu. Zorunlu cay molasi (3 sn).";
              tone = "danger";
            }
          } else if (eaten === "ayran") {
            reverseUntil = now + 4200;
            line = "Kopuk soku. Kontroller ters!";
            tone = "danger";
            teaStreak = 0;
          } else if (eaten === "kahve") {
            line = randomFrom(FORTUNE_LINES);
            tone = "fortune";
            teaStreak = 0;
          } else {
            line = randomFrom(EAT_LINES);
            tone = "eat";
            teaStreak = 0;
          }

          const blocked = new Set<string>(snake.map(makeBlockedKey));
          if (nazar) {
            blocked.add(makeBlockedKey(nazar));
          }
          const nextFoodCell = randomCell(blocked);
          food = {
            ...nextFoodCell,
            type: pickFoodType(),
          };
        } else {
          snake.pop();
        }

        next = {
          ...next,
          snake,
          direction,
          pendingDirection: direction,
          food,
          nazar,
          score,
          bestScore: Math.max(next.bestScore, score),
          speedBoostUntil,
          slowUntil,
          reverseUntil,
          freezeUntil,
          teaStreak,
          lastStepAt: now,
        };

        return applyEvent(next);
      });
    }, 60);

    return () => window.clearInterval(intervalId);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 20) {
      return;
    }

    if (absX > absY) {
      queueTurn(dx > 0 ? DIRECTIONS.right : DIRECTIONS.left);
      return;
    }
    queueTurn(dy > 0 ? DIRECTIONS.down : DIRECTIONS.up);
  };

  const statusPills = [
    { label: speedLabel, active: true },
    { label: isReversed ? "Kontroller ters" : "Kontroller normal", active: isReversed },
    { label: isFreeze ? "Cay molasi (durdu)" : "Akis serbest", active: isFreeze },
  ];

  return (
    <article className="soft-card snake-shell">
      <h2>Yilan Doner</h2>
      <p className="snake-subline">
        Masaustunde ok/WASD, telefonda swipe ile oyna. Duvar var, trafik var.
      </p>

      <section className="snake-stats">
        <span className="stats-pill">
          Skor: <strong>{game.score}</strong>
        </span>
        <span className="stats-pill">
          Rekor: <strong>{game.bestScore}</strong>
        </span>
        <span className={`stats-pill ${game.trafficState !== "none" ? "active" : ""}`}>
          {trafficText}
        </span>
      </section>

      <p className="snake-line">{game.voiceLine}</p>

      <div className="snake-layout">
        <div className="snake-board-column">
          <div
            className="snake-board-wrap"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              className="snake-canvas"
            />

            {game.phase !== "running" ? (
              <div className="snake-overlay">
                <p>
                  {game.phase === "game_over"
                    ? game.gameOverLine || "Bu tur bitti."
                    : "Yilan doner hazir."}
                </p>
                <button type="button" className="action-btn" onClick={startNewRun}>
                  {game.phase === "game_over"
                    ? "Yenildin ama olsun, bir cay ic de devam et"
                    : "Oyunu Baslat"}
                </button>
              </div>
            ) : null}
          </div>

        </div>

        <aside className="snake-side">
          <h3>Yiyecek Etkileri</h3>
          <ul className="snake-legend">
            {(Object.keys(FOOD_META) as FoodType[]).map((foodType) => (
              <li key={foodType}>
                <strong>{FOOD_META[foodType].label}</strong>
                <span>{FOOD_META[foodType].hint}</span>
              </li>
            ))}
          </ul>

          <h3>Durum</h3>
          <div className="snake-status-grid">
            {statusPills.map((item) => (
              <span
                key={item.label}
                className={`snake-status-pill ${item.active ? "is-active" : ""}`}
              >
                {item.label}
              </span>
            ))}
          </div>

          <p className="meta-line">
            Bu surumde yiyecek efektleri, trafik isigi ve nazar aktif. Minibus ve
            vergi memuru sonraki turda eklenecek.
          </p>
        </aside>
      </div>
    </article>
  );
}
