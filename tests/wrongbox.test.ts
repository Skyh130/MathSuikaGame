import { describe, expect, it } from 'vitest';
import type { Quest } from '../src/content/quests';
import { dueItems, emptyBox, GAPS, pickDue, record, reviewBatch, topicCounts } from '../src/state/wrongbox';

const q = (id: string, topic: Quest['topic'] = 'fraction'): Quest => ({
  id, tpl: id, grade: 3, topic, prompt: `문제 ${id}`, kind: 'input', answer: 1, hints: ['a', 'b', 'c'], explanation: 'e',
});
const clean = { solved: true, hintsUsed: 0, wrong: 0 };
const wrong = { solved: true, hintsUsed: 0, wrong: 1 };

describe('오답 상자', () => {
  it('틀리면 상자에 문제 그대로 들어간다', () => {
    const box = emptyBox();
    expect(record(box, q('a'), wrong)).toBe('added');
    expect(box.items).toHaveLength(1);
    expect(box.items[0].quest.prompt).toBe('문제 a');
    expect(box.items[0].level).toBe(0);
  });
  it('한 번에 맞히면 상자에 넣지 않는다', () => {
    const box = emptyBox();
    expect(record(box, q('a'), clean)).toBe('none');
    expect(box.items).toHaveLength(0);
    expect(box.draws).toBe(1);
  });
  it('건너뛰기(틀린 적 없음)는 상자에 넣지 않는다', () => {
    const box = emptyBox();
    expect(record(box, q('a'), { solved: false, hintsUsed: 0, wrong: 0 })).toBe('none');
    expect(box.items).toHaveLength(0);
  });
  it('틀린 뒤 GAPS[0]번 지나야 다시 나온다', () => {
    const box = emptyBox();
    record(box, q('a'), wrong);
    expect(pickDue(box)).toBeNull();
    for (let i = 0; i < GAPS[0]; i++) record(box, q(`x${i}`), clean);
    expect(pickDue(box)?.id).toBe('a');
  });
  it('연달아 깔끔하게 3번 맞히면 졸업한다 (간격은 점점 길어진다)', () => {
    const box = emptyBox();
    record(box, q('a'), wrong);
    const passes: string[] = [];
    let guard = 0;
    while (box.items.length && guard++ < 100) {
      const due = pickDue(box);
      if (due) passes.push(record(box, due.quest, clean));
      else record(box, q(`f${guard}`), clean);
    }
    expect(passes).toEqual(['up', 'up', 'graduated']);
    expect(box.graduated).toBe(1);
    expect(box.items).toHaveLength(0);
  });
  it('복습에서 또 틀리면 처음부터 다시', () => {
    const box = emptyBox();
    record(box, q('a'), wrong);
    box.items[0].level = 2;
    expect(record(box, q('a'), wrong)).toBe('again');
    expect(box.items[0].level).toBe(0);
    expect(box.items[0].wrongs).toBe(2);
    expect(box.items).toHaveLength(1);
  });
  it('힌트를 쓰고 맞히면 레벨은 그대로', () => {
    const box = emptyBox();
    record(box, q('a'), wrong);
    box.items[0].level = 1;
    expect(record(box, q('a'), { solved: true, hintsUsed: 2, wrong: 0 })).toBe('kept');
    expect(box.items[0].level).toBe(1);
  });
  it('같은 문제를 두 번 넣지 않는다', () => {
    const box = emptyBox();
    record(box, q('a'), wrong);
    record(box, q('a'), wrong);
    expect(box.items).toHaveLength(1);
  });
  it('복습 묶음: 때가 된 것 먼저, 그다음 레벨이 낮고 오래된 순', () => {
    const box = emptyBox();
    record(box, q('a'), wrong);
    record(box, q('b'), wrong);
    record(box, q('c'), wrong);
    box.items[0].level = 2; // a
    box.items[1].level = 0; // b
    box.items[2].level = 1; // c
    box.items.forEach((i) => (i.due = 999)); // 아직 때가 아님
    expect(reviewBatch(box, 5).map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(reviewBatch(box, 2)).toHaveLength(2);
    box.items[2].due = 0;
    expect(dueItems(box).map((i) => i.id)).toEqual(['c']);
    expect(reviewBatch(box, 5)[0].id).toBe('c');
  });
  it('최근에 나온 문제는 pickDue에서 건너뛴다', () => {
    const box = emptyBox();
    record(box, q('a'), wrong);
    record(box, q('b'), wrong);
    box.items.forEach((i) => (i.due = 0));
    expect(pickDue(box, ['a'])?.id).toBe('b');
  });
  it('주제별 개수', () => {
    const box = emptyBox();
    record(box, q('a', 'fraction'), wrong);
    record(box, q('b', 'fraction'), wrong);
    record(box, q('c', 'angle'), wrong);
    expect(topicCounts(box)).toEqual([['fraction', 2], ['angle', 1]]);
  });
  it('JSON으로 저장했다 읽어도 같다', () => {
    const box = emptyBox();
    record(box, q('a'), wrong);
    expect(JSON.parse(JSON.stringify(box))).toEqual(box);
  });
});
