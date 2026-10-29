import { bakeAll } from '../art.js';
import { state, load } from '../save.js';
import { CASES } from '../config.js';
import { CLERK_CASES, BOSS_CASE } from '../engine/clerkMenus.js';
const CLERK = [...CLERK_CASES, BOSS_CASE];

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    CASES.forEach(id => this.load.json('case:' + id, `data/cases/${id}.json`));
    CLERK.forEach(id => this.load.json('case:' + id, `data/cases/clerk/${id}.json`));
  }

  create() {
    bakeAll(this);
    [...CASES, ...CLERK].forEach(id => { state.cases[id] = this.cache.json.get('case:' + id); });
    load();
    this.scene.start('Title');
  }
}
