/**
 * 문제 생성기: 같은 틀에서 숫자와 상황을 바꿔 문제를 무한히 만든다.
 * 정답과 힌트, 해설은 숫자에 맞춰 함께 만들어진다.
 */
import { evaluate, type Token } from '../math/evaluate';
import type { BuildQuest, ChoiceQuest, Difficulty, InputQuest, Quest, Topic } from './quests';

export type Rng = () => number;

export interface Template {
  tpl: string;
  grade: 2 | 3 | 4;
  topic: Topic;
  diff: Difficulty;
  make(r: Rng): Quest;
}

// ───────── 도구 ─────────
const ri = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
function shuffle<T>(r: Rng, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const uniq = <T>(xs: T[]) => [...new Set(xs)];
const comma = (n: number) => n.toLocaleString('en-US');

type Hints = [string, string, string];

interface Helpers {
  input(key: string, prompt: string, answer: number, hints: Hints, explanation: string, unit?: string): InputQuest;
  choice(key: string, prompt: string, correct: string, wrongs: string[], hints: Hints, explanation: string): ChoiceQuest;
  build(key: string, prompt: string, cards: number[], target: number, hints: Hints, explanation: string): BuildQuest;
}

function T(tpl: string, grade: 2 | 3 | 4, topic: Topic, diff: Difficulty, fn: (h: Helpers, r: Rng) => Quest): Template {
  return {
    tpl,
    grade,
    topic,
    diff,
    make(r) {
      const meta = (key: string) => ({ id: `${tpl}~${key}`, tpl, grade, topic, diff });
      const h: Helpers = {
        input: (key, prompt, answer, hints, explanation, unit) => ({
          ...meta(key), kind: 'input', prompt, answer, hints, explanation, ...(unit ? { unit } : {}),
        }),
        choice(key, prompt, correct, wrongs, hints, explanation) {
          const ws = uniq(wrongs).filter((w) => w !== correct).slice(0, 3);
          if (ws.length < 3) throw new Error(`${tpl}: 오답 보기가 모자라요 (${ws.length})`);
          const options = shuffle(r, [correct, ...ws]);
          return { ...meta(key), kind: 'choice', prompt, options, answer: options.indexOf(correct), hints, explanation };
        },
        build: (key, prompt, cards, target, hints, explanation) => ({
          ...meta(key), kind: 'build', prompt, cards, target, hints, explanation,
        }),
      };
      return fn(h, r);
    },
  };
}

// ───────── 식 만들기 풀이기 ─────────
const perms = (xs: number[]): number[][] =>
  xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));

/** 카드를 모두 한 번씩 써서 만들 수 있는 값 → 식 (곱셈이 들어간 식을 우선) */
export function reachable(cards: number[]): Map<number, string> {
  const ops = ['+', '−', '×'] as const;
  const out = new Map<number, string>();
  for (const order of perms(cards)) {
    const n = order.length - 1;
    for (let k = 0; k < 3 ** n; k++) {
      const tokens: Token[] = [order[0]];
      let c = k;
      for (let i = 1; i < order.length; i++) {
        tokens.push(ops[c % 3], order[i]);
        c = Math.floor(c / 3);
      }
      const v = evaluate(tokens);
      if (v === null || v <= 0) continue;
      const text = tokens.join('');
      const old = out.get(v);
      if (!old || (!old.includes('×') && text.includes('×'))) out.set(v, text);
    }
  }
  return out;
}

function buildTemplate(tpl: string, grade: 2 | 3 | 4, diff: Difficulty, count: number, lo: number, hi: number, maxCard: number): Template {
  return T(tpl, grade, 'make-expr', diff, (h, r) => {
    for (let tries = 0; tries < 200; tries++) {
      const cards = Array.from({ length: count }, () => ri(r, 1, maxCard));
      const sum = cards.reduce((a, b) => a + b, 0);
      const options = [...reachable(cards)].filter(([v, e]) => v >= lo && v <= hi && v !== sum && e.includes('×'));
      if (!options.length) continue;
      const [target, expr] = pick(r, options);
      const firstMul = expr.match(/\d+×\d+/)?.[0] ?? expr;
      const sorted = [...cards].sort((a, b) => a - b);
      return h.build(
        `${sorted.join('-')}=${target}`,
        `카드 ${sorted.join(', ')}를 모두 한 번씩 써서 ${target}을 만들어 보세요.`,
        sorted,
        target,
        ['×는 +, −보다 먼저 계산해요. 곱셈을 어디에 넣을지 생각해 봐요.', `${firstMul}부터 계산해 볼까요?`, `${expr} = ${target}`],
        `${expr} = ${target}. 곱셈을 먼저 계산하는 것이 비결이에요.`,
      );
    }
    throw new Error(`${tpl}: 문제를 만들지 못했어요`);
  });
}

// ───────── 시각 표기 ─────────
const clock = (h: number, m: number) => {
  const hh = ((h - 1) % 12 + 12) % 12 + 1;
  return m === 0 ? `${hh}시` : `${hh}시 ${m}분`;
};
/** "3시 45분이에요" / "5시예요" */
const clockIs = (h: number, m: number) => (m === 0 ? `${clock(h, 0)}예요` : `${clock(h, m)}이에요`);
const hm = (mins: number) => (mins % 60 ? `${Math.floor(mins / 60)}시간 ${mins % 60}분` : `${Math.floor(mins / 60)}시간`);

// ───────── 생성기 ─────────
export const GENERATORS: Template[] = [
  // ── 식 만들기 ──
  buildTemplate('g-build3', 2, 1, 3, 8, 40, 9),
  buildTemplate('g-build4', 3, 3, 4, 10, 60, 6),

  // ── 규칙 찾기 ──
  T('g-pat-add', 2, 'pattern', 1, (h, r) => {
    const s = ri(r, 1, 20), d = ri(r, 2, 9);
    const t = [0, 1, 2, 3].map((i) => s + d * i);
    const ans = s + d * 4;
    return h.input(`${s}+${d}`, `규칙을 찾아 □에 알맞은 수를 쓰세요.\n${t.join(', ')}, □`, ans,
      ['이웃한 두 수의 차를 구해 보세요.', `${t[1]}−${t[0]} = ${d}, 계속 같은 수만큼 변해요.`, `${d}씩 커져요. ${t[3]}+${d} = ${ans}`],
      `${d}씩 더해지는 규칙이에요. ${t[3]} 다음은 ${ans}.`);
  }),
  T('g-pat-sub', 2, 'pattern', 1, (h, r) => {
    const d = ri(r, 2, 9), s = ri(r, d * 4 + 5, 80); // 다음 수도 0보다 커야 한다
    const t = [0, 1, 2, 3].map((i) => s - d * i);
    const ans = s - d * 4;
    return h.input(`${s}-${d}`, `규칙을 찾아 □에 알맞은 수를 쓰세요.\n${t.join(', ')}, □`, ans,
      ['커지나요, 작아지나요?', `${t[0]}−${t[1]} = ${d}`, `${d}씩 작아져요. ${t[3]}−${d} = ${ans}`],
      `${d}씩 빼는 규칙이에요. ${t[3]} 다음은 ${ans}.`);
  }),
  T('g-pat-double', 2, 'pattern', 2, (h, r) => {
    const s = ri(r, 1, 5), m = pick(r, [2, 3]);
    const t = [s, s * m, s * m * m, s * m ** 3];
    const ans = s * m ** 4;
    return h.input(`${s}x${m}`, `규칙을 찾아 □에 알맞은 수를 쓰세요.\n${t.join(', ')}, □`, ans,
      ['이웃한 수를 나눠 보거나 곱해 보세요.', `${t[0]}→${t[1]}, ${t[1]}→${t[2]}. 몇 배일까요?`, `${m}배씩 커져요. ${t[3]}×${m} = ${ans}`],
      `앞의 수에 ${m}을 곱하는 규칙이에요. ${t[3]}×${m} = ${ans}.`);
  }),
  T('g-pat-alt', 3, 'pattern', 2, (h, r) => {
    const a = ri(r, 1, 4), b = ri(r, 5, 9), s = ri(r, 1, 15);
    const t = [s, s + a, s + a + b, s + 2 * a + b, s + 2 * a + 2 * b];
    const ans = s + 3 * a + 2 * b;
    return h.input(`${s}:${a},${b}`, `규칙을 찾아 □에 알맞은 수를 쓰세요.\n${t.join(', ')}, □`, ans,
      ['이웃한 수의 차를 차례로 적어 보세요.', `차가 ${a}, ${b}, ${a}, ${b}, … 로 번갈아 나와요.`, `다음 차는 ${a}. ${t[4]}+${a} = ${ans}`],
      `${a}와 ${b}를 번갈아 더하는 규칙이에요. ${t[4]} 다음은 ${ans}.`);
  }),
  T('g-pat-grow', 3, 'pattern', 3, (h, r) => {
    const s = ri(r, 1, 6), d0 = pick(r, [1, 2]);
    const t = [s];
    for (let i = 0; i < 5; i++) t.push(t[i] + d0 + i);
    const shown = t.slice(0, 5);
    const ans = t[5];
    return h.input(`${s}:${d0}`, `규칙을 찾아 □에 알맞은 수를 쓰세요.\n${shown.join(', ')}, □`, ans,
      ['이웃한 두 수의 차를 적어 보세요.', `차가 ${d0}, ${d0 + 1}, ${d0 + 2}, ${d0 + 3} … 로 하나씩 커져요.`, `다음 차는 ${d0 + 4}. ${shown[4]}+${d0 + 4} = ${ans}`],
      `더하는 수가 1씩 커지는 규칙이에요. ${shown[4]}+${d0 + 4} = ${ans}.`);
  }),
  T('g-pat-twice1', 4, 'pattern', 3, (h, r) => {
    const s = ri(r, 1, 3);
    const t = [s];
    for (let i = 0; i < 4; i++) t.push(t[i] * 2 + 1);
    const ans = t[4] * 2 + 1;
    return h.input(`${s}`, `규칙을 찾아 □에 알맞은 수를 쓰세요.\n${t.join(', ')}, □`, ans,
      ['앞의 수와 다음 수의 관계를 찾아 보세요.', `${t[0]}→${t[1]}: ${t[0]}×2+1 = ${t[1]}`, `앞의 수×2+1. ${t[4]}×2+1 = ${ans}`],
      `앞의 수를 2배 하고 1을 더하는 규칙이에요. ${t[4]}×2+1 = ${ans}.`);
  }),

  // ── 길이 ──
  T('g-len-cm', 2, 'measure', 1, (h, r) => {
    const m = ri(r, 1, 5), c = ri(r, 1, 19) * 5;
    if (r() < 0.5) {
      return h.input(`${m}-${c}`, `${m} m ${c} cm는 몇 cm일까요?`, m * 100 + c,
        [`${m} m는 몇 cm일까요?`, `${m} m = ${m * 100} cm`, `${m * 100} + ${c} = ${m * 100 + c}`],
        `1 m = 100 cm이니까 ${m} m ${c} cm = ${m * 100 + c} cm예요.`, 'cm');
    }
    const total = m * 100 + c;
    return h.choice(`r${m}-${c}`, `${total} cm는 몇 m 몇 cm일까요?`, `${m} m ${c} cm`,
      [`${m} m ${c + 5} cm`, `${m + 1} m ${c} cm`, `${Math.floor(total / 10)} m ${total % 10} cm`, `${m} m ${Math.max(5, c - 5)} cm`],
      ['100 cm는 몇 m일까요?', `${total}에서 100을 몇 번 뺄 수 있나요?`, `${total} = ${m * 100} + ${c} → ${m} m ${c} cm`],
      `100 cm = 1 m이므로 ${total} cm = ${m} m ${c} cm예요.`);
  }),
  T('g-len-rope', 2, 'measure', 2, (h, r) => {
    const total = pick(r, [150, 200, 250, 300]);
    const use = ri(r, 4, Math.floor((total - 20) / 5)) * 5;
    if (r() < 0.5) {
      return h.input(`${total}-${use}`, `길이가 ${total / 100} m인 끈에서 ${use} cm를 잘라 썼어요.\n남은 끈은 몇 cm일까요?`, total - use,
        ['단위를 cm로 맞춰 보세요.', `${total / 100} m = ${total} cm`, `${total} − ${use} = ${total - use}`],
        `${total / 100} m = ${total} cm이고, ${total} − ${use} = ${total - use} (cm)예요.`, 'cm');
    }
    const a = ri(r, 4, 30) * 5, b = ri(r, 4, 30) * 5;
    return h.input(`j${a}-${b}`, `길이가 ${a} cm와 ${b} cm인 끈 두 개를 이어 붙였어요.\n모두 몇 cm일까요?`, a + b,
      ['두 길이를 더해요.', `${a} + ${b} 를 계산해 보세요.`, `${a} + ${b} = ${a + b}`],
      `${a} + ${b} = ${a + b} (cm)예요.`, 'cm');
  }),
  T('g-len-mm', 3, 'measure', 2, (h, r) => {
    const c = ri(r, 2, 9), mm = ri(r, 1, 9);
    return h.input(`${c}-${mm}`, `1 cm = 10 mm예요.\n${c} cm ${mm} mm는 몇 mm일까요?`, c * 10 + mm,
      [`${c} cm는 몇 mm일까요?`, `${c} cm = ${c * 10} mm`, `${c * 10} + ${mm} = ${c * 10 + mm}`],
      `${c} cm = ${c * 10} mm이고, 여기에 ${mm} mm를 더해 ${c * 10 + mm} mm예요.`, 'mm');
  }),
  T('g-len-km', 3, 'measure', 2, (h, r) => {
    const k = ri(r, 1, 6), m = ri(r, 1, 9) * 100;
    return h.input(`${k}-${m}`, `1 km = 1000 m예요.\n${k} km ${m} m는 몇 m일까요?`, k * 1000 + m,
      [`${k} km는 몇 m일까요?`, `${k} km = ${k * 1000} m`, `${k * 1000} + ${m} = ${k * 1000 + m}`],
      `${k} km = ${k * 1000} m이고 여기에 ${m} m를 더해 ${k * 1000 + m} m예요.`, 'm');
  }),

  // ── 시각과 시간 ──
  T('g-time-min', 2, 'time', 1, (h, r) => {
    const hr = ri(r, 1, 3), m = ri(r, 1, 11) * 5;
    return h.input(`${hr}-${m}`, `${hr}시간 ${m}분은 모두 몇 분일까요?`, hr * 60 + m,
      ['1시간은 몇 분일까요?', `${hr}시간 = ${hr * 60}분`, `${hr * 60} + ${m} = ${hr * 60 + m}`],
      `1시간 = 60분이니까 ${hr}시간 ${m}분 = ${hr * 60 + m}분이에요.`, '분');
  }),
  T('g-time-after', 2, 'time', 2, (h, r) => {
    const hh = ri(r, 1, 12), mm = ri(r, 0, 11) * 5, add = ri(r, 3, 18) * 5;
    const total = hh * 60 + mm + add;
    const eh = Math.floor(total / 60), em = total % 60;
    const ok = clock(eh, em);
    const wrongs = [
      mm + add >= 60 ? `${clock(hh, 0).replace('시', '')}시 ${mm + add}분` : clock(hh, (mm + add + 10) % 60),
      clock(eh, (em + 10) % 60),
      clock(eh, (em + 50) % 60),
      clock(eh + 1, em),
      clock(eh, (em + 5) % 60),
    ];
    return h.choice(`${hh}:${mm}+${add}`, `지금 ${clockIs(hh, mm)}.\n${add}분 뒤는 몇 시 몇 분일까요?`, ok, wrongs,
      ['먼저 다음 정각까지 몇 분 남았는지 구해 보세요.', `${60 - mm}분 뒤에 ${clock(hh + 1, 0)}이에요.`, `${add}분 중 ${Math.min(add, 60 - mm)}분을 쓰고 남은 시간을 더해요. 정답은 ${ok}`],
      `${mm}분 + ${add}분 = ${mm + add}분. 60분이 넘으면 1시간으로 바꿔요. 답은 ${ok}.`);
  }),
  T('g-time-span', 3, 'time', 2, (h, r) => {
    const sh = ri(r, 1, 9), sm = ri(r, 0, 11) * 5, dur = ri(r, 6, 36) * 5;
    const end = sh * 60 + sm + dur;
    const eh = Math.floor(end / 60), em = end % 60;
    return h.input(`${sh}:${sm}->${dur}`, `${clock(sh, sm)}에 시작해서 ${clock(eh, em)}에 끝났어요.\n걸린 시간은 몇 분일까요?`, dur,
      ['정각까지 먼저 세어 보세요.', `${clock(sh, sm)}에서 ${clock(sh + 1, 0)}까지는 ${60 - sm || 60}분이에요.`, `${hm(dur)} = ${dur}분`],
      `${clock(sh, sm)} → ${clock(eh, em)}는 ${hm(dur)}, 즉 ${dur}분이에요.`, '분');
  }),

  // ── 수 만들기 ──
  T('g-digits3', 2, 'number-sense', 1, (h, r) => {
    const ds = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    const big = r() < 0.5;
    const s = [...ds].sort((a, b) => (big ? b - a : a - b));
    return h.input(`${ds.join('')}${big ? 'M' : 'm'}`, `숫자 카드 ${ds.join(', ')}를 한 번씩 모두 써서 만들 수 있는\n가장 ${big ? '큰' : '작은'} 세 자리 수는?`, Number(s.join('')),
      [`백의 자리에는 어떤 수를 놓아야 ${big ? '클' : '작을'}까요?`, `${big ? '큰' : '작은'} 수부터 차례로 놓아요.`, `${s.join(', ')} → ${s.join('')}`],
      `가장 ${big ? '큰' : '작은'} 수는 ${big ? '큰' : '작은'} 숫자부터 백, 십, 일의 자리에 놓아요.`);
  }),
  T('g-digits4z', 3, 'number-sense', 2, (h, r) => {
    const ds = shuffle(r, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
    if (!ds.includes(0)) ds[0] = 0;
    const sortedUp = [...ds].sort((a, b) => a - b);
    const min = [...sortedUp];
    const firstNonZero = min.findIndex((d) => d !== 0);
    [min[0], min[firstNonZero]] = [min[firstNonZero], min[0]];
    return h.input(`${[...ds].sort().join('')}`, `숫자 카드 ${[...ds].sort().join(', ')}를 한 번씩 모두 써서 만들 수 있는\n가장 작은 네 자리 수는?`, Number(min.join('')),
      ['작은 수부터 놓으면 될까요? 0은 맨 앞에 올 수 없어요.', `맨 앞에는 0 다음으로 작은 ${min[0]}을 놓아요.`, `${min.join(', ')} → ${min.join('')}`],
      `0은 맨 앞에 올 수 없으니 ${min[0]}을 맨 앞에 놓고, 나머지는 작은 수부터 차례로 놓아요.`);
  }),
  T('g-comp100', 2, 'number-sense', 1, (h, r) => {
    const a = ri(r, 1, 19) * 5 + (r() < 0.5 ? 0 : ri(r, 1, 4));
    return h.input(`${a}`, `□ + ${a} = 100\n□에 알맞은 수는 얼마일까요?`, 100 - a,
      ['100에서 어떤 수를 빼면 될까요?', `100 − ${a} 를 계산해 보세요.`, `100 − ${a} = ${100 - a}`],
      `100 − ${a} = ${100 - a}이니까 □ = ${100 - a}예요.`);
  }),
  T('g-comp1000', 3, 'number-sense', 2, (h, r) => {
    const a = ri(r, 2, 19) * 50 + ri(r, 1, 9) * 5;
    return h.input(`${a}`, `□ + ${a} = 1000\n□에 알맞은 수는 얼마일까요?`, 1000 - a,
      ['1000에서 빼면 돼요.', `일의 자리부터 생각해 보세요.`, `1000 − ${a} = ${1000 - a}`],
      `1000 − ${a} = ${1000 - a}이니까 □ = ${1000 - a}예요.`);
  }),

  // ── 곱셈·나눗셈 ──
  T('g-mul-groups', 2, 'multiply', 1, (h, r) => {
    const [thing, unit, box] = pick(r, [['사과', '개', '상자'], ['구슬', '개', '주머니'], ['연필', '자루', '통'], ['스티커', '장', '묶음']] as const);
    const a = ri(r, 2, 9), b = ri(r, 2, 9);
    return h.input(`${a}x${b}`, `${thing}가 한 ${box}에 ${a}${unit}씩 ${b}${box} 있어요.\n${thing}는 모두 몇 ${unit}일까요?`, a * b,
      [`${a}${unit}씩 ${b}번 더하는 것과 같아요.`, `${a}×${b} 를 계산해 보세요.`, `${a} × ${b} = ${a * b}`],
      `${a}${unit}씩 ${b}${box}이니까 ${a} × ${b} = ${a * b}(${unit})예요.`, unit);
  }),
  T('g-mul-2d', 3, 'multiply', 2, (h, r) => {
    const a = ri(r, 12, 48), b = ri(r, 3, 9);
    return h.input(`${a}x${b}`, `한 봉지에 ${a}개씩 ${b}봉지가 있어요.\n모두 몇 개일까요?`, a * b,
      [`십의 자리와 일의 자리를 나누어 곱해 보세요.`, `${Math.floor(a / 10) * 10}×${b} = ${Math.floor(a / 10) * 10 * b}, ${a % 10}×${b} = ${(a % 10) * b}`, `${Math.floor(a / 10) * 10 * b} + ${(a % 10) * b} = ${a * b}`],
      `${a} × ${b} = ${a * b}예요.`, '개');
  }),
  T('g-div-share', 3, 'multiply', 1, (h, r) => {
    const b = ri(r, 2, 9), q = ri(r, 2, 9);
    return h.input(`${b * q}/${b}`, `사탕 ${b * q}개를 ${b}명이 똑같이 나누어 가지면\n한 명이 몇 개씩 가질 수 있을까요?`, q,
      ['똑같이 나누는 것은 나눗셈이에요.', `${b}단에서 ${b * q}을 찾아 보세요.`, `${b} × ${q} = ${b * q}이므로 ${b * q} ÷ ${b} = ${q}`],
      `${b * q} ÷ ${b} = ${q}이므로 한 명이 ${q}개씩 가져요.`, '개');
  }),
  T('g-div-rem', 3, 'multiply', 2, (h, r) => {
    const b = ri(r, 3, 9), q = ri(r, 3, 9), rem = ri(r, 1, b - 1);
    const n = b * q + rem;
    const askRem = r() < 0.5;
    return h.input(`${n}/${b}${askRem ? 'r' : 'q'}`, `${n}을 ${b}로 나누었어요.\n${askRem ? '나머지는' : '몫은'} 얼마일까요?`, askRem ? rem : q,
      [`${b}단에서 ${n}에 가장 가까운 수를 찾아 보세요.`, `${b} × ${q} = ${b * q}, ${n} − ${b * q} = ${rem}`, `몫 ${q}, 나머지 ${rem}`],
      `${n} ÷ ${b} = ${q} … ${rem}. 몫은 ${q}, 나머지는 ${rem}이에요.`);
  }),
  T('g-mul-3x2', 4, 'multiply', 3, (h, r) => {
    const a = ri(r, 11, 39) * 10 + pick(r, [0, 0, 5]), b = ri(r, 11, 29);
    return h.input(`${a}x${b}`, `${a} × ${b} 는 얼마일까요?`, a * b,
      [`${b}를 십의 자리와 일의 자리로 나누어 보세요.`, `${a}×${Math.floor(b / 10) * 10} = ${a * Math.floor(b / 10) * 10}, ${a}×${b % 10} = ${a * (b % 10)}`, `${a * Math.floor(b / 10) * 10} + ${a * (b % 10)} = ${a * b}`],
      `${a} × ${b} = ${a * b}이에요.`);
  }),
  T('g-div-3d', 4, 'multiply', 3, (h, r) => {
    const b = ri(r, 11, 29), q = ri(r, 5, 30);
    return h.input(`${b * q}/${b}`, `${b * q} ÷ ${b} 는 얼마일까요?`, q,
      [`${b}에 어떤 수를 곱하면 ${b * q}이 될까요?`, `${b}×10 = ${b * 10}부터 시작해 보세요.`, `${b} × ${q} = ${b * q}이므로 ${q}`],
      `${b} × ${q} = ${b * q}이니까 ${b * q} ÷ ${b} = ${q}이에요.`);
  }),

  // ── 논리·추리 ──
  T('g-balance', 2, 'logic', 2, (h, r) => {
    const [x, y, z] = pick(r, [['🍎', '🍐', '🍌'], ['🍓', '🍊', '🍇'], ['🥕', '🍅', '🍆']] as const);
    const a = pick(r, [2, 3, 4]);
    if (r() < 0.5) {
      const b = a * ri(r, 2, 4);
      return h.input(`d${a}-${b}`, `${x} ${a}개 = ${y} 1개\n${y} 1개 = ${z} ${b}개\n${x} 1개는 ${z} 몇 개와 같을까요?`, b / a,
        [`${y} 1개는 ${x} 몇 개와 같나요?`, `${x} ${a}개가 ${z} ${b}개와 같아요.`, `${b}개를 똑같이 ${a}로 나누면 ${b / a}개`],
        `${x} ${a}개 = ${z} ${b}개이니까 ${x} 1개 = ${z} ${b / a}개예요.`, '개');
    }
    const b = ri(r, 2, 5);
    return h.input(`m${a}-${b}`, `${x} 1개 = ${y} ${a}개\n${y} 1개 = ${z} ${b}개\n${x} 1개는 ${z} 몇 개와 같을까요?`, a * b,
      [`${y} ${a}개는 ${z} 몇 개와 같을까요?`, `${y} 1개가 ${z} ${b}개예요.`, `${b} × ${a} = ${a * b}`],
      `${x} 1개 = ${y} ${a}개 = ${z} ${b}개씩 ${a}번 = ${a * b}개예요.`, '개');
  }),
  T('g-sumdiff', 2, 'logic', 2, (h, r) => {
    const small = ri(r, 2, 15), big = small + ri(r, 1, 9) + (r() < 0.5 ? 0 : 2);
    const S = big + small, D = big - small;
    const askBig = r() < 0.5;
    return h.input(`${S}-${D}${askBig ? 'b' : 's'}`, `두 수를 더하면 ${S}, 두 수의 차는 ${D}예요.\n두 수 중 ${askBig ? '큰' : '작은'} 수는 얼마일까요?`, askBig ? big : small,
      [`합이 ${S}인 두 수를 하나씩 적어 보세요.`, `차가 ${D}인 것을 찾아 보세요.`, `${big} + ${small} = ${S}, ${big} − ${small} = ${D}`],
      `${big}과 ${small}을 더하면 ${S}, 빼면 ${D}예요. ${askBig ? '큰' : '작은'} 수는 ${askBig ? big : small}.`);
  }),

  // ── 경우의 수 ──
  T('g-count-outfit', 3, 'counting', 2, (h, r) => {
    const s = ri(r, 2, 5), p = ri(r, 2, 4);
    return h.input(`${s}x${p}`, `티셔츠 ${s}벌과 바지 ${p}벌이 있어요.\n티셔츠 한 벌과 바지 한 벌을 짝지어 입는 방법은 모두 몇 가지일까요?`, s * p,
      ['티셔츠 한 벌마다 바지를 몇 가지로 고를 수 있나요?', `티셔츠 1벌에 바지 ${p}가지예요.`, `${s} × ${p} = ${s * p}`],
      `티셔츠 ${s}벌 × 바지 ${p}벌 = ${s * p}가지예요.`, '가지');
  }),
  T('g-count-3way', 4, 'counting', 3, (h, r) => {
    const a = ri(r, 2, 4), b = ri(r, 2, 4), c = ri(r, 2, 3);
    return h.input(`${a}x${b}x${c}`, `모자 ${a}개, 티셔츠 ${b}벌, 바지 ${c}벌이 있어요.\n모자, 티셔츠, 바지를 하나씩 골라 입는 방법은 모두 몇 가지일까요?`, a * b * c,
      ['모자와 티셔츠를 먼저 짝지어 보세요.', `${a} × ${b} = ${a * b}가지, 거기에 바지를 고르면?`, `${a * b} × ${c} = ${a * b * c}`],
      `${a} × ${b} × ${c} = ${a * b * c}가지예요.`, '가지');
  }),
  T('g-count-shake', 3, 'counting', 2, (h, r) => {
    const n = ri(r, 3, 7);
    const ans = (n * (n - 1)) / 2;
    const seq = Array.from({ length: n - 1 }, (_, i) => n - 1 - i);
    return h.input(`${n}`, `${n}명이 모두 한 번씩 서로 악수를 해요.\n악수는 모두 몇 번일까요?`, ans,
      ['한 사람이 몇 명과 악수하나요?', '같은 악수를 두 번 세지 않도록 조심해요.', `${seq.join(' + ')} = ${ans}`],
      `${seq.join('+')} = ${ans}번이에요. 같은 악수를 두 번 세지 않는 것이 중요해요.`, '번');
  }),
  T('g-count-league', 4, 'counting', 3, (h, r) => {
    const n = ri(r, 4, 8);
    const ans = (n * (n - 1)) / 2;
    return h.input(`${n}`, `${n}팀이 서로 한 번씩 모두 경기를 해요.\n경기는 모두 몇 번일까요?`, ans,
      ['한 팀이 몇 팀과 경기하나요?', `${n}팀 × ${n - 1}경기 = ${n * (n - 1)}, 그런데 같은 경기를 두 번 셌어요.`, `${n * (n - 1)} ÷ 2 = ${ans}`],
      `${n}×${n - 1} = ${n * (n - 1)}에서 같은 경기를 두 번 세었으니 2로 나눠 ${ans}경기예요.`, '번');
  }),
  T('g-count-trees', 3, 'counting', 2, (h, r) => {
    const d = ri(r, 2, 5), k = ri(r, 3, 9);
    if (r() < 0.7) {
      return h.input(`${d}x${k}`, `길이 ${d * k} m인 길의 한쪽에 ${d} m 간격으로 처음부터 끝까지 나무를 심어요.\n나무는 모두 몇 그루일까요?`, k + 1,
        ['간격이 몇 개인지 먼저 세어 보세요.', `${d * k}÷${d} = ${k}개의 간격이 있어요.`, `나무는 간격보다 하나 더 많아요. ${k}+1 = ${k + 1}`],
        `간격이 ${k}개이고 양 끝에 모두 심으니 나무는 ${k}+1 = ${k + 1}그루예요.`, '그루');
    }
    return h.input(`o${d}x${k}`, `둘레가 ${d * k} m인 둥근 연못 둘레에 ${d} m 간격으로 나무를 심어요.\n나무는 모두 몇 그루일까요?`, k,
      ['둥근 모양은 처음과 끝이 만나요.', `${d * k}÷${d} = ${k}개의 간격이 있어요.`, `둥글게 이어지면 간격 수와 나무 수가 같아요. ${k}`],
      `둥근 곳에서는 처음과 끝이 만나서 간격 수 ${k}와 나무 수가 같아요.`, '그루');
  }),
  T('g-count-stairs', 4, 'counting', 3, (h, r) => {
    const n = ri(r, 4, 6);
    const ways = [0, 1, 2, 3, 5, 8, 13]; // ways[n] = n칸을 오르는 방법
    return h.input(`${n}`, `한 번에 1칸 또는 2칸을 오를 수 있어요.\n${n}칸짜리 계단을 오르는 방법은 모두 몇 가지일까요?`, ways[n],
      ['1칸, 2칸, 3칸 계단부터 차례로 세어 보세요.', '1칸: 1가지, 2칸: 2가지, 3칸: 3가지 … 앞의 두 수를 더하는 규칙이 있어요.', `${ways[n - 2]} + ${ways[n - 1]} = ${ways[n]}`],
      `1, 2, 3, 5, 8, 13 … 앞의 두 수를 더해요. ${n}칸은 ${ways[n]}가지예요.`, '가지');
  }),

  // ── 분수 ──
  T('g-fr-left', 3, 'fraction', 1, (h, r) => {
    const N = pick(r, [4, 6, 8, 10, 12]);
    const a = ri(r, 1, Math.floor((N - 2) / 2)), b = ri(r, 1, N - a - 1);
    return h.input(`${N}-${a}-${b}`, `피자 한 판을 똑같이 ${N}조각으로 나눴어요.\n한 명이 ${a}조각, 다른 한 명이 ${b}조각을 먹었어요.\n남은 피자는 전체의 □/${N}이에요. □는?`, N - a - b,
      ['먹은 조각은 모두 몇 개일까요?', `${a} + ${b} = ${a + b}조각을 먹었어요.`, `${N} − ${a + b} = ${N - a - b}`],
      `${N}조각 중 ${a + b}조각을 먹었으니 남은 것은 ${N - a - b}조각, 전체의 ${N - a - b}/${N}이에요.`);
  }),
  T('g-fr-equal', 3, 'fraction', 2, (h, r) => {
    const q = pick(r, [2, 3, 4, 5]), p = ri(r, 1, q - 1), k = ri(r, 2, 4);
    if (r() < 0.5) {
      return h.input(`${p}/${q}-${k}n`, `${p}/${q} = □/${q * k}\n□에 알맞은 수는 얼마일까요?`, p * k,
        [`분모 ${q}가 ${q * k}가 되려면 몇 배 해야 하나요?`, `분모가 ${k}배가 되었으니 분자도 ${k}배예요.`, `${p} × ${k} = ${p * k}`],
        `분모와 분자에 똑같이 ${k}를 곱하면 크기가 같아요. ${p}/${q} = ${p * k}/${q * k}.`);
    }
    return h.input(`${p}/${q}-${k}d`, `${p}/${q} = ${p * k}/□\n□에 알맞은 수는 얼마일까요?`, q * k,
      [`분자 ${p}가 ${p * k}가 되려면 몇 배 해야 하나요?`, `분자가 ${k}배가 되었으니 분모도 ${k}배예요.`, `${q} × ${k} = ${q * k}`],
      `분자가 ${k}배가 되었으니 분모도 ${k}배. ${p}/${q} = ${p * k}/${q * k}.`);
  }),
  T('g-fr-unit', 3, 'fraction', 1, (h, r) => {
    const ds = shuffle(r, [2, 3, 4, 5, 6, 8, 10, 12]).slice(0, 4);
    const big = r() < 0.5;
    const ans = big ? Math.min(...ds) : Math.max(...ds);
    return h.choice(`${[...ds].sort((a, b) => a - b).join('')}${big ? 'B' : 's'}`, `피자를 똑같이 나눈 한 조각이에요.\n가장 ${big ? '큰' : '작은'} 조각은 어느 것일까요?`, `1/${ans}`,
      ds.filter((d) => d !== ans).map((d) => `1/${d}`),
      ['전체를 몇 조각으로 나눴는지 보세요.', '많이 나눌수록 한 조각은 작아져요.', `분모가 ${big ? '작을수록 커요' : '클수록 작아요'}. 1/${ans}`],
      `분자가 1로 같을 때는 분모가 ${big ? '작을수록' : '클수록'} ${big ? '더 큰' : '더 작은'} 분수예요. 답은 1/${ans}.`);
  }),
  T('g-fr-add', 3, 'fraction', 2, (h, r) => {
    const q = ri(r, 5, 12), a = ri(r, 1, q - 2), b = ri(r, 1, q - a - 1);
    if (r() < 0.55) {
      return h.input(`${q}:${a}+${b}`, `${a}/${q} + ${b}/${q} = □/${q}\n□에 알맞은 수는 얼마일까요?`, a + b,
        ['분모가 같으면 분자끼리 더해요.', `분모는 그대로 ${q}예요.`, `${a} + ${b} = ${a + b}`],
        `분모가 같은 분수의 덧셈은 분자끼리 더해요. ${a}/${q} + ${b}/${q} = ${a + b}/${q}.`);
    }
    return h.input(`${q}:${a + b}-${a}`, `${a + b}/${q} − ${a}/${q} = □/${q}\n□에 알맞은 수는 얼마일까요?`, b,
      ['분모가 같으면 분자끼리 빼요.', `분모는 그대로 ${q}예요.`, `${a + b} − ${a} = ${b}`],
      `분모가 같은 분수의 뺄셈은 분자끼리 빼요. ${a + b}/${q} − ${a}/${q} = ${b}/${q}.`);
  }),
  T('g-fr-one', 4, 'fraction', 2, (h, r) => {
    const q = ri(r, 5, 12), p = ri(r, 1, q - 1);
    return h.input(`${p}/${q}`, `두 분수의 합이 1이에요. 한 분수가 ${p}/${q}라면\n다른 분수는 □/${q}예요. □는?`, q - p,
      ['1을 분모가 같은 분수로 바꿔 보세요.', `1 = ${q}/${q}`, `${q} − ${p} = ${q - p}`],
      `1 = ${q}/${q}이니까 ${q}/${q} − ${p}/${q} = ${q - p}/${q}예요.`);
  }),

  // ── 큰 수 ──
  T('g-big-compose', 4, 'big-number', 2, (h, r) => {
    const a = ri(r, 1, 9), b = ri(r, 1, 9), c = ri(r, 1, 9);
    return h.input(`${a}${b}${c}`, `10000이 ${a}개, 1000이 ${b}개, 100이 ${c}개인 수는 얼마일까요?`, a * 10000 + b * 1000 + c * 100,
      ['각각 얼마인지 먼저 구해 보세요.', `${comma(a * 10000)}, ${comma(b * 1000)}, ${comma(c * 100)}이에요.`, `${comma(a * 10000)} + ${comma(b * 1000)} + ${comma(c * 100)} = ${comma(a * 10000 + b * 1000 + c * 100)}`],
      `${comma(a * 10000)} + ${comma(b * 1000)} + ${comma(c * 100)} = ${comma(a * 10000 + b * 1000 + c * 100)}이에요.`);
  }),
  T('g-big-jump', 4, 'big-number', 2, (h, r) => {
    const start = ri(r, 1, 9) * 10000 + ri(r, 0, 9) * 1000, step = pick(r, [1000, 2000, 5000, 10000]), k = ri(r, 2, 5);
    const ans = start + step * k;
    return h.input(`${start}+${step}x${k}`, `${comma(start)}에서 ${comma(step)}씩 ${k}번 뛰어 센 수는 얼마일까요?`, ans,
      [`${comma(step)}씩 ${k}번은 모두 얼마일까요?`, `${comma(step)} × ${k} = ${comma(step * k)}`, `${comma(start)} + ${comma(step * k)} = ${comma(ans)}`],
      `${comma(start)} + ${comma(step)}×${k} = ${comma(ans)}이에요.`);
  }),
  T('g-big-digits', 4, 'big-number', 3, (h, r) => {
    const ds = shuffle(r, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5);
    if (!ds.includes(0)) ds[0] = 0;
    const shown = shuffle(r, ds);
    const asc = [...ds].sort((a, b) => a - b);
    const nz = asc.findIndex((d) => d !== 0);
    const min = [...asc];
    [min[0], min[nz]] = [min[nz], min[0]];
    return h.input(`${[...ds].sort().join('')}`, `숫자 카드 ${shown.join(', ')}를 한 번씩 모두 써서 만들 수 있는\n가장 작은 다섯 자리 수는 얼마일까요?`, Number(min.join('')),
      ['작은 수부터 놓으면 될까요? 0은 맨 앞에 올 수 없어요.', `맨 앞에는 0 다음으로 작은 ${min[0]}을 놓아요.`, `${min.join(', ')} → ${min.join('')}`],
      `0은 맨 앞에 올 수 없으니 ${min[0]}을 맨 앞에 놓고 나머지는 작은 수부터 놓아요. 답은 ${min.join('')}.`);
  }),

  // ── 각도 ──
  T('g-ang-tri', 4, 'angle', 2, (h, r) => {
    const a = ri(r, 4, 16) * 5, b = ri(r, 3, Math.floor((175 - a) / 5)) * 5;
    return h.input(`${a}-${b}`, `삼각형의 두 각이 ${a}°, ${b}°예요.\n나머지 한 각은 몇 도일까요?`, 180 - a - b,
      ['삼각형의 세 각을 모두 더하면 얼마일까요?', '세 각의 합은 180°예요.', `180 − ${a} − ${b} = ${180 - a - b}`],
      `삼각형의 세 각의 합은 180°라서 180 − ${a} − ${b} = ${180 - a - b}°예요.`, '도');
  }),
  T('g-ang-line', 4, 'angle', 1, (h, r) => {
    const a = ri(r, 2, 16) * 5;
    if (r() < 0.5) {
      return h.input(`R${a}`, `직각은 90°예요.\n직각에서 ${a}°를 뺀 각은 몇 도일까요?`, 90 - a,
        ['직각은 몇 도일까요?', `90°에서 ${a}°를 빼요.`, `90 − ${a} = ${90 - a}`],
        `90° − ${a}° = ${90 - a}°예요.`, '도');
    }
    return h.input(`L${a}`, `일직선이 이루는 각은 180°예요.\n일직선 위의 한 각이 ${a}°라면 나머지 각은 몇 도일까요?`, 180 - a,
      ['일직선의 각은 몇 도일까요?', `180°에서 ${a}°를 빼요.`, `180 − ${a} = ${180 - a}`],
      `180° − ${a}° = ${180 - a}°예요.`, '도');
  }),
  T('g-ang-quad', 4, 'angle', 3, (h, r) => {
    let a = 0, b = 0, c = 0, rest = 0;
    do {
      a = ri(r, 12, 20) * 5;
      b = ri(r, 12, 20) * 5;
      c = ri(r, 12, 21) * 5;
      rest = 360 - a - b - c;
    } while (rest < 50 || rest > 150);
    return h.input(`q${a}-${b}-${c}`, `사각형의 네 각의 합은 360°예요.\n세 각이 ${a}°, ${b}°, ${c}°라면 나머지 한 각은 몇 도일까요?`, rest,
      ['세 각을 먼저 더해 보세요.', `${a} + ${b} + ${c} = ${a + b + c}`, `360 − ${a + b + c} = ${rest}`],
      `세 각의 합이 ${a + b + c}°이니 나머지는 360 − ${a + b + c} = ${rest}°예요.`, '도');
  }),
  T('g-ang-clock', 4, 'angle', 2, (h, r) => {
    const k = ri(r, 1, 6);
    const ans = k * 30;
    const wrongs = [30, 60, 90, 120, 150, 180].filter((x) => x !== ans);
    return h.choice(`${k}`, `시계가 ${k}시 정각일 때, 시침과 분침이 이루는 작은 각은 몇 도일까요?`, `${ans}°`,
      shuffle(r, wrongs).slice(0, 3).map((x) => `${x}°`),
      ['시계 한 바퀴는 360°예요. 숫자 한 칸은 몇 도일까요?', '360 ÷ 12 = 30°가 한 칸이에요.', `12에서 ${k}까지는 ${k}칸. ${k} × 30 = ${ans}`],
      `숫자 한 칸은 30°이고, ${k}시에는 ${k}칸 떨어져 있으니 ${k} × 30 = ${ans}°예요.`);
  }),
];
