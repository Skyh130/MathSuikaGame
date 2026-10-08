import { describe, expect, it } from 'vitest';
import { defaultSave, normalize, type Save } from '../src/state/storage';
import { isValidPin, makePinHash, verifyPin } from '../src/state/pin';
import {
  addPlay, classify, dayKey, exportJson, grantExtra, KEEP_DAYS, limitState, logQuest, MAX_RECENT,
  overall, parseImport, recommendations, topicRows, weekSummary, worldsFor,
} from '../src/state/report';
import { record } from '../src/state/wrongbox';
import type { Quest } from '../src/content/quests';

const NOW = new Date(2026, 9, 8, 15, 0, 0); // 2026-10-08 (목)
const daysAgo = (n: number) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n, 12);
const clean = { solved: true, hintsUsed: 0, wrong: 0 };
const hinted = { solved: true, hintsUsed: 2, wrong: 0 };
const wrong = { solved: true, hintsUsed: 0, wrong: 1 };
const skipped = { solved: false, hintsUsed: 0, wrong: 0 };

function withStats(rows: Array<[string, number, number]>): Save {
  const s = defaultSave();
  for (const [topic, seen, cleanN] of rows) s.stats[topic] = { seen, correct: seen, hints: 0, clean: cleanN };
  return s;
}

describe('기록하기', () => {
  it('날짜 키', () => expect(dayKey(NOW)).toBe('2026-10-08'));
  it('놀이 시간이 하루에 쌓인다', () => {
    const s = defaultSave();
    addPlay(s, 1000, NOW);
    addPlay(s, 2500, NOW);
    expect(s.days['2026-10-08'].ms).toBe(3500);
  });
  it('결과 분류', () => {
    expect(classify(clean)).toBe(0);
    expect(classify(hinted)).toBe(1);
    expect(classify(skipped)).toBe(1);
    expect(classify(wrong)).toBe(2);
  });
  it('퀘스트를 풀면 주제 통계, 하루 기록, 최근 기록이 함께 쌓인다', () => {
    const s = defaultSave();
    logQuest(s, 'fraction', clean, NOW);
    logQuest(s, 'fraction', hinted, NOW);
    logQuest(s, 'fraction', wrong, NOW);
    expect(s.stats.fraction).toEqual({ seen: 3, correct: 3, hints: 2, clean: 1, mistakes: 1 });
    expect(s.days['2026-10-08']).toMatchObject({ quests: 3, clean: 1 });
    expect(s.recent.map((r) => r.r)).toEqual([0, 1, 2]);
  });
  it('최근 기록은 200개까지만 남긴다', () => {
    const s = defaultSave();
    for (let i = 0; i < MAX_RECENT + 30; i++) logQuest(s, 'angle', clean, NOW);
    expect(s.recent).toHaveLength(MAX_RECENT);
  });
  it('오래된 날짜 기록은 지운다', () => {
    const s = defaultSave();
    addPlay(s, 1000, daysAgo(KEEP_DAYS + 5));
    addPlay(s, 1000, daysAgo(3));
    logQuest(s, 'angle', clean, NOW);
    expect(Object.keys(s.days)).toHaveLength(2);
  });
  it('예전 저장(clean 없음)도 읽는다', () => {
    const s = normalize({ stats: { angle: { seen: 4, correct: 3, hints: 1 } } });
    const row = topicRows(s)[0];
    expect(row.clean).toBe(3);
    expect(row.rate).toBeCloseTo(0.75);
  });
});

describe('하루 시간 제한', () => {
  it('제한이 없으면 막지 않는다', () => {
    const s = defaultSave();
    addPlay(s, 10 * 3600_000, NOW);
    expect(limitState(s, NOW)).toMatchObject({ enabled: false, over: false });
  });
  it('남은 시간과 초과를 계산한다', () => {
    const s = defaultSave();
    s.settings.dailyLimitMin = 30;
    addPlay(s, 29 * 60_000, NOW);
    expect(limitState(s, NOW)).toMatchObject({ enabled: true, over: false, remainingMs: 60_000 });
    addPlay(s, 60_000, NOW);
    expect(limitState(s, NOW).over).toBe(true);
  });
  it('다른 날의 사용 시간은 세지 않는다', () => {
    const s = defaultSave();
    s.settings.dailyLimitMin = 30;
    addPlay(s, 60 * 60_000, daysAgo(1));
    expect(limitState(s, NOW)).toMatchObject({ usedMs: 0, over: false });
  });
  it('부모가 시간을 늘려 주면 다시 놀 수 있다', () => {
    const s = defaultSave();
    s.settings.dailyLimitMin = 30;
    addPlay(s, 30 * 60_000, NOW);
    expect(limitState(s, NOW).over).toBe(true);
    grantExtra(s, NOW);
    expect(limitState(s, NOW)).toMatchObject({ over: false, remainingMs: 15 * 60_000 });
  });
});

describe('주간 요약', () => {
  it('오늘을 포함한 7일, 오늘이 마지막', () => {
    const w = weekSummary(defaultSave(), NOW);
    expect(w.days).toHaveLength(7);
    expect(w.days[6]).toMatchObject({ key: '2026-10-08', isToday: true, dow: 4 });
    expect(w.days[0].key).toBe('2026-10-02');
  });
  it('시간·문제 수·놀이한 날을 합친다', () => {
    const s = defaultSave();
    addPlay(s, 10 * 60_000, NOW);
    addPlay(s, 20 * 60_000, daysAgo(2));
    addPlay(s, 5 * 60_000, daysAgo(30)); // 이번 주가 아님
    logQuest(s, 'angle', clean, NOW);
    logQuest(s, 'angle', wrong, daysAgo(2));
    const w = weekSummary(s, NOW);
    expect(w.totalMinutes).toBe(30);
    expect(w.activeDays).toBe(2);
    expect(w.quests).toBe(2);
    expect(w.clean).toBe(1);
  });
});

describe('단원별 현황', () => {
  it('3문제 미만은 "아직 조금", 기준에 따라 잘해요/보통/연습', () => {
    const rows = topicRows(withStats([['angle', 2, 2], ['fraction', 10, 9], ['pattern', 10, 6], ['counting', 10, 2]]));
    const by = Object.fromEntries(rows.map((r) => [r.topic, r.level]));
    expect(by).toEqual({ angle: 'new', fraction: 'good', pattern: 'ok', counting: 'weak' });
  });
  it('연습이 필요한 단원이 위에 온다', () => {
    const rows = topicRows(withStats([['fraction', 10, 9], ['counting', 10, 2], ['pattern', 10, 6]]));
    expect(rows.map((r) => r.topic)).toEqual(['counting', 'pattern', 'fraction']);
  });
  it('안 푼 단원은 나오지 않는다', () => expect(topicRows(defaultSave())).toEqual([]));
  it('전체 비율', () => {
    const o = overall(withStats([['fraction', 10, 9], ['counting', 10, 1]]));
    expect(o).toMatchObject({ seen: 20, clean: 10 });
    expect(o.rate).toBeCloseTo(0.5);
  });
});

describe('제안', () => {
  it('약한 단원은 어울리는 월드와 함께 알려준다', () => {
    const r = recommendations(withStats([['fraction', 10, 2]]), NOW);
    expect(r[0]).toContain('분수');
    expect(r[0]).toContain('분수 연못');
  });
  it('오답 상자가 쌓이면 복습을 권한다', () => {
    const s = defaultSave();
    for (let i = 0; i < 5; i++) {
      const q = { id: `q${i}`, kind: 'input', grade: 3, topic: 'angle', prompt: 'p', answer: 1, hints: ['a', 'b', 'c'], explanation: 'e' } as Quest;
      record(s.wrong, q, wrong);
    }
    expect(recommendations(s, NOW).some((t) => t.includes('오답 상자'))).toBe(true);
  });
  it('힌트를 자주 쓰면 알려준다', () => {
    const s = defaultSave();
    s.stats.angle = { seen: 10, correct: 10, hints: 25, clean: 5 };
    expect(recommendations(s, NOW).some((t) => t.includes('힌트'))).toBe(true);
  });
  it('잘하는 단원이 둘 이상이면 학년을 올려 보라고 한다 (이미 4학년이면 말하지 않는다)', () => {
    const s = withStats([['fraction', 10, 9], ['angle', 10, 9]]);
    expect(recommendations(s, NOW).some((t) => t.includes('학년을 올려'))).toBe(true);
    s.settings.maxGrade = 4;
    expect(recommendations(s, NOW).some((t) => t.includes('학년을 올려'))).toBe(false);
  });
  it('기록이 있는데 최근 3일 쉬었으면 알려준다', () => {
    const s = defaultSave();
    addPlay(s, 600_000, daysAgo(5));
    expect(recommendations(s, NOW).some((t) => t.includes('최근 3일'))).toBe(true);
    addPlay(s, 600_000, daysAgo(1));
    expect(recommendations(s, NOW).some((t) => t.includes('최근 3일'))).toBe(false);
  });
  it('주제에 맞는 월드', () => expect(worldsFor('fraction')).toContain('분수 연못'));
});

describe('내보내기 / 가져오기 / 예전 저장', () => {
  it('내보낸 데이터를 그대로 가져온다', () => {
    const s = defaultSave();
    s.bests['angle-castle'] = 42;
    logQuest(s, 'angle', wrong, NOW);
    const back = parseImport(exportJson(s, NOW))!;
    expect(back.bests['angle-castle']).toBe(42);
    expect(back.stats.angle.seen).toBe(1);
    expect(back.days['2026-10-08'].quests).toBe(1);
  });
  it('이 게임이 아닌 파일은 거부한다', () => {
    expect(parseImport('{"hello":1}')).toBeNull();
    expect(parseImport('not json')).toBeNull();
    expect(parseImport(JSON.stringify({ app: 'math-suika-game', data: 5 }))).toBeNull();
  });
  it('빠진 항목은 기본값으로 채운다 (예전 버전 저장)', () => {
    const old = normalize({ best: 12, settings: { hint: 'easy', maxGrade: 2 } });
    expect(old.bests['double-forest']).toBe(12);
    expect(old.settings).toMatchObject({ hint: 'easy', maxGrade: 2, dailyLimitMin: 0, pinHash: '' });
    expect(old.days).toEqual({});
    expect(old.recent).toEqual([]);
  });
});

describe('PIN', () => {
  it('4자리 숫자만', () => {
    expect(isValidPin('1234')).toBe(true);
    for (const bad of ['123', '12345', 'abcd', '12a4', '']) expect(isValidPin(bad)).toBe(false);
  });
  it('맞는 PIN만 통과한다', async () => {
    const h = await makePinHash('2580');
    expect(await verifyPin('2580', h)).toBe(true);
    expect(await verifyPin('0000', h)).toBe(false);
  });
  it('PIN이 없으면 통과한다', async () => expect(await verifyPin('1111', '')).toBe(true));
  it('같은 PIN이라도 저장 값이 매번 다르다 (솔트)', async () => {
    expect(await makePinHash('2580')).not.toBe(await makePinHash('2580'));
  });
  it('PIN 숫자가 그대로 저장되지 않는다', async () => expect(await makePinHash('2580')).not.toContain('2580'));
});
