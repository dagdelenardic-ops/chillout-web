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
type FoodType = "simit" | "doner" | "baklava" | "cay" | "ayran" | "kahve" | "raki";
type TrafficState = "none" | "red" | "green";
type GamePhase = "ready" | "running" | "game_over";
type ToneKey = "eat" | "boost" | "danger" | "dead" | "fortune" | "start";

type Food = Point & { type: FoodType };

type GameState = {
  phase: GamePhase;
  bestScore: number;
  snake: Point[];
  renderFromSnake: Point[];
  renderStartedAt: number;
  renderDurationMs: number;
  direction: Direction;
  pendingDirection: Direction;
  food: Food;
  nazar: Point | null;
  score: number;
  lastStepAt: number;
  nowMs: number;
  speedBoostUntil: number;
  slowUntil: number;
  freezeUntil: number;
  teaStreak: number;
  trafficState: TrafficState;
  trafficUntil: number;
  nextTrafficAt: number;
  nextNazarAt: number;
  drunkUntil: number;
  overlayKey: null | "ayran" | "raki";
  overlayUntil: number;
  gameOverLine: string;
  voiceLine: string;
  eventId: number;
  eventTone: ToneKey | null;
};

const GRID_COLS = 20;
const GRID_ROWS = 12;
const CELL_SIZE = 18;
const BOARD_WIDTH = GRID_COLS * CELL_SIZE;
const BOARD_HEIGHT = GRID_ROWS * CELL_SIZE;
// Supersample the canvas so the smooth (non-pixelated) snake stays crisp
// when the board is upscaled to fill its column.
const RENDER_SCALE = 2;
const BEST_SCORE_KEY = "snake_doner_best_score_v1";

const FOOD_META: Record<
  FoodType,
  { label: string; score: number; grow: number; hint: string }
> = {
  simit: {
    label: "Simit",
    score: 8,
    grow: 1,
    hint: "Susam etkisi: kısa süre hızlanma.",
  },
  doner: {
    label: "Döner",
    score: 12,
    grow: 2,
    hint: "Ekmek arası mı olsun? Yılan uzar.",
  },
  baklava: {
    label: "Baklava",
    score: 16,
    grow: 1,
    hint: "Şerbet koması: kısa süre yavaşlama.",
  },
  cay: {
    label: "Çay",
    score: 7,
    grow: 1,
    hint: "Kafein patlaması: hızlanma (5'te mola).",
  },
  ayran: {
    label: "Ayran",
    score: 9,
    grow: 1,
    hint: "Rehavet çöktü: 5 saniye yavaşlama.",
  },
  kahve: {
    label: "Türk Kahvesi",
    score: 10,
    grow: 1,
    hint: "Fal bonusu: rastgele yorum.",
  },
  raki: {
    label: "Rakı",
    score: 11,
    grow: 1,
    hint: "Çok sarhoşsun: 3 saniye geri geri.",
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
  "raki",
];

const EAT_LINES = [
  "Afiyet olsun abi.",
  "Eline sağlık.",
  "Bir çay daha?",
  "Çok iyi gidiyorsun.",
];

const DEATH_LINES = [
  "Of be abi yine mi?",
  "Yandı gülüm keten helva.",
  "Hayat devam ediyor.",
  "Kuyruğa çarptın. Canın sağ olsun.",
];

const FORTUNE_LINES = [
  "Fal: kısmetin açılıyor.",
  "Fal: dikkat, trafikte yavaşla.",
  "Fal: bugün şans senden yana.",
  "Fal: sabırlı olursan skor patlar.",
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
    speed -= 30;
  }
  if (now < state.slowUntil) {
    speed += 36;
  }
  if (state.trafficState === "green" && now < state.trafficUntil) {
    speed -= 20;
  }
  return Math.max(72, Math.min(235, speed));
}

function directionToAngle(direction: Direction): number {
  if (direction.x === 1) {
    return 0;
  }
  if (direction.x === -1) {
    return Math.PI;
  }
  if (direction.y === -1) {
    return -Math.PI / 2;
  }
  return Math.PI / 2;
}

function normalizeWrapDelta(delta: number): number {
  if (delta > 1) {
    return -1;
  }
  if (delta < -1) {
    return 1;
  }
  return delta;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Body half-width at a normalized position along the snake (0 = head, 1 = tail).
function bodyRadius(t: number): number {
  const neck = CELL_SIZE * 0.44;
  const tail = CELL_SIZE * 0.12;
  if (t < 0.12) {
    return lerp(CELL_SIZE * 0.4, neck, t / 0.12);
  }
  return lerp(neck, tail, (t - 0.12) / 0.88);
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const ground = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
  ground.addColorStop(0, "#13262f");
  ground.addColorStop(1, "#0b1820");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  ctx.strokeStyle = "rgba(109, 240, 194, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, BOARD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(BOARD_WIDTH, y * CELL_SIZE);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(
    BOARD_WIDTH / 2,
    BOARD_HEIGHT / 2,
    BOARD_HEIGHT * 0.3,
    BOARD_WIDTH / 2,
    BOARD_HEIGHT / 2,
    BOARD_HEIGHT * 0.78
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
}

// Nazar boncuğu: concentric evil-eye rings.
function drawNazar(ctx: CanvasRenderingContext2D, cellX: number, cellY: number) {
  const cx = cellX * CELL_SIZE + CELL_SIZE / 2;
  const cy = cellY * CELL_SIZE + CELL_SIZE / 2;
  const R = CELL_SIZE * 0.42;
  const rings: Array<[number, string]> = [
    [R, "#0b3d91"],
    [R * 0.72, "#f2f6ff"],
    [R * 0.48, "#1f8fd6"],
    [R * 0.24, "#06121f"],
  ];
  ctx.save();
  ctx.shadowColor = "rgba(31, 143, 214, 0.55)";
  ctx.shadowBlur = 8;
  rings.forEach(([r, color], idx) => {
    if (idx === 1) {
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(cx - R * 0.18, cy - R * 0.18, R * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Realistic smooth snake: a tapered, top-lit tube with scaled back markings,
// a forked flicking tongue and slit-pupil eyes. Drawn from the interpolated
// render positions (grid units, possibly fractional). Wrap jumps split the
// body so no line streaks across the board.
function drawSnake(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  headDir: Direction,
  nowMs: number,
  running: boolean
) {
  const n = points.length;
  if (n === 0) {
    return;
  }

  const px = points.map((p) => ({
    x: p.x * CELL_SIZE + CELL_SIZE / 2,
    y: p.y * CELL_SIZE + CELL_SIZE / 2,
  }));

  const chains: number[][] = [];
  let chain: number[] = [0];
  for (let i = 1; i < n; i += 1) {
    const a = px[i - 1];
    const b = px[i];
    if (Math.hypot(a.x - b.x, a.y - b.y) <= CELL_SIZE * 1.5) {
      chain.push(i);
    } else {
      chains.push(chain);
      chain = [i];
    }
  }
  chains.push(chain);

  const radiusForIndex = (i: number) => bodyRadius(n <= 1 ? 0 : i / (n - 1));

  type Stamp = { x: number; y: number; r: number };
  const stamps: Stamp[] = [];
  chains.forEach((c) => {
    if (c.length === 1) {
      const i = c[0];
      stamps.push({ x: px[i].x, y: px[i].y, r: radiusForIndex(i) });
      return;
    }
    for (let k = 0; k < c.length - 1; k += 1) {
      const iA = c[k];
      const iB = c[k + 1];
      const a = px[iA];
      const b = px[iB];
      const steps = 4;
      for (let s = 0; s < steps; s += 1) {
        const tt = s / steps;
        stamps.push({
          x: lerp(a.x, b.x, tt),
          y: lerp(a.y, b.y, tt),
          r: lerp(radiusForIndex(iA), radiusForIndex(iB), tt),
        });
      }
    }
    const last = c[c.length - 1];
    stamps.push({ x: px[last].x, y: px[last].y, r: radiusForIndex(last) });
  });

  // Soft contact shadow.
  ctx.save();
  ctx.fillStyle = "rgba(3, 8, 11, 0.28)";
  stamps.forEach((s) => {
    ctx.beginPath();
    ctx.arc(s.x, s.y + 2.4, s.r + 0.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Body base (vertical gradient: lit on top, darker below).
  const bodyGrad = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
  bodyGrad.addColorStop(0, "#2fa457");
  bodyGrad.addColorStop(1, "#15703a");
  ctx.fillStyle = bodyGrad;
  stamps.forEach((s) => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Top-lit core highlight to round the tube.
  ctx.fillStyle = "rgba(150, 230, 170, 0.45)";
  stamps.forEach((s) => {
    if (s.r < 2) {
      return;
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y - s.r * 0.32, s.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Back markings (dark ovals every couple of segments).
  ctx.fillStyle = "rgba(15, 79, 41, 0.82)";
  for (let i = 1; i < n - 1; i += 2) {
    const r = radiusForIndex(i);
    if (r < 3) {
      continue;
    }
    ctx.beginPath();
    ctx.ellipse(px[i].x, px[i].y, r * 0.42, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright dorsal hairline along each contiguous chain.
  ctx.strokeStyle = "rgba(214, 255, 198, 0.5)";
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  chains.forEach((c) => {
    if (c.length < 2) {
      return;
    }
    ctx.beginPath();
    c.forEach((i, idx) => {
      if (idx === 0) {
        ctx.moveTo(px[i].x, px[i].y);
      } else {
        ctx.lineTo(px[i].x, px[i].y);
      }
    });
    ctx.stroke();
  });

  // Head.
  const head = px[0];
  const angle = directionToAngle(headDir);
  const hr = bodyRadius(0) * 1.18;
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  if (running) {
    const flick = Math.sin(nowMs / 90);
    if (flick > 0) {
      const len = hr * (1.05 + flick * 0.5);
      ctx.strokeStyle = "#e8413f";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hr * 0.7, 0);
      ctx.lineTo(hr * 0.7 + len * 0.7, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hr * 0.7 + len * 0.7, 0);
      ctx.lineTo(hr * 0.7 + len, -hr * 0.28);
      ctx.moveTo(hr * 0.7 + len * 0.7, 0);
      ctx.lineTo(hr * 0.7 + len, hr * 0.28);
      ctx.stroke();
    }
  }

  const headGrad = ctx.createLinearGradient(0, -hr, 0, hr);
  headGrad.addColorStop(0, "#54c777");
  headGrad.addColorStop(1, "#1c7d42");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(hr * 0.1, 0, hr * 1.15, hr * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(160, 235, 180, 0.4)";
  ctx.beginPath();
  ctx.ellipse(hr * 0.05, -hr * 0.32, hr * 0.7, hr * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(8, 40, 22, 0.8)";
  [-1, 1].forEach((sgn) => {
    ctx.beginPath();
    ctx.arc(hr * 1.0, sgn * hr * 0.22, hr * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });

  [-1, 1].forEach((sgn) => {
    const ex = hr * 0.18;
    const ey = sgn * hr * 0.5;
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.arc(ex, ey, hr * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#08130b";
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr * 0.08, hr * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(ex - hr * 0.08, ey - hr * 0.1, hr * 0.06, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
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
    { x: 8, y: 6 },
    { x: 7, y: 6 },
    { x: 6, y: 6 },
    { x: 5, y: 6 },
  ];
  const blocked = new Set(snake.map(makeBlockedKey));
  const firstFoodPoint = randomCell(blocked);

  return {
    phase: "ready",
    bestScore,
    snake,
    renderFromSnake: snake,
    renderStartedAt: now,
    renderDurationMs: 138,
    direction: { ...DIRECTIONS.right },
    pendingDirection: { ...DIRECTIONS.right },
    food: { ...firstFoodPoint, type: pickFoodType() },
    nazar: null,
    score: 0,
    lastStepAt: now,
    nowMs: now,
    speedBoostUntil: 0,
    slowUntil: 0,
    freezeUntil: 0,
    teaStreak: 0,
    trafficState: "none",
    trafficUntil: 0,
    nextTrafficAt: now + randomInt(9000, 13000),
    nextNazarAt: now + randomInt(10000, 16000),
    drunkUntil: 0,
    overlayKey: null,
    overlayUntil: 0,
    gameOverLine: "",
    voiceLine: "Yılan döner hazır. Başlayalım.",
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
      return "Çok hızlı";
    }
    if (speed <= 120) {
      return "Hızlı";
    }
    if (speed <= 160) {
      return "Normal";
    }
    return "Yavaş";
  }, [game]);

  const isFreeze = game.nowMs < game.freezeUntil;
  const isDrunk = game.nowMs < game.drunkUntil;
  const trafficText =
    game.trafficState === "red"
      ? "Kırmızı ışık: DUR"
      : game.trafficState === "green"
        ? "Yeşil ışık: Bas gaza"
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

    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    drawBackground(ctx);

    if (game.nazar) {
      drawNazar(ctx, game.nazar.x, game.nazar.y);
    }

    const foodEmoji: Record<FoodType, string> = {
      simit: "🥯",
      doner: "🥙",
      baklava: "🧁",
      cay: "🍵",
      ayran: "🥛",
      kahve: "☕",
      raki: "🥃",
    };

    const duration = Math.max(1, game.renderDurationMs || 1);
    const t =
      game.phase === "running"
        ? Math.min(
            1,
            Math.max(0, (game.nowMs - game.renderStartedAt) / duration)
          )
        : 1;

    const renderSnake = game.snake.map((segment, index) => {
      const from = game.renderFromSnake[index] ?? segment;
      const dx = normalizeWrapDelta(segment.x - from.x);
      const dy = normalizeWrapDelta(segment.y - from.y);
      return { x: from.x + dx * t, y: from.y + dy * t };
    });

    // Food as emoji with a subtle pill behind it so it reads clearly on the
    // darkened board.
    const fx = game.food.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = game.food.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL_SIZE * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(4, 9, 12, 0.42)";
    ctx.fill();
    ctx.strokeStyle = "rgba(109, 240, 194, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 10;
    ctx.font = `${Math.floor(CELL_SIZE * 0.98)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.fillText(foodEmoji[game.food.type], fx, fy + 0.5);
    ctx.restore();

    drawSnake(
      ctx,
      renderSnake,
      game.direction,
      game.nowMs,
      game.phase === "running"
    );

    if (game.trafficState === "red") {
      ctx.fillStyle = "rgba(150, 0, 0, 0.16)";
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
      voiceLine: "Afiyet olsun abi, başladık.",
    }));
  }, []);

  const queueTurn = useCallback((requested: Direction) => {
    setGame((prev) => {
      if (prev.phase === "game_over") {
        return prev;
      }
      const desired = requested;
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
            line = "Kırmızı ışık. Dur!";
            tone = "danger";
          } else {
            next = {
              ...next,
              trafficState: "green",
              trafficUntil: now + 4200,
              nextTrafficAt: now + randomInt(9000, 14000),
            };
            line = "Yeşil yandı. Bas gaza!";
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
        const isDrunkReverse = now < next.drunkUntil;

        let newHead: Point;
        let snake: Point[];

        if (isDrunkReverse) {
          // Drunk reverse: snake backs up (no wobble, no control flip).
          const currentSnake = next.snake;
          const tail = currentSnake[currentSnake.length - 1];
          const beforeTail = currentSnake[currentSnake.length - 2] ?? tail;
          const tailDirection = {
            x: normalizeWrapDelta(tail.x - beforeTail.x),
            y: normalizeWrapDelta(tail.y - beforeTail.y),
          };
          const newTail = {
            x: (tail.x + tailDirection.x + GRID_COLS) % GRID_COLS,
            y: (tail.y + tailDirection.y + GRID_ROWS) % GRID_ROWS,
          };
          const tailHitsBody = currentSnake
            .slice(1)
            .some((part) => samePoint(part, newTail));

          if (tailHitsBody) {
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

          snake = [...currentSnake.slice(1), newTail];
          newHead = snake[0];
        } else {
          const head = next.snake[0];
          newHead = {
            x: (head.x + direction.x + GRID_COLS) % GRID_COLS,
            y: (head.y + direction.y + GRID_ROWS) % GRID_ROWS,
          };

          // The tail vacates its cell this step, so moving into it is legal
          // (classic snake). Exclude it from the self-collision check.
          const hitSelf = next.snake
            .slice(0, next.snake.length - 1)
            .some((part) => samePoint(part, newHead));
          if (hitSelf) {
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

          snake = [newHead, ...next.snake];
        }
        let score = next.score;
        let speedBoostUntil = next.speedBoostUntil;
        let slowUntil = next.slowUntil;
        let freezeUntil = next.freezeUntil;
        let teaStreak = next.teaStreak;
        let food = next.food;
        let nazar = next.nazar;
        let drunkUntil = next.drunkUntil;
        let overlayKey: GameState["overlayKey"] = next.overlayKey;
        let overlayUntil = next.overlayUntil;

        if (overlayKey && now >= overlayUntil) {
          overlayKey = null;
          overlayUntil = 0;
        }

        if (nazar && samePoint(newHead, nazar)) {
          speedBoostUntil = Math.max(speedBoostUntil, now + 3600);
          score += 4;
          nazar = null;
          line = "Nazar enerjisi. Hızlandın!";
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
            line = "Simit etkisi. Hızlandın.";
            tone = "boost";
            teaStreak = 0;
          } else if (eaten === "doner") {
            line = "Ekmek arası mı olsun?";
            tone = "eat";
            teaStreak = 0;
          } else if (eaten === "baklava") {
            slowUntil = Math.max(slowUntil, now + 5200);
            line = "Şerbet koması. Biraz yavaş.";
            tone = "eat";
            teaStreak = 0;
          } else if (eaten === "cay") {
            speedBoostUntil = Math.max(speedBoostUntil, now + 3000);
            teaStreak += 1;
            line = "Çay geldi. Kafein patlaması.";
            tone = "boost";
            if (teaStreak >= 5) {
              teaStreak = 0;
              freezeUntil = now + 3000;
              line = "5 çay oldu. Zorunlu çay molası (3 sn).";
              tone = "danger";
            }
          } else if (eaten === "ayran") {
            slowUntil = Math.max(slowUntil, now + 5000);
            overlayKey = "ayran";
            overlayUntil = now + 1500;
            line = "Rehavet çöktü. 5 saniye yavaş!";
            tone = "danger";
            teaStreak = 0;
          } else if (eaten === "kahve") {
            line = randomFrom(FORTUNE_LINES);
            tone = "fortune";
            teaStreak = 0;
          } else if (eaten === "raki") {
            drunkUntil = Math.max(drunkUntil, now + 3000);
            overlayKey = "raki";
            overlayUntil = now + 1500;
            line = "Çok sarhoşsun. 3 saniye geri geri!";
            tone = "danger";
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
        } else if (!isDrunkReverse) {
          snake.pop();
        }

        const renderFromSnake = [...next.snake];
        while (renderFromSnake.length < snake.length) {
          renderFromSnake.push(renderFromSnake[renderFromSnake.length - 1] ?? { x: 0, y: 0 });
        }
        if (renderFromSnake.length > snake.length) {
          renderFromSnake.length = snake.length;
        }

        next = {
          ...next,
          snake,
          renderFromSnake,
          renderStartedAt: now,
          renderDurationMs: speed,
          direction,
          pendingDirection: direction,
          food,
          nazar,
          score,
          bestScore: Math.max(next.bestScore, score),
          speedBoostUntil,
          slowUntil,
          freezeUntil,
          teaStreak,
          drunkUntil,
          overlayKey,
          overlayUntil,
          lastStepAt: now,
        };

        return applyEvent(next);
      });
    }, 16);

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
    { label: isFreeze ? "Çay molası (durdu)" : "Akış serbest", active: isFreeze },
    { label: isDrunk ? "Sarhoş: geri geri" : "Denge normal", active: isDrunk },
  ];

  return (
    <article className="soft-card snake-shell">
      <h2>Yılan Döner</h2>
      <p className="snake-subline">
        Masaüstünde ok/WASD, telefonda swipe ile oyna. Duvar yok: çerçeveden sarar.
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
              width={BOARD_WIDTH * RENDER_SCALE}
              height={BOARD_HEIGHT * RENDER_SCALE}
              className="snake-canvas"
            />

            {game.phase === "running" && game.overlayKey && game.nowMs < game.overlayUntil ? (
              <div
                className={`snake-effect-overlay ${
                  game.overlayKey === "ayran" ? "is-ayran" : "is-raki"
                }`}
                aria-hidden="true"
              >
                <div className="snake-effect-caption">
                  {game.overlayKey === "ayran" ? "REHAVET ÇÖKTÜ!" : "ÇOK SARHOŞSUN!"}
                </div>
              </div>
            ) : null}

            {game.phase !== "running" ? (
              <div className="snake-overlay">
                <p>
                  {game.phase === "game_over"
                    ? game.gameOverLine || "Bu tur bitti."
                    : "Yılan döner hazır."}
                </p>
                <button type="button" className="action-btn" onClick={startNewRun}>
                  {game.phase === "game_over"
                    ? "Yenildin ama olsun, bir çay iç de devam et"
                    : "Oyunu Başlat"}
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
            Bu sürümde yiyecek efektleri, trafik ışığı ve nazar aktif. Minibüs ve
            vergi memuru sonraki turda eklenecek.
          </p>
        </aside>
      </div>
    </article>
  );
}
