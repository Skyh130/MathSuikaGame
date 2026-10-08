import type { HintLevel } from '../state/storage';
import type { WorldDef } from './worlds';

/** 스테이지 목표. 적힌 것을 모두 이루면 클리어. */
export interface Goal {
  /** 이 단계의 과일 만들기 */
  tier?: number;
  /** 퀘스트를 맞힌 개수 (힌트를 써도 됨) */
  quests?: number;
  /** 힌트 없이 맞힌 퀘스트 개수 */
  noHintQuests?: number;
}

export interface Stage {
  id: string;
  index: number;
  name: string;
  /** 모험 모드에서는 스테이지가 힌트 단계를 정한다 (뒤로 갈수록 어려워짐) */
  hint: HintLevel;
  goal: Goal;
  /** 이 개수 이하의 과일로 깨면 ⭐3 */
  par: number;
  /** 합체 몇 번마다 퀘스트가 나올지 [최소, 최대] */
  pace: [number, number];
}

export interface Progress {
  maxTier: number;
  quests: number;
  noHintQuests: number;
  drops: number;
}

export const STAGES_PER_WORLD = 5;
export const MAX_STARS = STAGES_PER_WORLD * 3;

/** 떨어뜨린 과일 하나가 평균 몇 칸(가장 작은 과일 기준)인지 — 목표 개수를 어림하는 데 쓴다 */
const AVG_UNITS = 2.7;

const tierPar = (t: number) => Math.ceil(((2 ** t / AVG_UNITS) * 3) / 2) + 3;
const questPar = (n: number) => n * 8 + 8;

export function stagesFor(world: WorldDef): Stage[] {
  const top = world.ladder.length - 1;
  const T = (t: number) => Math.min(top, t);
  const defs: Array<Omit<Stage, 'id' | 'index' | 'par'> & { par?: number }> = [
    { name: '첫걸음', hint: 'easy', goal: { tier: T(4) }, pace: [5, 8] },
    { name: '생각 주머니', hint: 'easy', goal: { quests: 2 }, pace: [3, 5], par: questPar(2) },
    { name: '쑥쑥 자라는 과일', hint: 'normal', goal: { tier: T(5) }, pace: [5, 8] },
    { name: '생각왕', hint: 'normal', goal: { noHintQuests: 3 }, pace: [3, 5], par: questPar(3) },
    { name: '보스 과일', hint: 'hard', goal: { tier: T(7), quests: 2 }, pace: [4, 6] },
  ];
  return defs.map((d, index) => ({
    ...d,
    id: `${world.id}:${index}`,
    index,
    par: d.par ?? tierPar(d.goal.tier ?? 0),
  }));
}

export function isCleared(goal: Goal, p: Progress): boolean {
  return (
    (goal.tier === undefined || p.maxTier >= goal.tier) &&
    (goal.quests === undefined || p.quests >= goal.quests) &&
    (goal.noHintQuests === undefined || p.noHintQuests >= goal.noHintQuests)
  );
}

/** 클리어했을 때의 별: ⭐1 깼다 · ⭐2 힌트 없이 퀘스트를 맞혔다 · ⭐3 그러면서 과일 수도 적게 썼다 */
export function starsFor(stage: Stage, p: Progress): 1 | 2 | 3 {
  if (p.noHintQuests < 1) return 1;
  return p.drops <= stage.par ? 3 : 2;
}

export interface GoalLine {
  key: string;
  icon: string;
  text: string;
  done: boolean;
}

/** 목표를 한 줄씩 보여줄 문구. progress 가 있으면 진행 상황을 함께 적는다. */
export function goalLines(world: WorldDef, goal: Goal, p?: Progress): GoalLine[] {
  const lines: GoalLine[] = [];
  if (goal.tier !== undefined) {
    lines.push({
      key: 'tier',
      icon: '🎯',
      text: `${world.format(world.ladder[goal.tier])} 만들기`,
      done: !!p && p.maxTier >= goal.tier,
    });
  }
  if (goal.quests !== undefined) {
    lines.push({
      key: 'quests',
      icon: '🎁',
      text: p ? `퀘스트 ${Math.min(p.quests, goal.quests)}/${goal.quests}` : `퀘스트 ${goal.quests}개 맞히기`,
      done: !!p && p.quests >= goal.quests,
    });
  }
  if (goal.noHintQuests !== undefined) {
    lines.push({
      key: 'nohint',
      icon: '💡',
      text: p
        ? `힌트 없이 ${Math.min(p.noHintQuests, goal.noHintQuests)}/${goal.noHintQuests}`
        : `힌트 없이 퀘스트 ${goal.noHintQuests}개 맞히기`,
      done: !!p && p.noHintQuests >= goal.noHintQuests,
    });
  }
  return lines;
}
