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
type SpriteKey =
  | "groundA"
  | "groundB"
  | "lane"
  | "snakeHead"
  | "snakeBodyA"
  | "snakeBodyB"
  | "snakeTail"
  | "foodSimit"
  | "foodDoner"
  | "foodBaklava"
  | "foodCay"
  | "foodAyran"
  | "foodKahve"
  | "nazar";

type AtlasRect = { x: number; y: number; w: number; h: number };
type SpriteAtlas = {
  canvas: HTMLCanvasElement;
  map: Record<SpriteKey, AtlasRect>;
};

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

const GRID_COLS = 20;
const GRID_ROWS = 12;
const CELL_SIZE = 18;
const BOARD_WIDTH = GRID_COLS * CELL_SIZE;
const BOARD_HEIGHT = GRID_ROWS * CELL_SIZE;
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
    hint: "Köpük şoku: kontroller kısa süre ters.",
  },
  kahve: {
    label: "Türk Kahvesi",
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
  "Eline sağlık.",
  "Bir çay daha?",
  "Çok iyi gidiyorsun.",
];

const DEATH_LINES = [
  "Of be abi yine mi?",
  "Yandı gülüm keten helva.",
  "Hayat devam ediyor.",
  "Duvara girdin, canın sağ olsun.",
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

const SPRITE_KEYS: SpriteKey[] = [
  "groundA",
  "groundB",
  "lane",
  "snakeHead",
  "snakeBodyA",
  "snakeBodyB",
  "snakeTail",
  "foodSimit",
  "foodDoner",
  "foodBaklava",
  "foodCay",
  "foodAyran",
  "foodKahve",
  "nazar",
];

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

function buildSpriteAtlas(cellSize: number): SpriteAtlas | null {
  if (typeof document === "undefined") {
    return null;
  }

  const columns = 4;
  const rows = Math.ceil(SPRITE_KEYS.length / columns);
  const canvas = document.createElement("canvas");
  canvas.width = columns * cellSize;
  canvas.height = rows * cellSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.imageSmoothingEnabled = false;
  const map = {} as Record<SpriteKey, AtlasRect>;

  const drawTile = (sprite: SpriteKey, sx: number, sy: number) => {
    const p = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(sx + x, sy + y, w, h);
    };
    const c = cellSize;

    if (sprite === "groundA") {
      p(0, 0, c, c, "#122734");
      p(0, 0, c, 2, "rgba(109,240,194,0.06)");
      p(0, c - 1, c, 1, "rgba(6,15,19,0.45)");
      return;
    }

    if (sprite === "groundB") {
      p(0, 0, c, c, "#183547");
      p(1, 1, c - 2, 1, "rgba(255,211,115,0.06)");
      p(0, c - 1, c, 1, "rgba(6,15,19,0.45)");
      return;
    }

    if (sprite === "lane") {
      p(0, 0, c, c, "rgba(0,0,0,0)");
      p(0, 2, c, 1, "rgba(255,211,115,0.1)");
      p(0, c - 3, c, 1, "rgba(109,240,194,0.08)");
      return;
    }

    if (sprite === "snakeHead") {
      p(1, c - 2, c - 4, 2, "rgba(5,10,13,0.25)");
      p(1, 1, c - 2, c - 2, "#114b62");
      p(2, 2, c - 4, c - 4, "#1c8da2");
      p(4, 3, c - 8, c - 6, "#35c1c1");
      p(4, 3, c - 10, 2, "#e9fff6");
      p(5, 5, c - 12, 1, "#ffd373");
      p(c - 6, 6, 3, 3, "#ffeebf");
      p(c - 5, 7, 1, 1, "#052f3f");
      p(c - 2, 6, 2, 5, "#dadada");
      return;
    }

    if (sprite === "snakeBodyA") {
      p(2, c - 2, c - 4, 2, "rgba(5,10,13,0.2)");
      p(1, 1, c - 2, c - 2, "#114b62");
      p(2, 2, c - 4, c - 4, "#35c1c1");
      p(3, 2, c - 6, 2, "#e9fff6");
      p(4, 4, c - 10, 1, "#ffd373");
      p(6, 2, 2, c - 4, "#177385");
      p(10, 2, 2, c - 4, "#177385");
      return;
    }

    if (sprite === "snakeBodyB") {
      p(2, c - 2, c - 4, 2, "rgba(5,10,13,0.2)");
      p(1, 1, c - 2, c - 2, "#114b62");
      p(2, 2, c - 4, c - 4, "#27a9bd");
      p(3, 2, c - 6, 2, "#d4fff2");
      p(4, 4, c - 10, 1, "#ffd373");
      p(6, 2, 2, c - 4, "#13687a");
      p(10, 2, 2, c - 4, "#13687a");
      return;
    }

    if (sprite === "snakeTail") {
      p(2, c - 2, c - 4, 2, "rgba(5,10,13,0.2)");
      p(1, 1, c - 2, c - 2, "#114b62");
      p(2, 2, c - 4, c - 4, "#2fb3c3");
      p(3, 2, c - 6, 2, "#d7fff3");
      p(c - 6, c - 2, 5, 2, "#ffdba0");
      p(c - 5, c, 2, 2, "#ffdba0");
      p(c - 3, c + 1, 1, 2, "#ffdba0");
      return;
    }

    if (sprite === "foodSimit") {
      p(1, 1, c - 2, c - 2, "#442113");
      p(3, 3, c - 6, c - 6, "#d6862f");
      p(6, 6, c - 12, c - 12, "#6d3117");
      p(4, 4, c - 8, 2, "#f7d29a");
      return;
    }

    if (sprite === "foodDoner") {
      p(2, 1, c - 4, c - 2, "#402216");
      p(3, 2, c - 6, c - 4, "#95512e");
      p(5, 4, c - 10, c - 8, "#cf7d39");
      p(8, 2, 2, c - 4, "#6f371f");
      return;
    }

    if (sprite === "foodBaklava") {
      p(2, 2, c - 4, c - 4, "#5f4e22");
      p(3, 3, c - 6, c - 6, "#ccab4b");
      p(5, 5, c - 10, c - 10, "#f3d985");
      p(8, 2, 2, c - 4, "#6f5d24");
      p(2, 8, c - 4, 2, "#6f5d24");
      return;
    }

    if (sprite === "foodCay") {
      p(4, 1, c - 8, c - 2, "#4a5864");
      p(5, 4, c - 10, c - 6, "#b32222");
      p(4, 2, c - 8, 2, "#d8eef5");
      p(4, c - 3, c - 8, 2, "#d8eef5");
      return;
    }

    if (sprite === "foodAyran") {
      p(3, 3, c - 6, c - 4, "#627f8f");
      p(4, 4, c - 8, c - 6, "#e5f3f8");
      p(5, 3, c - 10, 2, "#9ec2d1");
      p(5, c - 3, c - 10, 2, "#9ec2d1");
      return;
    }

    if (sprite === "foodKahve") {
      p(3, 3, c - 6, c - 5, "#362117");
      p(4, 4, c - 8, c - 6, "#5f3826");
      p(5, 3, c - 10, 2, "#a57653");
      p(6, 6, c - 12, 2, "#f2e2ce");
      return;
    }

    p(1, 1, c - 2, c - 2, "#0b2a63");
    p(3, 3, c - 6, c - 6, "#123f91");
    p(6, 6, c - 12, c - 12, "#e4f2ff");
    p(8, 8, c - 16, c - 16, "#1e58c2");
  };

  SPRITE_KEYS.forEach((sprite, index) => {
    const sx = (index % columns) * cellSize;
    const sy = Math.floor(index / columns) * cellSize;
    map[sprite] = { x: sx, y: sy, w: cellSize, h: cellSize };
    drawTile(sprite, sx, sy);
  });

  return { canvas, map };
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  atlas: SpriteAtlas,
  sprite: SpriteKey,
  cellX: number,
  cellY: number
) {
  const rect = atlas.map[sprite];
  ctx.drawImage(
    atlas.canvas,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    cellX * CELL_SIZE,
    cellY * CELL_SIZE,
    CELL_SIZE,
    CELL_SIZE
  );
}

function drawRotatedSprite(
  ctx: CanvasRenderingContext2D,
  atlas: SpriteAtlas,
  sprite: SpriteKey,
  cellX: number,
  cellY: number,
  angle: number
) {
  const rect = atlas.map[sprite];
  const centerX = cellX * CELL_SIZE + CELL_SIZE / 2;
  const centerY = cellY * CELL_SIZE + CELL_SIZE / 2;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.drawImage(
    atlas.canvas,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    -CELL_SIZE / 2,
    -CELL_SIZE / 2,
    CELL_SIZE,
    CELL_SIZE
  );
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
    voiceLine: "Yılan döner hazır. Başlayalım.",
    eventId: 0,
    eventTone: null,
  };
}

export function SnakeDonerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const swipeStartRef = useRef<Point | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const atlas = useMemo(() => buildSpriteAtlas(CELL_SIZE), []);
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

  const isReversed = game.nowMs < game.reverseUntil;
  const isFreeze = game.nowMs < game.freezeUntil;
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
    if (!canvas || !atlas) {
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
        const even = (x + y) % 2 === 0;
        drawSprite(ctx, atlas, even ? "groundA" : "groundB", x, y);
        if (y % 4 === 1) {
          drawSprite(ctx, atlas, "lane", x, y);
        }
      }
    }

    if (game.nazar) {
      drawSprite(ctx, atlas, "nazar", game.nazar.x, game.nazar.y);
    }

    const foodSprite: Record<FoodType, SpriteKey> = {
      simit: "foodSimit",
      doner: "foodDoner",
      baklava: "foodBaklava",
      cay: "foodCay",
      ayran: "foodAyran",
      kahve: "foodKahve",
    };
    drawSprite(ctx, atlas, foodSprite[game.food.type], game.food.x, game.food.y);

    game.snake.forEach((segment, index) => {
      if (index === 0) {
        drawRotatedSprite(
          ctx,
          atlas,
          "snakeHead",
          segment.x,
          segment.y,
          directionToAngle(game.direction)
        );
        return;
      }

      if (index === game.snake.length - 1) {
        const beforeTail = game.snake[index - 1];
        const tailDirection = {
          x: segment.x - beforeTail.x,
          y: segment.y - beforeTail.y,
        };
        drawRotatedSprite(
          ctx,
          atlas,
          "snakeTail",
          segment.x,
          segment.y,
          directionToAngle(tailDirection)
        );
        return;
      }

      drawSprite(ctx, atlas, index % 2 === 0 ? "snakeBodyA" : "snakeBodyB", segment.x, segment.y);
    });

    if (game.trafficState === "red") {
      ctx.fillStyle = "rgba(150, 0, 0, 0.16)";
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    }
  }, [atlas, game]);

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
            reverseUntil = now + 4200;
            line = "Köpük şoku. Kontroller ters!";
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
    { label: isFreeze ? "Çay molası (durdu)" : "Akış serbest", active: isFreeze },
  ];

  return (
    <article className="soft-card snake-shell">
      <h2>Yılan Döner</h2>
      <p className="snake-subline">
        Masaüstünde ok/WASD, telefonda swipe ile oyna. Duvar var, trafik var.
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
