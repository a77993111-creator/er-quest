// 統一輸入：鍵盤 + 螢幕虛擬按鍵（D-pad / A / B / START）
// held：目前按住的方向；queue：按鍵事件佇列（UI 以 await next() 取用）

const KEYMAP = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT', W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
  z: 'A', Z: 'A', Enter: 'A', ' ': 'A', j: 'A', J: 'A',
  x: 'B', X: 'B', Escape: 'B', Backspace: 'B', k: 'B', K: 'B',
  Shift: 'START', m: 'START', M: 'START', Tab: 'START',
};
const DIRS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

class InputBus {
  constructor() {
    this.held = { UP: false, DOWN: false, LEFT: false, RIGHT: false, A: false, B: false };
    this.queue = [];
    this.waiters = [];
    this.lastDir = null;
    this.onFirstGesture = [];
  }

  _gesture() {
    const fns = this.onFirstGesture;
    this.onFirstGesture = [];
    fns.forEach(f => f());
  }

  push(key) {
    if (this.waiters.length) {
      const w = this.waiters.shift();
      w(key);
    } else {
      this.queue.push(key);
      if (this.queue.length > 8) this.queue.shift();
    }
  }

  next() {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    return new Promise(res => this.waiters.push(res));
  }

  poll() {
    const q = this.queue;
    this.queue = [];
    return q;
  }

  flush() { this.queue = []; }

  heldDir() {
    if (this.lastDir && this.held[this.lastDir]) return this.lastDir;
    return DIRS.find(d => this.held[d]) || null;
  }

  attachKeyboard() {
    window.addEventListener('keydown', e => {
      const k = KEYMAP[e.key];
      if (!k) return;
      e.preventDefault();
      this._gesture();
      if (DIRS.includes(k)) {
        if (!this.held[k]) this.lastDir = k;
        this.held[k] = true;
        this.push(k); // 方向鍵允許連發（選單捲動）
      } else if (!e.repeat) {
        this.held[k] = true;
        this.push(k);
      }
    });
    window.addEventListener('keyup', e => {
      const k = KEYMAP[e.key];
      if (k) this.held[k] = false;
    });
    window.addEventListener('blur', () => {
      Object.keys(this.held).forEach(k => (this.held[k] = false));
    });
  }

  attachButtons(root) {
    // A / B / START
    root.querySelectorAll('[data-btn]').forEach(el => {
      const k = el.dataset.btn;
      const down = e => {
        e.preventDefault();
        this._gesture();
        el.classList.add('pressed');
        this.held[k] = true;
        this.push(k);
        if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) {}
      };
      const up = e => { e.preventDefault(); el.classList.remove('pressed'); this.held[k] = false; };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    });

    // D-pad：以觸控點相對中心的角度判斷方向，可滑動換方向
    const pad = root.querySelector('#dpad');
    if (!pad) return;
    let active = null;
    const setDir = d => {
      if (d === active) return;
      if (active) { this.held[active] = false; pad.classList.remove('d-' + active); }
      active = d;
      if (d) {
        this.held[d] = true;
        this.lastDir = d;
        pad.classList.add('d-' + d);
        this.push(d);
        if (navigator.vibrate) try { navigator.vibrate(5); } catch (_) {}
      }
    };
    const dirFrom = e => {
      const r = pad.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.12) return active;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP');
    };
    pad.addEventListener('pointerdown', e => {
      e.preventDefault();
      this._gesture();
      try { pad.setPointerCapture(e.pointerId); } catch (_) {}
      setDir(dirFrom(e));
    });
    pad.addEventListener('pointermove', e => { if (active) setDir(dirFrom(e)); });
    const end = e => { e.preventDefault(); setDir(null); };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }
}

export const input = new InputBus();
