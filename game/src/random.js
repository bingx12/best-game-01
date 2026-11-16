// A small seeded random source (mulberry32) so a run can be replayed exactly:
// the same seed always spawns the same shades in the same order, which is what
// the screenshot scenes and the deterministic grading runs rely on.
export function createRandom(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    // A float in [min, max).
    range(min, max) {
      return min + this.next() * (max - min);
    },
    // An integer in [min, max].
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    // One element of an array, uniformly.
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}
