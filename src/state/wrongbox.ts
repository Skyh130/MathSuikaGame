/**
 * 오답 상자: 틀린 문제를 숫자까지 그대로 저장해 두었다가 간격을 두고 다시 낸다.
 * 연속으로 세 번(간격을 두고) 깔끔하게 맞히면 "졸업"하고 상자에서 빠진다.
 *
 * 간격은 시간이 아니라 "퀘스트가 나온 횟수"로 센다 (아이가 쉬엄쉬엄 해도 잘 돌아가도록).
 */
import type { Quest, Topic } from '../content/quests';

export interface WrongItem {
  id: string;
  /** 틀린 문제 그대로 (생성기 문제도 같은 숫자로 다시 나온다) */
  quest: Quest;
  /** 연속으로 깔끔하게 맞힌 횟수 (0~2) */
  level: number;
  /** 지금까지 틀린 횟수 */
  wrongs: number;
  /** 이 횟수(draws)가 되면 다시 낸다 */
  due: number;
  /** 상자에 넣은 때 (draws) — 오래된 것부터 복습 */
  added: number;
}

export interface WrongBox {
  items: WrongItem[];
  graduated: number;
  /** 지금까지 나온 퀘스트 수 */
  draws: number;
}

/** 복습 간격 (레벨 0, 1, 2) */
export const GAPS = [2, 5, 10];
export const GRADUATE_LEVEL = 3;

export const emptyBox = (): WrongBox => ({ items: [], graduated: 0, draws: 0 });

export interface Outcome {
  solved: boolean;
  hintsUsed: number;
  /** 틀린 횟수 */
  wrong: number;
}

export type Change = 'added' | 'again' | 'up' | 'graduated' | 'kept' | 'none';

/** 퀘스트 결과를 상자에 반영한다 */
export function record(box: WrongBox, quest: Quest, res: Outcome): Change {
  box.draws++;
  const item = box.items.find((i) => i.id === quest.id);

  if (res.wrong > 0) {
    if (item) {
      item.level = 0;
      item.wrongs++;
      item.due = box.draws + GAPS[0];
      return 'again';
    }
    box.items.push({ id: quest.id, quest, level: 0, wrongs: 1, due: box.draws + GAPS[0], added: box.draws });
    return 'added';
  }
  if (!item) return 'none';

  if (res.solved && res.hintsUsed === 0) {
    item.level++;
    if (item.level >= GRADUATE_LEVEL) {
      box.items = box.items.filter((i) => i !== item);
      box.graduated++;
      return 'graduated';
    }
    item.due = box.draws + GAPS[item.level];
    return 'up';
  }
  // 힌트를 썼거나 건너뛰었다: 레벨은 그대로, 조금 뒤에 다시
  item.due = box.draws + GAPS[item.level];
  return 'kept';
}

const byPriority = (a: WrongItem, b: WrongItem) => a.level - b.level || a.added - b.added;

export const dueItems = (box: WrongBox): WrongItem[] => box.items.filter((i) => i.due <= box.draws).sort(byPriority);

/** 게임 중 퀘스트로 낼 오답 하나 (없으면 null) */
export function pickDue(box: WrongBox, recentIds: readonly string[] = []): WrongItem | null {
  return dueItems(box).find((i) => !recentIds.includes(i.id)) ?? null;
}

/** 복습 세션에 낼 문제들: 때가 된 것부터, 그다음 레벨이 낮고 오래된 것 */
export function reviewBatch(box: WrongBox, n: number): WrongItem[] {
  const due = dueItems(box);
  const rest = box.items.filter((i) => !due.includes(i)).sort(byPriority);
  return [...due, ...rest].slice(0, n);
}

export function topicCounts(box: WrongBox): Array<[Topic, number]> {
  const m = new Map<Topic, number>();
  for (const i of box.items) m.set(i.quest.topic, (m.get(i.quest.topic) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}
