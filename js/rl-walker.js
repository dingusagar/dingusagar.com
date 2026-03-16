/**
 * Neuroevolution Quadruped Walker — AI Lab
 * 4-legged creature learns to walk via genetic algorithm + neural network.
 * Pure vanilla JS, no dependencies. All physics in screen-space (y down).
 */
(function () {

  // ── Tuning ───────────────────────────────────────────────────────────────────
  const POP_SIZE      = 24;
  const TOP_K         = 5;
  const EPISODE_STEPS = 480;
  const DT            = 1 / 60;

  const TORSO_HALF = 34;   // half-length of torso
  const TORSO_H    = 8;    // half-height of torso (for drawing)
  const LEG_UPPER  = 26;
  const LEG_LOWER  = 24;
  const LEG_SPREAD = 5;    // visual L/R spread per pair

  const HIP_MIN  = -0.6, HIP_MAX  = 0.9;
  const KNEE_MIN =  0.1, KNEE_MAX = 1.4;

  // Leg indices: 0=FL, 1=FR, 2=BL, 3=BR
  const FRONT = [0, 1], BACK = [2, 3];
  const IS_LEFT  = [true,  false, true,  false];
  const IS_FRONT = [true,  true,  false, false];

  // ── Neural Network ───────────────────────────────────────────────────────────
  // Inputs: 8 joint angles + tilt + vx + vy + sin/cos(phase) + 4 contact = 17
  const NI = 17, NH = 24, NO = 8;
  const WC = NI * NH + NH + NH * NO + NO;

  function forward(W, inp) {
    const h = new Float32Array(NH);
    for (let j = 0; j < NH; j++) {
      let s = W[NI * NH + j];
      for (let i = 0; i < NI; i++) s += inp[i] * W[i * NH + j];
      h[j] = Math.tanh(s);
    }
    const base = NI * NH + NH;
    const out = new Float32Array(NO);
    for (let o = 0; o < NO; o++) {
      let s = W[base + NH * NO + o];
      for (let j = 0; j < NH; j++) s += h[j] * W[base + j * NO + o];
      out[o] = Math.tanh(s);
    }
    return out;
  }

  function randW() {
    const w = new Float32Array(WC);
    for (let i = 0; i < WC; i++) w[i] = (Math.random() * 2 - 1) * 0.5;
    return w;
  }

  function randn() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function mutate(W, s) {
    const w = new Float32Array(W);
    for (let i = 0; i < w.length; i++) {
      w[i] += randn() * (Math.random() < 0.1 ? s * 4 : s);
      w[i] = Math.max(-6, Math.min(6, w[i]));
    }
    return w;
  }

  // ── Creature ─────────────────────────────────────────────────────────────────
  function makeCreature(W, groundY) {
    const standH = LEG_UPPER + LEG_LOWER;
    return {
      W,
      x: 0,
      y: groundY - standH - TORSO_H,   // torso centre y
      vx: 0, vy: 0,
      tilt: 0, tiltV: 0,
      // 8 joint angles: hip[0..3], knee[0..3]
      angles: [0.2, 0.2, -0.2, -0.2,   // hips FL,FR,BL,BR
               0.5, 0.5,  0.5,  0.5],  // knees
      phase: 0,
      steps: 0,
      alive: true,
      fitness: 0,
      feet: Array.from({length: 4}, () => ({ grounded: false, gripX: 0 })),
      contacts: [false, false, false, false],
    };
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // Hip attachment point in world coords
  function hipPos(c, legIdx) {
    const sign = IS_FRONT[legIdx] ? 1 : -1;
    const spread = IS_LEFT[legIdx] ? -LEG_SPREAD : LEG_SPREAD;
    // Torso end rotated by tilt
    const ax = c.x + Math.cos(c.tilt) * sign * TORSO_HALF + spread;
    const ay = c.y + Math.sin(c.tilt) * sign * TORSO_HALF + TORSO_H;
    return { ax, ay };
  }

  // Full leg joint positions in world coords
  function legPos(c, legIdx) {
    const { ax, ay } = hipPos(c, legIdx);
    const ha = c.angles[legIdx] + c.tilt * 0.5;           // hip angle from vertical
    const ka = c.angles[legIdx + 4];                       // knee angle
    const kx = ax + Math.sin(ha) * LEG_UPPER;
    const ky = ay + Math.cos(ha) * LEG_UPPER;
    const fx = kx + Math.sin(ha + ka) * LEG_LOWER;
    const fy = ky + Math.cos(ha + ka) * LEG_LOWER;
    return { ax, ay, kx, ky, fx, fy };
  }

  function step(c, groundY) {
    if (!c.alive) return;
    c.phase += DT;
    c.steps++;

    // Neural network
    const inp = new Float32Array(NI);
    for (let i = 0; i < 8; i++) inp[i] = c.angles[i] / 1.5;
    inp[8]  = c.tilt / 0.8;
    inp[9]  = c.vx / 8;
    inp[10] = c.vy / 8;
    inp[11] = Math.sin(c.phase * 3.0);
    inp[12] = Math.cos(c.phase * 3.0);
    for (let i = 0; i < 4; i++) inp[13 + i] = c.contacts[i] ? 1 : 0;

    const out = forward(c.W, inp);

    // Target angles
    const kp = 12;
    for (let i = 0; i < 4; i++) {
      const tHip  = HIP_MIN  + (out[i]     * 0.5 + 0.5) * (HIP_MAX  - HIP_MIN);
      const tKnee = KNEE_MIN + (out[i + 4] * 0.5 + 0.5) * (KNEE_MAX - KNEE_MIN);
      c.angles[i]     += (tHip  - c.angles[i])     * kp * DT;
      c.angles[i + 4] += (tKnee - c.angles[i + 4]) * kp * DT;
      c.angles[i]     = clamp(c.angles[i],     HIP_MIN,  HIP_MAX);
      c.angles[i + 4] = clamp(c.angles[i + 4], KNEE_MIN, KNEE_MAX);
    }

    // Gravity
    c.vy += 380 * DT;

    // Ground contact + foot grip
    let fySum = 0, fxSum = 0, contacts = 0;
    for (let leg = 0; leg < 4; leg++) {
      const lp   = legPos(c, leg);
      const foot = c.feet[leg];
      const pen  = lp.fy - groundY;

      if (pen > -4) {
        fySum += -(pen * 700 + c.vy * 9);
        contacts++;
        c.contacts[leg] = true;

        const footWorldX = lp.fx;
        if (!foot.grounded) {
          foot.grounded = true;
          foot.gripX    = footWorldX;
        }
        // Grip spring — foot stays planted, body swings over
        fxSum += (foot.gripX - footWorldX) * 280;
      } else {
        foot.grounded   = false;
        c.contacts[leg] = false;
      }
    }

    if (contacts > 0) {
      c.vy += (fySum / contacts) * DT;
      c.vx += (fxSum / contacts) * DT;
    }

    // Clamp velocities to prevent numerical explosion
    c.vx = clamp(c.vx, -15, 15);
    c.vy = clamp(c.vy, -20, 20);
    c.vx *= 0.93;
    c.vy *= 0.86;

    // Tilt: torso naturally wants to be level
    const tiltTorque = -c.tilt * 5 - c.tiltV * 3
                     + (c.angles[0] + c.angles[1] - c.angles[2] - c.angles[3]) * 0.05
                     + (Math.random() - 0.5) * 0.01;
    c.tiltV = clamp(c.tiltV + tiltTorque * DT, -3, 3);
    c.tilt  += c.tiltV * DT;
    c.tilt   = clamp(c.tilt, -0.5, 0.5);

    c.x += c.vx * DT * 60;
    c.x  = clamp(c.x, -100, 50000); // prevent x explosion
    c.y += c.vy * DT;
    c.y  = clamp(c.y, groundY - 200, groundY);

    // Fitness: raw forward distance only
    if (c.x > 0) c.fitness = c.x;

    if (Math.abs(c.tilt) > 0.48 || c.steps >= EPISODE_STEPS) {
      c.alive = false;
    }
  }

  // ── Evolution ────────────────────────────────────────────────────────────────
  function evolve(pop, groundY) {
    const sorted = [...pop].sort((a, b) => b.fitness - a.fitness);
    const elite  = sorted.slice(0, TOP_K);
    const next   = elite.map(e => makeCreature(new Float32Array(e.W), groundY));
    while (next.length < POP_SIZE) {
      const p     = elite[Math.floor(Math.random() * TOP_K)];
      const sigma = Math.random() < 0.1 ? 0.3 : 0.08;
      next.push(makeCreature(mutate(p.W, sigma), groundY));
    }
    return next;
  }

  // ── Rendering ────────────────────────────────────────────────────────────────
  const COLS = ['#7c5cfc','#38d9f5','#ff5fa0','#2efc8f','#ffd460',
                '#ff9a3c','#a78bfa','#34d399','#f472b6','#60a5fa',
                '#fb923c','#4ade80','#e879f9','#38bdf8','#facc15',
                '#f87171','#c084fc','#86efac','#fdba74','#67e8f9',
                '#818cf8','#fb7185','#34d399','#fbbf24'];

  function drawCreature(ctx, c, color, alpha, camX) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const ox = camX + c.x;  // world-to-screen offset for this creature

    // Draw back legs first (BL=2, BR=3)
    [2, 3].forEach(li => drawLeg(ctx, c, li, ox, color, false));

    // Torso
    ctx.save();
    ctx.translate(ox, c.y);
    ctx.rotate(c.tilt);
    ctx.beginPath();
    ctx.roundRect(-TORSO_HALF, -TORSO_H, TORSO_HALF * 2, TORSO_H * 2, 4);
    ctx.fillStyle = color;
    ctx.fill();
    // Eye dot on front
    ctx.beginPath();
    ctx.arc(TORSO_HALF - 6, -2, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.restore();

    // Front legs on top (FL=0, FR=1)
    [0, 1].forEach(li => drawLeg(ctx, c, li, ox, color, true));

    ctx.restore();
  }

  function drawLeg(ctx, c, legIdx, ox, color, isFront) {
    const lp = legPos(c, legIdx);
    const ax = lp.ax + ox - c.x;
    const ay = lp.ay;
    const kx = lp.kx + ox - c.x;
    const ky = lp.ky;
    const fx = lp.fx + ox - c.x;
    const fy = lp.fy;

    ctx.lineCap = 'round';
    ctx.strokeStyle = color;

    // Upper leg
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(kx, ky);
    ctx.lineWidth = isFront ? 4 : 3;
    ctx.stroke();

    // Lower leg
    ctx.beginPath();
    ctx.moveTo(kx, ky); ctx.lineTo(fx, fy);
    ctx.lineWidth = isFront ? 3 : 2.5;
    ctx.stroke();

    // Knee
    ctx.beginPath();
    ctx.arc(kx, ky, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Foot
    ctx.beginPath();
    ctx.arc(fx, fy, c.contacts[legIdx] ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = c.contacts[legIdx] ? '#fff' : color;
    ctx.globalAlpha *= 0.9;
    ctx.fill();
    ctx.globalAlpha /= 0.9;
  }

  // ── App ───────────────────────────────────────────────────────────────────────
  let canvas, ctx, groundY;
  let pop = [], gen = 1, bestFit = 0, allBest = 0;
  let bestW = null, speed = 1, showBest = false;

  function setGroundY() { groundY = canvas.height - 45; }

  function resizeCanvas() {
    canvas.width  = canvas.parentElement.clientWidth || 720;
    canvas.height = 270;
    setGroundY();
  }

  function initPop() {
    pop = Array.from({length: POP_SIZE}, () => makeCreature(randW(), groundY));
    gen = 1; bestFit = 0; showBest = false;
    document.getElementById('walker-watch-btn')?.classList.remove('active');
  }

  function watchBest() {
    if (!bestW) return;
    showBest = true;
    pop = [makeCreature(new Float32Array(bestW), groundY)];
    document.getElementById('walker-watch-btn')?.classList.add('active');
  }

  function render() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Ground
    const gGrad = ctx.createLinearGradient(0, 0, W, 0);
    gGrad.addColorStop(0,   'rgba(124,92,252,0.5)');
    gGrad.addColorStop(0.5, 'rgba(56,217,245,0.8)');
    gGrad.addColorStop(1,   'rgba(124,92,252,0.5)');
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY);
    ctx.strokeStyle = gGrad; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(56,217,245,0.04)';
    ctx.fillRect(0, groundY, W, H - groundY);

    // Camera
    const alive = pop.filter(c => c.alive);
    const leader = (alive.length ? alive : pop).reduce((a, b) => a.x > b.x ? a : b);
    const camX = W * 0.28 - leader.x;

    // Distance ticks
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '11px Inter,sans-serif';
    for (let d = -200; d < 8000; d += 100) {
      const sx = camX + d;
      if (sx < 0 || sx > W) continue;
      ctx.beginPath();
      ctx.moveTo(sx, groundY - 7); ctx.lineTo(sx, groundY + 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
      if (d >= 0) ctx.fillText(String(d), sx - 8, groundY - 10);
    }

    // Draw creatures
    if (showBest) {
      if (pop[0]) drawCreature(ctx, pop[0], '#38d9f5', 1, camX);
    } else {
      pop.forEach((c, i) => {
        if (!c.alive) return;
        drawCreature(ctx, c, COLS[i % COLS.length], c === leader ? 1 : 0.2, camX);
      });
    }

    // Progress bar
    if (allBest > 0) {
      const bw = Math.min(allBest / 800, 1) * (W - 40);
      ctx.fillStyle = 'rgba(124,92,252,0.12)';
      ctx.fillRect(20, 10, W - 40, 5);
      const bg = ctx.createLinearGradient(20, 0, 20 + bw, 0);
      bg.addColorStop(0, '#7c5cfc'); bg.addColorStop(1, '#38d9f5');
      ctx.fillStyle = bg;
      ctx.fillRect(20, 10, bw, 5);
    }
  }

  function tick() {
    for (let s = 0; s < speed; s++) {
      pop.forEach(c => step(c, groundY));

      if (!showBest) {
        if (pop.every(c => !c.alive)) {
          const best = pop.reduce((a, b) => a.fitness > b.fitness ? a : b);
          bestFit = best.fitness;
          if (best.fitness > allBest) {
            allBest = best.fitness;
            bestW   = new Float32Array(best.W);
            try { localStorage.setItem('quadBestW', JSON.stringify(Array.from(bestW))); } catch(e) {}
          }
          gen++;
          pop = evolve(pop, groundY);
          updateStats();
        }
      } else {
        if (pop[0] && !pop[0].alive) pop = [makeCreature(new Float32Array(bestW), groundY)];
      }
    }
  }

  function updateStats() {
    const g = document.getElementById('walker-gen');
    const f = document.getElementById('walker-fit');
    const b = document.getElementById('walker-best');
    if (g) g.textContent = gen;
    if (f) f.textContent = Math.round(bestFit);
    if (b) b.textContent = Math.round(allBest);
  }

  function loop() { tick(); render(); requestAnimationFrame(loop); }

  function boot() {
    canvas = document.getElementById('walker-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    try {
      const s = localStorage.getItem('quadBestW');
      if (s) bestW = new Float32Array(JSON.parse(s));
    } catch(e) {}

    initPop(); updateStats(); loop();

    document.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        speed = +btn.dataset.speed;
        document.querySelectorAll('[data-speed]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('walker-reset')?.addEventListener('click', () => {
      allBest = 0; bestW = null;
      try { localStorage.removeItem('quadBestW'); } catch(e) {}
      initPop(); updateStats();
    });

    document.getElementById('walker-watch-btn')?.addEventListener('click', () => {
      showBest ? initPop() : watchBest();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
