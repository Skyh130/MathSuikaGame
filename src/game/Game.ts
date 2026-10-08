import Matter from 'matter-js';
import type { WorldDef } from '../content/worlds';
import { makeExpr } from '../math/expr';
import type { HintLevel, PowerUp } from '../state/storage';
import type { Assets } from './assets';
import { CH, CW, DANGER_Y, DROP_COOLDOWN_MS, FLOOR_Y, GAME_OVER_MS, LEFT, RIGHT, SPAWN_Y, WALL } from './config';
import { drawBoard, drawFruit } from './render';

const { Engine, Bodies, Body, Composite, Events } = Matter;

export interface Piece {
  tier: number;
  value: number;
  label: string;
  /** 보여줄 과일 그림 번호 (쉬움 모드에서는 단계와 같다) */
  sprite: number;
  hue: number;
}

interface Fruit extends Piece {
  body: Matter.Body;
  born: number;
  merging: boolean;
}

interface Snapshot {
  fruits: Array<Piece & { x: number; y: number }>;
  score: number;
  merges: number;
  current: Piece;
  next: Piece;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  age: number;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  hue: number;
}

export interface GameHooks {
  onScore(score: number): void;
  onNext(piece: Piece): void;
  onMaxTier(tier: number): void;
  onQuest(): void;
  onOver(score: number): void;
  onToast(msg: string): void;
  onPowerups(counts: Record<PowerUp, number>): void;
  onBombMode(on: boolean): void;
}

export interface GameSettings {
  hint: HintLevel;
}

export type GameState = 'ready' | 'playing' | 'paused' | 'over';

const STEP_MS = 1000 / 60;

export class Game {
  state: GameState = 'ready';
  score = 0;
  powerups: Record<PowerUp, number>;

  private engine = Engine.create({ gravity: { x: 0, y: 1.1 } });
  private fruits = new Map<number, Fruit>();
  private mergeQueue: Array<[Fruit, Fruit]> = [];
  private current!: Piece;
  private next!: Piece;
  private aimX = CW / 2;
  private time = 0;
  private acc = 0;
  private lastDrop = -1e9;
  private overMs = 0;
  private merges = 0;
  private nextQuestAt = 6;
  private maxTier = -1;
  private popups: Popup[] = [];
  private sparks: Spark[] = [];
  private hintValue: number | null = null;
  private hintUntil = 0;
  private bombMode = false;
  private snapshot: Snapshot | null = null;
  private raf = 0;
  private last = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private world: WorldDef,
    private settings: GameSettings,
    readonly hooks: GameHooks,
    private assets: Assets,
    initialPowerups: Record<PowerUp, number>,
  ) {
    this.powerups = { ...initialPowerups };
    this.buildWalls();
    Events.on(this.engine, 'collisionStart', (e) => {
      for (const pair of e.pairs) {
        const a = this.fruits.get(pair.bodyA.id);
        const b = this.fruits.get(pair.bodyB.id);
        if (a && b && !a.merging && !b.merging && a.value === b.value) {
          a.merging = b.merging = true;
          this.mergeQueue.push([a, b]);
        }
      }
    });
    this.current = this.makePiece();
    this.next = this.makePiece();
  }

  setSettings(s: GameSettings): void {
    this.settings = s;
  }

  // ───────── 수명 주기 ─────────
  /** 화면 그리기 루프만 시작한다 (시작 화면 뒤에서 게임판이 보이도록). */
  boot(): void {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  start(): void {
    this.reset();
    this.state = 'playing';
    this.boot();
  }

  pause(): void {
    if (this.state === 'playing') this.state = 'paused';
  }

  resume(): void {
    if (this.state === 'paused') this.state = 'playing';
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private reset(): void {
    for (const f of this.fruits.values()) Composite.remove(this.engine.world, f.body);
    this.fruits.clear();
    this.mergeQueue = [];
    this.popups = [];
    this.sparks = [];
    this.score = 0;
    this.merges = 0;
    this.nextQuestAt = 6;
    this.maxTier = -1;
    this.overMs = 0;
    this.snapshot = null;
    this.hintValue = null;
    this.setBombMode(false);
    this.lastDrop = this.time;
    this.current = this.makePiece();
    this.next = this.makePiece();
    this.hooks.onScore(0);
    this.hooks.onNext(this.next);
    this.hooks.onMaxTier(-1);
  }

  // ───────── 조작 ─────────
  setAim(x: number): void {
    const r = this.world.radii[this.current.tier];
    this.aimX = Math.max(LEFT + r + 2, Math.min(RIGHT - r - 2, x));
  }

  /** 포인터를 뗄 때 호출. 폭탄 모드면 과일을 터뜨리고, 아니면 떨어뜨린다. */
  release(x: number, y: number): void {
    if (this.state !== 'playing') return;
    if (this.bombMode) {
      this.bombAt(x, y);
      return;
    }
    this.setAim(x);
    this.drop();
  }

  private drop(): void {
    if (this.time - this.lastDrop < DROP_COOLDOWN_MS) return;
    this.takeSnapshot();
    this.lastDrop = this.time;
    this.addFruit(this.current, this.aimX, SPAWN_Y);
    this.current = this.next;
    this.next = this.makePiece();
    this.hooks.onNext(this.next);
    this.setAim(this.aimX);
  }

  usePowerup(kind: PowerUp): void {
    if (this.state !== 'playing') return;
    if (this.powerups[kind] <= 0) {
      this.hooks.onToast('아이템이 없어요. 퀘스트를 풀면 얻을 수 있어요!');
      return;
    }
    switch (kind) {
      case 'hint': {
        this.hintValue = this.current.value;
        this.hintUntil = this.time + 3500;
        const any = [...this.fruits.values()].some((f) => f.value === this.current.value);
        this.hooks.onToast(
          any
            ? `${this.current.label} 와(과) 값이 같은 과일이 반짝여요!`
            : `${this.current.label} 의 값은 ${this.current.value}! 같은 값 과일이 아직 없어요.`,
        );
        break;
      }
      case 'bomb':
        this.setBombMode(!this.bombMode);
        this.hooks.onToast(this.bombMode ? '없앨 과일을 눌러 주세요' : '폭탄을 취소했어요');
        return; // 실제로 쓸 때 차감
      case 'shake':
        for (const f of this.fruits.values()) {
          Body.setVelocity(f.body, { x: (Math.random() - 0.5) * 7, y: -(2 + Math.random() * 4) });
        }
        break;
      case 'undo':
        if (!this.snapshot) {
          this.hooks.onToast('되돌릴 수 있는 동작이 없어요');
          return;
        }
        this.restore(this.snapshot);
        this.snapshot = null;
        break;
    }
    this.powerups[kind]--;
    this.hooks.onPowerups({ ...this.powerups });
  }

  addPowerup(kind: PowerUp): void {
    this.powerups[kind]++;
    this.hooks.onPowerups({ ...this.powerups });
  }

  private setBombMode(on: boolean): void {
    this.bombMode = on;
    this.hooks.onBombMode(on);
  }

  private bombAt(x: number, y: number): void {
    let hit: Fruit | null = null;
    for (const f of this.fruits.values()) {
      const r = this.world.radii[f.tier];
      if (Math.hypot(f.body.position.x - x, f.body.position.y - y) <= r) hit = f;
    }
    if (!hit) return;
    this.setBombMode(false);
    this.burst(hit.body.position.x, hit.body.position.y, hit.hue, 10);
    this.removeFruit(hit);
    this.powerups.bomb--;
    this.hooks.onPowerups({ ...this.powerups });
  }

  // ───────── 과일 만들기 ─────────
  private levelFor(): 1 | 2 | 3 {
    return this.settings.hint === 'easy' ? 1 : this.settings.hint === 'normal' ? 2 : 3;
  }

  private labelFor(value: number): string {
    const plain = this.settings.hint === 'easy' ? 0.25 : this.settings.hint === 'normal' ? 0.12 : 0;
    return makeExpr(value, { level: this.levelFor(), plain });
  }

  private spriteFor(tier: number): number {
    // 쉬움: 과일 종류가 단계를 알려준다. 그 외: 그림이 힌트가 되지 않도록 무작위
    if (this.settings.hint === 'easy') return tier;
    return Math.floor(Math.random() * this.world.hues.length);
  }

  private makeLook(tier: number): { sprite: number; hue: number } {
    const sprite = this.spriteFor(tier);
    return { sprite, hue: this.world.hues[sprite] };
  }

  private makePiece(tier?: number): Piece {
    const t = tier ?? this.world.spawnTiers[Math.floor(Math.random() * this.world.spawnTiers.length)];
    const value = this.world.ladder[t];
    return { tier: t, value, label: this.labelFor(value), ...this.makeLook(t) };
  }

  private addFruit(piece: Piece, x: number, y: number): Fruit {
    const r = this.world.radii[piece.tier];
    const body = Bodies.circle(x, y, r, { restitution: 0.12, friction: 0.25, frictionAir: 0.004, density: 0.0012 });
    const fruit: Fruit = { ...piece, body, born: this.time, merging: false };
    this.fruits.set(body.id, fruit);
    Composite.add(this.engine.world, body);
    return fruit;
  }

  private removeFruit(f: Fruit): void {
    Composite.remove(this.engine.world, f.body);
    this.fruits.delete(f.body.id);
  }

  private buildWalls(): void {
    const opts = { isStatic: true, friction: 0.3 };
    const mid = (LEFT + RIGHT) / 2;
    Composite.add(this.engine.world, [
      Bodies.rectangle(mid, FLOOR_Y + WALL / 2, RIGHT - LEFT + WALL * 2, WALL, opts),
      Bodies.rectangle(LEFT - WALL / 2, FLOOR_Y / 2 - 200, WALL, FLOOR_Y + 400, opts),
      Bodies.rectangle(RIGHT + WALL / 2, FLOOR_Y / 2 - 200, WALL, FLOOR_Y + 400, opts),
    ]);
  }

  // ───────── 되돌리기 ─────────
  private takeSnapshot(): void {
    this.snapshot = {
      fruits: [...this.fruits.values()].map((f) => ({
        tier: f.tier, value: f.value, label: f.label, sprite: f.sprite, hue: f.hue, x: f.body.position.x, y: f.body.position.y,
      })),
      score: this.score,
      merges: this.merges,
      current: this.current,
      next: this.next,
    };
  }

  private restore(s: Snapshot): void {
    for (const f of this.fruits.values()) Composite.remove(this.engine.world, f.body);
    this.fruits.clear();
    this.mergeQueue = [];
    for (const f of s.fruits) this.addFruit(f, f.x, f.y);
    this.score = s.score;
    this.merges = s.merges;
    this.current = s.current;
    this.next = s.next;
    this.hooks.onScore(this.score);
    this.hooks.onNext(this.next);
  }

  // ───────── 루프 ─────────
  private frame = (now: number): void => {
    const dt = Math.min(50, now - this.last);
    this.last = now;
    if (this.state === 'playing') {
      this.acc += dt;
      while (this.acc >= STEP_MS) {
        this.acc -= STEP_MS;
        this.tick(STEP_MS);
      }
    }
    this.draw(now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private tick(dt: number): void {
    this.time += dt;
    Engine.update(this.engine, dt);
    this.processMerges();
    this.checkGameOver(dt);
    for (const p of this.popups) p.age += dt;
    this.popups = this.popups.filter((p) => p.age < 900);
    for (const s of this.sparks) {
      s.age += dt;
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.12;
    }
    this.sparks = this.sparks.filter((s) => s.age < 600);
    if (this.hintValue !== null && this.time > this.hintUntil) this.hintValue = null;
  }

  private processMerges(): void {
    if (this.mergeQueue.length === 0) return;
    const queue = this.mergeQueue;
    this.mergeQueue = [];
    for (const [a, b] of queue) {
      if (!this.fruits.has(a.body.id) || !this.fruits.has(b.body.id)) continue;
      const x = (a.body.position.x + b.body.position.x) / 2;
      const y = (a.body.position.y + b.body.position.y) / 2;
      const tier = a.tier + 1;
      this.removeFruit(a);
      this.removeFruit(b);
      this.merges++;

      if (tier >= this.world.ladder.length) {
        // 마지막 단계끼리 만나면 펑! 보너스
        this.score += a.value * 2;
        this.burst(x, y, a.hue, 28);
        this.popups.push({ x, y, text: `대박! +${a.value * 2}`, age: 0 });
        this.addPowerup('shake');
      } else {
        const value = this.world.ladder[tier];
        const piece: Piece = { tier, value, label: this.labelFor(value), ...this.makeLook(tier) };
        const f = this.addFruit(piece, x, y);
        Body.setVelocity(f.body, { x: 0, y: 0 });
        this.score += value;
        this.burst(x, y, piece.hue, 12 + tier * 2);
        this.popups.push({ x, y: y - this.world.radii[tier], text: `+${value}`, age: 0 });
        if (tier > this.maxTier) {
          this.maxTier = tier;
          this.hooks.onMaxTier(tier);
        }
      }
      this.hooks.onScore(this.score);
    }
    if (this.merges >= this.nextQuestAt && this.state === 'playing') {
      this.nextQuestAt = this.merges + 5 + Math.floor(Math.random() * 4);
      this.hooks.onQuest();
    }
  }

  private checkGameOver(dt: number): void {
    let over = false;
    for (const f of this.fruits.values()) {
      if (f.merging || this.time - f.born < 1500) continue;
      const r = this.world.radii[f.tier];
      if (f.body.position.y - r < DANGER_Y && f.body.speed < 0.6) over = true;
    }
    this.overMs = over ? this.overMs + dt : 0;
    if (this.overMs >= GAME_OVER_MS) {
      this.state = 'over';
      this.hooks.onOver(this.score);
    }
  }

  private burst(x: number, y: number, hue: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 3;
      this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, age: 0, hue });
    }
  }

  // ───────── 그리기 ─────────
  private draw(now: number): void {
    const ctx = this.ctx;
    drawBoard(ctx, this.assets.box, this.overMs / GAME_OVER_MS, now);

    const pulse = 0.5 + 0.5 * Math.sin(now / 130);
    for (const f of this.fruits.values()) {
      const r = this.world.radii[f.tier];
      const hl = this.hintValue !== null && f.value === this.hintValue ? pulse : 0;
      drawFruit(ctx, f.body.position.x, f.body.position.y, r, f.label, this.look(f), hl);
    }

    if (this.state === 'playing' || this.state === 'paused') {
      const r = this.world.radii[this.current.tier];
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(100,80,60,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.aimX, SPAWN_Y + r);
      ctx.lineTo(this.aimX, FLOOR_Y);
      ctx.stroke();
      ctx.restore();
      const ready = this.time - this.lastDrop >= DROP_COOLDOWN_MS;
      ctx.globalAlpha = ready ? 1 : 0.45;
      drawFruit(ctx, this.aimX, SPAWN_Y, r, this.current.label, this.look(this.current));
      ctx.globalAlpha = 1;
    }

    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, 1 - s.age / 600);
      ctx.fillStyle = `hsl(${s.hue} 95% 65%)`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.font = "26px 'Jua','Apple SD Gothic Neo',system-ui,sans-serif";
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    for (const p of this.popups) {
      const k = p.age / 900;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#7c2d12';
      ctx.fillStyle = '#fde047';
      ctx.strokeText(p.text, p.x, p.y - k * 36);
      ctx.fillText(p.text, p.x, p.y - k * 36);
    }
    ctx.globalAlpha = 1;

    if (this.bombMode) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, CW, CH);
    }
  }

  private look(p: Piece) {
    return { sprite: p.sprite, hue: p.hue, img: this.assets.fruits[p.sprite] };
  }

  /** 미리보기용: 다음 과일을 작은 캔버스에 그린다 */
  drawPreview(ctx: CanvasRenderingContext2D, piece: Piece, size: number): void {
    ctx.clearRect(0, 0, size, size);
    const r = size * 0.38;
    drawFruit(ctx, size / 2, size / 2 + 3, r, piece.label, this.look(piece));
  }

  get maxReachedTier(): number {
    return this.maxTier;
  }
}
