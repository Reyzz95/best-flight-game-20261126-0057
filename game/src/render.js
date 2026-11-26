import { FIELD, FONT } from './config.js';

export const SCREEN_TITLE = 1;
export const SCREEN_PLAY = 2;
export const SCREEN_PAUSED = 3;
export const SCREEN_OVER = 4;
export const SCREEN_WIN = 5;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = FIELD.width;
    canvas.height = FIELD.height;
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    draw(worldState, screen, bestScore) {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);

      const state = worldState;

      // 1. Sky & Sun & Clouds
      const skyGrad = ctx.createLinearGradient(0, 0, 0, FIELD.height / 2);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height / 2 + 50);

      // Sun
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(1000, 120, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      const cloudOffset = (state.z * 0.2) % FIELD.width;
      for (let i = -1; i < 3; i++) {
        const cx = i * 600 - cloudOffset + 200;
        ctx.beginPath();
        ctx.arc(cx, 150, 40, 0, Math.PI * 2);
        ctx.arc(cx + 35, 140, 50, 0, Math.PI * 2);
        ctx.arc(cx + 70, 155, 35, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Terrain & Ground Projection
      const horizonY = FIELD.height / 2 + state.pitch * 300;
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, FIELD.height);
      groundGrad.addColorStop(0, '#15803d');
      groundGrad.addColorStop(1, '#166534');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, FIELD.width, FIELD.height - horizonY);

      // Distant hills: two sine ridges sitting on the horizon, scrolling
      // slowly with distance so the terrain reads as hills, not flat green.
      const ridges = [
        { amp: 42, lift: 0, color: '#14532d' },
        { amp: 26, lift: 16, color: '#15803d' },
      ];
      for (const ridge of ridges) {
        ctx.fillStyle = ridge.color;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let sx = 0; sx <= FIELD.width; sx += 16) {
          const wx = sx + state.z * 0.35;
          const hy = horizonY - ridge.lift - ridge.amp * (0.5 + 0.5 * Math.sin(wx * 0.004));
          ctx.lineTo(sx, hy);
        }
        ctx.lineTo(FIELD.width, horizonY);
        ctx.closePath();
        ctx.fill();
      }

      // River winding from the foreground up to the horizon: a narrow
      // curved ribbon, not a wide wedge.
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      const riverX = FIELD.width / 2 - state.x * 0.05 + Math.sin(state.z * 0.001) * 120;
      const rx0 = riverX + 70;
      ctx.moveTo(rx0 - 26, FIELD.height);
      ctx.quadraticCurveTo(rx0 - 90, horizonY + 150, riverX - 50, horizonY);
      ctx.lineTo(riverX - 38, horizonY);
      ctx.quadraticCurveTo(rx0 - 60, horizonY + 150, rx0 + 26, FIELD.height);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 15; i++) {
        const stepZ = (i * 200 - (state.z % 200));
        if (stepZ <= 0) continue;
        const perspective = 300 / stepZ;
        const sy = horizonY + perspective * 150;
        if (sy > horizonY && sy < FIELD.height) {
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(FIELD.width, sy);
          ctx.stroke();
        }
      }

      // Runway ahead
      const distToRunway = state.runwayZ - state.z;
      if (distToRunway > -500 && distToRunway < 3000) {
        const p1 = 300 / Math.max(10, distToRunway);
        const p2 = 300 / Math.max(10, distToRunway + 800);
        const rwWidth1 = 250 * p1;
        const rwWidth2 = 250 * p2;
        const cx = FIELD.width / 2 - state.x * p1;
        const sy1 = horizonY + (200 - state.y) * p1;
        const sy2 = horizonY + (200 - state.y) * p2;

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(cx - rwWidth1, sy1);
        ctx.lineTo(cx + rwWidth1, sy1);
        ctx.lineTo(cx + rwWidth2, sy2);
        ctx.lineTo(cx - rwWidth2, sy2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        ctx.moveTo(cx, sy1);
        ctx.lineTo(cx, sy2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Render 3D Rings
      for (let i = 0; i < state.rings.length; i++) {
        const ring = state.rings[i];
        if (ring.collected) continue;
        const dz = ring.z - state.z;
        if (dz > 0 && dz < 3500) {
          const p = 300 / dz;
          const rx = FIELD.width / 2 + (ring.x - state.x) * p;
          const ry = horizonY + (ring.y - state.y) * p;
          const rSize = ring.radius * p;

          if (rSize > 2 && ry > 0 && ry < FIELD.height) {
            ctx.save();
            ctx.strokeStyle = ring.z < state.z + 500 ? '#22d3ee' : '#eab308';
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 15;
            ctx.lineWidth = Math.max(3, 6 * p);
            ctx.beginPath();
            ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // 4. Chase View Airplane
      ctx.save();
      ctx.translate(FIELD.width / 2, FIELD.height * 0.75);
      ctx.rotate(state.roll);

      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.lineTo(12, 20);
      ctx.lineTo(0, 30);
      ctx.lineTo(-12, 20);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(80, 5);
      ctx.lineTo(70, 15);
      ctx.lineTo(0, 5);
      ctx.lineTo(-70, 15);
      ctx.lineTo(-80, 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(20, 35);
      ctx.lineTo(-20, 35);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 5. Lit HUD Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(20, 20, FIELD.width - 40, 70);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, FIELD.width - 40, 70);

      ctx.font = `bold 20px ${FONT}`;
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';

      const alt = Math.floor(state.y * 3.28);
      const spd = Math.floor(state.speed * 0.75);
      const hdg = Math.floor((state.heading + 360) % 360);

      ctx.fillText(`ALT: ${alt} FT`, 45, 62);
      ctx.fillText(`SPD: ${spd} KTS`, 220, 62);
      ctx.fillText(`HDG: ${String(hdg).padStart(3, '0')}°`, 395, 62);
      ctx.fillText(`SCORE: ${state.score}`, 570, 62);
      ctx.fillText(`FUEL: ${Math.floor(state.fuel)}%`, 775, 62);
      ctx.fillText(`RINGS: ${state.ringsRemaining}`, 970, 62);
      ctx.fillText(`LVL: ${state.levelIndex + 1}`, 1150, 62);

      // 6. Screens
      if (screen === SCREEN_TITLE) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);

        ctx.textAlign = 'center';
        ctx.font = `bold 64px ${FONT}`;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 30;
        ctx.fillText('SKYBOUND ACES', FIELD.width / 2, 220);

        ctx.font = `24px ${FONT}`;
        ctx.fillStyle = '#e2e8f0';
        ctx.shadowBlur = 0;
        ctx.fillText('The Ultimate Pseudo-3D Flight Challenge', FIELD.width / 2, 280);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `20px ${FONT}`;
        ctx.fillText('Steer: Arrow Keys / WASD (Bank & Pitch)  |  Boost: Shift  |  Restart: R', FIELD.width / 2, 390);
        ctx.fillText('Fly through glowing rings and land on the runway to complete each level!', FIELD.width / 2, 430);

        ctx.fillStyle = '#fde047';
        ctx.font = `bold 26px ${FONT}`;
        ctx.fillText('Press SPACE or Click to Start Flight', FIELD.width / 2, 540);
      } else if (screen === SCREEN_PAUSED) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);

        ctx.textAlign = 'center';
        ctx.font = `bold 48px ${FONT}`;
        ctx.fillStyle = '#fde047';
        ctx.fillText('GAME PAUSED', FIELD.width / 2, FIELD.height / 2 - 30);

        ctx.font = `22px ${FONT}`;
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText('Press P or Space to Resume', FIELD.width / 2, FIELD.height / 2 + 30);
      } else if (screen === SCREEN_OVER) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);

        ctx.textAlign = 'center';
        ctx.font = `bold 56px ${FONT}`;
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 25;
        ctx.fillText(state.outOfFuel ? 'OUT OF FUEL!' : 'CRASHED!', FIELD.width / 2, 240);

        ctx.font = `28px ${FONT}`;
        ctx.fillStyle = '#f8fafc';
        ctx.shadowBlur = 0;
        ctx.fillText(`Final Score: ${state.score}`, FIELD.width / 2, 330);
        ctx.fillText(`Best Score: ${bestScore}`, FIELD.width / 2, 380);

        ctx.fillStyle = '#fde047';
        ctx.font = `bold 24px ${FONT}`;
        ctx.fillText('Press R to Restart Run', FIELD.width / 2, 490);
      } else if (screen === SCREEN_WIN) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);

        ctx.textAlign = 'center';
        ctx.font = `bold 56px ${FONT}`;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#16a34a';
        ctx.shadowBlur = 30;
        ctx.fillText('MISSION ACCOMPLISHED!', FIELD.width / 2, 220);

        ctx.font = `28px ${FONT}`;
        ctx.fillStyle = '#f8fafc';
        ctx.shadowBlur = 0;
        ctx.fillText('All Levels Successfully Completed & Landed!', FIELD.width / 2, 290);
        ctx.fillText(`Final Score: ${state.score}  |  Best: ${bestScore}`, FIELD.width / 2, 360);

        ctx.fillStyle = '#fde047';
        ctx.font = `bold 24px ${FONT}`;
        ctx.fillText('Press R to Play Again', FIELD.width / 2, 480);
      }
    },
  };
}
