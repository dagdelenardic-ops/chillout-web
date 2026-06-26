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
// State machine
// =====================================================
type CatState =
  | "wandering"
  | "idle"
  | "seeking_food"
  | "eating"
  | "chasing_laser"
  | "being_petted"
  | "annoyed"
  | "sleeping"
  | "pooping"
  | "zoomies"          // delice koşma - rastgele hedefler
  | "leaving"
  | "gone";

interface Poop { id: number; x: number; y: number; createdAt: number; }
const POOP_LIFETIME_MS = 45_000;
const POOP_CHECK_MS = 25_000;       // her 25sn'de kontrol
const POOP_CHANCE = 0.18;           // %18 ihtimal -> ortalama ~140sn'de bir
const POOP_DURATION_MS = 3500;      // kakası sırasında bekleme

type Direction = "left" | "right";
interface Pos { x: number; y: number; }

const PET_WINDOW_MS = 5000;
const LEAVE_DURATION_MS = 28_000;
const HUNGER_INC_MS = 6000;
const AFFECTION_DEC_MS = 5000;
const STORAGE_KEY = "chillout-cat-v2";

// === bounds: kedi hep alt yarıda, ekran içinde ===
function getBounds() {
  if (typeof window === "undefined") return { minX: 60, maxX: 1200, minY: 300, maxY: 700 };
  const W = window.innerWidth;
  const H = window.innerHeight;
  return {
    minX: 60,
    maxX: W - 60,
    minY: Math.max(180, H * 0.45),     // ust yarıdan asagı
    maxY: H - 80,                      // dipten yukari biraz
  };
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function wrapAngle(a: number) {
  while (a > Math.PI)  a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function poseFor(state: CatState, isMoving: boolean, action: IdleAction): Pose {
  if (action === "loafing" || action === "tail_chasing") return "sitting";
  if (action === "staring" || action === "derp" || action === "swatting" || action === "slipping") return "sitting";
  if (action === "yawning" || action === "kneading") return "sitting";
  if (action === "licking" || action === "grooming" || action === "looking") return "sitting";
  switch (state) {
    case "sleeping":      return "lying";
    case "eating":        return "eating";
    case "annoyed":       return "alert";
    case "chasing_laser": return "running";
    case "zoomies":       return "running";
    case "being_petted":  return "sitting";
    case "pooping":       return "sitting";
    case "leaving":       return "walking";
    case "idle":          return "sitting";
    default:              return isMoving ? "walking" : "sitting";
  }
}

// =====================================================
// Component
// =====================================================
export function CatCompanion() {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Pos>({ x: 200, y: 400 });
  const [target, setTarget] = useState<Pos | null>(null);
  const [state, setState] = useState<CatState>("idle");
  const [direction, setDirection] = useState<Direction>("right");
  const [hunger, setHunger] = useState(40);
  const [affection, setAffection] = useState(45);
  const [bubble, setBubble] = useState<string | null>(null);
  const [foodAmount, setFoodAmount] = useState(0);
  const [foodPos, setFoodPos] = useState<Pos>({ x: 80, y: 0 });
  const [laserActive, setLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState<Pos>({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [earTwitch, setEarTwitch] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [pupilDilate, setPupilDilate] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [idleAction, setIdleAction] = useState<IdleAction>(null);

  const [name, setName] = useState<string>("");
  const [personality, setPersonality] = useState<Personality>("sevecen");
  const [poops, setPoops] = useState<Poop[]>([]);

  // === Motion refs ===
  const headingRef = useRef(0);  // radians
  const stateRef = useRef(state);
  const posRef = useRef(pos);
  const targetRef = useRef(target);
  const laserRef = useRef({ active: false, x: 0, y: 0 });
  const cursorRef = useRef<Pos | null>(null);
  const lastCursorMoveRef = useRef(0);
  const recentPetsRef = useRef<number[]>([]);
  const animationRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wobbleSeedRef = useRef(Math.random() * 1000);
  const persRef = useRef<Personality>("sevecen");

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { targetRef.current = target; }, [target]);
  useEffect(() => { laserRef.current = { active: laserActive, x: laserPos.x, y: laserPos.y }; }, [laserActive, laserPos]);
  useEffect(() => { persRef.current = personality; }, [personality]);

  // === Mount: pick personality, name, position ===
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
        savedPers = ["tembel","yaramaz","meraklı","sevecen"].includes(parsed.pers) ? parsed.pers : "";
      }
    } catch { /* ignore */ }

    const finalName = savedName || pickName();
    const finalPers: Personality = (savedPers as Personality) || pickPersonality();
    setName(finalName);
    setPersonality(finalPers);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: finalName, pers: finalPers }));
    } catch { /* ignore */ }

    const b = getBounds();
    setPos({ x: rand(b.minX + 100, b.maxX - 100), y: rand(b.minY + 50, b.maxY - 50) });
    // Mama kasesi bottom-left, cat-controls toggle'in hemen sağında
    setFoodPos({ x: 90, y: window.innerHeight - 36 });
    headingRef.current = 0;

    // Greet bubble after small delay
    setTimeout(() => {
      setBubble(`Selam, ben ${finalName}!`);
      bubbleTimerRef.current = setTimeout(() => setBubble(null), 2600);
    }, 800);
  }, []);

  // === Cursor tracking globally for awareness ===
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

  // Bubble helper
  const showBubble = useCallback((text: string, ms = 2200) => {
    setBubble(text);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), ms);
  }, []);
  const showCtxBubble = useCallback((ctx: BubbleContext, ms?: number) => {
    showBubble(pickBubble(ctx), ms);
  }, [showBubble]);

  // === Hunger / affection ticks ===
  useEffect(() => {
    const hungerId = setInterval(() => setHunger((h) => Math.min(100, h + 1)), HUNGER_INC_MS);
    const affId = setInterval(() => setAffection((a) => Math.max(0, a - 1)), AFFECTION_DEC_MS);
    return () => { clearInterval(hungerId); clearInterval(affId); };
  }, []);

  // === Random blinks (more frequent when alert) ===
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const sched = () => {
      timeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 130);
        // Sometimes double-blink
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

  // === Random ear twitches ===
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

  // === Random Turkish bubble (idle chatter, personality-paced) ===
  useEffect(() => {
    if (!mounted) return;
    let timeout: ReturnType<typeof setTimeout>;
    const cfg = PERSONALITIES[personality];
    const sched = () => {
      timeout = setTimeout(() => {
        const s = stateRef.current;
        // Don't spam bubbles in busy states
        if (s !== "eating" && s !== "leaving" && s !== "gone" && s !== "annoyed") {
          // Pick context based on stats
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

  // === Idle micro-actions (look/lick/groom/yawn/knead + silly) ===
  useEffect(() => {
    if (!mounted) return;
    if (state !== "idle" && state !== "being_petted") return;
    const cfg = PERSONALITIES[personality];
    let timeout: ReturnType<typeof setTimeout>;
    const sched = () => {
      timeout = setTimeout(() => {
        const s = stateRef.current;
        if (s !== "idle" && s !== "being_petted") return;

        // Silliness probability boost for yaramaz/meraklı
        const sillyChance = 0.35 + cfg.playfulness * 0.25;
        const r = Math.random();
        let action: IdleAction = null;
        let bubbleCtx: BubbleContext | null = null;
        let durationMs = 1800;

        // Petted-only kneading
        if (s === "being_petted" && r < 0.4) {
          action = "kneading";
          bubbleCtx = "purr";
          durationMs = 2200;
        }
        // Salaklık branch
        else if (r < sillyChance) {
          // Pick random silly action
          const sillyR = Math.random();
          if (sillyR < 0.16) {
            action = "tail_chasing";
            bubbleCtx = "tail_chase";
            durationMs = 2400;
          } else if (sillyR < 0.32) {
            action = "staring";
            bubbleCtx = "freeze";
            setPupilDilate(true);
            setTimeout(() => setPupilDilate(false), 2400);
            durationMs = 2600;
          } else if (sillyR < 0.50) {
            action = "loafing";
            bubbleCtx = "loaf";
            durationMs = 4500;
          } else if (sillyR < 0.68) {
            action = "swatting";
            bubbleCtx = "swat";
            durationMs = 1600;
          } else if (sillyR < 0.85) {
            action = "slipping";
            bubbleCtx = "slip";
            durationMs = 1400;
          } else {
            action = "derp";
            bubbleCtx = "derp";
            setMouthOpen(true);
            setTimeout(() => setMouthOpen(false), 1500);
            durationMs = 2000;
          }
        }
        // Normal grooming branch
        else if (r < sillyChance + 0.15) {
          action = "looking";
          durationMs = 1500;
        } else if (r < sillyChance + 0.35) {
          action = "licking";
          bubbleCtx = "groom";
          durationMs = 2000;
        } else if (r < sillyChance + 0.55) {
          action = "grooming";
          bubbleCtx = "groom";
          durationMs = 2200;
        } else if (cfg.sleepiness > 0.25) {
          action = "yawning";
          bubbleCtx = "stretch";
          setMouthOpen(true);
          setTimeout(() => setMouthOpen(false), 700);
          durationMs = 1800;
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

  // === ZOOMIES: random sudden burst of running ===
  useEffect(() => {
    if (state === "gone") return;
    const cfg = PERSONALITIES[personality];
    const id = setInterval(() => {
      const s = stateRef.current;
      if (s !== "idle" && s !== "wandering") return;
      // Probability scales with playfulness
      if (Math.random() < cfg.playfulness * 0.18) {
        setState("zoomies");
        showCtxBubble("zoomies", 1500);
      }
    }, 22000);
    return () => clearInterval(id);
  }, [state, personality, showCtxBubble]);

  // === Zoomies execution: rapid random targets for ~4 seconds ===
  useEffect(() => {
    if (state !== "zoomies") return;
    let count = 0;
    const maxBursts = 5;
    const pickZoomTarget = () => {
      const b = getBounds();
      setTarget({
        x: rand(b.minX + 80, b.maxX - 80),
        y: rand(b.minY + 40, b.maxY - 40),
      });
    };
    pickZoomTarget();
    const burstId = setInterval(() => {
      count++;
      if (count >= maxBursts) {
        clearInterval(burstId);
        return;
      }
      pickZoomTarget();
    }, 650);
    const endId = setTimeout(() => {
      clearInterval(burstId);
      setState("idle");
      setTarget(null);
      // Confused after-effect
      setIdleAction("derp");
      showCtxBubble("derp", 1600);
      setTimeout(() => setIdleAction(null), 1700);
    }, 4200);
    return () => {
      clearInterval(burstId);
      clearTimeout(endId);
    };
  }, [state, showCtxBubble]);

  // === Cursor awareness when idle (look toward cursor) ===
  useEffect(() => {
    if (state !== "idle") return;
    const cfg = PERSONALITIES[personality];
    if (cfg.curiosity < 0.4) return;
    const id = setInterval(() => {
      const c = cursorRef.current;
      if (!c) return;
      const cur = posRef.current;
      const d = distance(cur, c);
      if (d < 250 && Date.now() - lastCursorMoveRef.current < 1500) {
        // Face the cursor
        setDirection(c.x > cur.x ? "right" : "left");
        setPupilDilate(true);
        setTimeout(() => setPupilDilate(false), 1400);
      }
    }, 800);
    return () => clearInterval(id);
  }, [state, personality]);

  // === High-level decision making ===
  useEffect(() => {
    if (state === "gone") {
      const id = setTimeout(() => {
        if (typeof window === "undefined") return;
        const fromLeft = Math.random() < 0.5;
        const b = getBounds();
        setPos({
          x: fromLeft ? -80 : window.innerWidth + 80,
          y: rand(b.minY + 40, b.maxY - 40),
        });
        setDirection(fromLeft ? "right" : "left");
        headingRef.current = fromLeft ? 0 : Math.PI;
        setState("wandering");
        setHunger(50);
        setAffection(50);
        showCtxBubble("greet", 2400);
      }, LEAVE_DURATION_MS);
      return () => clearTimeout(id);
    }

    const cfg = PERSONALITIES[personality];

    const decisionId = setInterval(() => {
      const s = stateRef.current;
      if (s === "eating" || s === "annoyed" || s === "leaving" || s === "gone" || s === "being_petted" || s === "pooping" || s === "zoomies") return;

      // Laser dominates
      if (laserRef.current.active) {
        if (s !== "chasing_laser") {
          setState("chasing_laser");
          showCtxBubble("playful", 1200);
        }
        return;
      }

      // Hungry?
      if (hunger > 60 && foodAmount > 0) {
        setState("seeking_food");
        setTarget({ x: foodPos.x + 18, y: foodPos.y - 8 });
        showCtxBubble("hungry", 1500);
        return;
      }

      // Sleep?
      if (affection > 65 && hunger < 35 && Math.random() < cfg.sleepiness * 0.55) {
        setState("sleeping");
        setTarget(null);
        showCtxBubble("sleepy", 3200);
        return;
      }

      // From idle: maybe wander
      if (s === "idle" || s === "sleeping") {
        if (s === "sleeping" && Math.random() > 0.4) return; // stay sleeping more often
        const b = getBounds();
        setState("wandering");
        setTarget({
          x: rand(b.minX + 40, b.maxX - 40),
          y: rand(b.minY + 30, b.maxY - 30),
        });
      } else if (s === "wandering") {
        // 40% pause when reaching target
        if (Math.random() < 0.4) {
          setState("idle");
          setTarget(null);
        } else {
          const b = getBounds();
          setTarget({
            x: rand(b.minX + 40, b.maxX - 40),
            y: rand(b.minY + 30, b.maxY - 30),
          });
        }
      }
    }, 4000);

    return () => clearInterval(decisionId);
  }, [state, hunger, foodAmount, foodPos.x, foodPos.y, personality, showCtxBubble]);

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

  // === Pooping urge: random check, only triggers when calm ===
  useEffect(() => {
    if (state === "gone") return;
    const id = setInterval(() => {
      const s = stateRef.current;
      // Only trigger when chill states
      if (s !== "idle" && s !== "wandering") return;
      if (Math.random() < POOP_CHANCE) {
        setTarget(null);
        setState("pooping");
      }
    }, POOP_CHECK_MS);
    return () => clearInterval(id);
  }, [state]);

  // === Pooping action: stop, do the deed, drop poop, idle ===
  useEffect(() => {
    if (state !== "pooping") return;
    showCtxBubble("potty_pre", POOP_DURATION_MS - 200);
    const id = setTimeout(() => {
      const cur = posRef.current;
      // Place poop slightly behind the cat (behind = opposite of direction)
      const offset = direction === "right" ? -22 : 22;
      const newPoop: Poop = {
        id: Date.now() + Math.random(),
        x: cur.x + offset,
        y: cur.y + 18,
        createdAt: Date.now(),
      };
      setPoops((p) => [...p, newPoop]);
      showCtxBubble("potty_post", 2200);
      setState("idle");
    }, POOP_DURATION_MS);
    return () => clearTimeout(id);
  }, [state, direction, showCtxBubble]);

  // === Auto-cleanup poops after lifetime ===
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
    headingRef.current = exitLeft ? Math.PI : 0;
    setDirection(exitLeft ? "left" : "right");
    showCtxBubble("exit", 1800);
    const id = setTimeout(() => setState("gone"), 6500);
    return () => clearTimeout(id);
  }, [state, showCtxBubble]);

  // === Movement loop with steering + bounds ===
  useEffect(() => {
    if (state === "gone") {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;

      const s = stateRef.current;
      let tgt = targetRef.current;

      // Laser overrides target
      if (s === "chasing_laser") {
        if (laserRef.current.active) {
          tgt = { x: laserRef.current.x, y: laserRef.current.y - 10 };
        } else {
          setState("idle");
          setIsMoving(false);
          animationRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      // No movement states
      if (!tgt || s === "sleeping" || s === "eating" || s === "being_petted" || s === "idle" || s === "annoyed" || s === "pooping") {
        setIsMoving(false);
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      const cfg = PERSONALITIES[persRef.current];
      const cur = posRef.current;
      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Speed by state
      let baseSpeed: number;
      if (s === "chasing_laser") baseSpeed = 4.0;
      else if (s === "zoomies")  baseSpeed = 5.0;
      else if (s === "leaving")  baseSpeed = 2.6;
      else baseSpeed = 1.5 * cfg.speedMult;

      const step = (baseSpeed * dt) / 16;

      // Arrived?
      if (dist < step + 6) {
        if (s === "seeking_food") {
          setState("eating");
          setTarget(null);
        } else if (s === "leaving") {
          // continue offscreen
        } else if (s === "chasing_laser") {
          // hover near laser, do not stop
        } else if (s === "wandering") {
          setState("idle");
          setTarget(null);
        }
        setIsMoving(false);
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      // === Steering: turn toward target gradually ===
      const desiredHeading = Math.atan2(dy, dx);
      const diff = wrapAngle(desiredHeading - headingRef.current);
      const TURN_RATE =
        s === "chasing_laser" ? 0.18 :
        s === "zoomies" ? 0.30 :          // delice savruluyor
        0.08;
      headingRef.current += clamp(diff, -TURN_RATE, TURN_RATE);

      // === Wobble for natural motion ===
      let wHead = headingRef.current;
      if (s === "wandering" || s === "seeking_food") {
        const t = (now / 700) + wobbleSeedRef.current;
        wHead += Math.sin(t) * 0.07;
      }

      const vx = Math.cos(wHead) * step;
      const vy = Math.sin(wHead) * step;

      let nx = cur.x + vx;
      let ny = cur.y + vy;

      // === Bounds: hard clamp + force new target if hit edge ===
      const b = getBounds();
      let bumped = false;

      // Allow leaving state to go offscreen
      if (s !== "leaving") {
        if (nx < b.minX) { nx = b.minX; bumped = true; }
        if (nx > b.maxX) { nx = b.maxX; bumped = true; }
        if (ny < b.minY) { ny = b.minY; bumped = true; }
        if (ny > b.maxY) { ny = b.maxY; bumped = true; }
      }

      if (bumped && s !== "chasing_laser") {
        // Pick target away from edge so cat turns around
        setTarget({
          x: rand(b.minX + 100, b.maxX - 100),
          y: rand(b.minY + 50, b.maxY - 50),
        });
        // Show small confused bubble occasionally
        if (Math.random() < 0.2) showCtxBubble("curious", 1200);
      }

      setPos({ x: nx, y: ny });
      setIsMoving(true);
      // Direction follows actual horizontal motion
      if (Math.abs(vx) > 0.05) setDirection(vx > 0 ? "right" : "left");

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state, showCtxBubble]);

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

  // === Reposition food bowl on resize ===
  useEffect(() => {
    const onResize = () => {
      if (typeof window === "undefined") return;
      setFoodPos({ x: 90, y: window.innerHeight - 36 });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    if (state === "annoyed") {
      showCtxBubble("annoyed", 1200);
      return;
    }

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, pers: next }));
    } catch { /* ignore */ }
    showBubble(`Artık ${PERSONALITIES[next].label} ${PERSONALITIES[next].emoji}`, 2200);
  }, [personality, name, showBubble]);

  const renameCat = useCallback(() => {
    const newName = pickName();
    setName(newName);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: newName, pers: personality }));
    } catch { /* ignore */ }
    showBubble(`Bana ${newName} de`, 2200);
  }, [personality, showBubble]);

  if (!mounted) return null;

  if (state === "gone") {
    return (
      <CatControls
        name={name}
        personality={personality}
        foodAmount={foodAmount}
        onFeed={fillFoodBowl}
        laserActive={laserActive}
        onToggleLaser={toggleLaser}
        hunger={hunger}
        affection={affection}
        onCyclePers={cyclePersonality}
        onRename={renameCat}
        catGone
      />
    );
  }

  const pose = poseFor(state, isMoving, idleAction);

  return (
    <>
      <div
        className={`cat-companion state-${state} pers-${personality}`}
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

      <div className="cat-foodbowl" style={{ left: foodPos.x, top: foodPos.y }}>
        <div className="cat-foodbowl-inner">
          {foodAmount > 0 ? "🍖".repeat(Math.min(3, foodAmount)) : "🥣"}
        </div>
      </div>

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
        name={name}
        personality={personality}
        foodAmount={foodAmount}
        onFeed={fillFoodBowl}
        laserActive={laserActive}
        onToggleLaser={toggleLaser}
        hunger={hunger}
        affection={affection}
        onCyclePers={cyclePersonality}
        onRename={renameCat}
      />
    </>
  );
}

function distance(a: Pos, b: Pos) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
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
            <strong onClick={onRename} title="Tıkla, ismini değiştir">
              {name}
            </strong>
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
            <Heart size={11} /> Sırtına tıklayarak sevebilirsin. Çok sevince sıkılır.
          </p>
        </div>
      )}
    </div>
  );
}
