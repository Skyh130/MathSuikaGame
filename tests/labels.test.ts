import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/content/worlds';
import { evaluate, type Token } from '../src/math/evaluate';
import { fmtKorean, fmtLength, fmtTime } from '../src/math/labels';

/** 월드별 식 문자열을 가장 작은 단위의 정수로 되돌려 계산한다 (표기 오류를 잡기 위해 생성기와 따로 구현). */
const operand: Record<string, (s: string) => number | null> = {
  'double-forest': (s) => (/^\d+$/.test(s) ? Number(s) : null),
  'length-village': (s) => {
    const m = s.match(/^(?:(\d+)m)?(?: ?(\d+)cm)?$/);
    return m && (m[1] || m[2]) ? Number(m[1] ?? 0) * 100 + Number(m[2] ?? 0) : null;
  },
  'clock-tower': (s) => {
    const m = s.match(/^(?:(\d+)시간)?(?: ?(\d+)분)?$/);
    return m && (m[1] || m[2]) ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : null;
  },
  'angle-castle': (s) => (/^\d+°$/.test(s) ? parseInt(s) : null),
  'big-number-mountain': (s) => {
    if (/^[\d,]+$/.test(s)) return Number(s.replace(/,/g, ''));
    const m = s.match(/^(?:(\d+)만)?(?: ?(\d+)천)?(?: ?(\d+)백)?(?: ?(\d+))?$/);
    return m ? Number(m[1] ?? 0) * 10000 + Number(m[2] ?? 0) * 1000 + Number(m[3] ?? 0) * 100 + Number(m[4] ?? 0) : null;
  },
  'fraction-pond': (s) => {
    const fr = s.match(/^(\d+)\/(\d+)$/);
    if (fr) return (Number(fr[1]) * 16) / Number(fr[2]);
    return /^\d+(\.\d+)?$/.test(s) ? Number(s) * 16 : null;
  },
};

/** 연산자(+ − ×) 기준으로 나눠 계산. 피연산자 안의 공백("1m 20cm")은 그대로 둔다. */
function evalLabel(worldId: string, text: string): number | null {
  const parts = text.split(/([+−×])/);
  const tokens: Token[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === '+' || p === '−' || p === '×') tokens.push(p);
    else if (parts[i + 1] === '×') {
      // "2×5°" 의 2 는 단위가 없는 곱하는 수
      if (!/^\d+$/.test(p.trim())) return null;
      tokens.push(Number(p));
    } else {
      const n = operand[worldId](p.trim());
      if (n === null) return null;
      tokens.push(n);
    }
  }
  return evaluate(tokens);
}

describe('월드별 식 생성기', () => {
  for (const w of WORLDS) {
    it(`${w.name}: 만든 식의 값은 항상 과일의 값과 같다`, () => {
      for (const level of [1, 2, 3] as const) {
        for (const value of w.ladder) {
          for (let i = 0; i < 250; i++) {
            const text = w.label(value, { level, plain: 0.1 });
            expect(evalLabel(w.id, text), `[${w.id}] "${text}" should be ${value}`).toBe(value);
          }
        }
      }
    });
    it(`${w.name}: 단계마다 식이 여러 모양으로 나온다`, () => {
      const mid = w.ladder[Math.min(4, w.ladder.length - 1)];
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) seen.add(w.label(mid, { level: 2, plain: 0 }));
      expect(seen.size).toBeGreaterThan(3);
    });
    it(`${w.name}: 설정이 올바르다`, () => {
      expect(w.radii).toHaveLength(w.ladder.length);
      expect(w.sprites).toHaveLength(w.ladder.length);
      expect(w.sprites.at(-1)).toBe(9);
      expect(w.ladder.every((v, i) => i === 0 || v === w.ladder[i - 1] * 2)).toBe(true);
    });
  }
});

describe('표기', () => {
  it('길이', () => {
    expect([fmtLength(5), fmtLength(100), fmtLength(120), fmtLength(1280)]).toEqual(['5cm', '1m', '1m 20cm', '12m 80cm']);
  });
  it('시간', () => {
    expect([fmtTime(15), fmtTime(60), fmtTime(90)]).toEqual(['15분', '1시간', '1시간 30분']);
  });
  it('큰 수', () => {
    expect([fmtKorean(500), fmtKorean(16000), fmtKorean(128000)]).toEqual(['5백', '1만 6천', '12만 8천']);
  });
});
