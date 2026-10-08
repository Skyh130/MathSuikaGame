import { emptyBox, type WrongBox } from './wrongbox';

export type HintLevel = 'easy' | 'normal' | 'hard';
export type PowerUp = 'hint' | 'bomb' | 'shake' | 'undo';

import type { Topic } from '../content/quests';

export interface TopicStat {
  seen: number;
  /** 결국 맞힌 문제 (힌트를 써도 포함) */
  correct: number;
  /** 쓴 힌트 수 */
  hints: number;
  /** 힌트 없이 한 번에 맞힌 문제 (예전 저장에는 없을 수 있다) */
  clean?: number;
  /** 한 번이라도 틀린 문제 (예전 저장에는 없을 수 있다) */
  mistakes?: number;
}

/** 하루 기록 */
export interface DayLog {
  /** 놀이 시간 (ms) */
  ms: number;
  /** 푼 퀘스트 수 */
  quests: number;
  /** 그중 힌트 없이 한 번에 맞힌 수 */
  clean: number;
  /** 부모가 늘려 준 시간 (분) */
  extra: number;
}

/** 최근 퀘스트 기록 (0: 한 번에, 1: 힌트 썼거나 건너뜀, 2: 틀림) */
export interface RecentEntry {
  d: string;
  t: Topic;
  r: 0 | 1 | 2;
}

export interface Save {
  /** 월드별 최고 점수 */
  bests: Record<string, number>;
  /** 마지막으로 고른 월드 */
  world: string;
  /** 모험 모드 스테이지별 최고 별 (id: `${월드}:${번호}`) */
  adventure: Record<string, number>;
  powerups: Record<PowerUp, number>;
  settings: Settings;
  stats: Record<string, TopicStat>;
  /** 오답 상자 */
  wrong: WrongBox;
  /** 날짜별 기록 (YYYY-MM-DD) */
  days: Record<string, DayLog>;
  recent: RecentEntry[];
}

export interface Settings {
  hint: HintLevel;
  maxGrade: 2 | 3 | 4;
  /** 하루 놀이 시간 제한 (분). 0이면 제한 없음 */
  dailyLimitMin: number;
  /** 부모 확인 PIN (`솔트:해시`). 빈 문자열이면 PIN 없음 */
  pinHash: string;
}

const KEY = 'math-suika-game.v1';

export const defaultSave = (): Save => ({
  bests: {},
  world: 'double-forest',
  adventure: {},
  powerups: { hint: 2, bomb: 1, shake: 1, undo: 1 },
  settings: { hint: 'normal', maxGrade: 3, dailyLimitMin: 0, pinHash: '' },
  stats: {},
  wrong: emptyBox(),
  days: {},
  recent: [],
});

/** 저장된(또는 가져온) 데이터에 빠진 항목을 기본값으로 채운다 */
/** 저장된 데이터의 모양 (예전 버전이라 항목이 빠져 있을 수 있다) */
export type LooseSave = Partial<Omit<Save, 'settings'>> & { settings?: Partial<Settings>; best?: number };

export function normalize(data: LooseSave): Save {
  const base = defaultSave();
  return {
    // 예전 저장(월드가 하나일 때)의 최고 점수는 더블 숲으로 옮긴다
    bests: data.bests ?? (data.best ? { 'double-forest': data.best } : {}),
    world: data.world ?? base.world,
    adventure: data.adventure ?? {},
    powerups: { ...base.powerups, ...data.powerups },
    settings: { ...base.settings, ...data.settings },
    stats: data.stats ?? {},
    wrong: { ...base.wrong, ...data.wrong },
    days: data.days ?? {},
    recent: Array.isArray(data.recent) ? data.recent : [],
  };
}

export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function writeSave(save: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* 저장소를 못 써도 게임은 계속된다 */
  }
}

/** 저장 데이터를 모두 지운다 (부모 화면의 초기화) */
export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
