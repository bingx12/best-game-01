// LAST LIGHT — the world: the Keeper, the beacon, the shades, the waves and the
// rules. A fixed-step simulation (STEP seconds per step) so a seeded run replays
// exactly. The world owns no drawing and no sound; it reports what happened as
// event flags and lets the caller play the sounds and paint the frame.
import { ARENA, PLAYER, ENEMY_KINDS, WAVES, TOTAL_WAVES, UPGRADES, STEP } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_BEACON_HIT = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;

const TAU = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const state = {
    status: 'title', // title | play | upgrade | over | win | paused
    time: 0,
    score: 0,
    kills: 0,
    shardsCollected: 0,
    wave: 0,
    player: null,
    beacon: null,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    shards: [],
    particles: [],
    floaters: [],
    schedule: [],
    spawnTimer: 0,
    spawned: 0,
    toSpawn: 0,
    upgradeChoices: [],
    shake: 0,
    turretTimer: 0,
    best: 0,
  };

  function freshPlayer() {
    return {
      x: ARENA.width / 2,
      y: ARENA.height / 2 + 150,
      vx: 0, vy: 0,
      angle: -Math.PI / 2,
      radius: PLAYER.radius,
      health: PLAYER.maxHealth,
      maxHealth: PLAYER.maxHealth,
      invuln: 0,
      dashTime: 0,
      dashCooldown: 0,
      dashX: 0, dashY: 0,
      fireCooldown: 0,
      speed: PLAYER.speed,
      fireInterval: PLAYER.fireInterval,
      bulletDamage: PLAYER.bulletDamage,
      projectiles: 1,
      pierce: 0,
      magnetRadius: PLAYER.magnetRadius,
      dashCooldownMax: PLAYER.dashCooldown,
      turret: false,
      taken: {},
    };
  }

  function reset() {
    state.status = 'title';
    state.time = 0;
    state.score = 0;
    state.kills = 0;
    state.shardsCollected = 0;
    state.wave = 0;
    state.player = freshPlayer();
    state.beacon = { health: ARENA.beaconMaxHealth, maxHealth: ARENA.beaconMaxHealth };
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.shards = [];
    state.particles = [];
    state.floaters = [];
    state.schedule = [];
    state.spawnTimer = 0;
    state.spawned = 0;
    state.toSpawn = 0;
    state.upgradeChoices = [];
    state.shake = 0;
    state.turretTimer = 0;
    // A few wisps drift around the beacon behind the title screen.
    for (let i = 0; i < 6; i += 1) {
      const a = random.next() * TAU;
      state.enemies.push(makeEnemy('wisp', ARENA.beaconX + Math.cos(a) * 200, ARENA.beaconY + Math.sin(a) * 150));
    }
  }

  function makeEnemy(kind, x, y) {
    const def = ENEMY_KINDS[kind];
    return {
      kind, def,
      x, y,
      vx: 0, vy: 0,
      hp: def.hp, maxHp: def.hp,
      radius: def.radius,
      speed: def.speed * random.range(0.9, 1.1),
      attackCooldown: 0,
      shotTimer: random.range(0.5, def.shotInterval ?? 1),
      summonTimer: def.summonInterval ?? 0,
      flash: 0,
      wobble: random.next() * TAU,
    };
  }

  function spawnEdge(kind) {
    const side = random.int(0, 3);
    const m = 20;
    let x;
    let y;
    if (side === 0) { x = random.range(m, ARENA.width - m); y = m; }
    else if (side === 1) { x = random.range(m, ARENA.width - m); y = ARENA.height - m; }
    else if (side === 2) { x = m; y = random.range(m, ARENA.height - m); }
    else { x = ARENA.width - m; y = random.range(m, ARENA.height - m); }
    return makeEnemy(kind, x, y);
  }

  // Groups overlap: group i starts 2 s after the one before it, so several
  // kinds arrive together and the field gets busy instead of trickling in.
  function buildSchedule(waveIndex) {
    const schedule = [];
    WAVES[waveIndex].groups.forEach((group, gi) => {
      let t = 0.5 + gi * 2.0;
      for (let i = 0; i < group.count; i += 1) {
        schedule.push({ at: t, kind: group.kind });
        t += group.gap;
      }
    });
    schedule.sort((a, b) => a.at - b.at);
    return schedule;
  }

  function startWave(n) {
    state.wave = n;
    state.schedule = buildSchedule(n - 1);
    state.spawnTimer = 0;
    state.spawned = 0;
    state.toSpawn = state.schedule.length;
    state.status = 'play';
  }

  function startRun() {
    reset();
    state.player = freshPlayer();
    state.beacon = { health: ARENA.beaconMaxHealth, maxHealth: ARENA.beaconMaxHealth };
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.shards = [];
    state.particles = [];
    state.floaters = [];
    startWave(1);
  }

  function rollUpgrades() {
    const p = state.player;
    const pool = UPGRADES.filter((u) => (p.taken[u.id] ?? 0) < u.max);
    const picks = [];
    while (picks.length < 3 && pool.length > 0) {
      const i = Math.floor(random.next() * pool.length);
      picks.push(pool.splice(i, 1)[0]);
    }
    return picks;
  }

  function applyUpgrade(id) {
    const p = state.player;
    p.taken[id] = (p.taken[id] ?? 0) + 1;
    if (id === 'rapid') p.fireInterval *= 0.8;
    else if (id === 'heavy') p.bulletDamage *= 1.35;
    else if (id === 'twin') p.projectiles = Math.min(3, p.projectiles + 1);
    else if (id === 'pierce') p.pierce = Math.min(3, p.pierce + 1);
    else if (id === 'swift') p.speed *= 1.15;
    else if (id === 'phase') p.dashCooldownMax *= 0.7;
    else if (id === 'heart') { p.maxHealth += 1; p.health = Math.min(p.maxHealth, p.health + 1); }
    else if (id === 'magnet') p.magnetRadius += 60;
    else if (id === 'beacon') {
      state.beacon.maxHealth += 40;
      state.beacon.health = Math.min(state.beacon.maxHealth, state.beacon.health + 60);
    } else if (id === 'turret') p.turret = true;
    startWave(state.wave + 1);
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = random.next() * TAU;
      const s = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: random.range(0.25, 0.55), maxLife: 0.55,
        color, size: random.range(2, 4.5),
      });
    }
  }

  function floater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  function dropShards(x, y, n) {
    for (let i = 0; i < n; i += 1) {
      const a = random.next() * TAU;
      state.shards.push({
        x, y,
        vx: Math.cos(a) * random.range(40, 130),
        vy: Math.sin(a) * random.range(40, 130),
        life: 9,
      });
    }
  }

  function killEnemy(index, award) {
    const e = state.enemies[index];
    state.enemies.splice(index, 1);
    state.kills += 1;
    burst(e.x, e.y, e.def.color, 14, 190);
    if (award) {
      state.score += e.def.score;
      floater(e.x, e.y - 14, `+${e.def.score}`, '#ffe082');
      dropShards(e.x, e.y, e.def.shards);
    }
    if (e.kind === 'splitter') {
      for (let i = 0; i < 2; i += 1) {
        state.enemies.push(makeEnemy('wisp', e.x + random.range(-14, 14), e.y + random.range(-14, 14)));
      }
    }
  }

  function damagePlayer(amount) {
    const p = state.player;
    if (p.invuln > 0 || p.dashTime > 0) return false;
    p.health -= amount;
    p.invuln = PLAYER.invulnTime;
    state.shake = Math.max(state.shake, 9);
    burst(p.x, p.y, '#67e8f9', 12, 220);
    return true;
  }

  function damageBeacon(amount) {
    state.beacon.health -= amount;
    state.shake = Math.max(state.shake, 7);
    burst(ARENA.beaconX, ARENA.beaconY, '#ffb74d', 10, 180);
  }

  function firePlayer() {
    const p = state.player;
    const n = p.projectiles;
    const spread = 0.14;
    for (let i = 0; i < n; i += 1) {
      const off = (i - (n - 1) / 2) * spread;
      const a = p.angle + off;
      state.bullets.push({
        x: p.x + Math.cos(a) * (p.radius + 6),
        y: p.y + Math.sin(a) * (p.radius + 6),
        vx: Math.cos(a) * PLAYER.bulletSpeed,
        vy: Math.sin(a) * PLAYER.bulletSpeed,
        damage: p.bulletDamage,
        pierce: p.pierce,
        radius: PLAYER.bulletRadius,
        friendly: true,
      });
    }
    p.fireCooldown = p.fireInterval;
  }

  function fireTurret(target) {
    const a = Math.atan2(target.y - ARENA.beaconY, target.x - ARENA.beaconX);
    state.bullets.push({
      x: ARENA.beaconX + Math.cos(a) * (ARENA.beaconRadius + 6),
      y: ARENA.beaconY + Math.sin(a) * (ARENA.beaconRadius + 6),
      vx: Math.cos(a) * 520,
      vy: Math.sin(a) * 520,
      damage: 1,
      pierce: 0,
      radius: 4,
      friendly: true,
    });
    state.turretTimer = 1.2;
  }

  function updatePlayer(dt, ctl) {
    const p = state.player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.fireCooldown = Math.max(0, p.fireCooldown - dt);
    p.angle = Math.atan2(ctl.aimY - p.y, ctl.aimX - p.x);

    if (ctl.dash && p.dashCooldown <= 0 && p.dashTime <= 0) {
      const dx = ctl.move.x;
      const dy = ctl.move.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.01) {
        p.dashX = dx / len;
        p.dashY = dy / len;
      } else {
        p.dashX = Math.cos(p.angle);
        p.dashY = Math.sin(p.angle);
      }
      p.dashTime = PLAYER.dashTime;
      p.dashCooldown = p.dashCooldownMax;
      burst(p.x, p.y, '#67e8f9', 8, 160);
    }

    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.vx = p.dashX * PLAYER.dashSpeed;
      p.vy = p.dashY * PLAYER.dashSpeed;
    } else {
      p.vx = ctl.move.x * p.speed;
      p.vy = ctl.move.y * p.speed;
    }
    p.x = Math.min(ARENA.width - p.radius, Math.max(p.radius, p.x + p.vx * dt));
    p.y = Math.min(ARENA.height - p.radius, Math.max(p.radius, p.y + p.vy * dt));

    if (ctl.firing && p.fireCooldown <= 0) firePlayer();
  }

  function updateEnemies(dt) {
    const p = state.player;
    const b = state.beacon;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      e.flash = Math.max(0, e.flash - dt);
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.wobble += dt * 3;
      let tx;
      let ty;
      if (e.def.target === 'player') { tx = p.x; ty = p.y; }
      else if (e.def.target === 'beacon') { tx = ARENA.beaconX; ty = ARENA.beaconY; }
      else { tx = ARENA.beaconX; ty = ARENA.beaconY; }

      const dx = tx - e.x;
      const dy = ty - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const reach = e.radius + (e.def.target === 'beacon' ? ARENA.beaconRadius : p.radius);

      if (e.def.target === 'ranged' && d < (e.def.range ?? 230)) {
        // Hold range and shoot at the beacon.
        e.shotTimer -= dt;
        if (e.shotTimer <= 0) {
          e.shotTimer = e.def.shotInterval;
          const a = Math.atan2(ARENA.beaconY - e.y, ARENA.beaconX - e.x);
          state.enemyBullets.push({
            x: e.x + Math.cos(a) * (e.radius + 4),
            y: e.y + Math.sin(a) * (e.radius + 4),
            vx: Math.cos(a) * e.def.shotSpeed,
            vy: Math.sin(a) * e.def.shotSpeed,
            radius: 5,
          });
        }
      } else if (d > reach) {
        e.x += (dx / d) * e.speed * dt;
        e.y += (dy / d) * e.speed * dt;
      } else if (e.def.target === 'beacon' || e.kind === 'brute' || e.kind === 'herald') {
        if (e.attackCooldown <= 0) {
          // A shade chews on the beacon more slowly than it bites the Keeper,
          // so the beacon holds long enough for the Keeper to answer.
          e.attackCooldown = 1.4;
          damageBeacon(e.def.damage);
          state.lastBeaconHit = true;
        }
      } else if (e.def.target === 'player') {
        // Touching the Keeper: it hurts the Keeper and itself.
        if (damagePlayer(e.def.damage)) {
          e.hp -= 1;
          e.flash = 0.12;
          const ka = Math.atan2(e.y - p.y, e.x - p.x);
          e.x += Math.cos(ka) * 26;
          e.y += Math.sin(ka) * 26;
          if (e.hp <= 0) killEnemy(i, true);
        }
      }

      // The Herald calls wisps to its side.
      if (e.kind === 'herald') {
        e.summonTimer -= dt;
        if (e.summonTimer <= 0 && state.enemies.length < 46) {
          e.summonTimer = e.def.summonInterval;
          for (let s = 0; s < 2; s += 1) {
            state.enemies.push(makeEnemy('wisp', e.x + random.range(-30, 30), e.y + random.range(-30, 30)));
          }
          burst(e.x, e.y, '#ffd54f', 10, 150);
        }
      }
    }

    // Light separation so shades do not stack into one dot.
    for (let i = 0; i < state.enemies.length; i += 1) {
      for (let j = i + 1; j < state.enemies.length; j += 1) {
        const a = state.enemies[i];
        const c = state.enemies[j];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const min = a.radius + c.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < min * min) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          c.x += nx * push;
          c.y += ny * push;
        }
      }
    }
  }

  function updateBullets(dt) {
    const p = state.player;
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let dead = b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20;
      if (!dead) {
        for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
          const e = state.enemies[j];
          const rr = b.radius + e.radius;
          if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
            e.hp -= b.damage;
            e.flash = 0.1;
            burst(b.x, b.y, e.def.color, 4, 120);
            if (e.hp <= 0) {
              killEnemy(j, true);
              if (e.kind === 'brute' || e.kind === 'herald') floater(e.x, e.y - 20, `${e.def.score}`, '#ffe082');
            }
            if (b.pierce > 0) b.pierce -= 1;
            else { dead = true; }
            break;
          }
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }

    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = state.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let dead = b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20;
      if (!dead) {
        const rp = b.radius + p.radius;
        const rb = b.radius + ARENA.beaconRadius;
        if (dist2(b.x, b.y, p.x, p.y) < rp * rp) {
          damagePlayer(1);
          state.lastHit = true;
          dead = true;
        } else if (dist2(b.x, b.y, ARENA.beaconX, ARENA.beaconY) < rb * rb) {
          damageBeacon(1);
          state.lastBeaconHit = true;
          dead = true;
        }
      }
      if (dead) state.enemyBullets.splice(i, 1);
    }
  }

  function updateShards(dt) {
    const p = state.player;
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const s = state.shards[i];
      s.life -= dt;
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < p.magnetRadius) {
        const pull = 620 * (1 - d / p.magnetRadius) + 140;
        s.vx += (dx / d) * pull * dt;
        s.vy += (dy / d) * pull * dt;
      }
      s.vx *= 0.92;
      s.vy *= 0.92;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (d < 22) {
        state.shards.splice(i, 1);
        state.shardsCollected += 1;
        state.score += 5;
        burst(s.x, s.y, '#ffe082', 3, 90);
        continue;
      }
      if (s.life <= 0) state.shards.splice(i, 1);
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.life -= dt;
      f.y -= 26 * dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    state.shake = Math.max(0, state.shake - dt * 26);
  }

  function updateSpawning(dt) {
    state.spawnTimer += dt;
    while (state.spawned < state.schedule.length && state.schedule[state.spawned].at <= state.spawnTimer) {
      state.enemies.push(spawnEdge(state.schedule[state.spawned].kind));
      state.spawned += 1;
    }
  }

  function step(dt, ctl) {
    state.time += dt;
    state.lastHit = false;
    state.lastBeaconHit = false;
    if (state.status !== 'play') return 0;
    let events = 0;

    updateSpawning(dt);
    updatePlayer(dt, ctl);
    updateEnemies(dt);
    updateBullets(dt);
    updateShards(dt);
    updateParticles(dt);

    // The beacon's turret, once bought, fires at the nearest shade in range.
    if (state.player.turret) {
      state.turretTimer -= dt;
      if (state.turretTimer <= 0 && state.enemies.length > 0) {
        let best = null;
        let bestD = 420 * 420;
        for (const e of state.enemies) {
          const d2 = dist2(e.x, e.y, ARENA.beaconX, ARENA.beaconY);
          if (d2 < bestD) { bestD = d2; best = e; }
        }
        if (best) fireTurret(best);
      }
    }

    if (state.lastHit) events |= EVENT_HIT;
    if (state.lastBeaconHit) events |= EVENT_BEACON_HIT;

    if (state.player.health <= 0 || state.beacon.health <= 0) {
      state.status = 'over';
      state.loseReason = state.beacon.health <= 0 ? 'beacon' : 'player';
      burst(state.player.x, state.player.y, '#67e8f9', 26, 260);
      return events | EVENT_OVER;
    }

    if (state.spawned >= state.schedule.length && state.enemies.length === 0) {
      state.score += state.wave * 50;
      if (state.wave >= TOTAL_WAVES) {
        state.status = 'win';
        return events | EVENT_WIN;
      }
      state.upgradeChoices = rollUpgrades();
      state.status = 'upgrade';
      return events | EVENT_WAVE_CLEAR;
    }
    return events;
  }

  // The title screen's living backdrop: a few wisps drift around the beacon.
  function stepTitle(dt) {
    state.time += dt;
    for (const e of state.enemies) {
      e.wobble += dt * 0.7;
      e.x += Math.cos(e.wobble) * 14 * dt;
      e.y += Math.sin(e.wobble * 1.3) * 14 * dt;
    }
    updateParticles(dt);
    if (random.next() < dt * 2) {
      const a = random.next() * TAU;
      state.particles.push({
        x: ARENA.beaconX + Math.cos(a) * 60,
        y: ARENA.beaconY + Math.sin(a) * 60,
        vx: Math.cos(a) * 12, vy: -14,
        life: 1.2, maxLife: 1.2, color: '#ffb74d', size: 2.5,
      });
    }
  }

  reset();

  return {
    state,
    reset,
    startRun,
    startWave,
    applyUpgrade,
    step,
    stepTitle,
  };
}
