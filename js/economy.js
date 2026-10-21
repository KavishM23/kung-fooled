'use strict';
// Coins, the item shop, upgrades and rewards. Everything you can buy is data here.
(function (KF) {
  // Slots: each item sets some look fields. Price 0 = owned from the start.
  const ITEMS = [
    // outfit
    { id: 'o_teal', slot: 'outfit', name: 'CLASSIC VEST', price: 0, look: { top: 'teal', style: 'vest', pants: 'indigo', trim: null } },
    { id: 'o_ronin', slot: 'outfit', name: 'CRIMSON GI', price: 120, look: { top: 'crimson', style: 'gi', pants: 'white', trim: 'white' } },
    { id: 'o_shinobi', slot: 'outfit', name: 'SHADOW GARB', price: 150, look: { top: 'black', style: 'gi', pants: 'black', trim: 'gray' } },
    { id: 'o_sakura', slot: 'outfit', name: 'SAKURA ROBE', price: 180, look: { top: 'pink', style: 'robe', pants: 'navy', trim: 'white' } },
    { id: 'o_jarl', slot: 'outfit', name: 'NORTHMAN FURS', price: 200, look: { top: 'hide', style: 'fur', pants: 'gray', trim: 'ivory' } },
    { id: 'o_neon', slot: 'outfit', name: 'NEON GLITCH', price: 220, look: { top: 'purple', style: 'vest', pants: 'black', trim: 'lime' } },
    { id: 'o_armor', slot: 'outfit', name: 'IRON ARMOR', price: 300, look: { top: 'steel', style: 'armor', pants: 'red', trim: null } },
    { id: 'o_gold', slot: 'outfit', name: 'GOLD CHAMPION', price: 500, look: { top: 'gold', style: 'gi', pants: 'white', trim: 'white' } },
    // head
    { id: 'h_orange', slot: 'head', name: 'ORANGE BAND', price: 0, look: { band: 'orange', head: 'none' } },
    { id: 'h_white', slot: 'head', name: 'WHITE BAND', price: 30, look: { band: 'white', head: 'none' } },
    { id: 'h_red', slot: 'head', name: 'RED BAND', price: 30, look: { band: 'red', head: 'none' } },
    { id: 'h_blue', slot: 'head', name: 'BLUE BAND', price: 30, look: { band: 'blue', head: 'none' } },
    { id: 'h_bare', slot: 'head', name: 'NO HEADWEAR', price: 0, look: { band: 'none', head: 'none' } },
    { id: 'h_straw', slot: 'head', name: 'STRAW HAT', price: 90, look: { band: 'none', head: 'straw' } },
    { id: 'h_hood', slot: 'head', name: 'SHINOBI HOOD', price: 90, look: { band: 'purple', head: 'hood' } },
    { id: 'h_horned', slot: 'head', name: 'HORNED HELM', price: 140, look: { band: 'none', head: 'horned' } },
    { id: 'h_kabuto', slot: 'head', name: 'KABUTO', price: 160, look: { band: 'none', head: 'kabuto' } },
    // hair
    { id: 'r_spiky', slot: 'hair', name: 'SPIKY', price: 0, look: { hair: 'spiky' } },
    { id: 'r_topknot', slot: 'hair', name: 'TOPKNOT', price: 40, look: { hair: 'topknot' } },
    { id: 'r_long', slot: 'hair', name: 'LONG', price: 40, look: { hair: 'long' } },
    { id: 'r_braid', slot: 'hair', name: 'BRAID', price: 50, look: { hair: 'braid' } },
    { id: 'r_mohawk', slot: 'hair', name: 'MOHAWK', price: 60, look: { hair: 'mohawk' } },
    { id: 'r_bald', slot: 'hair', name: 'SHAVED', price: 30, look: { hair: 'bald' } },
    // hair colour
    { id: 'c_black', slot: 'colour', name: 'BLACK HAIR', price: 0, look: { hairColor: 'black' } },
    { id: 'c_brown', slot: 'colour', name: 'BROWN HAIR', price: 20, look: { hairColor: 'brown' } },
    { id: 'c_blond', slot: 'colour', name: 'BLOND HAIR', price: 30, look: { hairColor: 'blond' } },
    { id: 'c_red', slot: 'colour', name: 'RED HAIR', price: 30, look: { hairColor: 'red' } },
    { id: 'c_white', slot: 'colour', name: 'WHITE HAIR', price: 40, look: { hairColor: 'white' } },
    { id: 'c_blue', slot: 'colour', name: 'BLUE HAIR', price: 50, look: { hairColor: 'blue' } },
    { id: 'c_pink', slot: 'colour', name: 'PINK HAIR', price: 50, look: { hairColor: 'pink' } },
    // fists
    { id: 'w_cream', slot: 'fists', name: 'CLOTH WRAPS', price: 0, look: { wraps: 'cream' } },
    { id: 'w_black', slot: 'fists', name: 'BLACK WRAPS', price: 25, look: { wraps: 'black' } },
    { id: 'w_red', slot: 'fists', name: 'RED WRAPS', price: 25, look: { wraps: 'red' } },
    { id: 'w_steel', slot: 'fists', name: 'STEEL KNUCKLES', price: 60, look: { wraps: 'steel' } },
    { id: 'w_gold', slot: 'fists', name: 'GOLD GAUNTLETS', price: 80, look: { wraps: 'gold' } },
    // face
    { id: 'f_none', slot: 'face', name: 'CLEAN SHAVEN', price: 0, look: { beard: false } },
    { id: 'f_beard', slot: 'face', name: 'MIGHTY BEARD', price: 60, look: { beard: true } },
    // skin tones are free
    { id: 's_tan', slot: 'skin', name: 'SKIN: TAN', price: 0, look: { skin: 'tan' } },
    { id: 's_light', slot: 'skin', name: 'SKIN: LIGHT', price: 0, look: { skin: 'light' } },
    { id: 's_pale', slot: 'skin', name: 'SKIN: PALE', price: 0, look: { skin: 'pale' } },
    { id: 's_dark', slot: 'skin', name: 'SKIN: DARK', price: 0, look: { skin: 'dark' } },
  ];
  const SLOTS = ['outfit', 'head', 'hair', 'colour', 'fists', 'face', 'skin'];

  // Special moves (fights). Cost meter; one equipped at a time.
  const SPECIALS = [
    { id: 'wave', name: 'SPIRIT WAVE', price: 0, desc: 'ENERGY BLAST THAT TRAVELS' },
    { id: 'rush', name: 'TIGER RUSH', price: 150, desc: 'DASHING ELBOW, HARD TO DODGE' },
    { id: 'spin', name: 'WHIRLWIND KICK', price: 200, desc: 'SPINNING MULTI-HIT KICK' },
    { id: 'stomp', name: 'QUAKE STOMP', price: 260, desc: 'SHOCKWAVE ALONG THE GROUND' },
  ];

  // Stat upgrades: 5 levels each.
  const UPGRADES = [
    { id: 'power', name: 'POWER', desc: '+15% DAMAGE PER LEVEL' },
    { id: 'guard', name: 'GUARD', desc: '-8% DAMAGE TAKEN PER LEVEL' },
    { id: 'health', name: 'HEALTH', desc: '+15 MAX HEALTH PER LEVEL' },
    { id: 'speed', name: 'SPEED', desc: 'FASTER ATTACKS AND FOOTWORK' },
  ];
  const UPGRADE_COST = [50, 100, 170, 260, 380];

  const E = {
    ITEMS, SLOTS, SPECIALS, UPGRADES, UPGRADE_COST, MAX_UPGRADE: 5,
    item(id) { return ITEMS.find((i) => i.id === id); },
    save() { return KF.Save.data; },
    get coins() { return this.save().coins; },
    owns(id) { const it = this.item(id) || SPECIALS.find((s) => s.id === id); return !!(it && (it.price === 0 || this.save().owned[id])); },
    equipped(slot) { return this.save().equip[slot]; },
    // The player's look = defaults overlaid with every equipped item.
    look() {
      const look = Object.assign({}, KF.Sprites.DEFAULT_LOOK);
      for (const slot of SLOTS) { const it = this.item(this.save().equip[slot]); if (it) Object.assign(look, it.look); }
      return look;
    },
    buy(id) {
      const it = this.item(id) || SPECIALS.find((s) => s.id === id);
      const d = this.save();
      if (!it || this.owns(id) || d.coins < it.price) return false;
      d.coins -= it.price; d.owned[id] = true; KF.Save.write();
      return true;
    },
    equip(id) {
      const it = this.item(id);
      if (it && this.owns(id)) { this.save().equip[it.slot] = id; KF.Save.write(); KF.Sprites.setLook(this.look()); return true; }
      const sp = SPECIALS.find((s) => s.id === id);
      if (sp && this.owns(id)) { this.save().equip.special = id; KF.Save.write(); return true; }
      return false;
    },
    level(stat) { return this.save().upg[stat] || 0; },
    upgradeCost(stat) { const l = this.level(stat); return l >= 5 ? null : UPGRADE_COST[l]; },
    upgrade(stat) {
      const c = this.upgradeCost(stat), d = this.save();
      if (c === null || d.coins < c) return false;
      d.coins -= c; d.upg[stat] = this.level(stat) + 1; KF.Save.write();
      return true;
    },
    earn(n) { this.save().coins += n; KF.Save.write(); return n; },
    // Player's fighting stats from upgrades.
    playerStats() {
      return {
        power: 1 + 0.15 * this.level('power'),
        guard: 1 - 0.08 * this.level('guard'),
        health: 100 + 15 * this.level('health'),
        speed: 1 + 0.06 * this.level('speed'),
        special: this.save().equip.special || 'wave',
      };
    },
  };
  KF.Economy = E;
})(window.KF);
