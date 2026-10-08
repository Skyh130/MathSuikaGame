/**
 * 부모 리포트에 쓰는 기록과 집계 (화면과 따로 두어 테스트할 수 있게 한다).
 */
import { TOPIC_NAMES, type Topic } from '../content/quests';
import { WORLDS } from '../content/worlds';
import { normalize, type DayLog, type LooseSave, type Save } from './storage';

export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const emptyDay = (): DayLog => ({ ms: 0, quests: 0, clean: 0, extra: 0 });
const dayOf = (save: Save, key: string): DayLog => (save.days[key] ??= emptyDay());

export const KEEP_DAYS = 120;
export const MAX_RECENT = 200;
/** 시간 제한에 걸렸을 때 부모가 한 번에 늘려 주는 시간 (분) */
export const EXTRA_MIN = 15;

// ───────── 기록하기 ─────────
export function addPlay(save: Save, ms: number, now: Date): void {
  dayOf(save, dayKey(now)).ms += ms;
}

export interface QuestOutcome {
  solved: boolean;
  hintsUsed: number;
  wrong: number;
}

/** 0: 힌트 없이 한 번에, 1: 힌트를 썼거나 건너뜀, 2: 틀림 */
export const classify = (r: QuestOutcome): 0 | 1 | 2 => (r.wrong > 0 ? 2 : r.solved && r.hintsUsed === 0 ? 0 : 1);

export function logQuest(save: Save, topic: Topic, res: QuestOutcome, now: Date): void {
  const kind = classify(res);
  const st = (save.stats[topic] ??= { seen: 0, correct: 0, hints: 0 });
  st.seen++;
  st.hints += res.hintsUsed;
  if (res.solved) st.correct++;
  if (kind === 0) st.clean = (st.clean ?? 0) + 1;
  if (res.wrong > 0) st.mistakes = (st.mistakes ?? 0) + 1;

  const key = dayKey(now);
  const day = dayOf(save, key);
  day.quests++;
  if (kind === 0) day.clean++;

  save.recent.push({ d: key, t: topic, r: kind });
  if (save.recent.length > MAX_RECENT) save.recent.splice(0, save.recent.length - MAX_RECENT);
  pruneDays(save, now);
}

function pruneDays(save: Save, now: Date): void {
  const cutoff = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - KEEP_DAYS));
  for (const k of Object.keys(save.days)) if (k < cutoff) delete save.days[k];
}

// ───────── 하루 시간 제한 ─────────
export interface LimitState {
  enabled: boolean;
  usedMs: number;
  allowedMs: number;
  remainingMs: number;
  over: boolean;
}

export function limitState(save: Save, now: Date): LimitState {
  const day = save.days[dayKey(now)];
  const usedMs = day?.ms ?? 0;
  const limit = save.settings.dailyLimitMin;
  const allowedMs = (limit + (day?.extra ?? 0)) * 60_000;
  const enabled = limit > 0;
  return { enabled, usedMs, allowedMs, remainingMs: Math.max(0, allowedMs - usedMs), over: enabled && usedMs >= allowedMs };
}

/** 오늘의 시간을 늘려 준다 (부모 확인 뒤) */
export function grantExtra(save: Save, now: Date, minutes = EXTRA_MIN): void {
  dayOf(save, dayKey(now)).extra += minutes;
}

// ───────── 집계 ─────────
export interface WeekDay {
  key: string;
  /** 0(일) ~ 6(토) */
  dow: number;
  minutes: number;
  isToday: boolean;
}

export interface WeekSummary {
  days: WeekDay[];
  totalMinutes: number;
  activeDays: number;
  quests: number;
  clean: number;
}

/** 오늘을 포함한 최근 7일 */
export function weekSummary(save: Save, now: Date): WeekSummary {
  const days: WeekDay[] = [];
  let quests = 0;
  let clean = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = dayKey(d);
    const log = save.days[key];
    days.push({ key, dow: d.getDay(), minutes: Math.round((log?.ms ?? 0) / 60_000), isToday: i === 0 });
    quests += log?.quests ?? 0;
    clean += log?.clean ?? 0;
  }
  return {
    days,
    totalMinutes: days.reduce((a, d) => a + d.minutes, 0),
    activeDays: days.filter((d) => (save.days[d.key]?.ms ?? 0) >= 30_000).length,
    quests,
    clean,
  };
}

export type TopicLevel = 'good' | 'ok' | 'weak' | 'new';

export interface TopicRow {
  topic: Topic;
  name: string;
  seen: number;
  clean: number;
  /** 힌트 없이 한 번에 맞힌 비율 (0~1) */
  rate: number;
  /** 한 문제당 쓴 힌트 수 */
  hintsPer: number;
  level: TopicLevel;
}

export const LEVEL_NAMES: Record<TopicLevel, string> = { good: '잘해요', ok: '보통', weak: '연습이 필요해요', new: '아직 조금' };

/** 연습이 필요한 단원이 위로 오도록 정렬한 단원별 현황 */
export function topicRows(save: Save): TopicRow[] {
  const rows: TopicRow[] = Object.entries(save.stats)
    .filter(([, st]) => st.seen > 0)
    .map(([key, st]) => {
      const topic = key as Topic;
      const clean = st.clean ?? st.correct; // 예전 저장에는 clean 이 없다
      const rate = clean / st.seen;
      const level: TopicLevel = st.seen < 3 ? 'new' : rate >= 0.75 ? 'good' : rate >= 0.5 ? 'ok' : 'weak';
      return { topic, name: TOPIC_NAMES[topic] ?? key, seen: st.seen, clean, rate, hintsPer: st.hints / st.seen, level };
    });
  const order: Record<TopicLevel, number> = { weak: 0, ok: 1, new: 2, good: 3 };
  return rows.sort((a, b) => order[a.level] - order[b.level] || a.rate - b.rate || b.seen - a.seen);
}

export interface Overall {
  seen: number;
  clean: number;
  rate: number;
  hintsPer: number;
}

export function overall(save: Save): Overall {
  const rows = topicRows(save);
  const seen = rows.reduce((a, r) => a + r.seen, 0);
  const clean = rows.reduce((a, r) => a + r.clean, 0);
  const hints = rows.reduce((a, r) => a + r.hintsPer * r.seen, 0);
  return { seen, clean, rate: seen ? clean / seen : 0, hintsPer: seen ? hints / seen : 0 };
}

/** 이 주제와 어울리는 월드 이름들 */
export const worldsFor = (topic: Topic): string[] => WORLDS.filter((w) => w.topics.includes(topic)).map((w) => w.name);

/** 부모에게 드리는 한두 줄 제안 */
export function recommendations(save: Save, now: Date): string[] {
  const out: string[] = [];
  const rows = topicRows(save);
  const weak = rows.filter((r) => r.level === 'weak').slice(0, 2);
  for (const r of weak) {
    const worlds = worldsFor(r.topic);
    out.push(
      `「${r.name}」: 힌트 없이 한 번에 맞힌 비율이 ${Math.round(r.rate * 100)}%예요.${worlds.length ? ` ${worlds.slice(0, 2).join('·')} 월드에서 더 만나 볼 수 있어요.` : ''}`,
    );
  }
  if (save.wrong.items.length >= 5) {
    out.push(`오답 상자에 ${save.wrong.items.length}문제가 쌓여 있어요. 한 번에 5문제씩 복습해 보세요.`);
  }
  const o = overall(save);
  if (o.seen >= 8 && o.hintsPer > 1.5) {
    out.push('힌트를 자주 쓰고 있어요. 힌트 1단계만 보고 다시 생각해 보도록 응원해 주세요.');
  }
  const strong = rows.filter((r) => r.level === 'good' && r.seen >= 5);
  if (strong.length >= 2 && save.settings.maxGrade < 4) {
    out.push(`「${strong[0].name}」「${strong[1].name}」는 아주 잘해요! 부모 설정에서 퀘스트 학년을 올려 봐도 좋아요.`);
  }
  const lastDays = weekSummary(save, now).days.slice(-3);
  if (Object.keys(save.days).length > 0 && lastDays.every((d) => d.minutes === 0)) {
    out.push('최근 3일 동안 쉬었어요. 하루 10분이라도 꾸준히 하면 좋아요.');
  }
  if (o.seen >= 10 && out.length === 0) out.push('꾸준히 잘하고 있어요. 이대로 계속해요!');
  return out;
}

// ───────── 내보내기 / 가져오기 ─────────
const EXPORT_APP = 'math-suika-game';

export function exportJson(save: Save, now: Date): string {
  return JSON.stringify({ app: EXPORT_APP, version: 1, exportedAt: now.toISOString(), data: save }, null, 1);
}

/** 내보낸 파일의 내용을 읽는다. 형식이 맞지 않으면 null. */
export function parseImport(text: string): Save | null {
  try {
    const parsed = JSON.parse(text) as { app?: string; data?: unknown };
    if (parsed?.app !== EXPORT_APP || typeof parsed.data !== 'object' || parsed.data === null) return null;
    return normalize(parsed.data as LooseSave);
  } catch {
    return null;
  }
}
