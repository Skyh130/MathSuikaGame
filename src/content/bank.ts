/**
 * 문제은행: 손으로 쓴 고정 문제(quests.ts)와 숫자가 바뀌는 문제 생성기(generators.ts)를
 * 하나의 "문제 틀" 목록으로 묶고, 월드·학년·난이도·약한 단원에 맞춰 랜덤으로 뽑는다.
 * 스테이지마다 문제가 정해져 있지 않다.
 */
import { GENERATORS, type Rng, type Template } from './generators';
import { QUESTS, type Difficulty, type Quest, type Topic } from './quests';
import type { TopicStat } from '../state/storage';

const gradeDiff = (g: 2 | 3 | 4): Difficulty => (g - 1) as Difficulty;

/** 손으로 쓴 문제: 학년으로 난이도를 정한다 (2학년 → 1, 3학년 → 2, 4학년 → 3) */
export const STATIC_TEMPLATES: Template[] = QUESTS.map((q) => {
  const diff = q.diff ?? gradeDiff(q.grade);
  return { tpl: q.id, grade: q.grade, topic: q.topic, diff, make: () => ({ ...q, tpl: q.id, diff }) };
});

export const TEMPLATES: Template[] = [...STATIC_TEMPLATES, ...GENERATORS];

export interface DrawOptions {
  maxGrade: 2 | 3 | 4;
  /** 지금 월드와 어울리는 주제 (3배 더 자주) */
  worldTopics: Topic[];
  /** 목표 난이도. 없으면 난이도를 따지지 않는다 */
  diff?: Difficulty;
  stats: Record<string, TopicStat>;
  /** 최근에 나온 문제 틀 (연달아 나오지 않게) */
  recentTpl: readonly string[];
  /** 최근에 나온 문제 (같은 숫자가 다시 나오지 않게) */
  recentIds: readonly string[];
  rng?: Rng;
}

const DIFF_WEIGHT = [1, 0.45, 0.15];

export function templateWeight(t: Template, o: DrawOptions): number {
  const st = o.stats[t.topic];
  const topic = o.worldTopics.includes(t.topic) ? 3 : 1;
  // 안 풀어 본 주제와 틀렸던 주제를 더 자주
  const need = st ? 1 + Math.max(0, st.seen - st.correct) * 1.5 + (st.hints > st.seen ? 0.5 : 0) : 2;
  const diff = o.diff ? DIFF_WEIGHT[Math.abs(o.diff - t.diff)] : 1;
  const recent = o.recentTpl.includes(t.tpl) ? 0.04 : 1;
  return topic * need * diff * recent;
}

export function drawQuest(o: DrawOptions): Quest {
  const rng = o.rng ?? Math.random;
  const pool = TEMPLATES.filter((t) => t.grade <= o.maxGrade);
  const weights = pool.map((t) => templateWeight(t, o));
  const total = weights.reduce((a, b) => a + b, 0);
  let quest: Quest | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    let x = rng() * total;
    let chosen = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      if ((x -= weights[i]) <= 0) {
        chosen = pool[i];
        break;
      }
    }
    quest = chosen.make(rng);
    if (!o.recentIds.includes(quest.id)) break;
  }
  return quest!;
}
