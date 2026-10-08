export type HintLevel = 'easy' | 'normal' | 'hard';
export type PowerUp = 'hint' | 'bomb' | 'shake' | 'undo';

export interface TopicStat {
  seen: number;
  correct: number;
  hints: number;
}

export interface Save {
  /** 월드별 최고 점수 */
  bests: Record<string, number>;
  /** 마지막으로 고른 월드 */
  world: string;
  powerups: Record<PowerUp, number>;
  settings: { hint: HintLevel; maxGrade: 2 | 3 | 4 };
  stats: Record<string, TopicStat>;
}

const KEY = 'math-suika-game.v1';

export const defaultSave = (): Save => ({
  bests: {},
  world: 'double-forest',
  powerups: { hint: 2, bomb: 1, shake: 1, undo: 1 },
  settings: { hint: 'normal', maxGrade: 3 },
  stats: {},
});

export function loadSave(): Save {
  const base = defaultSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const data = JSON.parse(raw) as Partial<Save> & { best?: number };
    return {
      // 예전 저장(월드가 하나일 때)의 최고 점수는 더블 숲으로 옮긴다
      bests: data.bests ?? (data.best ? { 'double-forest': data.best } : {}),
      world: data.world ?? base.world,
      powerups: { ...base.powerups, ...data.powerups },
      settings: { ...base.settings, ...data.settings },
      stats: data.stats ?? {},
    };
  } catch {
    return base;
  }
}

export function writeSave(save: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* 저장소를 못 써도 게임은 계속된다 */
  }
}
