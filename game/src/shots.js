// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and the
// same seed always gives the same frame. The play scene's pilot kites, aims and
// fires; the end scene's pilot stands still and never shoots, so the night takes
// it, as a careless player is taken.
import { ARENA, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 14;
const END_LIMIT_SECONDS = 300;
const SAMPLE = 1 / 30;

/** Where to aim to hit a moving shade: its position when the bullet gets there. */
function leadTarget(p, e) {
  let tx;
  let ty;
  if (e.def.target === 'player') { tx = p.x; ty = p.y; }
  else { tx = ARENA.beaconX; ty = ARENA.beaconY; }
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const evx = (dx / d) * e.speed;
  const evy = (dy / d) * e.speed;
  const dist = Math.hypot(e.x - p.x, e.y - p.y);
  const t = dist / 580;
  return { x: e.x + evx * t, y: e.y + evy * t };
}

/** The autopilot's control for one step: where to move, where to aim, whether to fire. */
function autopilot(state, aggressive) {
  const p = state.player;
  const enemies = state.enemies;
  if (enemies.length === 0) {
    return { move: { x: 0, y: 0 }, aimX: p.x, aimY: p.y - 100, firing: false, dash: false };
  }
  let nearest = null;
  let nearestD = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestD) { nearestD = d; nearest = e; }
  }
  if (!nearest) {
    return { move: { x: 0, y: 0 }, aimX: p.x, aimY: p.y - 100, firing: false, dash: false };
  }
  // Aim at the shade that most threatens the beacon (a crawler, brute or herald
  // closing on it) before the nearest shade to the Keeper: the beacon is the
  // lose condition, so it gets defended first.
  let target = nearest;
  let targetD = nearestD;
  for (const e of enemies) {
    if (e.def.target !== 'beacon' && e.kind !== 'brute' && e.kind !== 'herald') continue;
    const db = Math.hypot(e.x - ARENA.beaconX, e.y - ARENA.beaconY);
    if (db < 280) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (!target || e.def.target === 'beacon') { target = e; targetD = d; }
      break;
    }
  }
  // Flee the nearest shade hard when it is close; only drift toward shards or
  // the guard ring when nothing is near, so the pilot never walks into a hit.
  let mx = 0;
  let my = 0;
  const threatened = nearestD < 150;
  if (nearestD < 150) {
    mx += (p.x - nearest.x) / nearestD * 1.6;
    my += (p.y - nearest.y) / nearestD * 1.6;
  }
  if (!threatened) {
    let shard = null;
    let shardD = Infinity;
    for (const s of state.shards) {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < shardD) { shardD = d; shard = s; }
    }
    if (shard && shardD < 220) {
      mx += (shard.x - p.x) / shardD * 0.7;
      my += (shard.y - p.y) / shardD * 0.7;
    }
    const gx = ARENA.beaconX + 150;
    const gy = ARENA.beaconY + 90;
    const gd = Math.hypot(gx - p.x, gy - p.y);
    if (gd > 60) {
      mx += (gx - p.x) / gd * 0.45;
      my += (gy - p.y) / gd * 0.45;
    }
  }
  const len = Math.hypot(mx, my);
  const move = len > 0.01 ? { x: mx / len, y: my / len } : { x: 0, y: 0 };
  const dash = aggressive && nearestD < 60 && p.dashCooldown <= 0;
  const aim = leadTarget(p, target);
  return {
    move,
    aimX: aim.x,
    aimY: aim.y,
    firing: aggressive,
    dash,
  };
}

function idleControl(state) {
  return { move: { x: 0, y: 0 }, aimX: state.player.x, aimY: state.player.y - 100, firing: false, dash: false };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. The world is reset first, so every scene starts identical.
 */
export function stageShot(name, world) {
  const state = world.state;
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.stepTitle(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'upgrade') {
    world.startRun();
    // Clear wave 1 with the pilot, then stop on the upgrade screen.
    for (let i = 0; i < 240 / STEP; i += 1) {
      const events = world.step(STEP, autopilot(state, true));
      if (state.status === 'upgrade') break;
      if (state.status === 'over' || state.status === 'win') break;
    }
    return { screen: state.status === 'upgrade' ? SCREEN_UPGRADE : SCREEN_PLAY, best: state.score };
  }
  if (name === 'end') {
    world.startRun();
    // Stand still and never shoot: the shades take the Keeper.
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      world.step(STEP, idleControl(state));
      if (state.status === 'over') break;
      if (state.status === 'upgrade' || state.status === 'win') break;
    }
    // A fresh browser has no best score yet, so this run is the new best.
    return { screen: state.status === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  // play: jump to wave 7 and fight it for a while, so the frame is thick with
  // shades, shots and shards instead of an empty cleared field.
  world.startRun();
  world.startWave(7);
  for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
    const events = world.step(STEP, autopilot(state, true));
    if (state.status !== 'play') break;
  }
  const screen = state.status === 'play' ? SCREEN_PLAY : (state.status === 'over' ? SCREEN_OVER : SCREEN_PLAY);
  return { screen, best: state.score };
}
