import { describe, expect, it } from 'vitest';
import { drawQuest, STATIC_TEMPLATES, TEMPLATES } from '../src/content/bank';
import { GENERATORS, reachable, type Rng } from '../src/content/generators';
import type { Quest } from '../src/content/quests';

function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const make = (tpl: string, seed: number): Quest => GENERATORS.find((g) => g.tpl === tpl)!.make(seeded(seed));
const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);

describe('문제 생성기: 형식', () => {
  for (const g of GENERATORS) {
    it(`${g.tpl}: 300개를 만들어도 모두 올바른 문제`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        const q = g.make(seeded(seed));
        expect(q.id.startsWith(`${g.tpl}~`), q.id).toBe(true);
        expect(q.tpl).toBe(g.tpl);
        expect(q.grade).toBe(g.grade);
        expect(q.topic).toBe(g.topic);
        expect(q.prompt.length).toBeGreaterThan(5);
        expect(q.hints.every((h) => h.length > 0), q.id).toBe(true);
        expect(q.explanation.length).toBeGreaterThan(0);
        if (q.kind === 'input') {
          expect(Number.isInteger(q.answer) && q.answer >= 0, `${q.id} answer=${q.answer}`).toBe(true);
        } else if (q.kind === 'choice') {
          expect(new Set(q.options).size, q.id).toBe(4);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(4);
        } else {
          expect(reachable(q.cards).has(q.target), `${q.id} 풀 수 없어요`).toBe(true);
        }
      }
    });
    it(`${g.tpl}: 숫자가 바뀌어 여러 문제가 나온다`, () => {
      const ids = new Set<string>();
      for (let seed = 1; seed <= 300; seed++) ids.add(g.make(seeded(seed)).id);
      expect(ids.size).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('문제 생성기: 정답 확인 (프롬프트의 숫자로 다시 계산)', () => {
  const each = (tpl: string, fn: (q: Quest) => void) => {
    for (let seed = 1; seed <= 200; seed++) fn(make(tpl, seed));
  };
  it('덧셈 규칙', () =>
    each('g-pat-add', (q) => {
      const n = nums(q.prompt.split('\n')[1]);
      expect(q.kind === 'input' && q.answer).toBe(n[3] + (n[1] - n[0]));
    }));
  it('뺄셈 규칙', () =>
    each('g-pat-sub', (q) => {
      const n = nums(q.prompt.split('\n')[1]);
      expect(q.kind === 'input' && q.answer).toBe(n[3] - (n[0] - n[1]));
    }));
  it('차가 1씩 커지는 규칙', () =>
    each('g-pat-grow', (q) => {
      const n = nums(q.prompt.split('\n')[1]);
      const lastDiff = n[4] - n[3];
      expect(q.kind === 'input' && q.answer).toBe(n[4] + lastDiff + 1);
    }));
  it('2배 하고 1 더하는 규칙', () =>
    each('g-pat-twice1', (q) => {
      const n = nums(q.prompt.split('\n')[1]);
      expect(q.kind === 'input' && q.answer).toBe(n[4] * 2 + 1);
    }));
  it('m와 cm', () =>
    each('g-len-cm', (q) => {
      if (q.kind === 'input') {
        const [m, c] = nums(q.prompt);
        expect(q.answer).toBe(m * 100 + c);
      } else if (q.kind === 'choice') {
        const total = nums(q.prompt)[0];
        expect(q.options[q.answer]).toBe(`${Math.floor(total / 100)} m ${total % 100} cm`);
      }
    }));
  it('시간 → 분', () =>
    each('g-time-min', (q) => {
      const [h, m] = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(h * 60 + m);
    }));
  it('시각 더하기', () =>
    each('g-time-after', (q) => {
      if (q.kind !== 'choice') throw new Error();
      const mt = q.prompt.match(/지금 (\d+)시(?: (\d+)분)?(?:이에요|예요)\.\n(\d+)분 뒤/)!;
      const [h, m, add] = [Number(mt[1]), Number(mt[2] ?? 0), Number(mt[3])];
      const total = h * 60 + m + add;
      const eh = ((Math.floor(total / 60) - 1) % 12) + 1;
      const em = total % 60;
      expect(q.options[q.answer]).toBe(em === 0 ? `${eh}시` : `${eh}시 ${em}분`);
    }));
  it('가장 큰/작은 세 자리 수', () =>
    each('g-digits3', (q) => {
      const ds = nums(q.prompt.split('\n')[0]).filter((x) => x < 10);
      const big = q.prompt.includes('가장 큰');
      const sorted = [...ds].sort((a, b) => (big ? b - a : a - b));
      expect(q.kind === 'input' && q.answer).toBe(Number(sorted.join('')));
    }));
  it('가장 작은 네 자리 수 (0은 맨 앞에 올 수 없다)', () =>
    each('g-digits4z', (q) => {
      const ds = nums(q.prompt.split('\n')[0]);
      const best = Math.min(...perm(ds).filter((p) => p[0] !== 0).map((p) => Number(p.join(''))));
      expect(q.kind === 'input' && q.answer).toBe(best);
    }));
  it('가장 작은 다섯 자리 수', () =>
    each('g-big-digits', (q) => {
      const ds = nums(q.prompt.split('\n')[0]);
      const best = Math.min(...perm(ds).filter((p) => p[0] !== 0).map((p) => Number(p.join(''))));
      expect(q.kind === 'input' && q.answer).toBe(best);
    }));
  it('100 만들기, 1000 만들기', () => {
    each('g-comp100', (q) => expect(q.kind === 'input' && q.answer + nums(q.prompt)[0]).toBe(100));
    each('g-comp1000', (q) => expect(q.kind === 'input' && q.answer + nums(q.prompt)[0]).toBe(1000));
  });
  it('곱셈, 나눗셈, 나머지', () => {
    each('g-mul-groups', (q) => {
      const n = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(n[0] * n[1]);
    });
    each('g-mul-3x2', (q) => {
      const n = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(n[0] * n[1]);
    });
    each('g-div-share', (q) => {
      const n = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(n[0] / n[1]);
    });
    each('g-div-3d', (q) => {
      const n = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(n[0] / n[1]);
    });
    each('g-div-rem', (q) => {
      const [n, b] = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(q.prompt.includes('나머지') ? n % b : Math.floor(n / b));
    });
  });
  it('합과 차', () =>
    each('g-sumdiff', (q) => {
      const [S, D] = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(q.prompt.includes('큰 수') ? (S + D) / 2 : (S - D) / 2);
    }));
  it('악수와 리그전', () => {
    each('g-count-shake', (q) => {
      const n = nums(q.prompt)[0];
      expect(q.kind === 'input' && q.answer).toBe((n * (n - 1)) / 2);
    });
    each('g-count-league', (q) => {
      const n = nums(q.prompt)[0];
      expect(q.kind === 'input' && q.answer).toBe((n * (n - 1)) / 2);
    });
  });
  it('나무 심기', () =>
    each('g-count-trees', (q) => {
      const [len, d] = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(q.prompt.includes('둥근') ? len / d : len / d + 1);
    }));
  it('경우의 수', () => {
    each('g-count-outfit', (q) => {
      const [a, b] = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(a * b);
    });
    each('g-count-3way', (q) => {
      const [a, b, c] = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(a * b * c);
    });
  });
  it('분수', () => {
    each('g-fr-left', (q) => {
      const [N, a, b] = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(N - a - b);
    });
    each('g-fr-add', (q) => {
      const n = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(q.prompt.includes('+') ? n[0] + n[2] : n[0] - n[2]);
    });
    each('g-fr-one', (q) => {
      const [, p, qq] = nums(q.prompt.split('\n')[0]);
      expect(q.kind === 'input' && q.answer).toBe(qq - p);
    });
    each('g-fr-equal', (q) => {
      const first = q.prompt.split('\n')[0];
      const n = nums(first);
      if (first.includes('□/')) expect(q.kind === 'input' && q.answer).toBe((n[0] * n[2]) / n[1]); // p/q = □/r
      else expect(q.kind === 'input' && q.answer).toBe((n[1] * n[2]) / n[0]); // p/q = x/□
    });
    each('g-fr-unit', (q) => {
      if (q.kind !== 'choice') throw new Error();
      const ds = q.options.map((o) => Number(o.split('/')[1]));
      const big = q.prompt.includes('가장 큰');
      expect(Number(q.options[q.answer].split('/')[1])).toBe(big ? Math.min(...ds) : Math.max(...ds));
    });
  });
  it('큰 수', () => {
    each('g-big-compose', (q) => {
      const [a, b, c] = nums(q.prompt.replace(/,/g, '')).filter((x) => x < 10 || x === 10000 || x === 1000 || x === 100).filter((x) => x < 10);
      expect(q.kind === 'input' && q.answer).toBe(a * 10000 + b * 1000 + c * 100);
    });
    each('g-big-jump', (q) => {
      const [start, step, k] = nums(q.prompt.replace(/,/g, ''));
      expect(q.kind === 'input' && q.answer).toBe(start + step * k);
    });
  });
  it('각도', () => {
    each('g-ang-tri', (q) => {
      const [a, b] = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(180 - a - b);
    });
    each('g-ang-quad', (q) => {
      const [, a, b, c] = nums(q.prompt);
      expect(q.kind === 'input' && q.answer).toBe(360 - a - b - c);
    });
    each('g-ang-clock', (q) => {
      if (q.kind !== 'choice') throw new Error();
      expect(q.options[q.answer]).toBe(`${nums(q.prompt)[0] * 30}°`);
    });
  });
  it('저울 문제', () =>
    each('g-balance', (q) => {
      const [l0, l1] = q.prompt.split('\n');
      const a = nums(l0).find((_, i) => i === (/^\S+ 1개 = /.test(l0) ? 1 : 0))!;
      const b = nums(l1).find((_, i) => i === 1)!;
      // "X 1개 = Y a개" 이면 곱하기, "X a개 = Y 1개" 이면 나누기
      const expected = /^\S+ 1개 = /.test(l0) ? a * b : b / a;
      expect(q.kind === 'input' && q.answer).toBe(expected);
    }));
  it('계단 오르기', () =>
    each('g-count-stairs', (q) => {
      const n = nums(q.prompt)[2];
      const w = [0, 1, 2];
      for (let i = 3; i <= n; i++) w[i] = w[i - 1] + w[i - 2];
      expect(q.kind === 'input' && q.answer).toBe(w[n]);
    }));
});

function perm(xs: number[]): number[][] {
  return xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perm([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

describe('문제은행', () => {
  it('문제 틀이 80개 이상, 고유한 번호를 가진다', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(80);
    expect(new Set(TEMPLATES.map((t) => t.tpl)).size).toBe(TEMPLATES.length);
  });
  it('실제로 나오는 문제가 수천 가지다', () => {
    const rng = seeded(7);
    const ids = new Set<string>();
    for (let i = 0; i < 6000; i++) {
      ids.add(drawQuest({ maxGrade: 4, worldTopics: [], stats: {}, recentTpl: [], recentIds: [], rng }).id);
    }
    expect(ids.size).toBeGreaterThan(1500);
  });
  it('학년 제한을 지킨다', () => {
    const rng = seeded(3);
    for (let i = 0; i < 400; i++) {
      expect(drawQuest({ maxGrade: 2, worldTopics: [], stats: {}, recentTpl: [], recentIds: [], rng }).grade).toBe(2);
    }
  });
  it('최근에 나온 문제 틀은 거의 다시 나오지 않는다', () => {
    const rng = seeded(11);
    const recent = TEMPLATES.slice(0, 40).map((t) => t.tpl);
    let again = 0;
    for (let i = 0; i < 500; i++) {
      if (recent.includes(drawQuest({ maxGrade: 4, worldTopics: [], stats: {}, recentTpl: recent, recentIds: [], rng }).tpl!)) again++;
    }
    expect(again / 500).toBeLessThan(0.1);
  });
  it('난이도 목표에 맞는 문제를 더 자주 뽑는다', () => {
    const rng = seeded(5);
    const count = { 1: 0, 2: 0, 3: 0 };
    for (let i = 0; i < 1500; i++) {
      const q = drawQuest({ maxGrade: 4, worldTopics: [], diff: 1, stats: {}, recentTpl: [], recentIds: [], rng });
      count[q.diff!]++;
    }
    expect(count[1]).toBeGreaterThan(count[2]);
    expect(count[2]).toBeGreaterThan(count[3]);
  });
  it('월드와 어울리는 주제를 더 자주 뽑는다', () => {
    const rng = seeded(9);
    let angle = 0;
    for (let i = 0; i < 1500; i++) {
      if (drawQuest({ maxGrade: 4, worldTopics: ['angle'], stats: {}, recentTpl: [], recentIds: [], rng }).topic === 'angle') angle++;
    }
    const base = TEMPLATES.filter((t) => t.topic === 'angle').length / TEMPLATES.length;
    expect(angle / 1500).toBeGreaterThan(base * 1.5);
  });
  it('틀린 주제를 더 자주 뽑는다', () => {
    const rng = seeded(13);
    let n = 0;
    for (let i = 0; i < 1500; i++) {
      const q = drawQuest({ maxGrade: 4, worldTopics: [], stats: { fraction: { seen: 10, correct: 2, hints: 0 } }, recentTpl: [], recentIds: [], rng });
      if (q.topic === 'fraction') n++;
    }
    const base = TEMPLATES.filter((t) => t.topic === 'fraction').length / TEMPLATES.length;
    expect(n / 1500).toBeGreaterThan(base * 1.5);
  });
  it('손으로 쓴 문제도 틀에 포함되고 난이도가 붙는다', () => {
    expect(STATIC_TEMPLATES.length).toBeGreaterThanOrEqual(40);
    for (const t of STATIC_TEMPLATES) expect([1, 2, 3]).toContain(t.diff);
  });
  it('학년별·주제별로 골고루 있다', () => {
    for (const g of [2, 3, 4] as const) expect(TEMPLATES.filter((t) => t.grade === g).length).toBeGreaterThan(15);
    const topics = new Set(TEMPLATES.map((t) => t.topic));
    expect(topics.size).toBeGreaterThanOrEqual(11);
  });
});
