import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CRASH, EVENT_GAME_WIN, EVENT_LEVEL_WIN, EVENT_OUT_OF_FUEL, EVENT_RING } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

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
  } catch {}
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

  function announce(msg) {
    status.textContent = msg;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Flight started. Level 1.');
  }

  function restartGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Restarted flight.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      if (screen === SCREEN_TITLE) startGame();
      else restartGame();
    } else if (actions & ACTION_RESTART) {
      restartGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Resumed.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE || screen === SCREEN_PAUSED) return;
    const events = world.step(STEP, input.roll(), input.pitch(), input.isBoost());
    if (events & EVENT_CRASH || events & EVENT_OUT_OF_FUEL) {
      screen = SCREEN_OVER;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce('Crashed. Game over.');
    } else if (events & EVENT_GAME_WIN) {
      screen = SCREEN_WIN;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce('Mission accomplished! All levels won.');
    } else if (events & EVENT_LEVEL_WIN) {
      world.nextLevel();
      announce('Level completed! Advanced to next level.');
    } else if (events & EVENT_RING) {
      announce('Ring collected!');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Skybound Aces. Press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
