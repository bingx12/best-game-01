// LAST LIGHT — tuning constants. One place for every number the game balances on:
// the arena, the Keeper, the beacon, the five shade kinds, the ten waves and the upgrade pool.
export const STEP = 1 / 60;

export const ARENA = {
  width: 960,
  height: 600,
  // The beacon sits in the middle of the arena; the shades come for it.
  beaconX: 480,
  beaconY: 300,
  beaconRadius: 26,
  beaconMaxHealth: 150,
};

export const PLAYER = {
  radius: 14,
  speed: 265,
  maxHealth: 3,
  // Seconds of invulnerability after taking a hit.
  invulnTime: 1.1,
  fireInterval: 0.25,
  bulletSpeed: 580,
  bulletDamage: 1,
  bulletRadius: 4,
  dashSpeed: 920,
  dashTime: 0.14,
  dashCooldown: 2.0,
  // Shards drift to the Keeper inside this radius.
  magnetRadius: 80,
  // How many shards one kill is worth on average is set per enemy kind.
};

// A shade kind: what it looks like, how it moves, what it is worth.
export const ENEMY_KINDS = {
  wisp: {
    name: 'Wisp', hp: 1, speed: 98, radius: 10, damage: 1, score: 10, shards: 1,
    color: '#ff5da2', glow: '#ff5da2', shape: 'wisp', target: 'player',
  },
  crawler: {
    name: 'Crawler', hp: 3, speed: 46, radius: 16, damage: 1, score: 15, shards: 2,
    color: '#b388ff', glow: '#b388ff', shape: 'crawler', target: 'beacon',
  },
  spitter: {
    name: 'Spitter', hp: 2, speed: 56, radius: 13, damage: 1, score: 25, shards: 2,
    color: '#e040fb', glow: '#e040fb', shape: 'spitter', target: 'ranged',
    range: 230, shotInterval: 2.3, shotSpeed: 170,
  },
  splitter: {
    name: 'Splitter', hp: 3, speed: 62, radius: 15, damage: 1, score: 30, shards: 2,
    color: '#ffab40', glow: '#ffab40', shape: 'splitter', target: 'player',
  },
  brute: {
    name: 'Brute', hp: 12, speed: 33, radius: 24, damage: 2, score: 50, shards: 4,
    color: '#ff5252', glow: '#ff5252', shape: 'brute', target: 'beacon',
  },
  herald: {
    name: 'Umbral Herald', hp: 70, speed: 29, radius: 34, damage: 2, score: 500, shards: 12,
    color: '#ffd54f', glow: '#ff5252', shape: 'herald', target: 'beacon',
    // Every few seconds the Herald calls two wisps to its side.
    summonInterval: 6,
  },
};

// Ten waves. Each wave is a list of spawn groups; a group releases `count` shades of
// one kind, one every `gap` seconds, from random arena edges. Wave 10 ends the night:
// clear it and dawn breaks.
export const WAVES = [
  { groups: [{ kind: 'wisp', count: 6, gap: 1.1 }] },
  { groups: [{ kind: 'wisp', count: 8, gap: 0.9 }, { kind: 'crawler', count: 2, gap: 2.0 }] },
  { groups: [{ kind: 'wisp', count: 8, gap: 0.8 }, { kind: 'crawler', count: 4, gap: 1.6 }, { kind: 'spitter', count: 1, gap: 3.0 }] },
  { groups: [{ kind: 'wisp', count: 10, gap: 0.7 }, { kind: 'crawler', count: 4, gap: 1.4 }, { kind: 'spitter', count: 2, gap: 2.4 }, { kind: 'splitter', count: 1, gap: 3.0 }] },
  { groups: [{ kind: 'wisp', count: 8, gap: 0.6 }, { kind: 'crawler', count: 6, gap: 1.2 }, { kind: 'spitter', count: 2, gap: 2.2 }, { kind: 'splitter', count: 2, gap: 2.6 }, { kind: 'brute', count: 1, gap: 4.0 }] },
  { groups: [{ kind: 'wisp', count: 12, gap: 0.55 }, { kind: 'crawler', count: 6, gap: 1.1 }, { kind: 'spitter', count: 3, gap: 2.0 }, { kind: 'splitter', count: 2, gap: 2.4 }, { kind: 'brute', count: 1, gap: 3.5 }] },
  { groups: [{ kind: 'wisp', count: 12, gap: 0.5 }, { kind: 'crawler', count: 8, gap: 1.0 }, { kind: 'spitter', count: 4, gap: 1.8 }, { kind: 'splitter', count: 3, gap: 2.2 }, { kind: 'brute', count: 2, gap: 3.0 }] },
  { groups: [{ kind: 'wisp', count: 14, gap: 0.45 }, { kind: 'crawler', count: 8, gap: 0.9 }, { kind: 'spitter', count: 4, gap: 1.7 }, { kind: 'splitter', count: 4, gap: 2.0 }, { kind: 'brute', count: 2, gap: 2.8 }] },
  { groups: [{ kind: 'wisp', count: 16, gap: 0.4 }, { kind: 'crawler', count: 10, gap: 0.85 }, { kind: 'spitter', count: 5, gap: 1.6 }, { kind: 'splitter', count: 4, gap: 1.9 }, { kind: 'brute', count: 3, gap: 2.6 }] },
  { groups: [{ kind: 'wisp', count: 10, gap: 0.5 }, { kind: 'crawler', count: 6, gap: 1.0 }, { kind: 'spitter', count: 3, gap: 1.8 }, { kind: 'splitter', count: 2, gap: 2.2 }, { kind: 'brute', count: 2, gap: 3.0 }, { kind: 'herald', count: 1, gap: 1.0 }] },
];

export const TOTAL_WAVES = WAVES.length;

// Between waves the Keeper picks one of three upgrade cards. `max` caps how many
// times that upgrade can be taken; a cap of 1 means it appears only until taken once.
export const UPGRADES = [
  { id: 'rapid', name: 'Rapid Trigger', max: 4, text: 'Fire 25% faster.' },
  { id: 'heavy', name: 'Heavy Rounds', max: 4, text: 'Bullets deal 35% more damage.' },
  { id: 'twin', name: 'Twin Shot', max: 2, text: 'Fire one extra bullet in a spread.' },
  { id: 'pierce', name: 'Piercing Rounds', max: 3, text: 'Bullets pass through one more shade.' },
  { id: 'swift', name: 'Swift Boots', max: 3, text: 'Move 15% faster.' },
  { id: 'phase', name: 'Phase Capacitor', max: 3, text: 'Dash recharges 30% faster.' },
  { id: 'heart', name: 'Vitality', max: 3, text: '+1 max heart, and mend one heart now.' },
  { id: 'magnet', name: 'Shard Magnet', max: 3, text: 'Shards fly to you from 60 further away.' },
  { id: 'beacon', name: 'Reinforce Beacon', max: 4, text: '+40 beacon health, and repair 60 now.' },
  { id: 'turret', name: 'Beacon Turret', max: 1, text: 'The beacon fires its own bolt every 1.2s.' },
];

export const BEST_KEY = 'last-light-best';
