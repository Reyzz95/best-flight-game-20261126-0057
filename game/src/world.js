import { LEVEL_CONFIGS } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_CRASH = 2;
export const EVENT_LAND = 4;
export const EVENT_LEVEL_WIN = 8;
export const EVENT_GAME_WIN = 16;
export const EVENT_OUT_OF_FUEL = 32;

const LEVEL_LENGTH = 8000;

export function createWorld(rng) {
  let state = {
    levelIndex: 0,
    x: 0,
    y: 200,
    z: 0,
    speed: 200,
    heading: 0,
    pitch: 0,
    roll: 0,
    fuel: 100,
    score: 0,
    ringsRemaining: 5,
    rings: [],
    runwayZ: LEVEL_LENGTH,
    crashed: false,
    landed: false,
    outOfFuel: false,
    gameWon: false,
  };

  function getTerrainHeight(x, z) {
    const base = 40 + Math.sin(z * 0.001) * 80 + Math.cos(x * 0.002) * 50;
    const hills = Math.sin(z * 0.003 + rng() * 10) * 60 + Math.cos(z * 0.007) * 40;
    const river = Math.abs(Math.sin(z * 0.002) * 200 - x) < 60 ? -30 : 0;
    const mountainBonus = state.levelIndex === 2 ? Math.sin(z * 0.005) * 150 : 0;
    return Math.max(10, base + hills + river + mountainBonus);
  }

  function initLevel(index) {
    state.levelIndex = index;
    const cfg = LEVEL_CONFIGS[index];
    state.x = 0;
    state.y = 250;
    state.z = 0;
    state.speed = cfg.speed;
    state.heading = 0;
    state.pitch = 0;
    state.roll = 0;
    state.fuel = cfg.fuel;
    state.ringsRemaining = cfg.rings;
    state.runwayZ = LEVEL_LENGTH;
    state.crashed = false;
    state.landed = false;
    state.outOfFuel = false;
    state.gameWon = false;

    state.rings = [];
    const interval = (LEVEL_LENGTH - 1500) / (cfg.rings + 1);
    for (let i = 1; i <= cfg.rings; i++) {
      const rz = 1000 + i * interval;
      const rx = (rng() - 0.5) * 400;
      const ry = 180 + rng() * 150 + getTerrainHeight(rx, rz);
      state.rings.push({
        x: rx,
        y: ry,
        z: rz,
        radius: 45,
        collected: false,
      });
    }
  }

  initLevel(0);

  return {
    state,
    getTerrainHeight,
    reset() {
      state.score = 0;
      initLevel(0);
    },
    nextLevel() {
      if (state.levelIndex < LEVEL_CONFIGS.length - 1) {
        initLevel(state.levelIndex + 1);
        return true;
      } else {
        state.gameWon = true;
        return false;
      }
    },
    step(dt, rollInput, pitchInput, boost) {
      if (state.crashed || state.landed || state.outOfFuel || state.gameWon) {
        return EVENT_NONE;
      }

      let events = EVENT_NONE;
      const cfg = LEVEL_CONFIGS[state.levelIndex];

      const rollSpeed = 2.5;
      const pitchSpeed = 2.0;

      state.roll += rollInput * rollSpeed * dt;
      state.roll = Math.max(-0.9, Math.min(0.9, state.roll));
      if (rollInput === 0) state.roll *= 0.9;

      state.pitch += pitchInput * pitchSpeed * dt;
      state.pitch = Math.max(-0.6, Math.min(0.6, state.pitch));
      if (pitchInput === 0) state.pitch *= 0.95;

      const boostMultiplier = boost ? 1.4 : 1.0;
      state.speed = cfg.speed * boostMultiplier;

      state.x -= state.roll * 300 * dt;
      state.x = Math.max(-700, Math.min(700, state.x));

      state.y += (state.pitch * 250 + (state.speed - 200) * 0.2) * dt;
      state.y = Math.max(10, Math.min(1000, state.y));

      state.z += state.speed * dt;

      const fuelBurn = (1.5 + (boost ? 2.5 : 0.0)) * dt;
      state.fuel -= fuelBurn;
      if (state.fuel <= 0) {
        state.fuel = 0;
        state.outOfFuel = true;
        state.crashed = true;
        return EVENT_OUT_OF_FUEL;
      }

      const groundH = getTerrainHeight(state.x, state.z);
      if (state.y <= groundH) {
        if (state.z >= state.runwayZ - 400 && state.z <= state.runwayZ + 600 && Math.abs(state.x) < 120 && state.ringsRemaining <= 0 && state.y <= groundH + 5 && Math.abs(state.pitch) < 0.2 && Math.abs(state.roll) < 0.2) {
          state.landed = true;
          events |= EVENT_LAND;
          if (state.levelIndex === LEVEL_CONFIGS.length - 1) {
            state.gameWon = true;
            events |= EVENT_GAME_WIN;
          } else {
            events |= EVENT_LEVEL_WIN;
          }
        } else {
          state.crashed = true;
          events |= EVENT_CRASH;
        }
        return events;
      }

      for (let i = 0; i < state.rings.length; i++) {
        const ring = state.rings[i];
        if (!ring.collected && Math.abs(state.z - ring.z) < 40) {
          const dist = Math.hypot(state.x - ring.x, state.y - ring.y);
          if (dist < ring.radius + 30) {
            ring.collected = true;
            state.ringsRemaining--;
            state.score += 100 * (state.levelIndex + 1);
            state.fuel = Math.min(100, state.fuel + 15);
            events |= EVENT_RING;
          }
        }
      }

      return events;
    },
  };
}
