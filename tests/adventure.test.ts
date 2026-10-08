import { describe, expect, it } from 'vitest';
import { goalLines, isCleared, MAX_STARS, STAGES_PER_WORLD, stagesFor, starsFor, type Progress } from '../src/content/adventure';
import { WORLDS } from '../src/content/worlds';

const p = (o: Partial<Progress> = {}): Progress => ({ maxTier: -1, quests: 0, noHintQuests: 0, drops: 0, ...o });

describe('스테이지 구성', () => {
  for (const w of WORLDS) {
    it(`${w.name}: 스테이지 ${STAGES_PER_WORLD}개, 목표 단계는 사다리 안에 있다`, () => {
      const stages = stagesFor(w);
      expect(stages).toHaveLength(STAGES_PER_WORLD);
      expect(new Set(stages.map((s) => s.id)).size).toBe(STAGES_PER_WORLD);
      for (const s of stages) {
        if (s.goal.tier !== undefined) {
          expect(s.goal.tier).toBeGreaterThanOrEqual(0);
          expect(s.goal.tier).toBeLessThan(w.ladder.length);
        }
        expect(s.par).toBeGreaterThan(0);
        expect(s.pace[0]).toBeLessThanOrEqual(s.pace[1]);
        expect(Object.keys(s.goal).length).toBeGreaterThan(0);
      }
    });
    it(`${w.name}: 목표 단계가 뒤로 갈수록 같거나 높다`, () => {
      const tiers = stagesFor(w).flatMap((s) => (s.goal.tier === undefined ? [] : [s.goal.tier]));
      expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    });
  }
  it('힌트 단계는 쉬움 → 보통 → 어려움 순으로 올라간다', () => {
    const order = { easy: 0, normal: 1, hard: 2 };
    const hints = stagesFor(WORLDS[0]).map((s) => order[s.hint]);
    expect([...hints].sort()).toEqual(hints);
  });
  it('최대 별 개수', () => expect(MAX_STARS).toBe(15));
});

describe('클리어와 별', () => {
  const [s1, s2, , s4, s5] = stagesFor(WORLDS[0]);
  it('단계 목표', () => {
    expect(isCleared(s1.goal, p({ maxTier: 3 }))).toBe(false);
    expect(isCleared(s1.goal, p({ maxTier: 4 }))).toBe(true);
  });
  it('퀘스트 목표는 힌트를 써도 센다, 힌트 없이 목표는 따로 센다', () => {
    expect(isCleared(s2.goal, p({ quests: 2 }))).toBe(true);
    expect(isCleared(s4.goal, p({ quests: 3 }))).toBe(false);
    expect(isCleared(s4.goal, p({ quests: 3, noHintQuests: 3 }))).toBe(true);
  });
  it('보스는 단계와 퀘스트를 모두 이뤄야 한다', () => {
    expect(isCleared(s5.goal, p({ maxTier: 7 }))).toBe(false);
    expect(isCleared(s5.goal, p({ maxTier: 7, quests: 2 }))).toBe(true);
  });
  it('별: 깨면 1, 힌트 없이 퀘스트를 맞히면 2, 과일도 적게 쓰면 3', () => {
    expect(starsFor(s1, p({ drops: 5 }))).toBe(1);
    expect(starsFor(s1, p({ noHintQuests: 1, drops: s1.par + 1 }))).toBe(2);
    expect(starsFor(s1, p({ noHintQuests: 1, drops: s1.par }))).toBe(3);
  });
  it('목표 문구', () => {
    const w = WORLDS[0];
    expect(goalLines(w, s1.goal).map((l) => l.text)).toEqual(['32 만들기']);
    expect(goalLines(w, s5.goal, p({ quests: 1 })).map((l) => l.text)).toEqual(['256 만들기', '퀘스트 1/2']);
  });
});
