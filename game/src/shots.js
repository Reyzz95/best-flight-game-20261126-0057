import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Stage a true mid-flight frame directly: far down level 1 (seed 1 puts
    // the last ring at z 6417, x -144, y 379), so the ring is large ahead
    // and the runway sits on the horizon.
    world.state.z = 6000;
    world.state.x = 0;
    world.state.y = 250;
    world.state.roll = 0.12;
    world.state.pitch = 0;
    world.state.fuel = 55;
    return { screen: SCREEN_PLAY, best: 2500 };
  } else if (name === 'end') {
    world.state.score = 5400;
    world.state.landed = true;
    return { screen: SCREEN_WIN, best: 5400 };
  } else {
    return { screen: SCREEN_TITLE, best: 0 };
  }
}
