import { describe, expect, it } from 'vitest';
import { QUESTS, TOPIC_NAMES, type BuildQuest } from '../src/content/quests';
import { WORLDS } from '../src/content/worlds';
import { evaluate, type Token } from '../src/math/evaluate';

/** 카드를 모두 한 번씩 써서 목표 값을 만들 수 있는지 모든 순서와 연산자로 확인 */
function solvable(q: BuildQuest): boolean {
  const ops = ['+', '−', '×'] as const;
  const perms = (xs: number[]): number[][] =>
    xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
  for (const order of perms(q.cards)) {
    const combos = ops.length ** (order.length - 1);
    for (let k = 0; k < combos; k++) {
      const tokens: Token[] = [order[0]];
      let c = k;
      for (let i = 1; i < order.length; i++) {
        tokens.push(ops[c % ops.length], order[i]);
        c = Math.floor(c / ops.length);
      }
      if (evaluate(tokens) === q.target) return true;
    }
  }
  return false;
}

describe('퀘스트 문제 은행', () => {
  it('id가 겹치지 않는다', () => {
    const ids = QUESTS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('힌트 3개와 해설이 모두 있다', () => {
    for (const q of QUESTS) {
      expect(q.hints.every((h) => h.length > 0), q.id).toBe(true);
      expect(q.explanation.length, q.id).toBeGreaterThan(0);
      expect(TOPIC_NAMES[q.topic], q.id).toBeTruthy();
    }
  });
  it('객관식 정답 번호가 보기 안에 있다', () => {
    for (const q of QUESTS) if (q.kind === 'choice') expect(q.answer, q.id).toBeLessThan(q.options.length);
  });
  it('식 만들기 문제는 실제로 풀 수 있다', () => {
    for (const q of QUESTS) if (q.kind === 'build') expect(solvable(q), q.id).toBe(true);
  });
  it('모든 월드에 어울리는 퀘스트가 3개 이상 있다', () => {
    for (const w of WORLDS) {
      const n = QUESTS.filter((q) => w.topics.includes(q.topic)).length;
      expect(n, w.id).toBeGreaterThanOrEqual(3);
    }
  });
  it('학년별로 문제가 있다', () => {
    for (const g of [2, 3, 4] as const) expect(QUESTS.filter((q) => q.grade === g).length).toBeGreaterThan(5);
  });
});
