"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Cookie, Zap, X, Heart } from "lucide-react";
import { CatSprite, type Pose, type IdleAction } from "./cat/sprite";
import {
  PERSONALITIES,
  pickPersonality,
  pickName,
  pickBubble,
  type Personality,
  type BubbleContext,
} from "./cat/personality";

// =====================================================
// Kedi artık tab bar'ın ÜZERİNDE yaşar: yavaş yürür,
// yerçekimi + zıplama fiziği vardır, aktif sekmeye/imlece
// tepki verir. Boşta serbest dolaşmaz.
// =====================================================
type CatState =
  | "wandering"        // bar üstünde bir noktaya yürüyor
  | "idle"
  | "seeking_food"
  | "eating"
  | "chasing_laser"
  | "being_petted"
  | "annoyed"
  | "sleeping"
  | "pooping"
  | "zoomies"
  | "leaving"
  | "gone";

interface Poop { id: number; x: number; y: number; createdAt: number; }
const POOP_LIFETIME_MS = 45_000;
const POOP_CHECK_MS = 28_000;
const POOP_CHANCE = 0.14;
const POOP_DURATION_MS = 3500;

type Direction = "left" | "right";
interface Pos { x: number; y: number; }

const PET_WINDOW_MS = 5000;
const LEAVE_DURATION_MS = 28_000;
const HUNGER_INC_MS = 6000;
const AFFECTION_DEC_MS = 5000;
const STORAGE_KEY = "chillout-cat-v2";

// === Fizik sabitleri ===
const GRAVITY = 0.55;        // kare başına (16ms) ivme
const HOP_V = 4.6;           // zıplama başlangıç hızı
const GROUND_GAP = 14;       // kedi merkezinin bar üstünden yüksekliği
const MIN_Y = 34;            // ekran tepesinden taşmasın
const X_MARGIN = 12;
const SLOW_WALK = 0.34;      // çok yavaş yürüyüş (eski 1.5 idi)
const SETTLE_LERP = 0.4;     // bara yumuşak oturma (yay hissi)

interface Bar { left: number; right: number; top: number; activeCx: number; }

function readBar(): Bar | null {
  if (typeof document === "undefined") return null;
  const nav = document.querySelector(".tab-nav") as HTMLElement | null;
  if (!nav) return null;
  const r = nav.getBoundingClientRect();
  if (r.width < 10) return null;
  let activeCx = r.left + r.width / 2;
  const active = nav.querySelector(".tab-btn.active") as HTMLElement | null;
  if (active) {
    const ar = active.getBoundingClientRect();
    activeCx = ar.left + ar.width / 2;
  }
  return { left: r.left, right: r.right, top: r.top, activeCx };
}

function groundY(b: Bar) { return Math.max(MIN_Y, b.top - GROUND_GAP); }
function xMin(b: Bar) { return b.left + X_MARGIN; }
function xMax(b: Bar) { return b.right - X_MARGIN; }

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function distance(a: Pos, b: Pos) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

function poseFor(state: CatState, isMoving: boolean, action: IdleAction): Pose {
  if (action === "loafing" || action === "tail_chasing") return "sitting";
  if (action === "staring" || action === "derp" || action === "swatting" || action === "slipping") return "sitting";
  if (action === "yawning" || action === "kneading") return "sitting";
  if (action === "licking" || action === "grooming" || action === "looking") return "sitting";
  switch (state) {
    case "sleeping":      return "lying";
    case "eating":        return "eating";
    case "annoyed":       return "alert";
    case "chasing_laser": return "alert";
    case "zoomies":       return "running";
    case "being_petted":  return "sitting";
    case "pooping":       return "sitting";
    case "leaving":       return "walking";
    case "idle":          return "sitting";
    default:              return isMoving ? "walking" : "sitting";
  }
}

// =====================================================
export function CatCompanion() {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Pos>({ x: 200, y: 120 });
  const [target, setTarget] = useState<Pos | null>(null);
  const [state, setState] = useState<CatState>("idle");
  const [direction, setDirection] = useState<Direction>("right");
  const [hunger, setHunger] = useState(40);
  const [affection, setAffection] = useState(45);
  const [bubble, setBubble] = useState<string | null>(null);
  const [foodAmount, setFoodAmount] = useState(0);
  const [foodPos, setFoodPos] = useState<Pos>({ x: 80, y: 120 });
  const [laserActive, setLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState<Pos>({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [earTwitch, setEarTwitch] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [pupilDilate, setPupilDilate] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [idleAction, setIdleAction] = useState<IdleAction>(null);
  const [airborne, setAirborne] = useState(false);
  const [squash, setSquash] = useState(false);

  const [name, setName] = useState<string>("");
  const [personality, setPersonality] = useState<Personality>("sevecen");
  const [poops, setPoops] = useState<Poop[]>([]);

  // === refs ===
  const stateRef = useRef(state);
  const posRef = useRef(pos);
  const targetRef = useRef(target);
  const laserRef = useRef({ active: false, x: 0, y: 0 });
  const cursorRef = useRef<Pos | null>(null);
  const lastCursorMoveRef = useRef(0);
  const recentPetsRef = useRef<number[]>([]);
  const animationRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persRef = useRef<Personality>("sevecen");
  const barRef = useRef<Bar | null>(null);
  const foodPosRef = useRef<Pos>({ x: 80, y: 120 });
  const lastBowlRef = useRef<Pos | null>(null);
  const vyRef = useRef(0);
  const vxRef = useRef(0);
  const airborneRef = useRef(false);
  const squashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { targetRef.current = target; }, [target]);
  useEffect(() => { laserRef.current = { active: laserActive, x: laserPos.x, y: laserPos.y }; }, [laserActive, laserPos]);
  useEffect(() => { persRef.current = personality; }, [personality]);

  const triggerSquash = useCallback(() => {
    setSquash(true);
    if (squashTimerRef.current) clearTimeout(squashTimerRef.current);
    squashTimerRef.current = setTimeout(() => setSquash(false), 220);
  }, []);

  const doHop = useCallback(() => {
    if (airborneRef.current) return;
    airborneRef.current = true;
    vyRef.current = -HOP_V;
    setAirborne(true);
  }, []);

  // === Mount ===
  useEffect(() => {
    if (typeof window === "undefined") return;
    setMounted(true);

    let savedName = "";
    let savedPers: Personality | "" = "";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        savedName = typeof parsed.name === "string" ? parsed.name : "";
        savedPers = ["tembel", "yaramaz", "meraklı", "sevecen"].includes(parsed.pers) ? parsed.pers : "";
      }
    } catch { /* ignore */ }

    const finalName = savedName || pickName();
    const finalPers: Personality = (savedPers as Personality) || pickPersonality();
    setName(finalName);
    setPersonality(finalPers);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: finalName, pers: finalPers }));
    } catch { /* ignore */ }

    // Bara yerleş (yoksa geçici nokta; döngü oturtur)
    const b = readBar();
    if (b) {
      barRef.current = b;
      setPos({ x: (xMin(b) + xMax(b)) / 2, y: groundY(b) });
    }

    setTimeout(() => {
      setBubble(`Selam, ben ${finalName}!`);
      bubbleTimerRef.current = setTimeout(() => setBubble(null), 2600);
    }, 800);
  }, []);

  // === Cursor tracking ===
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
      lastCursorMoveRef.current = Date.now();
      if (laserRef.current.active) setLaserPos({ x: e.clientX, y: e.clientY });
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      cursorRef.current = { x: t.clientX, y: t.clientY };
      lastCursorMoveRef.current = Date.now();
      if (laserRef.current.active) setLaserPos({ x: t.clientX, y: t.clientY });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  const showBubble = useCallback((text: string, ms = 2200) => {
    setBubble(text);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), ms);
  }, []);
  const showCtxBubble = useCallback((ctx: BubbleContext, ms?: number) => {
    showBubble(pickBubble(ctx), ms);
  }, [showBubble]);

  // === Hunger / affection ===
  useEffect(() => {
    const hungerId = setInterval(() => setHunger((h) => Math.min(100, h + 1)), HUNGER_INC_MS);
    const affId = setInterval(() => setAffection((a) => Math.max(0, a - 1)), AFFECTION_DEC_MS);
    return () => { clearInterval(hungerId); clearInterval(affId); };
  }, []);

  // === Blinks ===
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const sched = () => {
      timeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 130);
        if (Math.random() < 0.25) {
          setTimeout(() => {
            setBlinking(true);
            setTimeout(() => setBlinking(false), 110);
          }, 280);
        }
        sched();
      }, rand(2800, 6500));
    };
    sched();
    return () => clearTimeout(timeout);
  }, []);

  // === Ear twitches ===
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const sched = () => {
      timeout = setTimeout(() => {
        setEarTwitch(true);
        setTimeout(() => setEarTwitch(false), 280);
        sched();
      }, rand(4200, 11000));
    };
    sched();
    return () => clearTimeout(timeout);
  }, []);

  // === Idle chatter bubbles ===
  useEffect(() => {
    if (!mounted) return;
    let timeout: ReturnType<typeof setTimeout>;
    const cfg = PERSONALITIES[personality];
    const sched = () => {
      timeout = setTimeout(() => {
        const s = stateRef.current;
        if (s !== "eating" && s !== "leaving" && s !== "gone" && s !== "annoyed") {
          let ctx: BubbleContext = "bored";
          if (hunger > 70) ctx = "hungry";
          else if (s === "sleeping") ctx = "sleepy";
          else if (s === "being_petted") ctx = "purr";
          else if (s === "chasing_laser") ctx = "playful";
          else if (cursorRef.current && distance(posRef.current, cursorRef.current) < 80) ctx = "curious";
          else ctx = Math.random() < 0.5 ? "bored" : "thinking";
          showCtxBubble(ctx, 1900);
        }
        sched();
      }, rand(cfg.bubbleRate, cfg.bubbleRate * 1.6));
    };
    sched();
    return () => clearTimeout(timeout);
  }, [mounted, personality, hunger, showCtxBubble]);

  // === Idle micro-actions ===
  useEffect(() => {
    if (!mounted) return;
    if (state !== "idle" && state !== "being_petted") return;
    const cfg = PERSONALITIES[personality];
    let timeout: ReturnType<typeof setTimeout>;
    const sched = () => {
      timeout = setTimeout(() => {
        const s = stateRef.current;
        if (s !== "idle" && s !== "being_petted") return;

        const sillyChance = 0.32 + cfg.playfulness * 0.22;
        const r = Math.random();
        let action: IdleAction = null;
        let bubbleCtx: BubbleContext | null = null;
        let durationMs = 1800;

        if (s === "being_petted" && r < 0.4) {
          action = "kneading"; bubbleCtx = "purr"; durationMs = 2200;
        } else if (r < sillyChance) {
          const sillyR = Math.random();
          if (sillyR < 0.18) { action = "tail_chasing"; bubbleCtx = "tail_chase"; durationMs = 2400; }
          else if (sillyR < 0.36) {
            action = "staring"; bubbleCtx = "freeze";
            setPupilDilate(true); setTimeout(() => setPupilDilate(false), 2400); durationMs = 2600;
          } else if (sillyR < 0.56) { action = "loafing"; bubbleCtx = "loaf"; durationMs = 4500; }
          else if (sillyR < 0.74) { action = "swatting"; bubbleCtx = "swat"; durationMs = 1600; }
          else {
            action = "derp"; bubbleCtx = "derp";
            setMouthOpen(true); setTimeout(() => setMouthOpen(false), 1500); durationMs = 2000;
          }
        } else if (r < sillyChance + 0.18) { action = "looking"; durationMs = 1500; }
        else if (r < sillyChance + 0.4) { action = "licking"; bubbleCtx = "groom"; durationMs = 2000; }
        else if (r < sillyChance + 0.6) { action = "grooming"; bubbleCtx = "groom"; durationMs = 2200; }
        else if (cfg.sleepiness > 0.25) {
          action = "yawning"; bubbleCtx = "stretch";
          setMouthOpen(true); setTimeout(() => setMouthOpen(false), 700); durationMs = 1800;
        }

        if (action) {
          setIdleAction(action);
          if (bubbleCtx) showCtxBubble(bubbleCtx, durationMs - 200);
          setTimeout(() => setIdleAction(null), durationMs);
        }
        sched();
      }, rand(cfg.idleActionRate, cfg.idleActionRate * 1.6));
    };
    sched();
    return () => clearTimeout(timeout);
  }, [mounted, state, personality, showCtxBubble]);

  // === Zoomies (tame, bar üstünde) ===
  useEffect(() => {
    if (state === "gone") return;
    const cfg = PERSONALITIES[personality];
    const id = setInterval(() => {
      const s = stateRef.current;
      if (s !== "idle" && s !== "wandering") return;
      if (Math.random() < cfg.playfulness * 0.09) {
        setState("zoomies");
        showCtxBubble("zoomies", 1500);
      }
    }, 26000);
    return () => clearInterval(id);
  }, [state, personality, showCtxBubble]);

  useEffect(() => {
    if (state !== "zoomies") return;
    let count = 0;
    const maxBursts = 3;
    const pickZoom = () => {
      const b = barRef.current; if (!b) return;
      setTarget({ x: rand(xMin(b), xMax(b)), y: groundY(b) });
      doHop();
    };
    pickZoom();
    const burstId = setInterval(() => {
      count++;
      if (count >= maxBursts) { clearInterval(burstId); return; }
      pickZoom();
    }, 900);
    const endId = setTimeout(() => {
      clearInterval(burstId);
      setState("idle");
      setTarget(null);
      setIdleAction("derp");
      showCtxBubble("derp", 1600);
      setTimeout(() => setIdleAction(null), 1700);
    }, 3600);
    return () => { clearInterval(burstId); clearTimeout(endId); };
  }, [state, showCtxBubble, doHop]);

  // === İmleç farkındalığı: bara yakınsa imleci izle (zeki) ===
  useEffect(() => {
    if (state !== "idle" && state !== "wandering") return;
    const cfg = PERSONALITIES[personality];
    const id = setInterval(() => {
      const c = cursorRef.current;
      const b = barRef.current;
      if (!c || !b) return;
      const gY = groundY(b);
      const near = Math.abs(c.y - gY) < 150 && c.x > xMin(b) - 80 && c.x < xMax(b) + 80;
      if (near && Date.now() - lastCursorMoveRef.current < 1600) {
        setDirection(c.x > posRef.current.x ? "right" : "left");
        if (cfg.curiosity > 0.45 && Math.random() < 0.6) {
          setState("wandering");
          setTarget({ x: clamp(c.x, xMin(b), xMax(b)), y: gY });
          setPupilDilate(true);
          setTimeout(() => setPupilDilate(false), 1200);
        }
      }
    }, 900);
    return () => clearInterval(id);
  }, [state, personality]);

  // === High-level decisions (bar üstünde) ===
  useEffect(() => {
    if (state === "gone") {
      const id = setTimeout(() => {
        const b = readBar();
        const fromLeft = Math.random() < 0.5;
        if (b) {
          barRef.current = b;
          setPos({ x: fromLeft ? xMin(b) : xMax(b), y: groundY(b) });
        }
        setDirection(fromLeft ? "right" : "left");
        setState("wandering");
        if (b) setTarget({ x: (xMin(b) + xMax(b)) / 2, y: groundY(b) });
        setHunger(50);
        setAffection(50);
        showCtxBubble("greet", 2400);
      }, LEAVE_DURATION_MS);
      return () => clearTimeout(id);
    }

    const cfg = PERSONALITIES[personality];

    const decisionId = setInterval(() => {
      const s = stateRef.current;
      if (s === "eating" || s === "annoyed" || s === "leaving" || s === "gone" ||
          s === "being_petted" || s === "pooping" || s === "zoomies" ||
          s === "chasing_laser" || s === "seeking_food") return;

      const b = barRef.current; if (!b) return;
      const gY = groundY(b);

      if (laserRef.current.active) return;

      if (hunger > 60 && foodAmount > 0) {
        setState("seeking_food");
        setTarget({ x: clamp(foodPosRef.current.x, xMin(b), xMax(b)), y: gY });
        showCtxBubble("hungry", 1500);
        return;
      }

      if (affection > 65 && hunger < 35 && Math.random() < cfg.sleepiness * 0.5) {
        setState("sleeping");
        setTarget(null);
        showCtxBubble("sleepy", 3200);
        return;
      }

      const r = Math.random();
      const pickX = () => {
        // %35 aktif sekmenin üstüne otur (zeki davranış)
        if (Math.random() < 0.35) return clamp(b.activeCx + rand(-16, 16), xMin(b), xMax(b));
        return rand(xMin(b), xMax(b));
      };

      if (s === "idle" || s === "sleeping") {
        if (s === "sleeping" && Math.random() > 0.4) return;
        if (r < 0.42) return; // dur, otur
        setState("wandering");
        setTarget({ x: pickX(), y: gY });
        if (r > 0.85) doHop(); // bazen zıplayarak gider
      } else if (s === "wandering") {
        if (Math.random() < 0.5) { setState("idle"); setTarget(null); }
        else setTarget({ x: pickX(), y: gY });
      }
    }, 3800);

    return () => clearInterval(decisionId);
  }, [state, hunger, foodAmount, personality, showCtxBubble, doHop]);

  // === Wake from sleep ===
  useEffect(() => {
    if (state !== "sleeping") return;
    const cfg = PERSONALITIES[personality];
    const dur = rand(7000 / cfg.sleepiness, 14000 / cfg.sleepiness);
    const id = setTimeout(() => {
      setState("idle");
      setIdleAction("yawning");
      setMouthOpen(true);
      showCtxBubble("wakeup", 1800);
      setTimeout(() => { setIdleAction(null); setMouthOpen(false); }, 1500);
    }, dur);
    return () => clearTimeout(id);
  }, [state, personality, showCtxBubble]);

  // === Annoyed -> leaving ===
  useEffect(() => {
    if (state !== "annoyed") return;
    showCtxBubble("annoyed", 2200);
    const id = setTimeout(() => setState("leaving"), 1400);
    return () => clearTimeout(id);
  }, [state, showCtxBubble]);

  // === Laser: chase yalnız bar üstünde (zıplayıp uzanır) ===
  useEffect(() => {
    if (!laserActive) return;
    if (state === "leaving" || state === "gone" || state === "eating") return;
    setState("chasing_laser");
    const swatId = setInterval(() => {
      if (!laserRef.current.active) return;
      if (Math.random() < 0.5) doHop();
    }, 1400);
    return () => clearInterval(swatId);
  }, [laserActive, state, doHop]);

  useEffect(() => {
    if (state === "chasing_laser" && !laserActive) {
      setState("idle");
      setTarget(null);
    }
  }, [laserActive, state]);

  // === Pooping ===
  useEffect(() => {
    if (state === "gone") return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (s !== "idle" && s !== "wandering") return;
      if (Math.random() < POOP_CHANCE) { setTarget(null); setState("pooping"); }
    }, POOP_CHECK_MS);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (state !== "pooping") return;
    showCtxBubble("potty_pre", POOP_DURATION_MS - 200);
    const id = setTimeout(() => {
      const cur = posRef.current;
      const offset = direction === "right" ? -22 : 22;
      const newPoop: Poop = {
        id: Date.now() + Math.random(),
        x: cur.x + offset,
        y: cur.y + 26, // barın hemen altına düşer
        createdAt: Date.now(),
      };
      setPoops((p) => [...p, newPoop]);
      showCtxBubble("potty_post", 2200);
      setState("idle");
    }, POOP_DURATION_MS);
    return () => clearTimeout(id);
  }, [state, direction, showCtxBubble]);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setPoops((p) => p.filter((pp) => now - pp.createdAt < POOP_LIFETIME_MS));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const cleanPoop = useCallback((id: number) => {
    setPoops((p) => p.filter((pp) => pp.id !== id));
    showBubble("Tertemiz! 🧹", 1400);
  }, [showBubble]);

  // === Leaving -> gone ===
  useEffect(() => {
    if (state !== "leaving" || typeof window === "undefined") return;
    const exitLeft = posRef.current.x < window.innerWidth / 2;
    setTarget({ x: exitLeft ? -120 : window.innerWidth + 120, y: posRef.current.y });
    setDirection(exitLeft ? "left" : "right");
    showCtxBubble("exit", 1800);
    const id = setTimeout(() => setState("gone"), 6500);
    return () => clearTimeout(id);
  }, [state, showCtxBubble]);

  // === Movement loop: ledge walk + gravity/hop ===
  useEffect(() => {
    if (state === "gone") {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(40, now - last); last = now;
      const f = dt / 16;

      const liveBar = readBar();
      if (liveBar) barRef.current = liveBar;
      const b = barRef.current;
      const s = stateRef.current;
      const cur = posRef.current;

      if (!b) { setIsMoving(false); animationRef.current = requestAnimationFrame(tick); return; }

      const gY = groundY(b);
      const lo = xMin(b), hi = xMax(b);

      // mama kasesini barın sol ucuna sabitle (sadece değişince render)
      const bowl = { x: clamp(lo + 4, lo, hi), y: gY + 12 };
      foodPosRef.current = bowl;
      const lb = lastBowlRef.current;
      if (!lb || Math.abs(bowl.x - lb.x) > 0.5 || Math.abs(bowl.y - lb.y) > 0.5) {
        lastBowlRef.current = bowl;
        setFoodPos(bowl);
      }

      // === dikey fizik ===
      let ny: number;
      if (airborneRef.current) {
        vyRef.current += GRAVITY * f;
        ny = cur.y + vyRef.current * f;
        if (ny >= gY) {
          ny = gY; airborneRef.current = false; vyRef.current = 0;
          setAirborne(false); triggerSquash();
        }
      } else {
        ny = cur.y + (gY - cur.y) * SETTLE_LERP; // yumuşak oturma + scroll takibi
      }

      // === yatay (ivme + sürtünmeyle gerçekçi yürüyüş) ===
      const moveBlocked =
        s === "sleeping" || s === "eating" || s === "being_petted" ||
        s === "idle" || s === "annoyed" || s === "pooping";

      // Hedef x ve bu duruma özgü maksimum hız
      let tx: number | null = null;
      let maxSpeed = 0;
      if (s === "leaving" && targetRef.current) {
        tx = targetRef.current.x; // ekran dışı, clamp yok
        maxSpeed = 1.6;
      } else if (!moveBlocked) {
        if (s === "chasing_laser" && laserRef.current.active) {
          tx = clamp(laserRef.current.x, lo, hi);
          maxSpeed = 1.45;
        } else if (s === "zoomies" && targetRef.current) {
          tx = clamp(targetRef.current.x, lo, hi);
          maxSpeed = 2.3;
        } else if (targetRef.current) {
          tx = clamp(targetRef.current.x, lo, hi);
          maxSpeed = SLOW_WALK * 1.85 * PERSONALITIES[persRef.current].speedMult;
        }
      }

      let vx = vxRef.current;
      if (tx !== null) {
        const dxh = tx - cur.x;
        // Hedefe yaklaşınca hız düşer -> doğal yavaşlama (ease-out)
        const approach = clamp(Math.abs(dxh) / 26, 0, 1);
        const desired = Math.sign(dxh) * maxSpeed * approach;
        // Hıza yumuşak yaklaş -> kalkışta ease-in
        vx += (desired - vx) * Math.min(1, 0.16 * f);
        if (Math.abs(dxh) < 1.6 && Math.abs(vx) < 0.12) {
          vx = 0;
          if (!airborneRef.current) {
            if (s === "seeking_food") { setState("eating"); setTarget(null); }
            else if (s === "wandering") { setState("idle"); setTarget(null); }
          }
        }
      } else {
        // Hedef yok: sürtünmeyle yavaşça dur
        vx *= Math.pow(0.8, f);
        if (Math.abs(vx) < 0.02) vx = 0;
      }
      vxRef.current = vx;

      let nx = cur.x + vx * f;
      if (s !== "leaving") nx = clamp(nx, lo, hi);
      const movingNow = Math.abs(vx) > 0.07;
      if (Math.abs(vx) > 0.05) setDirection(vx > 0 ? "right" : "left");

      if (Math.abs(nx - cur.x) > 0.01 || Math.abs(ny - cur.y) > 0.05) {
        setPos({ x: nx, y: ny });
      }
      setIsMoving(movingNow || airborneRef.current);

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [state, triggerSquash]);

  // === Eating ===
  useEffect(() => {
    if (state !== "eating") return;
    showBubble("Mmmm 😋", 2400);
    const eatId = setInterval(() => {
      setHunger((h) => Math.max(0, h - 12));
      setFoodAmount((f) => Math.max(0, f - 1));
    }, 700);
    const doneId = setTimeout(() => setState("idle"), 4500);
    return () => { clearInterval(eatId); clearTimeout(doneId); };
  }, [state, showBubble]);

  useEffect(() => {
    if (state === "eating" && foodAmount === 0) setState("idle");
  }, [foodAmount, state]);

  // === Interactions ===
  const fillFoodBowl = useCallback(() => {
    setFoodAmount((f) => Math.min(8, f + 3));
    showBubble("🍖 mama hazır", 1400);
  }, [showBubble]);

  const toggleLaser = useCallback(() => {
    setLaserActive((v) => !v);
    if (!laserActive) {
      setPupilDilate(true);
      setTimeout(() => setPupilDilate(false), 1800);
      showCtxBubble("playful", 1300);
    }
  }, [laserActive, showCtxBubble]);

  const petCat = useCallback(() => {
    if (state === "leaving" || state === "gone") return;
    if (state === "annoyed") { showCtxBubble("annoyed", 1200); return; }

    const now = Date.now();
    const cfg = PERSONALITIES[personality];
    recentPetsRef.current = [
      ...recentPetsRef.current.filter((t) => now - t < PET_WINDOW_MS),
      now,
    ];

    if (recentPetsRef.current.length > cfg.petTolerance) {
      setAffection((a) => Math.max(0, a - 25));
      setState("annoyed");
      recentPetsRef.current = [];
      return;
    }

    setAffection((a) => Math.min(100, a + 12));
    setState("being_petted");
    showCtxBubble("petted", 1400);
    setTimeout(() => {
      if (stateRef.current === "being_petted") setState("idle");
    }, 1600);
  }, [state, personality, showCtxBubble]);

  const cyclePersonality = useCallback(() => {
    const order: Personality[] = ["sevecen", "yaramaz", "meraklı", "tembel"];
    const next = order[(order.indexOf(personality) + 1) % order.length];
    setPersonality(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, pers: next })); } catch { /* ignore */ }
    showBubble(`Artık ${PERSONALITIES[next].label} ${PERSONALITIES[next].emoji}`, 2200);
  }, [personality, name, showBubble]);

  const renameCat = useCallback(() => {
    const newName = pickName();
    setName(newName);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: newName, pers: personality })); } catch { /* ignore */ }
    showBubble(`Bana ${newName} de`, 2200);
  }, [personality, showBubble]);

  if (!mounted) return null;

  if (state === "gone") {
    return (
      <CatControls
        name={name} personality={personality} foodAmount={foodAmount}
        onFeed={fillFoodBowl} laserActive={laserActive} onToggleLaser={toggleLaser}
        hunger={hunger} affection={affection} onCyclePers={cyclePersonality}
        onRename={renameCat} catGone
      />
    );
  }

  const pose = poseFor(state, isMoving, idleAction);

  return (
    <>
      <div
        className={`cat-companion state-${state} pers-${personality}${airborne ? " airborne" : ""}${squash ? " squash" : ""}`}
        style={{
          left: pos.x,
          top: pos.y,
          transform: `translate(-50%, -50%) scaleX(${direction === "left" ? -1 : 1})`,
        }}
        onClick={petCat}
        title={`${name} - sırtını sıvazla`}
        aria-label={`${name} - tıklayarak sevebilirsin`}
        role="button"
      >
        {bubble && <div className="cat-bubble">{bubble}</div>}
        <CatSprite
          pose={pose}
          action={idleAction}
          blinking={blinking}
          earTwitch={earTwitch}
          mouthOpen={mouthOpen}
          pupilDilate={pupilDilate}
        />
      </div>

      <button
        type="button"
        className={`cat-foodbowl ${foodAmount > 0 ? "has-food" : "empty"}`}
        style={{ left: foodPos.x, top: foodPos.y }}
        onClick={fillFoodBowl}
        title="Mama ver"
        aria-label="Mama kasesi — tıklayarak mama ekle"
      >
        <span className="cat-foodbowl-inner">
          {foodAmount > 0 ? "🍖".repeat(Math.min(3, foodAmount)) : "🥣"}
        </span>
      </button>

      {laserActive && (
        <div className="cat-laser-dot" style={{ left: laserPos.x, top: laserPos.y }} />
      )}

      {poops.map((p) => (
        <button
          key={p.id}
          className="cat-poop"
          style={{ left: p.x, top: p.y }}
          onClick={() => cleanPoop(p.id)}
          title="Temizle"
          aria-label="Kaka - tıklayarak temizle"
        >
          💩
        </button>
      ))}

      <CatControls
        name={name} personality={personality} foodAmount={foodAmount}
        onFeed={fillFoodBowl} laserActive={laserActive} onToggleLaser={toggleLaser}
        hunger={hunger} affection={affection} onCyclePers={cyclePersonality}
        onRename={renameCat}
      />
    </>
  );
}

interface ControlsProps {
  name: string;
  personality: Personality;
  foodAmount: number;
  onFeed: () => void;
  laserActive: boolean;
  onToggleLaser: () => void;
  hunger: number;
  affection: number;
  onCyclePers: () => void;
  onRename: () => void;
  catGone?: boolean;
}

function CatControls({
  name, personality, foodAmount, onFeed, laserActive, onToggleLaser,
  hunger, affection, onCyclePers, onRename, catGone,
}: ControlsProps) {
  const [open, setOpen] = useState(false);
  const cfg = PERSONALITIES[personality];

  return (
    <div className={`cat-controls ${open ? "open" : ""}`}>
      <button
        className="cat-controls-toggle"
        onClick={() => setOpen((o) => !o)}
        title={open ? "Kapat" : `${name} ile etkileşime gir`}
      >
        {open ? <X size={14} /> : "🐾"}
      </button>
      {open && (
        <div className="cat-controls-panel">
          <div className="cat-name-row">
            <strong onClick={onRename} title="Tıkla, ismini değiştir">{name}</strong>
            <button className="cat-pers-btn" onClick={onCyclePers} title="Karakterini değiştir">
              {cfg.emoji} {cfg.label}
            </button>
          </div>
          <div className="cat-stats">
            <div className="cat-stat">
              <span>Açlık</span>
              <div className="cat-bar"><div className="cat-bar-fill hunger" style={{ width: `${hunger}%` }} /></div>
            </div>
            <div className="cat-stat">
              <span>Sevgi</span>
              <div className="cat-bar"><div className="cat-bar-fill affection" style={{ width: `${affection}%` }} /></div>
            </div>
          </div>
          <div className="cat-actions">
            <button onClick={onFeed} className="cat-action-btn">
              <Cookie size={13} />
              Mama ver ({foodAmount})
            </button>
            <button onClick={onToggleLaser} className={`cat-action-btn ${laserActive ? "active" : ""}`}>
              <Zap size={13} />
              {laserActive ? "Lazer KAPAT" : "Lazer AÇ"}
            </button>
          </div>
          {catGone && <p className="cat-status-msg">{name} gücendi… birazdan döner.</p>}
          <p className="cat-tip">
            <Heart size={11} /> Sekmelerin üstünde gezer. Sırtına tıklayarak sevebilirsin.
          </p>
        </div>
      )}
    </div>
  );
}
