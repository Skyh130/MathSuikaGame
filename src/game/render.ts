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

  // 라벨 (칸에 맞춰 글자 크기 조절)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fs = r * 0.82;
  ctx.font = `${fs}px ${FONT}`;
  const w = ctx.measureText(label).width;
  const maxW = r * 1.62;
  if (w > maxW) fs *= maxW / w;
  ctx.font = `${fs}px ${FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, fs * 0.3);
  ctx.strokeStyle = '#5a2d0c';
  ctx.strokeText(label, x, y + fs * 0.05);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, x, y + fs * 0.05);

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
