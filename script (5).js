/* =============================================
   BAWEDA ESCAPE: Endless Run
   Full game implementation — Vanilla JS + Canvas
   ============================================= */

// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────
const LANES = 3;
const LANE_COLORS = ['#3a7bd5', '#3a7bd5', '#3a7bd5'];

// ──────────────────────────────────────────────
// UTILITY
// ──────────────────────────────────────────────
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Rect collision check (AABB)
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ──────────────────────────────────────────────
// GAME STATE
// ──────────────────────────────────────────────
// state: 'start' | 'playing' | 'paused' | 'gameover'
let state = 'start';

// ──────────────────────────────────────────────
// SCORE MANAGER
// ──────────────────────────────────────────────
const ScoreManager = {
  score: 0,
  distance: 0,
  multiplier: 1,
  highScore: 0,

  init() {
    this.score = 0;
    this.distance = 0;
    this.multiplier = 1;
    // Load high score from localStorage safely
    try {
      const saved = localStorage.getItem('baweda_hs');
      this.highScore = saved ? parseInt(saved, 10) : 0;
    } catch(e) { this.highScore = 0; }
  },

  reset() {
    this.score = 0;
    this.distance = 0;
    this.multiplier = 1;
  },

  addDistance(d) {
    this.distance += d;
    this.score += d * this.multiplier;
  },

  addCoin(val = 10) {
    this.score += val * this.multiplier;
  },

  updateMultiplier(seconds) {
    // Multiplier increases every 10 seconds of survival
    this.multiplier = 1 + Math.floor(seconds / 10) * 0.5;
  },

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      try { localStorage.setItem('baweda_hs', this.highScore); } catch(e) {}
    }
  },

  getDisplay() { return Math.floor(this.score); },
};

// ──────────────────────────────────────────────
// PLAYER
// ──────────────────────────────────────────────
const Player = {
  lane: 1,          // 0=left, 1=center, 2=right
  targetX: 0,       // pixel x to interpolate toward
  x: 0,
  y: 0,
  w: 32,
  h: 56,
  baseY: 0,         // ground Y
  velY: 0,
  isJumping: false,
  isSliding: false,
  slideTimer: 0,
  slideDuration: 600, // ms
  gravity: 2800,
  jumpForce: -800,
  animFrame: 0,
  animTimer: 0,
  animSpeed: 150,   // ms per frame
  wobble: 0,        // drunk wobble offset
  wobbleDir: 1,

  init(canvasW, canvasH, laneWidth, laneOffsetX) {
    this.laneWidth = laneWidth;
    this.laneOffsetX = laneOffsetX;
    this.baseY = canvasH * 0.62;
    this.x = this.laneOffsetX + this.lane * this.laneWidth + this.laneWidth / 2 - this.w / 2;
    this.targetX = this.x;
    this.y = this.baseY;
    this.velY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.wobble = 0;
    this.wobbleDir = 1;
    this.animFrame = 0;
    this.animTimer = 0;
  },

  reset(canvasW, canvasH, laneWidth, laneOffsetX) {
    this.lane = 1;
    this.init(canvasW, canvasH, laneWidth, laneOffsetX);
  },

  getLaneX(lane) {
    return this.laneOffsetX + lane * this.laneWidth + this.laneWidth / 2 - this.w / 2;
  },

  moveLeft() {
    if (this.lane > 0) { this.lane--; this.targetX = this.getLaneX(this.lane); }
  },

  moveRight() {
    if (this.lane < LANES - 1) { this.lane++; this.targetX = this.getLaneX(this.lane); }
  },

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.velY = this.jumpForce;
      this.isSliding = false;
      this.slideTimer = 0;
    }
  },

  slide() {
    if (!this.isJumping) {
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
    }
  },

  update(dt) {
    // Horizontal movement (smooth)
    const dx = this.targetX - this.x;
    this.x += dx * (1 - Math.pow(0.005, dt / 1000));

    // Vertical (jump arc)
    if (this.isJumping) {
      this.velY += this.gravity * (dt / 1000);
      this.y += this.velY * (dt / 1000);
      if (this.y >= this.baseY) {
        this.y = this.baseY;
        this.velY = 0;
        this.isJumping = false;
      }
    }

    // Slide timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.isSliding = false;
    }

    // Drunk wobble animation
    this.wobble += this.wobbleDir * 0.12;
    if (Math.abs(this.wobble) > 4) this.wobbleDir *= -1;

    // Walk animation frame
    if (!this.isJumping && !this.isSliding) {
      this.animTimer += dt;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    }
  },

  getBounds() {
    if (this.isSliding) {
      return { x: this.x + 2, y: this.baseY + this.h * 0.5, w: this.w - 4, h: this.h * 0.5 };
    }
    return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 };
  },

  // Draw the drunk character using canvas shapes
  draw(ctx) {
    ctx.save();
    const cx = this.x + this.w / 2;
    const drawY = this.isSliding ? this.baseY + this.h * 0.5 : this.y;
    const h = this.isSliding ? this.h * 0.5 : this.h;

    ctx.translate(cx + this.wobble, drawY + h / 2);

    const legSwing = Math.sin(this.animFrame * Math.PI / 2) * 8;

    if (this.isSliding) {
      // Slide pose
      ctx.fillStyle = '#FF6B6B';
      roundRect(ctx, -14, -10, 28, 20, 4);
      ctx.fill();
      // Head
      ctx.fillStyle = '#FFDAB9';
      ctx.beginPath(); ctx.arc(12, -6, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
      // Eye
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(14, -7, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      // Body (shirt)
      ctx.fillStyle = '#FF6B6B';
      roundRect(ctx, -10, -8, 20, 22, 4);
      ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
      roundRect(ctx, -10, -8, 20, 22, 4);
      ctx.stroke();

      // Legs
      ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-5, 14); ctx.lineTo(-5 + legSwing * 0.6, 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, 14); ctx.lineTo(5 - legSwing * 0.6, 30); ctx.stroke();

      // Arms (swing with legs)
      ctx.strokeStyle = '#FFDAB9'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-20 - legSwing * 0.4, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(20 + legSwing * 0.4, 14); ctx.stroke();

      // Head
      ctx.fillStyle = '#FFDAB9';
      ctx.beginPath(); ctx.arc(0, -18, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();

      // Eyes (glazed / drunk)
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-4, -19, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -19, 2.5, 0, Math.PI * 2); ctx.fill();
      // X eyes (sometimes)
      if (this.wobble > 2) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
        drawX(ctx, -4, -19, 2.5);
        drawX(ctx, 4, -19, 2.5);
      }

      // Smile/slur
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -14, 5, 0.2, Math.PI - 0.2); ctx.stroke();

      // Hair
      ctx.fillStyle = '#3E2723';
      ctx.beginPath(); ctx.arc(0, -28, 9, Math.PI, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
};

// ──────────────────────────────────────────────
// CHASER
// ──────────────────────────────────────────────
const Chaser = {
  distance: 200, // in game units (pixels, roughly)
  baseDistance: 200,
  speed: 0,    // relative to player; positive = catching up

  reset() {
    this.distance = 200;
  },

  update(dt, hasCollision) {
    if (hasCollision) {
      // Move closer on collision
      this.distance -= 60 * (dt / 1000) * 60;
    } else {
      // Slowly recede when player is doing well
      this.distance = Math.min(this.baseDistance, this.distance + 10 * (dt / 1000));
    }
    // Chaser slowly creeps closer over time (difficulty ramp)
    const elapsed = GameManager.elapsed;
    const creep = Math.max(0, (elapsed - 10000) / 60000) * 50;
    this.distance -= creep * (dt / 1000);
    this.distance = Math.max(0, this.distance);
  },

  caught() { return this.distance <= 0; },

  // Draw chaser behind the player
  draw(ctx, canvasW, canvasH) {
    const chaserY = canvasH * 0.62 + Player.h / 2;
    const cx = canvasW / 2;
    const drawX = cx - 40; // always on left side of screen bottom

    ctx.save();
    ctx.translate(drawX, chaserY);

    // Chaser body (officer blue)
    ctx.fillStyle = '#1565C0';
    roundRect(ctx, -10, -8, 20, 22, 4);
    ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
    roundRect(ctx, -10, -8, 20, 22, 4);
    ctx.stroke();

    // Hat
    ctx.fillStyle = '#0D47A1';
    roundRect(ctx, -12, -30, 24, 10, 2);
    ctx.fill();
    ctx.strokeStyle = '#111'; ctx.stroke();

    // Head
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath(); ctx.arc(0, -20, 11, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = '#111'; ctx.stroke();

    // Angry eyes
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-4, -22, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -22, 2, 0, Math.PI * 2); ctx.fill();

    // Angry brows
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -26); ctx.lineTo(-2, -24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -26); ctx.lineTo(2, -24); ctx.stroke();

    ctx.restore();
  }
};

// ──────────────────────────────────────────────
// OBSTACLE TYPES
// ──────────────────────────────────────────────
// type: { label, w, h, color, accent, canJumpOver, canSlideUnder }
const OBSTACLE_TYPES = [
  { label: 'cone',    w: 28, h: 36, color: '#FF6D00', accent: '#FFAB40', canJumpOver: true,  canSlideUnder: false },
  { label: 'barrier', w: 50, h: 28, color: '#F44336', accent: '#EF9A9A', canJumpOver: false, canSlideUnder: true  },
  { label: 'bin',     w: 32, h: 44, color: '#37474F', accent: '#78909C', canJumpOver: true,  canSlideUnder: false },
  { label: 'vehicle', w: 54, h: 38, color: '#00897B', accent: '#80CBC4', canJumpOver: false, canSlideUnder: false },
];

// ──────────────────────────────────────────────
// OBSTACLE MANAGER
// ──────────────────────────────────────────────
const ObstacleManager = {
  obstacles: [],
  spawnTimer: 0,
  spawnInterval: 1800, // ms

  reset() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1800;
  },

  update(dt, gameSpeed, laneWidth, laneOffsetX, canvasH) {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawn(laneWidth, laneOffsetX, canvasH);
    }

    for (const o of this.obstacles) {
      o.y += gameSpeed * (dt / 1000);
    }

    // Remove off-screen
    this.obstacles = this.obstacles.filter(o => o.y - o.h < canvasH + 100);
  },

  spawn(laneWidth, laneOffsetX, canvasH) {
    // Pick 1 or 2 occupied lanes, leave at least 1 clear
    const numObs = Math.random() < 0.35 ? 2 : 1;
    const shuffled = [0, 1, 2].sort(() => Math.random() - 0.5);
    const occupiedLanes = shuffled.slice(0, numObs);

    for (const lane of occupiedLanes) {
      const type = OBSTACLE_TYPES[randInt(0, OBSTACLE_TYPES.length - 1)];
      const cx = laneOffsetX + lane * laneWidth + laneWidth / 2;
      this.obstacles.push({
        type,
        lane,
        x: cx - type.w / 2,
        y: -type.h - 20,
        w: type.w,
        h: type.h,
        color: type.color,
        accent: type.accent,
        label: type.label,
        canJumpOver: type.canJumpOver,
        canSlideUnder: type.canSlideUnder,
      });
    }
  },

  draw(ctx) {
    for (const o of this.obstacles) {
      drawObstacle(ctx, o);
    }
  }
};

function drawObstacle(ctx, o) {
  ctx.save();
  const { x, y, w, h, label, color, accent } = o;

  if (label === 'cone') {
    // Triangle cone
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
    // Stripe
    ctx.strokeStyle = accent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.55); ctx.lineTo(x + w * 0.7, y + h * 0.55); ctx.stroke();

  } else if (label === 'barrier') {
    // Wide flat barrier
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 5);
    ctx.stroke();
    // Stripes
    ctx.fillStyle = accent;
    for (let i = 0; i < 3; i++) {
      const sx = x + 6 + i * 14;
      ctx.fillRect(sx, y + 4, 6, h - 8);
    }

  } else if (label === 'bin') {
    // Trash bin
    ctx.fillStyle = color;
    roundRect(ctx, x + 2, y + 8, w - 4, h - 8, 4);
    ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    roundRect(ctx, x + 2, y + 8, w - 4, h - 8, 4);
    ctx.stroke();
    // Lid
    ctx.fillStyle = accent;
    roundRect(ctx, x, y, w, 10, 3);
    ctx.fill(); ctx.stroke();
    // Lines
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 8 + i * 8, y + 14);
      ctx.lineTo(x + 8 + i * 8, y + h - 4);
      ctx.stroke();
    }

  } else if (label === 'vehicle') {
    // Car / vehicle top-down-ish
    ctx.fillStyle = color;
    roundRect(ctx, x, y + 8, w, h - 8, 6);
    ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    roundRect(ctx, x, y + 8, w, h - 8, 6);
    ctx.stroke();
    // Roof
    ctx.fillStyle = accent;
    roundRect(ctx, x + 8, y, w - 16, h * 0.55, 4);
    ctx.fill(); ctx.stroke();
    // Wheels
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(x + 8, y + h - 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 8, y + h - 2, 7, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

// ──────────────────────────────────────────────
// POWERUP MANAGER
// ──────────────────────────────────────────────
const POWERUP_TYPES = [
  { label: 'speed',  color: '#FFD600', icon: '⚡', duration: 5000 },
  { label: 'slow',   color: '#00BCD4', icon: '🐢', duration: 5000 },
  { label: 'coin',   color: '#FFC107', icon: '🪙', duration: 0 },
];

const PowerupManager = {
  powerups: [],
  active: null,   // currently active timed powerup
  activeTimer: 0,
  spawnTimer: 0,
  spawnInterval: 8000,

  reset() {
    this.powerups = [];
    this.active = null;
    this.activeTimer = 0;
    this.spawnTimer = 0;
  },

  update(dt, gameSpeed, laneWidth, laneOffsetX, canvasH) {
    // Spawn
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawn(laneWidth, laneOffsetX);
    }

    // Move powerups
    for (const p of this.powerups) {
      p.y += gameSpeed * (dt / 1000);
    }
    this.powerups = this.powerups.filter(p => p.y - p.r < canvasH + 80);

    // Tick active powerup
    if (this.active) {
      this.activeTimer -= dt;
      if (this.activeTimer <= 0) {
        this.active = null;
        GameManager.applyPowerupEnd();
      }
    }
  },

  spawn(laneWidth, laneOffsetX) {
    const type = POWERUP_TYPES[randInt(0, POWERUP_TYPES.length - 1)];
    const lane = randInt(0, 2);
    const cx = laneOffsetX + lane * laneWidth + laneWidth / 2;
    this.powerups.push({ ...type, lane, x: cx, y: -30, r: 16 });
  },

  activate(p) {
    if (p.label === 'coin') {
      ScoreManager.addCoin(50);
      showFloatingText('+50 COIN!', p.x, p.y, '#FFC107');
    } else {
      this.active = p.label;
      this.activeTimer = p.duration;
      GameManager.applyPowerupStart(p.label);
      showFloatingText(p.icon + ' ' + p.label.toUpperCase() + '!', p.x, p.y, p.color);
    }
  },

  draw(ctx) {
    for (const p of this.powerups) {
      ctx.save();
      ctx.shadowColor = p.color; ctx.shadowBlur = 14;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, p.x, p.y);
      ctx.restore();
    }
  }
};

// ──────────────────────────────────────────────
// COIN MANAGER (simple floating coins)
// ──────────────────────────────────────────────
const CoinManager = {
  coins: [],
  spawnTimer: 0,
  spawnInterval: 3000,

  reset() { this.coins = []; this.spawnTimer = 0; },

  update(dt, gameSpeed, laneWidth, laneOffsetX, canvasH) {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const lane = randInt(0, 2);
      const cx = laneOffsetX + lane * laneWidth + laneWidth / 2;
      this.coins.push({ x: cx, y: -20, r: 10, lane, collected: false });
    }
    for (const c of this.coins) c.y += gameSpeed * (dt / 1000);
    this.coins = this.coins.filter(c => !c.collected && c.y < canvasH + 40);
  },

  draw(ctx) {
    for (const c of this.coins) {
      ctx.save();
      ctx.fillStyle = '#FFD600';
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#B8860B';
      ctx.font = 'bold 10px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$', c.x, c.y);
      ctx.restore();
    }
  }
};

// ──────────────────────────────────────────────
// FLOATING TEXT
// ──────────────────────────────────────────────
let floatingTexts = [];
function showFloatingText(text, x, y, color) {
  floatingTexts.push({ text, x, y, color, life: 1.2, maxLife: 1.2 });
}
function updateFloatingTexts(dt) {
  for (const f of floatingTexts) f.life -= dt / 1000;
  floatingTexts = floatingTexts.filter(f => f.life > 0);
}
function drawFloatingTexts(ctx) {
  for (const f of floatingTexts) {
    const alpha = f.life / f.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = f.color || '#FFD600';
    ctx.font = 'bold 16px Bangers, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rise = (1 - alpha) * 40;
    ctx.fillText(f.text, f.x, f.y - rise);
    ctx.restore();
  }
}

// ──────────────────────────────────────────────
// BACKGROUND / ROAD RENDERER
// ──────────────────────────────────────────────
const Road = {
  scrollY: 0,
  bgScrollY: 0,

  reset() { this.scrollY = 0; this.bgScrollY = 0; },

  update(dt, speed) {
    this.scrollY = (this.scrollY + speed * (dt / 1000)) % 80;
    this.bgScrollY = (this.bgScrollY + (speed * 0.15) * (dt / 1000)) % 200;
  },

  draw(ctx, canvasW, canvasH, laneWidth, laneOffsetX) {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH * 0.45);
    skyGrad.addColorStop(0, '#0D0D1A');
    skyGrad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasW, canvasH * 0.45);

    // Buildings (simple silhouettes)
    this.drawBuildings(ctx, canvasW, canvasH);

    // Road surface
    const roadGrad = ctx.createLinearGradient(0, canvasH * 0.35, 0, canvasH);
    roadGrad.addColorStop(0, '#1a1a2e');
    roadGrad.addColorStop(0.3, '#252538');
    roadGrad.addColorStop(1, '#2a2a3e');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(laneOffsetX - 10, canvasH * 0.35, laneWidth * LANES + 20, canvasH * 0.65);

    // Sidewalks
    ctx.fillStyle = '#4A4060';
    ctx.fillRect(0, canvasH * 0.35, laneOffsetX - 10, canvasH);
    ctx.fillRect(laneOffsetX + laneWidth * LANES + 10, canvasH * 0.35, canvasW, canvasH);

    // Perspective road lines
    this.drawLaneLines(ctx, canvasW, canvasH, laneWidth, laneOffsetX);
  },

  drawBuildings(ctx, canvasW, canvasH) {
    const buildings = [
      { x: 0, w: 40, h: 120, color: '#1a1535' },
      { x: 45, w: 55, h: 90, color: '#16122e' },
      { x: 105, w: 35, h: 140, color: '#1d1640' },
      { x: canvasW - 45, w: 45, h: 110, color: '#1a1535' },
      { x: canvasW - 95, w: 44, h: 85, color: '#16122e' },
      { x: canvasW - 145, w: 44, h: 130, color: '#1d1640' },
    ];
    for (const b of buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, canvasH * 0.45 - b.h, b.w, b.h);
      // Windows
      ctx.fillStyle = 'rgba(255,220,100,0.4)';
      for (let wy = 10; wy < b.h - 10; wy += 18) {
        for (let wx = 4; wx < b.w - 4; wx += 12) {
          if (Math.sin(b.x + wx + wy) > 0) {
            ctx.fillRect(b.x + wx, canvasH * 0.45 - b.h + wy, 7, 8);
          }
        }
      }
    }
  },

  drawLaneLines(ctx, canvasW, canvasH, laneWidth, laneOffsetX) {
    const roadTop = canvasH * 0.35;
    const roadBot = canvasH;

    // Draw dashed lane dividers
    ctx.strokeStyle = '#FFD60055';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -this.scrollY;

    for (let lane = 1; lane < LANES; lane++) {
      const lx = laneOffsetX + lane * laneWidth;
      ctx.beginPath();
      ctx.moveTo(lx, roadTop);
      ctx.lineTo(lx, roadBot);
      ctx.stroke();
    }

    // Road edges
    ctx.strokeStyle = '#FFD600AA';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    ctx.beginPath();
    ctx.moveTo(laneOffsetX - 2, roadTop);
    ctx.lineTo(laneOffsetX - 2, roadBot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(laneOffsetX + laneWidth * LANES + 2, roadTop);
    ctx.lineTo(laneOffsetX + laneWidth * LANES + 2, roadBot);
    ctx.stroke();
  }
};

// ──────────────────────────────────────────────
// PARTICLE EFFECTS (footstep dust)
// ──────────────────────────────────────────────
let particles = [];
function spawnDustParticle(x, y) {
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: x + rand(-8, 8),
      y: y + rand(-4, 4),
      vx: rand(-30, 30),
      vy: rand(-40, -10),
      life: rand(0.3, 0.6),
      maxLife: 0.5,
      r: rand(2, 5),
    });
  }
}
function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * (dt / 1000);
    p.y += p.vy * (dt / 1000);
    p.vy += 60 * (dt / 1000);
    p.life -= dt / 1000;
  }
  particles = particles.filter(p => p.life > 0);
}
function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#ccc';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ──────────────────────────────────────────────
// CANVAS HELPER FUNCTIONS
// ──────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function drawX(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
  ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
  ctx.stroke();
}

// ──────────────────────────────────────────────
// GAME MANAGER
// ──────────────────────────────────────────────
const GameManager = {
  canvas: null,
  ctx: null,
  canvasW: 0,
  canvasH: 0,
  laneWidth: 0,
  laneOffsetX: 0,

  gameSpeed: 280,       // pixels/second
  baseSpeed: 280,
  maxSpeed: 700,
  speedRamp: 15,        // px/s per second of play

  elapsed: 0,           // total ms played this run
  lastTime: 0,
  rafId: null,

  hasCollision: false,
  collisionCooldown: 0,
  collisionFlash: 0,

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    ScoreManager.init();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state === 'playing') this.pause();
    });
    this.setupInput();
    this.setupUI();
    this.showScreen('start');
    document.getElementById('hs-value').textContent = ScoreManager.highScore;
    this.renderStatic();
  },

  resize() {
    const wrapper = document.getElementById('game-wrapper');
    this.canvasW = wrapper.clientWidth;
    this.canvasH = wrapper.clientHeight;
    this.canvas.width = this.canvasW;
    this.canvas.height = this.canvasH;

    // Lane layout: road takes middle 60% of width
    const roadWidth = Math.min(this.canvasW * 0.72, 260);
    this.laneOffsetX = (this.canvasW - roadWidth) / 2;
    this.laneWidth = roadWidth / LANES;

    if (state === 'playing' || state === 'paused') {
      Player.laneWidth = this.laneWidth;
      Player.laneOffsetX = this.laneOffsetX;
      Player.x = Player.getLaneX(Player.lane);
      Player.targetX = Player.x;
      Player.baseY = this.canvasH * 0.62;
      if (!Player.isJumping) Player.y = Player.baseY;
    }
  },

  start() {
    this.elapsed = 0;
    this.lastTime = 0;
    this.gameSpeed = this.baseSpeed;
    this.hasCollision = false;
    this.collisionCooldown = 0;
    this.collisionFlash = 0;

    particles = [];
    floatingTexts = [];

    ScoreManager.reset();
    Player.reset(this.canvasW, this.canvasH, this.laneWidth, this.laneOffsetX);
    ObstacleManager.reset();
    PowerupManager.reset();
    CoinManager.reset();
    Chaser.reset();
    Road.reset();

    state = 'playing';
    this.showScreen(null);
    this.rafId = requestAnimationFrame(ts => this.loop(ts));
  },

  pause() {
    if (state !== 'playing') return;
    state = 'paused';
    cancelAnimationFrame(this.rafId);
    this.showScreen('pause');
  },

  resume() {
    if (state !== 'paused') return;
    state = 'playing';
    this.showScreen(null);
    this.lastTime = 0;
    this.rafId = requestAnimationFrame(ts => this.loop(ts));
  },

  gameOver() {
    state = 'gameover';
    cancelAnimationFrame(this.rafId);
    ScoreManager.saveHighScore();
    document.getElementById('final-score').textContent = ScoreManager.getDisplay();
    document.getElementById('final-hs').textContent = ScoreManager.highScore;
    this.showScreen('gameover');
  },

  applyPowerupStart(type) {
    if (type === 'speed') this.gameSpeed = Math.min(this.gameSpeed * 1.5, this.maxSpeed);
    if (type === 'slow')  this.gameSpeed = this.gameSpeed * 0.5;
  },

  applyPowerupEnd() {
    // Recalculate base speed based on elapsed
    const baseCurrent = this.baseSpeed + (this.elapsed / 1000) * this.speedRamp;
    this.gameSpeed = Math.min(baseCurrent, this.maxSpeed);
    this.updatePowerupUI();
  },

  updatePowerupUI() {
    const el = document.getElementById('powerup-indicator');
    if (PowerupManager.active) {
      const type = PowerupManager.active;
      const p = POWERUP_TYPES.find(t => t.label === type);
      const remaining = Math.ceil(PowerupManager.activeTimer / 1000);
      el.textContent = (p?.icon || '') + ' ' + type.toUpperCase() + ' ' + remaining + 's';
      el.classList.add('visible');
    } else {
      el.classList.remove('visible');
    }
  },

  loop(ts) {
    if (state !== 'playing') return;

    const dt = this.lastTime ? Math.min(ts - this.lastTime, 50) : 16;
    this.lastTime = ts;
    this.elapsed += dt;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(t => this.loop(t));
  },

  update(dt) {
    // Speed ramp
    const targetSpeed = Math.min(this.baseSpeed + (this.elapsed / 1000) * this.speedRamp, this.maxSpeed);
    if (!PowerupManager.active) {
      this.gameSpeed += (targetSpeed - this.gameSpeed) * 0.01;
    }

    // Distance & score
    ScoreManager.addDistance(this.gameSpeed * (dt / 1000) * 0.05);
    ScoreManager.updateMultiplier(this.elapsed / 1000);

    // Systems
    Road.update(dt, this.gameSpeed);
    Player.update(dt);
    ObstacleManager.update(dt, this.gameSpeed, this.laneWidth, this.laneOffsetX, this.canvasH);
    PowerupManager.update(dt, this.gameSpeed, this.laneWidth, this.laneOffsetX, this.canvasH);
    CoinManager.update(dt, this.gameSpeed, this.laneWidth, this.laneOffsetX, this.canvasH);
    updateParticles(dt);
    updateFloatingTexts(dt);

    // Collision cooldown
    if (this.collisionCooldown > 0) this.collisionCooldown -= dt;
    if (this.collisionFlash > 0) this.collisionFlash -= dt;

    // Footstep dust
    if (!Player.isJumping && !Player.isSliding && Player.animFrame % 2 === 0) {
      if (Player.animTimer < 20) {
        spawnDustParticle(Player.x + Player.w / 2, Player.baseY + Player.h);
      }
    }

    // Collision: obstacles
    this.hasCollision = false;
    const pb = Player.getBounds();
    for (const o of ObstacleManager.obstacles) {
      if (this.collisionCooldown > 0) break;
      const ob = { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 };
      if (rectsOverlap(pb, ob)) {
        // Check avoidance
        const avoided =
          (o.canJumpOver && Player.isJumping) ||
          (o.canSlideUnder && Player.isSliding);
        if (!avoided) {
          this.hasCollision = true;
          this.collisionCooldown = 800;
          this.collisionFlash = 400;
          showFloatingText('💥 OUCH!', Player.x + Player.w / 2, Player.y, '#F44336');
        }
      }
    }

    // Collision: powerups
    for (let i = PowerupManager.powerups.length - 1; i >= 0; i--) {
      const p = PowerupManager.powerups[i];
      const dist = Math.hypot(pb.x + pb.w / 2 - p.x, pb.y + pb.h / 2 - p.y);
      if (dist < p.r + 20) {
        PowerupManager.activate(p);
        PowerupManager.powerups.splice(i, 1);
        this.updatePowerupUI();
      }
    }

    // Collision: coins
    for (const c of CoinManager.coins) {
      if (c.collected) continue;
      const dist = Math.hypot(pb.x + pb.w / 2 - c.x, pb.y + pb.h / 2 - c.y);
      if (dist < c.r + 22) {
        c.collected = true;
        ScoreManager.addCoin(10);
        showFloatingText('+10', c.x, c.y, '#FFD600');
      }
    }

    // Chaser
    Chaser.update(dt, this.hasCollision);
    if (Chaser.caught()) { this.gameOver(); return; }

    // HUD
    document.getElementById('score-val').textContent = ScoreManager.getDisplay();
    const dist = Math.max(0, Math.floor(Chaser.distance));
    document.getElementById('chaser-val').textContent = dist + 'm';
    this.updatePowerupUI();

    // Spawn interval decreases with difficulty
    const diffFactor = Math.max(0.4, 1 - (this.elapsed / 60000) * 0.5);
    ObstacleManager.spawnInterval = 1800 * diffFactor;
  },

  render() {
    const { ctx, canvasW, canvasH } = this;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Background & road
    Road.draw(ctx, canvasW, canvasH, this.laneWidth, this.laneOffsetX);

    // Particles (under player)
    drawParticles(ctx);

    // Coins
    CoinManager.draw(ctx);

    // Obstacles
    ObstacleManager.draw(ctx);

    // Powerups
    PowerupManager.draw(ctx);

    // Player
    Player.draw(ctx);

    // Chaser (behind player at bottom)
    Chaser.draw(ctx, canvasW, canvasH);

    // Collision flash overlay
    if (this.collisionFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (this.collisionFlash / 400) * 0.35;
      ctx.fillStyle = '#F44336';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.restore();
    }

    // Floating texts
    drawFloatingTexts(ctx);
  },

  renderStatic() {
    // Render just the background on start screen
    const { ctx, canvasW, canvasH } = this;
    ctx.clearRect(0, 0, canvasW, canvasH);
    Road.draw(ctx, canvasW, canvasH, this.laneWidth, this.laneOffsetX);
  },

  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (name) {
      const el = document.getElementById(name + '-screen');
      if (el) el.classList.add('active');
    }
  },

  setupUI() {
    document.getElementById('start-btn').addEventListener('click', () => this.start());
    document.getElementById('restart-btn').addEventListener('click', () => this.start());
    document.getElementById('resume-btn').addEventListener('click', () => this.resume());
    document.getElementById('pause-btn').addEventListener('click', () => {
      if (state === 'playing') this.pause();
      else if (state === 'paused') this.resume();
    });
  },

  setupInput() {
    // Keyboard
    document.addEventListener('keydown', e => {
      if (state !== 'playing') return;
      switch(e.key) {
        case 'ArrowLeft':  e.preventDefault(); Player.moveLeft(); break;
        case 'ArrowRight': e.preventDefault(); Player.moveRight(); break;
        case 'ArrowUp':    e.preventDefault(); Player.jump(); break;
        case 'ArrowDown':  e.preventDefault(); Player.slide(); break;
        case 'Escape': case 'p': case 'P': this.pause(); break;
      }
    });

    // Touch
    let touchStartX = 0, touchStartY = 0;
    this.canvas.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', e => {
      if (state !== 'playing') return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const threshold = 25;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -threshold) Player.moveLeft();
        else if (dx > threshold) Player.moveRight();
      } else {
        if (dy < -threshold) Player.jump();
        else if (dy > threshold) Player.slide();
      }
      e.preventDefault();
    }, { passive: false });

    // Mobile buttons
    const btnMap = {
      'btn-left':  () => Player.moveLeft(),
      'btn-right': () => Player.moveRight(),
      'btn-up':    () => Player.jump(),
      'btn-down':  () => Player.slide(),
    };
    for (const [id, fn] of Object.entries(btnMap)) {
      document.getElementById(id).addEventListener('touchstart', e => {
        if (state === 'playing') fn();
        e.preventDefault();
      }, { passive: false });
      document.getElementById(id).addEventListener('click', () => {
        if (state === 'playing') fn();
      });
    }
  }
};

// ──────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────
window.addEventListener('load', () => GameManager.init());
