// src/audio/engine.js
export class BreathAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bedGain = null;
    this.cueGain = null;
    this.filter = null;
    this.activeBed = null;        // BufferSource or {el, node}
  }

  ensure() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    const ctx = this.ctx;

    this.masterGain = ctx.createGain(); this.masterGain.gain.value = 0.9;
    this.bedGain    = ctx.createGain(); this.bedGain.gain.value = 0.35;
    this.cueGain    = ctx.createGain(); this.cueGain.gain.value = 0.6;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 16000;

    this.bedGain.connect(this.filter);
    this.cueGain.connect(this.filter);
    this.filter.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);
  }

  async loadBuffer(url) {
    this.ensure();
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const arr = await res.arrayBuffer();
    return await this.ctx.decodeAudioData(arr);
  }

  // robust multi-candidate (still OK for cues)
  async loadBufferAny(urls) {
    this.ensure();
    const list = Array.isArray(urls) ? urls : [urls];
    for (const url of list) {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) { console.warn(`[audio] ${url} -> HTTP ${res.status}`); continue; }
        const arr = await res.arrayBuffer();
        const probe = new TextDecoder().decode(arr.slice(0, 32)).toLowerCase();
        if (probe.includes("<!doctype") || probe.includes("<html")) {
          console.warn(`[audio] ${url} -> looks like HTML (bad path)`); continue;
        }
        const buf = await this.ctx.decodeAudioData(arr.slice(0));
        console.info(`[audio] decoded ${url}`);
        return buf;
      } catch (e) {
        console.warn(`[audio] decode failed for ${url}`, e);
      }
    }
    throw new Error("No decodable audio sources");
  }

  // ===== NEW: play loop from a URL using <audio> (best for MP3/M4A ambiences)
  playLoopUrl(url) {
    this.ensure();
    this.stopLoop(); // stop any current bed

    const el = new Audio();
    el.src = url;
    el.loop = true;
    el.crossOrigin = "anonymous"; // safe even if same-origin
    el.preload = "auto";
    // don't call el.play() here; caller should ensure ctx.resume() first

    const node = this.ctx.createMediaElementSource(el);
    node.connect(this.bedGain);

    // start once metadata is ready (safe in dev/prod)
    const start = () => { el.play().catch(() => {}); el.removeEventListener("canplay", start); };
    el.addEventListener("canplay", start);

    this.activeBed = { el, node };
    return this.activeBed;
  }

  // legacy buffer loop (kept for procedural/cues if needed)
  playLoop(buffer) {
    this.ensure();
    this.stopLoop();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.bedGain);
    src.start();
    this.activeBed = src;
    return src;
  }

  stopLoop() {
    if (!this.activeBed) return;
    try {
      if (this.activeBed.el) {
        this.activeBed.el.pause();
        this.activeBed.el.src = "";
        this.activeBed.node && this.activeBed.node.disconnect();
      } else {
        this.activeBed.stop();
      }
    } catch {}
    this.activeBed = null;
  }

  playCue(buffer, whenSec = 0) {
    if (!buffer) return;
    this.ensure();
    const t = this.ctx.currentTime + Math.max(0, whenSec);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.cueGain);
    src.start(t);
  }

  setBedVolume(v) { if (!this.ctx) return; this.bedGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  setCueVolume(v) { if (!this.ctx) return; this.cueGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03); }

  glideInhale(seconds) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.filter.frequency.cancelScheduledValues(t);
    this.filter.frequency.setValueAtTime(500, t);
    this.filter.frequency.linearRampToValueAtTime(1800, t + seconds);
  }
  glideExhale(seconds) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.filter.frequency.cancelScheduledValues(t);
    this.filter.frequency.setValueAtTime(1800, t);
    this.filter.frequency.linearRampToValueAtTime(500, t + seconds);
  }
  holdStill() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.filter.frequency.cancelScheduledValues(t);
    this.filter.frequency.setTargetAtTime(300, t, 0.2);
  }

  // Procedural brown noise stays via AudioBuffer
  makeBrownNoiseBuffer(seconds = 60) {
    this.ensure();
    const sr = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(seconds * sr));
    const buf = this.ctx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
    const fade = Math.min(512, Math.floor(sr * 0.01));
    for (let i = 0; i < fade; i++) {
      const g = i / fade;
      data[i] *= g;
      data[length - 1 - i] *= g;
    }
    return buf;
  }
}
