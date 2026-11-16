// Keyboard and mouse input, read once a frame. Movement is WASD or the arrow keys;
// the mouse aims and holding the button fires; Shift or Space dashes. P or Escape
// pauses, M mutes, 1/2/3 pick an upgrade card, Enter/Space/click confirms a menu.
// Actions are latched: each one is reported once, then cleared.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_UPGRADE_1 = 8;
export const ACTION_UPGRADE_2 = 16;
export const ACTION_UPGRADE_3 = 32;
export const ACTION_MUTE = 64;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  function keyAction(code) {
    switch (code) {
      case 'Enter':
      case 'Space': return ACTION_CONFIRM;
      case 'KeyP':
      case 'Escape': return ACTION_PAUSE;
      case 'ShiftLeft':
      case 'ShiftRight': return ACTION_DASH;
      case 'Digit1': return ACTION_UPGRADE_1;
      case 'Digit2': return ACTION_UPGRADE_2;
      case 'Digit3': return ACTION_UPGRADE_3;
      case 'KeyM': return ACTION_MUTE;
      default: return 0;
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    actions |= keyAction(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    mouseDown = true;
    mouseClicked = true;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    // A unit movement vector from the held keys, or (0, 0).
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const len = Math.hypot(x, y);
        x /= len;
        y /= len;
      }
      return { x, y };
    },
    // The mouse position in canvas CSS pixels.
    mouse() { return { x: mouseX, y: mouseY }; },
    firing() { return mouseDown || keys.has('Space'); },
    takeActions() {
      const taken = actions | (mouseClicked ? ACTION_CONFIRM : 0);
      actions = 0;
      mouseClicked = false;
      return taken;
    },
    // For the screenshot autopilot: pretend keys are held and the mouse is somewhere.
    drive(dir, mouse, firing) {
      keys.clear();
      if (dir.x < -0.3) keys.add('KeyA');
      if (dir.x > 0.3) keys.add('KeyD');
      if (dir.y < -0.3) keys.add('KeyW');
      if (dir.y > 0.3) keys.add('KeyS');
      mouseX = mouse.x;
      mouseY = mouse.y;
      mouseDown = firing;
    },
  };
}
