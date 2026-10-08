/** 값이 value인 식 문자열을 만든다. 같은 값을 여러 모양으로 보여주는 것이 이 게임의 핵심. */
export interface ExprOptions {
  /** 1: 두 수의 식, 2: 세 수의 식도 섞임, 3: 세 수의 식 위주 */
  level: 1 | 2 | 3;
  /** 식 없이 숫자만 보여줄 확률 (0~1) */
  plain: number;
  rng?: () => number;
}

type Rng = () => number;

function niceStep(v: number): number {
  for (const s of [100, 50, 10, 5]) if (v / 4 >= s) return s;
  return 1;
}

function factorPairs(v: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let a = 2; a * a <= v; a++) if (v % a === 0) pairs.push([a, v / a]);
  return pairs;
}

export function makeExpr(value: number, opts: ExprOptions): string {
  const rng: Rng = opts.rng ?? Math.random;
  const ri = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const pick = <T>(xs: T[]): T => xs[Math.floor(rng() * xs.length)];

  if (rng() < opts.plain) return String(value);

  const add2 = (): string | null => {
    if (value < 2) return null;
    const s = niceStep(value);
    const a = s * ri(1, Math.max(1, Math.floor((value - 1) / s)));
    return `${a}+${value - a}`;
  };
  const sub = (): string | null => {
    const s = niceStep(value);
    const k = s * ri(1, 6) + (s === 1 ? ri(0, 5) : 0);
    return `${value + k}−${k}`;
  };
  const mul = (): string | null => {
    const pairs = factorPairs(value);
    if (pairs.length === 0) return null;
    const [a, b] = pick(pairs);
    return rng() < 0.5 ? `${a}×${b}` : `${b}×${a}`;
  };
  const mulAdd = (): string | null => {
    const options: Array<[number, number]> = [];
    for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) if (a * b < value) options.push([a, b]);
    if (options.length === 0) return null;
    const [a, b] = pick(options);
    return `${a}×${b}+${value - a * b}`;
  };
  const add3 = (): string | null => {
    if (value < 3) return null;
    const a = ri(1, value - 2);
    const b = ri(1, value - a - 1);
    return `${a}+${b}+${value - a - b}`;
  };
  const addSub = (): string | null => {
    if (value < 2) return null;
    const c = ri(1, 9);
    const a = ri(1, value + c - 1);
    return `${a}+${value + c - a}−${c}`;
  };

  const forms =
    opts.level === 1
      ? [add2, sub, mul]
      : opts.level === 2
        ? [add2, sub, mul, mulAdd, add3]
        : [mulAdd, add3, addSub, mul, sub];

  const candidates = forms.map((f) => f()).filter((x): x is string => x !== null);
  return candidates.length ? pick(candidates) : String(value);
}
