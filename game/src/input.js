// Skylark Courier — keyboard and mouse input.
// Arrow keys / WASD fly the plane; the mouse steers by dragging.
// The state is polled once per frame, never event-driven in the loop.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, active: false };

  function onKey(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.type === 'keydown') keys.add(e.key.toLowerCase());
    else keys.delete(e.key.toLowerCase());
  }

  function onMouse(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = (e.clientY - rect.top) / rect.height;
    mouse.active = true;
  }

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  canvas.addEventListener('pointerdown', (e) => { mouse.down = true; onMouse(e); });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  window.addEventListener('pointermove', onMouse);

  function pressed(...names) {
    return names.some((n) => keys.has(n));
  }

  // Stick values for this frame: -1..1 pitch (up = climb) and bank.
  // Arrows fly, A/D bank, W/S work the throttle, Shift/Ctrl trim it fast.
  function stick() {
    let pitch = 0, bank = 0;
    if (pressed('arrowup')) pitch += 1;
    if (pressed('arrowdown')) pitch -= 1;
    if (pressed('arrowleft', 'a')) bank -= 1;
    if (pressed('arrowright', 'd')) bank += 1;
    if (mouse.down && mouse.active) {
      bank += (mouse.x - 0.5) * 2.4;
      pitch += (0.5 - mouse.y) * 1.8;
    }
    return {
      pitch: Math.max(-1, Math.min(1, pitch)),
      bank: Math.max(-1, Math.min(1, bank)),
    };
  }

  function throttleDelta() {
    let d = 0;
    if (pressed('w', 'shift')) d += 1;
    if (pressed('s', 'control', 'c')) d -= 1;
    return d;
  }

  return {
    keys,
    mouse,
    stick,
    throttleDelta,
    brake: () => pressed('b', ' '),
    anyKey: () => keys.size > 0,
    wasPressed: (name) => keys.has(name),
    clear: () => keys.clear(),
  };
}
