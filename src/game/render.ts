import { DANGER_Y, H, W } from './config';

export function drawBoard(ctx: CanvasRenderingContext2D, overRatio: number, time: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(1, '#ffe8c2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 게임오버 라인
  const blink = overRatio > 0 ? 0.5 + 0.5 * Math.sin(time / 90) : 0;
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = overRatio > 0 ? `rgba(239,68,68,${0.55 + 0.45 * blink})` : 'rgba(239,68,68,0.45)';
  ctx.beginPath();
  ctx.moveTo(0, DANGER_Y);
  ctx.lineTo(W, DANGER_Y);
  ctx.stroke();
  ctx.restore();
}

export function drawFruit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  label: string,
  hue: number,
  pulse = 0,
): void {
  const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  grad.addColorStop(0, `hsl(${hue} 90% 80%)`);
  grad.addColorStop(0.55, `hsl(${hue} 80% 62%)`);
  grad.addColorStop(1, `hsl(${hue} 65% 45%)`);

  // 잎
  ctx.fillStyle = '#4ade80';
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.18, y - r * 0.98, r * 0.28, r * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = `hsl(${hue} 60% 33%)`;
  ctx.stroke();

  // 반짝임
  ctx.beginPath();
  ctx.ellipse(x - r * 0.4, y - r * 0.45, r * 0.18, r * 0.1, -0.7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fill();

  // 라벨 (칸에 맞춰 글자 크기 조절)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fs = r * 0.82;
  const family = "'Jua','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif";
  ctx.font = `${fs}px ${family}`;
  const w = ctx.measureText(label).width;
  const maxW = r * 1.62;
  if (w > maxW) fs *= maxW / w;
  ctx.font = `${fs}px ${family}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, fs * 0.28);
  ctx.strokeStyle = `hsl(${hue} 70% 22%)`;
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
