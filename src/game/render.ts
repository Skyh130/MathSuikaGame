import { FRUIT_BODY_DY, FRUIT_BODY_RATIO } from '../content/sprite-meta';
import { isReady } from './assets';
import { BOX_RECT, CH, CW, DANGER_Y, LEFT, RIGHT } from './config';

const FONT = "'Jua','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif";

export function drawBoard(ctx: CanvasRenderingContext2D, box: HTMLImageElement | undefined, overRatio: number, time: number): void {
  ctx.clearRect(0, 0, CW, CH);
  if (isReady(box)) {
    ctx.drawImage(box, BOX_RECT.x, BOX_RECT.y, BOX_RECT.w, BOX_RECT.h);
  } else {
    ctx.fillStyle = '#ffe8c2';
    ctx.fillRect(LEFT, BOX_RECT.y, RIGHT - LEFT, CH);
  }

  // 게임오버 라인
  const blink = overRatio > 0 ? 0.5 + 0.5 * Math.sin(time / 90) : 0;
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = overRatio > 0 ? `rgba(239,68,68,${0.55 + 0.45 * blink})` : 'rgba(239,68,68,0.5)';
  ctx.beginPath();
  ctx.moveTo(LEFT, DANGER_Y);
  ctx.lineTo(RIGHT, DANGER_Y);
  ctx.stroke();
  ctx.restore();
}

export interface FruitLook {
  sprite: number;
  hue: number;
  img?: HTMLImageElement;
}

export function drawFruit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  label: string,
  look: FruitLook,
  pulse = 0,
): void {
  const { hue, img } = look;
  if (isReady(img)) {
    const side = (r * 1.05) / FRUIT_BODY_RATIO[look.sprite];
    ctx.drawImage(img, x - side / 2, y - side / 2 - FRUIT_BODY_DY[look.sprite] * side, side, side);
  } else {
    drawPlainFruit(ctx, x, y, r, hue);
  }

  drawLabel(ctx, label, x, y, r);

  if (pulse > 0) {
    ctx.beginPath();
    ctx.arc(x, y, r + 4 + pulse * 4, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(250,204,21,${0.5 + 0.5 * pulse})`;
    ctx.stroke();
  }
}

/** 그림을 못 불러왔을 때 쓰는 동그란 과일 */
function drawPlainFruit(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hue: number): void {
  const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  grad.addColorStop(0, `hsl(${hue} 90% 80%)`);
  grad.addColorStop(0.55, `hsl(${hue} 80% 62%)`);
  grad.addColorStop(1, `hsl(${hue} 65% 45%)`);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = `hsl(${hue} 60% 33%)`;
  ctx.stroke();
}

// ───────── 라벨 (식) ─────────
type Part = { frac: true; n: string; d: string; w: number } | { frac: false; t: string; w: number; op: boolean };
const TOKEN = /\d+\/\d+|[+−×]|[^+−×]+/g;
const FRAC_SCALE = 0.78;

function layout(ctx: CanvasRenderingContext2D, label: string, fs: number): { parts: Part[]; width: number } {
  const parts: Part[] = [];
  let width = 0;
  for (const t of label.match(TOKEN) ?? []) {
    const f = t.match(/^(\d+)\/(\d+)$/);
    if (f) {
      ctx.font = `${fs * FRAC_SCALE}px ${FONT}`;
      const w = Math.max(ctx.measureText(f[1]).width, ctx.measureText(f[2]).width) + fs * 0.24;
      parts.push({ frac: true, n: f[1], d: f[2], w });
      width += w;
    } else {
      ctx.font = `${fs}px ${FONT}`;
      const op = /^[+−×]$/.test(t);
      const w = ctx.measureText(t).width + (op ? fs * 0.1 : 0);
      parts.push({ frac: false, t, w, op });
      width += w;
    }
  }
  return { parts, width };
}

/** 과일 가운데에 식을 쓴다. 칸에 맞게 글자 크기를 줄이고, 분수는 위아래로 쌓는다. */
function drawLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, r: number): void {
  const maxW = r * 1.62;
  let fs = r * 0.82;
  let lay = layout(ctx, label, fs);
  if (lay.width > maxW) {
    fs *= maxW / lay.width;
    lay = layout(ctx, label, fs);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const outline = Math.max(3, fs * 0.3);
  const text = (t: string, px: number, tx: number, ty: number) => {
    ctx.font = `${px}px ${FONT}`;
    ctx.lineWidth = outline;
    ctx.strokeStyle = '#5a2d0c';
    ctx.strokeText(t, tx, ty);
    ctx.fillStyle = '#fff';
    ctx.fillText(t, tx, ty);
  };

  let cx = x - lay.width / 2;
  const baseY = y + fs * 0.05;
  for (const p of lay.parts) {
    const mid = cx + p.w / 2;
    if (p.frac) {
      const ff = fs * FRAC_SCALE;
      text(p.n, ff, mid, baseY - ff * 0.58);
      text(p.d, ff, mid, baseY + ff * 0.62);
      ctx.beginPath();
      ctx.moveTo(cx + fs * 0.06, baseY);
      ctx.lineTo(cx + p.w - fs * 0.06, baseY);
      ctx.lineWidth = fs * 0.3;
      ctx.strokeStyle = '#5a2d0c';
      ctx.stroke();
      ctx.lineWidth = fs * 0.11;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    } else {
      text(p.t, fs, mid, baseY);
    }
    cx += p.w;
  }
}
