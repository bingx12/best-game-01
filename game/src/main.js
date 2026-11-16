// LAST LIGHT — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between six screens:
// title, play, upgrade, paused, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|upgrade|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BEACON_HIT, EVENT_HIT, EVENT_OVER, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_UPGRADE_1, ACTION_UPGRADE_2, ACTION_UPGRADE_3, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.startRun();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1. Guard the beacon.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) {
      audio.win();
      announce(`Victory. Dawn breaks. Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.lose();
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function pickUpgrade(index) {
    if (index < 0 || index >= world.state.upgradeChoices.length) return;
    audio.upgrade();
    world.applyUpgrade(world.state.upgradeChoices[index].id);
    screen = SCREEN_PLAY;
    announce(`Wave ${world.state.wave}.`);
  }

  // Clicking an upgrade card picks it; a click anywhere else on that screen
  // does nothing, because the cards are the only buttons there.
  function handleUpgradeClick() {
    const m = input.mouse();
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 960, rect.height / 600);
    const ox = (rect.width - 960 * scale) / 2;
    const oy = (rect.height - 600 * scale) / 2;
    const lx = (m.x - ox) / scale;
    const ly = (m.y - oy) / scale;
    const w = 250;
    const gap = 24;
    const total = w * 3 + gap * 2;
    const x0 = 480 - total / 2;
    for (let i = 0; i < world.state.upgradeChoices.length; i += 1) {
      const x = x0 + i * (w + gap);
      if (lx >= x && lx <= x + w && ly >= 168 && ly <= 378) {
        pickUpgrade(i);
        return;
      }
    }
  }

  // The frame's latched actions, read once. Dash is edge-triggered by the
  // keydown latch, so holding Shift does not dash again and again.
  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      audio.click();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (screen === SCREEN_UPGRADE) {
      if (actions & ACTION_UPGRADE_1) pickUpgrade(0);
      else if (actions & ACTION_UPGRADE_2) pickUpgrade(1);
      else if (actions & ACTION_UPGRADE_3) pickUpgrade(2);
      else if (actions & ACTION_CONFIRM) handleUpgradeClick();
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.stepTitle(STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const dir = input.direction();
    const m = input.mouse();
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 960, rect.height / 600);
    const ox = (rect.width - 960 * scale) / 2;
    const oy = (rect.height - 600 * scale) / 2;
    const aimX = (m.x - ox) / scale;
    const aimY = (m.y - oy) / scale;
    const events = world.step(STEP, {
      move: dir,
      aimX, aimY,
      firing: input.firing(),
      dash: Boolean(actions & ACTION_DASH),
    });
    if (events & EVENT_HIT) audio.hurt();
    if (events & EVENT_BEACON_HIT) audio.beaconHurt();
    if (events & EVENT_WAVE_CLEAR) {
      audio.waveClear();
      screen = SCREEN_UPGRADE;
      announce(`Wave ${world.state.wave} cleared. Choose a blessing.`);
    }
    if (events & EVENT_OVER) endGame(false);
    if (events & EVENT_WIN) endGame(true);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting shades feed unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Last Light. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
