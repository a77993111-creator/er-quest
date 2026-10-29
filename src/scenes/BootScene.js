import { bakeAll } from '../art.js';
import { state, load } from '../save.js';
import { CASES } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    CASES.forEach(id => this.load.json('case:' + id, `data/cases/${id}.json`));
  }

  create() {
    bakeAll(this);
    CASES.forEach(id => { state.cases[id] = this.cache.json.get('case:' + id); });
    load();
    this.scene.start('Title');
  }
}
