[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bingx12/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bingx12/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node 22](https://img.shields.io/badge/Node-22-green.svg)](https://nodejs.org/)

# Last Light

The last beacon is fading. Hold the light through ten waves of night.

A wave-defense arena shooter, written in plain JavaScript with no libraries
and no network requests. You are the Keeper, a small orb of light, and the
beacon at the center of the arena is the last light left. Shades come in
waves — wisps that chase you, crawlers that chew the beacon, spitters that
shoot from range, splitters that break into two, brutes that take a beating,
and, on wave 10, the Umbral Herald itself. Survive all ten waves and dawn
breaks. Lose the beacon, or fall yourself, and the dark wins.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` and open
http://localhost:8080), then click or press Space to start.

- **WASD / arrows** — move
- **Mouse** — aim
- **Hold click** — fire
- **Shift / Space** — dash (a short burst of speed with a cooldown)
- **P** — pause
- **M** — mute

Between waves, pick one of three upgrade cards (click it, or press 1, 2 or
3): faster fire, heavier rounds, twin shot, piercing rounds, faster moves,
faster dash, more hearts, a shard magnet, a stronger beacon, or a beacon
turret that fires on its own. Shards dropped by fallen shades drift to you
and add to your score. Your best score is kept in the browser.

## Run it

```bash
node serve.ts        # serves game/ on http://localhost:8080
```

No build step, no dependencies. The game is `game/index.html` plus the ES
modules in `game/src/`.

## Files

- `game/index.html` — the page, a full-screen canvas and a status line
- `game/src/main.js` — boot, the fixed-step loop, the six screens
- `game/src/config.js` — every number that tunes the game: arena, player,
  shade kinds, waves, upgrades
- `game/src/world.js` — the rules: the Keeper, the beacon, the shades, the
  waves, the upgrades, the win and lose conditions
- `game/src/render.js` — everything drawn: the arena, the beacon, the
  shades, the shots, the HUD, the menus
- `game/src/input.js` — keyboard and mouse, and the latched action flags
- `game/src/audio.js` — synthesized sound effects (WebAudio, no files)
- `game/src/random.js` — the seeded random number generator
- `game/src/shots.js` — the four screenshot scenes (`?shot=start|play|upgrade|end`)
- `main.ts` — the program that hands the game in (copies `game/` and
  `screenshots/` to `/output` and writes `dossier.json`)
- `serve.ts` — a tiny static server for local play
- `shots.json` — the four screenshots and the scene each one shows
- `vendor/makefun-game.ts` — the make.fun dossier library, unchanged from the kit

## Screenshots

The four frames in `screenshots/` are the game itself, staged by
`game/src/shots.js`: the title, a mid-wave fight on wave 7, the upgrade
choice after clearing a wave, and the game-over screen. Each one is
deterministic for its seed (`?shot=play&seed=1` always shows the same fight).

---

Built for the [make.fun best-game-01 bounty](https://make.fun/bounty/best-game-01).
Try make.fun yourself: https://make.fun/?ref=k6eq9xtw
