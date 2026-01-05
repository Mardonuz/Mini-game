export const AudioFx = {
  ctx: null,
  last: 0,
  vol: 0.12,
  samples: {},
  tracks: {},
};

function getCtx() {
  if (!AudioFx.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    AudioFx.ctx = new AC();
  }
  return AudioFx.ctx;
}

export async function preloadSamples() {
  const ctx = getCtx();
  const list = {
    hit: "assets/hit.mp3",
    spawn: "assets/spawn.mp3",
    spell: "assets/spell.mp3",
  };
  for (const [k, url] of Object.entries(list)) {
    try {
      const res = await fetch(url);
      const data = await res.arrayBuffer();
      AudioFx.samples[k] = await ctx.decodeAudioData(data);
    } catch (e) {
      console.warn("Audio load failed for", k, "using fallback noise");
      AudioFx.samples[k] = makeNoiseBuffer(k === "spell" ? 280 : 60);
    }
  }
}

export class TrackPlayer {
  constructor(url, name) {
    this.name = name;
    this.url = url;
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.gain = 1.0;
    this.muted = false;
  }
  play() {
    this.audio.volume = AudioFx.vol * this.gain;
    this.audio.play().catch(() => { });
  }
  setVolume(v) {
    this.gain = v;
    this._update();
  }
  toggleMute() {
    this.muted = !this.muted;
    this._update();
  }
  _update() {
    this.audio.volume = this.muted ? 0 : AudioFx.vol * this.gain;
  }
}

export function initMusic() {
  AudioFx.tracks.bgm = new TrackPlayer("assets/bgm.mp3", "Battle");
  AudioFx.tracks.menu = new TrackPlayer("assets/menu.mp3", "Menu");
}

function makeNoiseBuffer(ms = 60) {
  const ctx = getCtx();
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * (ms / 1000));
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  return buf;
}

export function setMasterVolume(v) {
  AudioFx.vol = Math.max(0, Math.min(1, v));
  for (const t in AudioFx.tracks) AudioFx.tracks[t]._update();
}

export function playHit(vol = 0.08) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  if (now - AudioFx.last < 0.03) return;
  AudioFx.last = now;
  const buf = AudioFx.samples.hit || makeNoiseBuffer(60);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = vol * AudioFx.vol;
  src.connect(g); g.connect(ctx.destination);
  src.start();
}

export function playSpell(vol = 0.12) {
  const ctx = getCtx();
  const buf = AudioFx.samples.spell || makeNoiseBuffer(280);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = vol * AudioFx.vol;
  src.connect(g); g.connect(ctx.destination);
  src.start();
}

export function playSpawn(vol = 0.06) {
  const ctx = getCtx();
  const buf = AudioFx.samples.spawn || makeNoiseBuffer(50);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = vol * AudioFx.vol;
  src.connect(g); g.connect(ctx.destination);
  src.start();
}
