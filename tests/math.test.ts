import { describe, expect, it } from 'vitest';
import { evalText, evaluate } from '../src/math/evaluate';
import { makeExpr } from '../src/math/expr';
import { DOUBLE_FOREST } from '../src/content/worlds';

describe('evaluate', () => {
  it('곱셈을 먼저 계산한다', () => {
    expect(evalText('3×4+5')).toBe(17);
    expect(evalText('1+2×3')).toBe(7);
    expect(evalText('20−8')).toBe(12);
  });
  it('왼쪽부터 덧셈, 뺄셈', () => {
    expect(evalText('10−3+2')).toBe(9);
  });
  it('잘못된 식은 null', () => {
    expect(evalText('3+')).toBeNull();
    expect(evalText('+3')).toBeNull();
    expect(evaluate([3, 4])).toBeNull();
    expect(evalText('3&4')).toBeNull();
  });
});

describe('makeExpr', () => {
  it('만든 식의 값은 항상 목표 값과 같다', () => {
    for (const level of [1, 2, 3] as const) {
      for (const value of DOUBLE_FOREST.ladder) {
        for (let i = 0; i < 300; i++) {
          const text = makeExpr(value, { level, plain: 0.1 });
          expect(evalText(text), `${text} should be ${value}`).toBe(value);
        }
      }
    }
  });
  it('plain=1이면 숫자만', () => {
    expect(makeExpr(16, { level: 1, plain: 1 })).toBe('16');
  });
  it('식이 여러 모양으로 나온다', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(makeExpr(12, { level: 2, plain: 0 }));
    expect(seen.size).toBeGreaterThan(5);
  });
});
