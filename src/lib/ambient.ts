// Asset gerektirmeyen ortam sesi motoru — tüm katmanlar Web Audio ile sentezlenir.
// Yağmur, dalga, rüzgâr, ateş ve "derin" (kahverengi gürültü) katmanları beyaz/kahverengi
// gürültü tamponlarından üretilir; harici mp3/ses dosyası yoktur, bu yüzden hiç bozulmaz.

export type LayerId = "rain" | "waves" | "wind" | "fire" | "derin";

export type LayerMeta = {
  id: LayerId;
  label: string;
};

export const LAYERS: LayerMeta[] = [
  { id: "rain", label: "Yağmur" },
  { id: "waves", label: "Dalga" },
  { id: "wind", label: "Rüzgâr" },
  { id: "fire", label: "Ateş" },
  { id: "derin", label: "Derin" },
];

type Layer = {
  source: AudioBufferSourceNode;
  tremolo: GainNode; // LFO ile modüle edilen "doku" kazancı
  gain: GainNode; // kullanıcı seviyesi (0 = kapalı)
  lfos: OscillatorNode[];
  volume: number; // hedef kullanıcı seviyesi
  on: boolean;
};

function makeNoiseBuffer(ctx: AudioContext, kind: "white" | "brown", seconds = 4): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (kind === "white") {
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
  } else {
    // Kahverengi gürültü — sızıntılı integral, daha yumuşak/derin
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
  }
  return buffer;
}

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers = new Map<LayerId, Layer>();
  private whiteBuf: AudioBuffer | null = null;
  private brownBuf: AudioBuffer | null = null;
  private masterVolume = 0.6;
  private started = false;

  get isStarted(): boolean {
    return this.started;
  }

  // İlk kullanıcı etkileşiminde çağrılmalı (tarayıcı otomatik sesi engeller).
  async ensureStarted(): Promise<void> {
    if (this.started) {
      if (this.ctx && this.ctx.state === "suspended") {
        await this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AC: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      return;
    }
    const ctx = new AC();
    await ctx.resume().catch(() => {});
    const master = ctx.createGain();
    master.gain.value = this.masterVolume;
    master.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.whiteBuf = makeNoiseBuffer(ctx, "white");
    this.brownBuf = makeNoiseBuffer(ctx, "brown");
    this.started = true;

    LAYERS.forEach((meta) => this.buildLayer(meta.id));
  }

  private buildLayer(id: LayerId): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.whiteBuf || !this.brownBuf) {
      return;
    }

    const source = ctx.createBufferSource();
    source.loop = true;

    const tremolo = ctx.createGain();
    const gain = ctx.createGain();
    gain.gain.value = 0;

    const lfos: OscillatorNode[] = [];
    const filters: BiquadFilterNode[] = [];

    const addLfo = (target: AudioParam, freq: number, depth: number, base: number) => {
      target.value = base;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = freq;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = depth;
      lfo.connect(lfoGain).connect(target);
      lfo.start();
      lfos.push(lfo);
    };

    switch (id) {
      case "rain": {
        source.buffer = this.whiteBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 900;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 8200;
        filters.push(hp, lp);
        addLfo(tremolo.gain, 7, 0.08, 0.92); // hafif çıtırtı
        break;
      }
      case "waves": {
        source.buffer = this.brownBuf;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 520;
        filters.push(lp);
        addLfo(tremolo.gain, 0.11, 0.55, 0.6); // yavaş kabarış
        break;
      }
      case "wind": {
        source.buffer = this.brownBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 520;
        bp.Q.value = 0.7;
        filters.push(bp);
        addLfo(bp.frequency, 0.07, 380, 620); // esinti dalgaları
        addLfo(tremolo.gain, 0.13, 0.32, 0.78);
        break;
      }
      case "fire": {
        source.buffer = this.brownBuf;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 1100;
        filters.push(lp);
        addLfo(tremolo.gain, 6.5, 0.25, 0.82); // titreşen alev
        addLfo(tremolo.gain, 1.3, 0.18, 0); // yavaş çıtırdama
        break;
      }
      case "derin":
      default: {
        source.buffer = this.brownBuf;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 460;
        filters.push(lp);
        tremolo.gain.value = 1;
        break;
      }
    }

    // source -> filtreler -> tremolo -> gain -> master
    let node: AudioNode = source;
    filters.forEach((f) => {
      node.connect(f);
      node = f;
    });
    node.connect(tremolo).connect(gain).connect(master);
    source.start();

    this.layers.set(id, { source, tremolo, gain, lfos, volume: 0.5, on: false });
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  setLayer(id: LayerId, on: boolean, volume?: number): void {
    const layer = this.layers.get(id);
    if (!layer || !this.ctx) {
      return;
    }
    layer.on = on;
    if (typeof volume === "number") {
      layer.volume = Math.max(0, Math.min(1, volume));
    }
    const target = on ? layer.volume : 0;
    layer.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.35);
  }

  setLayerVolume(id: LayerId, volume: number): void {
    const layer = this.layers.get(id);
    if (!layer || !this.ctx) {
      return;
    }
    layer.volume = Math.max(0, Math.min(1, volume));
    if (layer.on) {
      layer.gain.gain.setTargetAtTime(layer.volume, this.ctx.currentTime, 0.1);
    }
  }

  stopAll(): void {
    LAYERS.forEach((meta) => this.setLayer(meta.id, false));
  }
}

let singleton: AmbientEngine | null = null;

export function getAmbientEngine(): AmbientEngine {
  if (!singleton) {
    singleton = new AmbientEngine();
  }
  return singleton;
}
