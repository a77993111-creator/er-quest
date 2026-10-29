import { bakeAll } from '../art.js';
import { state, load, persist } from '../save.js';
import { bakePets } from '../petArt.js';
import { PETS } from '../cosmetics.js';
import { fx, checkAdmin, setAdminDevice, adminDevice } from '../progress.js';
import { uiConfig } from '../ui.js';
import { CASES } from '../config.js';
import { CLERK_CASES, BOSS_CASE, PGY_CASES, PGY_BOSS } from '../engine/clerkMenus.js';
const CLERK = [...CLERK_CASES, BOSS_CASE];
const PGY = [...PGY_CASES, PGY_BOSS];

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    CASES.forEach(id => this.load.json('case:' + id, `data/cases/${id}.json`));
    CLERK.forEach(id => this.load.json('case:' + id, `data/cases/clerk/${id}.json`));
    PGY.forEach(id => this.load.json('case:' + id, `data/cases/pgy/${id}.json`));
  }

  create() {
    bakeAll(this);
    [...CASES, ...CLERK, ...PGY].forEach(id => { const c = this.cache.json.get('case:' + id); if (c) state.cases[id] = c; });
    bakePets(this, PETS.map(p => p.id));
    load();
    state.save.admin = adminDevice();
    uiConfig.textMs = fx.textMs(state.save);
    const code = new URLSearchParams(location.search).get('admin');
    const go = () => this.scene.start('Title');
    if (code) {
      checkAdmin(code.trim()).then(ok => {
        if (ok) { setAdminDevice(true); state.save.admin = true; state.adminNotice = true; persist(); }
        else state.adminNotice = 'bad';
        go();
      });
    } else go();
  }
}
