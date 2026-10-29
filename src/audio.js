// 原創 chiptune：以 Web Audio 即時合成，不使用任何外部音檔
import { input } from './input.js';

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(n) {
  if (!n) return 0;
  const m = n.match(/^([A-G]#?)(\d)$/);
  const midi = (parseInt(m[2]) + 1) * 12 + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
// 'E5:.5 G5:.5 -:1' → [[note, beats]]
function seq(str) {
  return str.trim().split(/\s+/).map(t => {
    const [n, b] = t.split(':');
    return [n === '-' ? null : n, parseFloat(b)];
  });
}

const SONGS = {
  // 急診室的日常（C 大調，輕快）
  map: {
    bpm: 112,
    tracks: [
      { wave: 'square', vol: 0.05, notes: seq(`
        E5:.5 G5:.5 C6:1 B5:.5 G5:.5 A5:1
        G5:.5 E5:.5 F5:.5 G5:.5 E5:2
        D5:.5 E5:.5 F5:1 A5:.5 G5:.5 F5:1
        E5:.5 D5:.5 C5:.5 D5:.5 E5:2
        E5:.5 G5:.5 C6:1 D6:.5 C6:.5 B5:1
        A5:.5 B5:.5 C6:.5 A5:.5 G5:2
        F5:.5 A5:.5 G5:.5 F5:.5 E5:.5 D5:.5 C5:1
        D5:1 G4:1 C5:2`) },
      { wave: 'triangle', vol: 0.12, notes: seq(`
        C3:1 G3:1 C3:1 G3:1  A2:1 E3:1 A2:1 E3:1
        F2:1 C3:1 F2:1 C3:1  C3:1 G3:1 G2:1 B2:1
        C3:1 G3:1 C3:1 G3:1  A2:1 E3:1 F2:1 C3:1
        F2:1 C3:1 G2:1 D3:1  G2:1 B2:1 C3:2`) },
    ],
  },
  // 生命徵象（A 小調，緊張）
  battle: {
    bpm: 152,
    tracks: [
      { wave: 'square', vol: 0.045, notes: seq(`
        A5:.5 -:.5 A5:.5 C6:.5 B5:.5 A5:.5 E5:1
        F5:.5 E5:.5 D5:.5 E5:.5 A4:2
        F5:.5 -:.5 F5:.5 A5:.5 G5:.5 F5:.5 C5:1
        D5:.5 E5:.5 F5:.5 G5:.5 B5:1 G5:1
        A5:.5 -:.5 A5:.5 C6:.5 E6:.5 D6:.5 C6:1
        B5:.5 C6:.5 B5:.5 A5:.5 E5:2
        F5:.5 A5:.5 C6:.5 A5:.5 D6:1 C6:1
        B5:.5 G#5:.5 E5:.5 G#5:.5 B5:2`) },
      { wave: 'triangle', vol: 0.13, notes: seq(`
        A2:.5 A3:.5 A2:.5 A3:.5 A2:.5 A3:.5 A2:.5 A3:.5
        A2:.5 A3:.5 A2:.5 A3:.5 G2:.5 G3:.5 G2:.5 G3:.5
        F2:.5 F3:.5 F2:.5 F3:.5 F2:.5 F3:.5 F2:.5 F3:.5
        G2:.5 G3:.5 G2:.5 G3:.5 G2:.5 G3:.5 G2:.5 G3:.5
        A2:.5 A3:.5 A2:.5 A3:.5 A2:.5 A3:.5 A2:.5 A3:.5
        A2:.5 A3:.5 A2:.5 A3:.5 G2:.5 G3:.5 G2:.5 G3:.5
        F2:.5 F3:.5 F2:.5 F3:.5 F2:.5 F3:.5 F2:.5 F3:.5
        E2:.5 E3:.5 E2:.5 E3:.5 E2:.5 E3:.5 E2:.5 E3:.5`) },
    ],
  },
  // 標題（同一主題、放慢）
  title: null,
};
SONGS.title = { ...SONGS.map, bpm: 92 };

class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('erq.muted') === '1'; } catch (_) {}
    this.song = null;
    this.wanted = null;
    this.timer = null;
    input.onFirstGesture.push(() => this.unlock());
  }

  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    if (this.wanted) this.play(this.wanted, true);
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('erq.muted', m ? '1' : '0'); } catch (_) {}
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  }

  tone(f, start, dur, wave = 'square', vol = 0.06, slideTo = null) {
    if (!this.ctx || !f) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
    g.gain.setValueAtTime(vol, start + Math.max(0.01, dur - 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  noise(start, dur, vol = 0.08, fromHz = 4000, toHz = 600) {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(fromHz, start);
    f.frequency.exponentialRampToValueAtTime(toHz, start + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(start);
  }

  // ---------- 背景音樂 ----------
  play(name, force = false) {
    this.wanted = name;
    if (!this.ctx) return;
    if (this.song && this.song.name === name && !force) return;
    this.stop(false);
    const s = SONGS[name];
    if (!s) return;
    const beat = 60 / s.bpm;
    const total = s.tracks[0].notes.reduce((a, n) => a + n[1], 0);
    this.song = { name, s, beat, total, t0: this.ctx.currentTime + 0.1, idx: s.tracks.map(() => 0), next: s.tracks.map(() => 0), loop: 0 };
    this.timer = setInterval(() => this._schedule(), 30);
    this._schedule();
  }

  stop(clearWanted = true) {
    if (clearWanted) this.wanted = null;
    clearInterval(this.timer);
    this.timer = null;
    this.song = null;
  }

  _schedule() {
    const sg = this.song;
    if (!sg || !this.ctx) return;
    const ahead = this.ctx.currentTime + 0.15;
    sg.s.tracks.forEach((tr, ti) => {
      for (;;) {
        const when = sg.t0 + sg.next[ti] * sg.beat;
        if (when > ahead) break;
        const [n, b] = tr.notes[sg.idx[ti]];
        if (n && when >= this.ctx.currentTime - 0.02) this.tone(freq(n), when, b * sg.beat * 0.9, tr.wave, tr.vol);
        sg.next[ti] += b;
        sg.idx[ti] += 1;
        if (sg.idx[ti] >= tr.notes.length) sg.idx[ti] = 0;
      }
    });
  }

  // ---------- 音效 ----------
  sfx(name, opt = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case 'cursor': this.tone(1320, t, 0.035, 'square', 0.04); break;
      case 'select': this.tone(988, t, 0.05, 'square', 0.05); this.tone(1480, t + 0.05, 0.06, 'square', 0.05); break;
      case 'cancel': this.tone(660, t, 0.06, 'square', 0.04); this.tone(440, t + 0.05, 0.06, 'square', 0.04); break;
      case 'bump': this.tone(110, t, 0.08, 'square', 0.06); break;
      case 'text': this.tone(1760, t, 0.012, 'square', 0.015); break;
      case 'beep': this.tone(opt.f || 1000, t, 0.06, 'sine', 0.035); break;
      case 'good': this.tone(1568, t, 0.07, 'square', 0.04); this.tone(2093, t + 0.07, 0.1, 'square', 0.04); break;
      case 'bad': this.tone(196, t, 0.12, 'square', 0.06); this.tone(185, t + 0.1, 0.18, 'square', 0.06); break;
      case 'alarm':
        for (let i = 0; i < 3; i++) { this.tone(988, t + i * 0.3, 0.14, 'square', 0.06); this.tone(784, t + i * 0.3 + 0.15, 0.14, 'square', 0.06); }
        break;
      case 'siren':
        for (let i = 0; i < 4; i++) this.tone(700, t + i * 0.25, 0.25, 'square', 0.05, 1100);
        break;
      case 'hiss': this.noise(t, 0.9, 0.12, 6000, 900); break;
      case 'heal': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * 0.07, 0.12, 'square', 0.045)); break;
      case 'arrest': this.tone(880, t, 2.2, 'sine', 0.06); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.12, 0.12, 'square', 0.05)); this.tone(1047, t + 0.5, 0.5, 'square', 0.05); this.tone(1319, t + 0.5, 0.5, 'square', 0.035); break;
      case 'fail': [659, 622, 587, 554].forEach((f, i) => this.tone(f, t + i * 0.28, 0.3, 'square', 0.05)); break;
      case 'save': this.tone(784, t, 0.08, 'square', 0.05); this.tone(1047, t + 0.1, 0.08, 'square', 0.05); this.tone(1568, t + 0.2, 0.16, 'square', 0.05); break;
    }
  }
}

export const audio = new Audio();
