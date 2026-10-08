/**
 * 단위가 있는 값(길이, 시간, 각도, 큰 수, 분수)을 여러 모양의 식으로 보여준다.
 * 값은 모두 "가장 작은 단위의 정수"로 다룬다 (cm, 분, 도, 1, 1/16).
 */
export interface LabelOpts {
  /** 1: 두 수의 식, 2: 세 수의 식도 섞임, 3: 세 수의 식 위주 */
  level: 1 | 2 | 3;
  /** 식 없이 값만 보여줄 확률 (0~1) */
  plain: number;
  rng?: () => number;
}

type Fmt = (u: number) => string;

export interface Kind {
  /** 같은 값을 쓰는 서로 다른 표기 (예: 1m 20cm / 120cm) */
  fmts: Fmt[];
  /** 가장 작은 단위 */
  min: number;
  /** 덧셈·뺄셈에 쓰기 좋은 "깔끔한" 수 (큰 것부터) */
  steps: number[];
  /** "ㅇ에서 빼기" 식에 쓰는 기준 값 (예: 1m, 180°) */
  anchors: number[];
}

// ───────── 표기 ─────────
export const fmtLength: Fmt = (u) => (u >= 100 ? `${Math.floor(u / 100)}m${u % 100 ? ` ${u % 100}cm` : ''}` : `${u}cm`);
export const fmtCm: Fmt = (u) => `${u}cm`;
export const fmtTime: Fmt = (u) => {
  if (u < 60) return `${u}분`;
  const h = Math.floor(u / 60);
  return u % 60 ? `${h}시간 ${u % 60}분` : `${h}시간`;
};
export const fmtMinutes: Fmt = (u) => `${u}분`;
export const fmtDeg: Fmt = (u) => `${u}°`;
export const fmtKorean: Fmt = (n) => {
  const parts: string[] = [];
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  if (man) parts.push(`${man}만`);
  if (Math.floor(rest / 1000)) parts.push(`${Math.floor(rest / 1000)}천`);
  if (Math.floor((rest % 1000) / 100)) parts.push(`${Math.floor((rest % 1000) / 100)}백`);
  if (rest % 100) parts.push(String(rest % 100));
  return parts.length ? parts.join(' ') : '0';
};
export const fmtComma: Fmt = (n) => n.toLocaleString('en-US');

export const KINDS = {
  length: { fmts: [fmtLength, fmtCm], min: 5, steps: [100, 50, 20, 10, 5], anchors: [100, 200, 300, 500, 1000, 1500, 2000] },
  time: { fmts: [fmtTime, fmtMinutes], min: 5, steps: [60, 30, 15, 10, 5], anchors: [60, 120, 180, 240, 360, 480, 720, 960, 1440] },
  angle: { fmts: [fmtDeg], min: 5, steps: [90, 45, 30, 20, 10, 5], anchors: [90, 180, 360] },
  big: { fmts: [fmtKorean, fmtComma], min: 100, steps: [10000, 5000, 1000, 500, 100], anchors: [1000, 5000, 10000, 50000, 100000, 200000] },
} satisfies Record<string, Kind>;

// ───────── 식 만들기 ─────────
export function makeLabel(value: number, kind: Kind, o: LabelOpts): string {
  const rng = o.rng ?? Math.random;
  const ri = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const pick = <T>(xs: T[]): T => xs[Math.floor(rng() * xs.length)];
  const f = kind.fmts[0];

  if (rng() < o.plain) return pick(kind.fmts)(value);

  const step = kind.steps.find((s) => s <= value / 4) ?? kind.min;
  const small = kind.steps.find((s) => s <= value / 8) ?? kind.min;

  const equiv = () => pick(kind.fmts)(value);
  const add2 = (): string | null => {
    const n = Math.floor((value - 1) / step);
    if (n < 1) return null;
    const a = step * ri(1, n);
    return `${f(a)}+${f(value - a)}`;
  };
  const sub = (): string | null => {
    const k = step * ri(1, 6);
    return `${f(value + k)}−${f(k)}`;
  };
  const anchor = (): string | null => {
    const options = kind.anchors.filter((a) => a > value && a - value <= value * 4);
    if (!options.length) return null;
    const a = pick(options);
    return `${f(a)}−${f(a - value)}`;
  };
  const times = (): string | null => {
    const ns = [2, 3, 4, 5].filter((n) => value % n === 0 && value / n >= kind.min && (value / n) % kind.min === 0);
    if (!ns.length) return null;
    const n = pick(ns);
    return `${n}×${f(value / n)}`;
  };
  const add3 = (): string | null => {
    if (value < kind.min * 3) return null;
    const a = small * ri(1, Math.max(1, Math.floor((value - 2 * kind.min) / small / 2)));
    const rem = value - a;
    if (rem < 2 * kind.min) return null;
    const b = small * ri(1, Math.max(1, Math.floor((rem - kind.min) / small)));
    const c = rem - b;
    if (b <= 0 || c <= 0) return null;
    return `${f(a)}+${f(b)}+${f(c)}`;
  };
  const addSub = (): string | null => {
    const c = small * ri(1, 3);
    const x = value + c;
    const a = small * ri(1, Math.max(1, Math.floor((x - kind.min) / small)));
    const b = x - a;
    if (a <= 0 || b <= 0) return null;
    return `${f(a)}+${f(b)}−${f(c)}`;
  };
  // 삼각형·사각형처럼 "전체에서 두 번 빼기" (180°−70°−50°)
  const anchor2 = (): string | null => {
    const options = kind.anchors.filter((a) => a > value + 2 * kind.min);
    if (!options.length) return null;
    const a = pick(options);
    const rest = a - value;
    const x = small * ri(1, Math.max(1, Math.floor((rest - kind.min) / small)));
    const y = rest - x;
    if (x <= 0 || y <= 0) return null;
    return `${f(a)}−${f(x)}−${f(y)}`;
  };

  const forms =
    o.level === 1
      ? [equiv, add2, sub, anchor, times]
      : o.level === 2
        ? [add2, sub, anchor, times, add3, anchor2]
        : [add3, addSub, anchor2, times, sub];
  const candidates = forms.map((g) => g()).filter((x): x is string => x !== null);
  return candidates.length ? pick(candidates) : equiv();
}

// ───────── 분수 (값은 1/16 단위의 정수) ─────────
const DENOMS = [2, 4, 8, 16];
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** 약분한 분수. 자연수면 자연수로. (예: 4 → "1/4", 16 → "1") */
export function fmtFraction(u: number): string {
  if (u % 16 === 0) return String(u / 16);
  const g = gcd(u, 16);
  return `${u / g}/${16 / g}`;
}

export function makeFractionLabel(value: number, o: LabelOpts): string {
  const rng = o.rng ?? Math.random;
  const ri = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const pick = <T>(xs: T[]): T => xs[Math.floor(rng() * xs.length)];

  const decimal = value % 16 !== 0 && value % 4 === 0 ? String(value / 16) : null; // 0.25, 0.5, 0.75
  if (rng() < o.plain) return decimal && rng() < 0.4 ? decimal : fmtFraction(value);

  const ds = DENOMS.filter((d) => (value * d) % 16 === 0);
  const D = pick(ds);
  const N = (value * D) / 16;

  const equiv = () => `${N}/${D}`;
  const dec = () => decimal;
  const add2 = (): string | null => {
    const dd = pick(ds.filter((d) => (value * d) / 16 >= 2).concat(ds.length ? [] : [D]));
    if (!dd) return null;
    const n = (value * dd) / 16;
    if (n < 2) return null;
    const a = ri(1, n - 1);
    return `${a}/${dd}+${n - a}/${dd}`;
  };
  const sub = (): string | null => {
    const c = ri(1, D);
    return `${N + c}/${D}−${c}/${D}`;
  };
  const add3 = (): string | null => {
    const dd = pick(ds.filter((d) => (value * d) / 16 >= 3));
    if (!dd) return null;
    const n = (value * dd) / 16;
    const a = ri(1, n - 2);
    const b = ri(1, n - a - 1);
    return `${a}/${dd}+${b}/${dd}+${n - a - b}/${dd}`;
  };
  const addSub = (): string | null => {
    const c = ri(1, D);
    const x = N + c;
    if (x < 2) return null;
    const a = ri(1, x - 1);
    return `${a}/${D}+${x - a}/${D}−${c}/${D}`;
  };

  const forms = o.level === 1 ? [equiv, dec, add2, sub] : o.level === 2 ? [add2, sub, add3, dec] : [add3, addSub, sub];
  const candidates = forms.map((g) => g()).filter((x): x is string => x !== null);
  return candidates.length ? pick(candidates) : fmtFraction(value);
}
