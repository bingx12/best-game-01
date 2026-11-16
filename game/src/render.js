// LAST LIGHT — the renderer: everything the player sees. It draws the arena, the
// beacon, the Keeper, the shades, the shots, the shards, the particles and the
// HUD, plus the title, upgrade, pause, game-over and victory screens. It never
// changes the world; it only paints the state it is given.
import { ARENA, PLAYER, ENEMY_KINDS, TOTAL_WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const TAU = Math.PI * 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  // A fixed starfield, so the backdrop never shimmers between frames.
  const stars = [];
  {
    let s = 1234567;
    const rnd = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < 90; i += 1) {
      stars.push({ x: rnd() * ARENA.width, y: rnd() * ARENA.height, r: rnd() * 1.4 + 0.4, a: rnd() * 0.5 + 0.2 });
    }
  }

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth || ARENA.width;
    const ch = canvas.clientHeight || ARENA.height;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    const scale = Math.min(canvas.width / ARENA.width, canvas.height / ARENA.height);
    const ox = (canvas.width - ARENA.width * scale) / 2;
    const oy = (canvas.height - ARENA.height * scale) / 2;
    return { scale, ox, oy };
  }

  function panel(x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
  }

  function text(str, x, y, size, color, align = 'center', weight = 700) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function drawBackground(time) {
    const g = ctx.createRadialGradient(
      ARENA.beaconX, ARENA.beaconY, 40,
      ARENA.beaconX, ARENA.beaconY, 560,
    );
    g.addColorStop(0, '#1b2340');
    g.addColorStop(0.55, '#0d1226');
    g.addColorStop(1, '#070a16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    // Stars.
    for (const s of stars) {
      ctx.globalAlpha = s.a * (0.75 + 0.25 * Math.sin(time * 1.4 + s.x));
      ctx.fillStyle = '#cfe8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Faint grid, so motion reads.
    ctx.strokeStyle = 'rgba(120, 160, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 60; x < ARENA.width; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.height); ctx.stroke();
    }
    for (let y = 60; y < ARENA.height; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA.width, y); ctx.stroke();
    }
    // Arena border.
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, ARENA.width - 8, ARENA.height - 8);
  }

  function drawBeacon(state, time) {
    const b = state.beacon;
    const pulse = 1 + 0.06 * Math.sin(time * 2.2);
    const glowR = 150 * pulse;
    const g = ctx.createRadialGradient(
      ARENA.beaconX, ARENA.beaconY, 8,
      ARENA.beaconX, ARENA.beaconY, glowR,
    );
    const low = b.health < b.maxHealth * 0.3;
    g.addColorStop(0, low ? 'rgba(255, 82, 82, 0.5)' : 'rgba(255, 183, 77, 0.45)');
    g.addColorStop(1, 'rgba(255, 183, 77, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ARENA.beaconX, ARENA.beaconY, glowR, 0, TAU);
    ctx.fill();
    // The crystal.
    ctx.save();
    ctx.translate(ARENA.beaconX, ARENA.beaconY);
    ctx.rotate(Math.sin(time * 0.8) * 0.08);
    ctx.fillStyle = low ? '#ff8a80' : '#ffd54f';
    ctx.shadowColor = low ? '#ff5252' : '#ffb74d';
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.moveTo(0, -ARENA.beaconRadius * pulse);
    ctx.lineTo(ARENA.beaconRadius * 0.72 * pulse, 0);
    ctx.lineTo(0, ARENA.beaconRadius * pulse);
    ctx.lineTo(-ARENA.beaconRadius * 0.72 * pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
    // Health ring.
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ARENA.beaconX, ARENA.beaconY, ARENA.beaconRadius + 10, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = low ? '#ff5252' : '#ffb74d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ARENA.beaconX, ARENA.beaconY, ARENA.beaconRadius + 10, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, b.health / b.maxHealth));
    ctx.stroke();
    text('BEACON', ARENA.beaconX, ARENA.beaconY + ARENA.beaconRadius + 26, 11, 'rgba(255, 213, 79, 0.85)', 'center', 800);
  }

  function drawEnemy(e, time) {
    const def = e.def;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : def.color;
    ctx.shadowColor = def.glow;
    ctx.shadowBlur = 14;
    const r = e.radius;
    if (def.shape === 'wisp') {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0a0e1a';
      ctx.beginPath(); ctx.arc(-3.5, -2, 2.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(3.5, -2, 2.2, 0, TAU); ctx.fill();
    } else if (def.shape === 'crawler') {
      ctx.rotate(Math.sin(e.wobble) * 0.15);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0a0e1a';
      ctx.beginPath(); ctx.arc(-4, -3, 2.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -3, 2.4, 0, TAU); ctx.fill();
    } else if (def.shape === 'spitter') {
      ctx.rotate(Math.PI / 4 + Math.sin(e.wobble * 0.7) * 0.12);
      ctx.fillRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44);
      ctx.shadowBlur = 0;
      ctx.rotate(-Math.PI / 4 - Math.sin(e.wobble * 0.7) * 0.12);
      ctx.fillStyle = '#0a0e1a';
      ctx.beginPath(); ctx.arc(0, -2, 3, 0, TAU); ctx.fill();
    } else if (def.shape === 'splitter') {
      ctx.rotate(Math.sin(e.wobble) * 0.2);
      ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(10, 14, 26, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, r * 0.8); ctx.stroke();
      ctx.fillStyle = '#0a0e1a';
      ctx.beginPath(); ctx.arc(-4, -3, 2.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -3, 2.2, 0, TAU); ctx.fill();
    } else if (def.shape === 'brute') {
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * TAU + Math.PI / 8;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0a0e1a';
      ctx.beginPath(); ctx.arc(-6, -4, 3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -4, 3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 6, 4, 0, Math.PI, 0); ctx.fill();
    } else {
      // Herald: a crowned star.
      ctx.rotate(Math.sin(time * 0.6) * 0.1);
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * TAU - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.55;
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#7f0000';
      ctx.beginPath(); ctx.arc(-7, -4, 3.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(7, -4, 3.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // Health bar for the tough ones.
    if (e.maxHp >= 4 && e.hp < e.maxHp) {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4);
      ctx.fillStyle = '#ff5252';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  }

  function drawPlayer(state, time) {
    const p = state.player;
    const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    // Dash trail.
    if (p.dashTime > 0) {
      ctx.fillStyle = 'rgba(103, 232, 249, 0.25)';
      ctx.beginPath();
      ctx.arc(p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.radius * 1.25, 0, TAU);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = '#67e8f9';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0e1a';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 0.45, 0, TAU);
    ctx.fill();
    // Aim tick.
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(p.angle) * (p.radius + 2), Math.sin(p.angle) * (p.radius + 2));
    ctx.lineTo(Math.cos(p.angle) * (p.radius + 12), Math.sin(p.angle) * (p.radius + 12));
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawHud(state) {
    const p = state.player;
    const b = state.beacon;
    // Top bar.
    ctx.fillStyle = 'rgba(5, 8, 18, 0.72)';
    ctx.fillRect(0, 0, ARENA.width, 44);
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.2)';
    ctx.beginPath(); ctx.moveTo(0, 44); ctx.lineTo(ARENA.width, 44); ctx.stroke();
    // Hearts.
    for (let i = 0; i < p.maxHealth; i += 1) {
      const x = 26 + i * 26;
      const y = 22;
      ctx.fillStyle = i < p.health ? '#ff5d7a' : 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.arc(x - 4, y - 3, 6, 0, TAU);
      ctx.arc(x + 4, y - 3, 6, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 1);
      ctx.lineTo(x, y + 9);
      ctx.lineTo(x + 9, y - 1);
      ctx.closePath();
      ctx.fill();
    }
    text(`WAVE ${state.wave} / ${TOTAL_WAVES}`, ARENA.width / 2 - 130, 23, 15, '#e8f6ff', 'center', 800);
    text(`SCORE ${state.score}`, ARENA.width / 2 + 40, 23, 15, '#ffe082', 'center', 800);
    text(`◆ ${state.shardsCollected}`, ARENA.width - 120, 23, 15, '#ffe082', 'center', 800);
    // Beacon health, under the top bar.
    const bw = 240;
    const bx = ARENA.width / 2 - bw / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, 52, bw, 9);
    ctx.fillStyle = b.health < b.maxHealth * 0.3 ? '#ff5252' : '#ffb74d';
    ctx.fillRect(bx, 52, bw * Math.max(0, b.health / b.maxHealth), 9);
    text(`BEACON ${Math.max(0, Math.ceil(b.health))}`, ARENA.width / 2, 74, 11, 'rgba(255, 213, 79, 0.9)', 'center', 800);
    // Dash cooldown, bottom left.
    const dashFrac = p.dashCooldownMax > 0 ? 1 - Math.min(1, p.dashCooldown / p.dashCooldownMax) : 1;
    text('DASH', 26, ARENA.height - 34, 11, 'rgba(207, 232, 255, 0.75)', 'left', 800);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(26, ARENA.height - 26, 90, 7);
    ctx.fillStyle = dashFrac >= 1 ? '#67e8f9' : '#4a7d8c';
    ctx.fillRect(26, ARENA.height - 26, 90 * dashFrac, 7);
    // Enemies left this wave.
    const left = state.toSpawn - state.spawned + state.enemies.length;
    text(`SHADES LEFT ${Math.max(0, left)}`, ARENA.width - 26, ARENA.height - 30, 12, 'rgba(207, 232, 255, 0.8)', 'right', 800);
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.55)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    text('LAST LIGHT', ARENA.width / 2, 168, 64, '#ffe082', 'center', 900);
    text('The last beacon is fading. Hold the light through ten waves of night.', ARENA.width / 2, 216, 17, '#cfe8ff', 'center', 600);
    panel(ARENA.width / 2 - 250, 252, 500, 118, 'rgba(8, 12, 26, 0.85)', 'rgba(103, 232, 249, 0.35)');
    text('WASD / ARROWS — move      MOUSE — aim      HOLD CLICK — fire', ARENA.width / 2, 282, 14, '#e8f6ff', 'center', 700);
    text('SHIFT / SPACE — dash      P — pause      M — mute', ARENA.width / 2, 310, 14, '#e8f6ff', 'center', 700);
    text('Guard the beacon. If it falls, the dark wins. Survive all 10 waves.', ARENA.width / 2, 338, 14, '#ffb74d', 'center', 700);
    const pulse = 0.7 + 0.3 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('CLICK OR PRESS SPACE TO START', ARENA.width / 2, 420, 18, '#67e8f9', 'center', 800);
    ctx.globalAlpha = 1;
    if (best > 0) text(`BEST SCORE ${best}`, ARENA.width / 2, 458, 14, 'rgba(207, 232, 255, 0.8)', 'center', 700);
  }

  function drawUpgrade(state) {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.62)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    text(`WAVE ${state.wave} CLEARED`, ARENA.width / 2, 96, 30, '#67e8f9', 'center', 900);
    text('The night relents a moment. Choose one blessing:', ARENA.width / 2, 132, 16, '#cfe8ff', 'center', 600);
    const w = 250;
    const gap = 24;
    const total = w * 3 + gap * 2;
    const x0 = ARENA.width / 2 - total / 2;
    state.upgradeChoices.forEach((u, i) => {
      const x = x0 + i * (w + gap);
      const y = 168;
      panel(x, y, w, 210, 'rgba(10, 16, 34, 0.95)', 'rgba(255, 213, 79, 0.55)');
      text(`${i + 1}`, x + w / 2, y + 34, 15, '#ffb74d', 'center', 800);
      text(u.name, x + w / 2, y + 74, 19, '#ffe082', 'center', 800);
      // Wrap the description.
      const words = u.text.split(' ');
      let line = '';
      let ly = 118;
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 22) {
          text(line.trim(), x + w / 2, y + ly, 14, '#e8f6ff', 'center', 600);
          line = word;
          ly += 24;
        } else line += ' ' + word;
      }
      if (line.trim()) text(line.trim(), x + w / 2, y + ly, 14, '#e8f6ff', 'center', 600);
      text('CLICK TO TAKE', x + w / 2, y + 178, 11, 'rgba(103, 232, 249, 0.85)', 'center', 800);
    });
    text(`Score ${state.score}   •   Next wave ${state.wave + 1} of ${TOTAL_WAVES}`, ARENA.width / 2, 430, 15, 'rgba(207, 232, 255, 0.85)', 'center', 700);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(10, 4, 8, 0.72)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    text('THE LIGHT WENT OUT', ARENA.width / 2, 190, 44, '#ff5252', 'center', 900);
    const cause = state.loseReason === 'beacon'
      ? `The dark took the beacon on wave ${state.wave}.`
      : `The Keeper fell on wave ${state.wave}.`;
    text(cause, ARENA.width / 2, 240, 17, '#cfe8ff', 'center', 600);
    text(`SCORE ${state.score}`, ARENA.width / 2, 300, 24, '#ffe082', 'center', 800);
    text(`${state.kills} shades banished   •   ${state.shardsCollected} shards gathered`, ARENA.width / 2, 336, 15, 'rgba(207, 232, 255, 0.85)', 'center', 600);
    if (state.score >= best && state.score > 0) text('NEW BEST!', ARENA.width / 2, 372, 16, '#67e8f9', 'center', 800);
    else if (best > 0) text(`BEST ${best}`, ARENA.width / 2, 372, 15, 'rgba(207, 232, 255, 0.8)', 'center', 700);
    const pulse = 0.7 + 0.3 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('CLICK OR PRESS SPACE TO TRY AGAIN', ARENA.width / 2, 430, 17, '#67e8f9', 'center', 800);
    ctx.globalAlpha = 1;
  }

  function drawWin(state, best) {
    ctx.fillStyle = 'rgba(20, 16, 4, 0.6)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    text('DAWN BREAKS', ARENA.width / 2, 180, 52, '#ffe082', 'center', 900);
    text('Ten waves held. The beacon burns bright again — the night is over.', ARENA.width / 2, 232, 17, '#fff3c4', 'center', 600);
    text(`SCORE ${state.score}`, ARENA.width / 2, 292, 26, '#ffe082', 'center', 800);
    text(`${state.kills} shades banished   •   ${state.shardsCollected} shards gathered`, ARENA.width / 2, 330, 15, 'rgba(255, 243, 196, 0.9)', 'center', 600);
    if (state.score >= best && state.score > 0) text('NEW BEST!', ARENA.width / 2, 368, 16, '#67e8f9', 'center', 800);
    else if (best > 0) text(`BEST ${best}`, ARENA.width / 2, 368, 15, 'rgba(207, 232, 255, 0.8)', 'center', 700);
    const pulse = 0.7 + 0.3 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('CLICK OR PRESS SPACE TO PLAY AGAIN', ARENA.width / 2, 428, 17, '#67e8f9', 'center', 800);
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.66)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    text('PAUSED', ARENA.width / 2, 260, 44, '#e8f6ff', 'center', 900);
    text('Press P or click to keep playing.', ARENA.width / 2, 310, 16, '#cfe8ff', 'center', 600);
  }

  function draw(state, screen, best) {
    const { scale, ox, oy } = fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    const sx = state.shake > 0 ? (Math.random() * 2 - 1) * state.shake : 0;
    const sy = state.shake > 0 ? (Math.random() * 2 - 1) * state.shake : 0;
    ctx.save();
    ctx.translate(sx, sy);
    drawBackground(state.time);
    drawBeacon(state, state.time);
    for (const s of state.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(state.time * 2 + s.x);
      ctx.fillStyle = '#ffe082';
      ctx.shadowColor = '#ffd54f';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (const e of state.enemies) drawEnemy(e, state.time);
    for (const b of state.bullets) {
      ctx.fillStyle = '#a5f3fc';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 1.5, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (const b of state.enemyBullets) {
      ctx.fillStyle = '#f0abfc';
      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 1, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (screen !== SCREEN_TITLE) drawPlayer(state, state.time);
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      text(f.text, f.x, f.y, 14, f.color, 'center', 800);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_UPGRADE) { drawHud(state); drawUpgrade(state); }
    else if (screen === SCREEN_OVER) { drawHud(state); drawOver(state, best); }
    else if (screen === SCREEN_WIN) { drawHud(state); drawWin(state, best); }
    else if (screen === SCREEN_PAUSED) { drawHud(state); drawPaused(); }
    else drawHud(state);
  }

  return { draw, fit };
}
