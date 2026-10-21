'use strict';
// Coins, the item shop, upgrades and rewards. Everything you can buy is data here.
(function (KF) {
  // Slots: each item sets some look fields. Price 0 = owned from the start.
  // Each slot's items reset every look field the slot owns, so switching items never leaves
  // pieces of the previous one behind (shorts from the kickboxer under a suit, say).
  const O = (look) => ({ legs: null, shins: null, belt: null, tie: null, tieColor: null, glow: null, material: null, build: null, ...look });
  const Hd = (look) => ({ band: 'none', head: 'none', hat: null, ...look });
  const Fc = (look) => ({ beard: false, moustache: false, visor: null, shades: null, mask: null, ...look });
  const Fi = (look) => ({ arm: null, ...look });
  const X = (look) => ({ cape: null, scarf: null, prop: null, ...look });
  const ITEMS = [
    // outfit
    { id: 'o_teal', slot: 'outfit', name: 'CLASSIC VEST', price: 0, look: O({ top: 'teal', style: 'vest', pants: 'indigo', trim: null }) },
    { id: 'o_ronin', slot: 'outfit', name: 'CRIMSON GI', price: 120, look: O({ top: 'crimson', style: 'gi', pants: 'white', trim: 'white' }) },
    { id: 'o_karate', slot: 'outfit', name: 'KARATE GI', price: 120, look: O({ top: 'white', style: 'gi', pants: 'white', trim: null, belt: 'black' }) },
    { id: 'o_shinobi', slot: 'outfit', name: 'SHADOW GARB', price: 150, look: O({ top: 'black', style: 'gi', pants: 'black', trim: 'gray' }) },
    { id: 'o_kick', slot: 'outfit', name: 'KICKBOXER', price: 150, look: O({ top: 'coral', style: 'tank', pants: 'black', legs: 'shorts', shins: 'cream', trim: null }) },
    { id: 'o_track', slot: 'outfit', name: 'TRACKSUIT', price: 160, look: O({ top: 'blue', style: 'track', pants: 'blue', trim: 'white' }) },
    { id: 'o_sakura', slot: 'outfit', name: 'SAKURA ROBE', price: 180, look: O({ top: 'pink', style: 'robe', pants: 'navy', trim: 'white' }) },
    { id: 'o_tang', slot: 'outfit', name: 'MASTER TANGZHUANG', price: 200, look: O({ top: 'slate', style: 'tang', pants: 'navy', trim: 'ivory', belt: 'red' }) },
    { id: 'o_jarl', slot: 'outfit', name: 'NORTHMAN FURS', price: 200, look: O({ top: 'hide', style: 'fur', pants: 'gray', trim: 'ivory' }) },
    { id: 'o_suit', slot: 'outfit', name: 'SHARP SUIT', price: 220, look: O({ top: 'black', style: 'suit', pants: 'charcoal', trim: null, tieColor: 'red' }) },
    { id: 'o_neon', slot: 'outfit', name: 'NEON GLITCH', price: 220, look: O({ top: 'purple', style: 'vest', pants: 'black', trim: 'lime' }) },
    { id: 'o_coat', slot: 'outfit', name: 'TRENCH COAT', price: 240, look: O({ top: 'khaki', style: 'coat', pants: 'charcoal', trim: 'black' }) },
    { id: 'o_hero', slot: 'outfit', name: 'HERO SUIT', price: 260, look: O({ top: 'blue', style: 'hero', pants: 'blue', trim: 'yellow', belt: 'yellow' }) },
    { id: 'o_cyber', slot: 'outfit', name: 'CYBER JACKET', price: 280, look: O({ top: 'charcoal', style: 'cyber', pants: 'charcoal', trim: null, glow: 'cyan' }) },
    { id: 'o_armor', slot: 'outfit', name: 'IRON ARMOR', price: 300, look: O({ top: 'steel', style: 'armor', pants: 'red', trim: null }) },
    { id: 'o_gold', slot: 'outfit', name: 'GOLD CHAMPION', price: 500, look: O({ top: 'gold', style: 'gi', pants: 'white', trim: 'white' }) },
    { id: 'o_crystal', slot: 'outfit', name: 'RED CRYSTAL', price: 900, look: O({ style: 'tank', material: 'crystal' }) },
    // head
    { id: 'h_orange', slot: 'head', name: 'ORANGE BAND', price: 0, look: Hd({ band: 'orange' }) },
    { id: 'h_white', slot: 'head', name: 'WHITE BAND', price: 30, look: Hd({ band: 'white' }) },
    { id: 'h_red', slot: 'head', name: 'RED BAND', price: 30, look: Hd({ band: 'red' }) },
    { id: 'h_blue', slot: 'head', name: 'BLUE BAND', price: 30, look: Hd({ band: 'blue' }) },
    { id: 'h_bare', slot: 'head', name: 'NO HEADWEAR', price: 0, look: Hd({}) },
    { id: 'h_cap', slot: 'head', name: 'BALL CAP', price: 50, look: Hd({ head: 'cap', hat: 'red' }) },
    { id: 'h_bowler', slot: 'head', name: 'BOWLER HAT', price: 70, look: Hd({ head: 'bowler', hat: 'black' }) },
    { id: 'h_fedora', slot: 'head', name: 'FEDORA', price: 80, look: Hd({ head: 'fedora', hat: 'khaki' }) },
    { id: 'h_straw', slot: 'head', name: 'STRAW HAT', price: 90, look: Hd({ head: 'straw' }) },
    { id: 'h_hood', slot: 'head', name: 'SHINOBI HOOD', price: 90, look: Hd({ band: 'purple', head: 'hood' }) },
    { id: 'h_cowboy', slot: 'head', name: 'COWBOY HAT', price: 100, look: Hd({ head: 'cowboy', hat: 'hide' }) },
    { id: 'h_tophat', slot: 'head', name: 'TOP HAT', price: 120, look: Hd({ head: 'tophat', hat: 'black' }) },
    { id: 'h_horned', slot: 'head', name: 'HORNED HELM', price: 140, look: Hd({ head: 'horned' }) },
    { id: 'h_kabuto', slot: 'head', name: 'KABUTO', price: 160, look: Hd({ head: 'kabuto' }) },
    { id: 'h_helmet', slot: 'head', name: 'MOTO HELMET', price: 180, look: Hd({ head: 'helmet', hat: 'chrome' }) },
    // hair
    { id: 'r_spiky', slot: 'hair', name: 'SPIKY', price: 0, look: { hair: 'spiky' } },
    { id: 'r_short', slot: 'hair', name: 'SHORT', price: 20, look: { hair: 'short' } },
    { id: 'r_topknot', slot: 'hair', name: 'TOPKNOT', price: 40, look: { hair: 'topknot' } },
    { id: 'r_bun', slot: 'hair', name: 'BUN', price: 40, look: { hair: 'bun' } },
    { id: 'r_long', slot: 'hair', name: 'LONG', price: 40, look: { hair: 'long' } },
    { id: 'r_slick', slot: 'hair', name: 'SLICKED BACK', price: 45, look: { hair: 'slick' } },
    { id: 'r_braid', slot: 'hair', name: 'BRAID', price: 50, look: { hair: 'braid' } },
    { id: 'r_mohawk', slot: 'hair', name: 'MOHAWK', price: 60, look: { hair: 'mohawk' } },
    { id: 'r_afro', slot: 'hair', name: 'AFRO', price: 60, look: { hair: 'afro' } },
    { id: 'r_bald', slot: 'hair', name: 'SHAVED', price: 30, look: { hair: 'bald' } },
    // hair colour
    { id: 'c_black', slot: 'colour', name: 'BLACK HAIR', price: 0, look: { hairColor: 'black' } },
    { id: 'c_brown', slot: 'colour', name: 'BROWN HAIR', price: 20, look: { hairColor: 'brown' } },
    { id: 'c_blond', slot: 'colour', name: 'BLOND HAIR', price: 30, look: { hairColor: 'blond' } },
    { id: 'c_red', slot: 'colour', name: 'RED HAIR', price: 30, look: { hairColor: 'red' } },
    { id: 'c_grey', slot: 'colour', name: 'GREY HAIR', price: 30, look: { hairColor: 'grey' } },
    { id: 'c_white', slot: 'colour', name: 'WHITE HAIR', price: 40, look: { hairColor: 'white' } },
    { id: 'c_blue', slot: 'colour', name: 'BLUE HAIR', price: 50, look: { hairColor: 'blue' } },
    { id: 'c_green', slot: 'colour', name: 'GREEN HAIR', price: 50, look: { hairColor: 'green' } },
    { id: 'c_pink', slot: 'colour', name: 'PINK HAIR', price: 50, look: { hairColor: 'pink' } },
    { id: 'c_magenta', slot: 'colour', name: 'MAGENTA HAIR', price: 60, look: { hairColor: 'magenta' } },
    // fists
    { id: 'w_cream', slot: 'fists', name: 'CLOTH WRAPS', price: 0, look: Fi({ wraps: 'cream' }) },
    { id: 'w_bare', slot: 'fists', name: 'BARE KNUCKLES', price: 0, look: Fi({ wraps: 'skin' }) },
    { id: 'w_black', slot: 'fists', name: 'BLACK WRAPS', price: 25, look: Fi({ wraps: 'black' }) },
    { id: 'w_red', slot: 'fists', name: 'RED WRAPS', price: 25, look: Fi({ wraps: 'red' }) },
    { id: 'w_steel', slot: 'fists', name: 'STEEL KNUCKLES', price: 60, look: Fi({ wraps: 'steel' }) },
    { id: 'w_gold', slot: 'fists', name: 'GOLD GAUNTLETS', price: 80, look: Fi({ wraps: 'gold' }) },
    { id: 'w_cyber', slot: 'fists', name: 'CYBER ARM', price: 240, look: Fi({ wraps: 'chrome', arm: 'cyber' }) },
    // face
    { id: 'f_none', slot: 'face', name: 'CLEAN SHAVEN', price: 0, look: Fc({}) },
    { id: 'f_beard', slot: 'face', name: 'MIGHTY BEARD', price: 60, look: Fc({ beard: true }) },
    { id: 'f_moustache', slot: 'face', name: 'MOUSTACHE', price: 40, look: Fc({ moustache: true }) },
    { id: 'f_shades', slot: 'face', name: 'SHADES', price: 60, look: Fc({ shades: 'black' }) },
    { id: 'f_mask', slot: 'face', name: 'HERO MASK', price: 70, look: Fc({ mask: 'navy' }) },
    { id: 'f_visor', slot: 'face', name: 'CYBER VISOR', price: 120, look: Fc({ visor: 'cyan' }) },
    // extras
    { id: 'x_none', slot: 'extra', name: 'NOTHING EXTRA', price: 0, look: X({}) },
    { id: 'x_scarf', slot: 'extra', name: 'RED SCARF', price: 60, look: X({ scarf: 'red' }) },
    { id: 'x_cane', slot: 'extra', name: 'GENTLEMAN CANE', price: 90, look: X({ prop: 'cane' }) },
    { id: 'x_cape', slot: 'extra', name: 'HERO CAPE', price: 150, look: X({ cape: 'red' }) },
    // skin tones are free
    { id: 's_tan', slot: 'skin', name: 'SKIN: TAN', price: 0, look: { skin: 'tan' } },
    { id: 's_light', slot: 'skin', name: 'SKIN: LIGHT', price: 0, look: { skin: 'light' } },
    { id: 's_pale', slot: 'skin', name: 'SKIN: PALE', price: 0, look: { skin: 'pale' } },
    { id: 's_olive', slot: 'skin', name: 'SKIN: OLIVE', price: 0, look: { skin: 'olive' } },
    { id: 's_dark', slot: 'skin', name: 'SKIN: DARK', price: 0, look: { skin: 'dark' } },
    { id: 's_deep', slot: 'skin', name: 'SKIN: DEEP', price: 0, look: { skin: 'deep' } },
    { id: 's_grey', slot: 'skin', name: 'SKIN: SILVER SCREEN', price: 0, look: { skin: 'grey' } },
  ];
  const SLOTS = ['outfit', 'head', 'hair', 'colour', 'fists', 'face', 'extra', 'skin'];

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
      if (look.wraps === 'skin') look.wraps = look.skin;
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
