export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const BOOST = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);

export function createInput(target) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let boost = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (BOOST.has(event.code)) boost = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else return;
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (BOOST.has(event.code)) boost = false;
  });

  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
    boost = false;
  });

  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    roll() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    pitch() {
      return (down ? 1 : 0) - (up ? 1 : 0);
    },
    isBoost() {
      return boost;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
