import { WORLDS } from '../content/worlds';
import { stagesFor, MAX_STARS } from '../content/adventure';
import { TOPIC_NAMES } from '../content/quests';
import { assetUrl } from '../game/assets';
import { isValidPin, makePinHash, verifyPin } from '../state/pin';
import {
  dayKey, exportJson, LEVEL_NAMES, limitState, overall, parseImport, recommendations, topicRows, weekSummary,
} from '../state/report';
import { clearSave, writeSave, type Save } from '../state/storage';
import { topicCounts } from '../state/wrongbox';

const show = (overlay: HTMLElement, html: string, cls = '') => {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="card ${cls}">${html}</div>`;
};
const $ = <T extends HTMLElement>(root: HTMLElement, sel: string) => root.querySelector(sel) as T;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

// ───────── PIN 키패드 ─────────
export interface PinOptions {
  title: string;
  sub?: string;
  /** 'verify': 저장된 PIN 확인, 'set': 새 PIN을 두 번 입력 */
  mode: 'verify' | 'set';
  stored?: string;
  onOk: (pin: string) => void;
  onCancel: () => void;
}

export function askPin(overlay: HTMLElement, o: PinOptions): void {
  let entered = '';
  let first = '';
  let note = '';
  const render = () => {
    const dots = Array.from({ length: 4 }, (_, i) => `<i class="${i < entered.length ? 'on' : ''}"></i>`).join('');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', '<']
      .map((k) => (k === 'x' ? '<button data-k="x" class="alt">취소</button>' : k === '<' ? '<button data-k="<" class="alt">⌫</button>' : `<button data-k="${k}">${k}</button>`))
      .join('');
    show(
      overlay,
      `<h2>🔒 ${o.title}</h2>
       <p class="sub">${first ? '한 번 더 입력해 주세요' : o.sub ?? ''}</p>
       <div class="pin-dots">${dots}</div>
       <div class="msg bad">${note}</div>
       <div class="pad">${keys}</div>`,
    );
    overlay.querySelectorAll<HTMLButtonElement>('.pad button').forEach((b) => (b.onclick = () => press(b.dataset.k!)));
  };
  const press = async (k: string) => {
    if (k === 'x') return o.onCancel();
    if (k === '<') entered = entered.slice(0, -1);
    else if (entered.length < 4) entered += k;
    note = '';
    if (entered.length === 4) {
      const pin = entered;
      entered = '';
      if (o.mode === 'verify') {
        if (await verifyPin(pin, o.stored ?? '')) return o.onOk(pin);
        note = 'PIN이 맞지 않아요';
      } else if (!first) {
        first = pin;
      } else if (first === pin) {
        return o.onOk(pin);
      } else {
        first = '';
        note = '두 번이 달라요. 처음부터 다시 해 주세요';
      }
    }
    render();
  };
  render();
}

// ───────── 시간 제한 잠금 ─────────
export function showLock(overlay: HTMLElement, o: { limitMin: number; onParent: () => void }): void {
  show(
    overlay,
    `<img class="fox" src="${assetUrl('fox/thumb.png')}" alt="" />
     <h2>오늘은 여기까지!</h2>
     <p>오늘 놀 수 있는 시간(${o.limitMin}분)을 다 썼어요.<br />내일 또 만나요 👋</p>
     <button class="btn alt" id="parent">👪 부모님 확인</button>`,
  );
  $(overlay, '#parent').onclick = o.onParent;
}

// ───────── 리포트 ─────────
type Tab = 'summary' | 'topics' | 'settings';

export interface ReportContext {
  save: Save;
  now: () => Date;
  onClose: () => void;
}

export function showReport(overlay: HTMLElement, ctx: ReportContext, tab: Tab = 'summary'): void {
  const { save } = ctx;
  const now = ctx.now();
  const rerender = (t: Tab = tab) => showReport(overlay, ctx, t);
  const tabs = ([['summary', '요약'], ['topics', '단원'], ['settings', '설정']] as const)
    .map(([k, n]) => `<button class="tab${k === tab ? ' sel' : ''}" data-tab="${k}">${n}</button>`)
    .join('');
  const body = tab === 'summary' ? summaryHtml(save, now) : tab === 'topics' ? topicsHtml(save) : settingsHtml(save, now);
  show(
    overlay,
    `<h2>👪 부모 리포트</h2>
     <div class="tabs">${tabs}</div>
     <div class="rbody">${body}</div>
     <button class="btn alt" id="close">닫기</button>`,
    'report',
  );
  overlay.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => (b.onclick = () => rerender(b.dataset.tab as Tab)));
  $(overlay, '#close').onclick = ctx.onClose;
  if (tab === 'settings') bindSettings(overlay, ctx, rerender);
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function summaryHtml(save: Save, now: Date): string {
  const w = weekSummary(save, now);
  const today = w.days[6].minutes;
  const o = overall(save);
  const max = Math.max(30, ...w.days.map((d) => d.minutes));
  const bars = w.days
    .map(
      (d) => `<div class="col${d.isToday ? ' today' : ''}" title="${d.key} ${d.minutes}분">
        <span class="v">${d.minutes || ''}</span><i style="height:${Math.max(d.minutes ? 6 : 2, (d.minutes / max) * 70)}px"></i><span class="d">${DOW[d.dow]}</span></div>`,
    )
    .join('');
  const recs = recommendations(save, now);
  const sentence =
    w.quests > 0
      ? `이번 주 <b>${w.activeDays}일</b> 놀이하고 퀘스트 <b>${w.quests}문제</b> 중 힌트 없이 한 번에 맞힌 것은 <b>${w.clean}문제 (${pct(w.clean / w.quests)})</b>예요.`
      : '아직 이번 주 퀘스트 기록이 없어요. 게임을 하면서 풀어 본 문제가 여기에 쌓여요.';
  return `<div class="tiles">
      <div class="stat-box"><b>${today}분</b><small>오늘</small></div>
      <div class="stat-box"><b>${w.totalMinutes}분</b><small>이번 주</small></div>
      <div class="stat-box"><b>${o.seen}</b><small>푼 문제</small></div>
      <div class="stat-box"><b>${o.seen ? pct(o.rate) : '-'}</b><small>한 번에 맞힘</small></div>
    </div>
    <p class="sentence">${sentence}</p>
    <div class="week" role="img" aria-label="최근 7일 놀이 시간(분)">${bars}</div>
    <h3>이렇게 도와 주세요</h3>
    ${recs.length ? `<ul class="recs">${recs.map((r) => `<li>${r}</li>`).join('')}</ul>` : '<p class="sub">문제를 조금 더 풀면 제안을 드릴게요.</p>'}`;
}

function topicsHtml(save: Save): string {
  const rows = topicRows(save);
  const bars = rows.length
    ? rows
        .map(
          (r) => `<div class="trow">
        <span class="tn">${r.name}</span>
        <div class="bar"><i class="lv-${r.level}" style="width:${Math.max(4, r.rate * 100)}%"></i></div>
        <span class="tr">${pct(r.rate)}<small> · ${r.seen}문제</small></span>
        <em class="tlv lv-${r.level}">${LEVEL_NAMES[r.level]}</em></div>`,
        )
        .join('')
    : '<p class="sub">아직 푼 문제가 없어요.</p>';
  const counts = topicCounts(save.wrong)
    .map(([t, n]) => `<span class="chip">${TOPIC_NAMES[t]} ${n}</span>`)
    .join('');
  const worlds = WORLDS.map((w) => {
    const stars = stagesFor(w).reduce((a, s) => a + (save.adventure[s.id] ?? 0), 0);
    return `<li><span>${w.emoji} ${w.name}</span><span class="st">${'★'.repeat(Math.min(3, Math.floor(stars / 5)))}<small> ${stars}/${MAX_STARS}</small></span></li>`;
  }).join('');
  return `<h3>단원별 (힌트 없이 한 번에 맞힌 비율)</h3>${bars}
    <h3>📦 오답 상자</h3>
    <p class="sub">${save.wrong.items.length}문제 남음 · 🎓 졸업 ${save.wrong.graduated}문제</p>
    ${counts ? `<div class="chips">${counts}</div>` : ''}
    <h3>🗺️ 모험 진행</h3><ul class="wprog">${worlds}</ul>`;
}

function settingsHtml(save: Save, now: Date): string {
  const s = save.settings;
  const lim = limitState(save, now);
  const opts = [0, 20, 30, 45, 60, 90]
    .map((m) => `<option value="${m}"${m === s.dailyLimitMin ? ' selected' : ''}>${m ? `${m}분` : '제한 없음'}</option>`)
    .join('');
  const grade = [2, 3, 4].map((g) => `<option value="${g}"${g === s.maxGrade ? ' selected' : ''}>${g}학년까지</option>`).join('');
  return `<h3>놀이 시간</h3>
    <div class="row"><span>하루 시간 제한</span><select id="set-limit">${opts}</select></div>
    <p class="sub">오늘 ${Math.round(lim.usedMs / 60000)}분 사용${lim.enabled ? ` · ${Math.ceil(lim.remainingMs / 60000)}분 남음` : ''}</p>
    <h3>문제</h3>
    <div class="row"><span>퀘스트 학년</span><select id="set-grade">${grade}</select></div>
    <h3>PIN</h3>
    <p class="sub">${s.pinHash ? '🔒 PIN이 설정되어 있어요' : 'PIN이 없어요. 시간 제한을 쓰려면 PIN이 필요해요.'}</p>
    <div class="start-actions"><button class="btn alt sm" id="pin-set">${s.pinHash ? 'PIN 바꾸기' : 'PIN 만들기'}</button>${s.pinHash ? '<button class="btn alt sm" id="pin-del">PIN 지우기</button>' : ''}</div>
    <h3>데이터 (이 기기에만 저장돼요)</h3>
    <textarea id="io" rows="3" placeholder="내보내기를 누르면 여기에 나와요. 가져오려면 붙여넣고 가져오기를 누르세요."></textarea>
    <div class="start-actions"><button class="btn alt sm" id="exp-file">📤 파일로 저장</button><button class="btn alt sm" id="exp-copy">📋 복사</button><button class="btn alt sm" id="imp">📥 가져오기</button></div>
    <div class="start-actions"><button class="btn warn sm" id="reset">🗑 모든 기록 지우기</button></div>
    <p class="msg" id="rmsg"></p>`;
}

function bindSettings(overlay: HTMLElement, ctx: ReportContext, rerender: (t?: Tab) => void): void {
  const { save } = ctx;
  const persist = () => writeSave(save);
  const msg = (t: string) => ($(overlay, '#rmsg').textContent = t);

  /** PIN을 새로 만든다. 취소하면 false */
  const makePin = (after: (ok: boolean) => void) =>
    askPin(overlay, {
      title: '새 PIN 만들기',
      sub: '숫자 4자리',
      mode: 'set',
      onOk: async (pin) => {
        save.settings.pinHash = await makePinHash(pin);
        persist();
        after(true);
      },
      onCancel: () => after(false),
    });

  $<HTMLSelectElement>(overlay, '#set-limit').onchange = (e) => {
    const v = Number((e.target as HTMLSelectElement).value);
    const apply = () => {
      save.settings.dailyLimitMin = v;
      persist();
      rerender('settings');
    };
    if (v > 0 && !save.settings.pinHash) {
      // 시간 제한을 걸려면 아이가 풀 수 없게 PIN이 먼저 있어야 한다
      makePin((ok) => (ok ? apply() : rerender('settings')));
    } else apply();
  };
  $<HTMLSelectElement>(overlay, '#set-grade').onchange = (e) => {
    save.settings.maxGrade = Number((e.target as HTMLSelectElement).value) as 2 | 3 | 4;
    persist();
    msg('퀘스트 학년을 바꿨어요');
  };
  $(overlay, '#pin-set').onclick = () => makePin(() => rerender('settings'));
  const del = overlay.querySelector('#pin-del') as HTMLElement | null;
  if (del) {
    del.onclick = () => {
      if (save.settings.dailyLimitMin > 0 && !window.confirm('PIN을 지우면 하루 시간 제한도 함께 꺼져요. 지울까요?')) return;
      save.settings.pinHash = '';
      save.settings.dailyLimitMin = 0;
      persist();
      rerender('settings');
    };
  }

  const io = $<HTMLTextAreaElement>(overlay, '#io');
  const text = () => exportJson(save, ctx.now());
  $(overlay, '#exp-file').onclick = () => {
    const blob = new Blob([text()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `math-suika-game-${dayKey(ctx.now())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg('파일로 저장했어요');
  };
  $(overlay, '#exp-copy').onclick = async () => {
    io.value = text();
    io.select();
    try {
      await navigator.clipboard.writeText(io.value);
      msg('복사했어요. 메모장 등에 붙여넣어 보관하세요');
    } catch {
      msg('위 칸의 내용을 직접 복사해 주세요');
    }
  };
  $(overlay, '#imp').onclick = () => {
    const data = parseImport(io.value.trim());
    if (!data) return msg('이 게임에서 내보낸 내용이 아니에요');
    if (!window.confirm('지금 기록을 가져온 내용으로 바꿔요. 계속할까요?')) return;
    writeSave(data);
    window.location.reload();
  };
  $(overlay, '#reset').onclick = () => {
    if (!window.confirm('이 기기의 모든 기록(점수, 별, 오답 상자, 리포트, PIN)을 지워요.\n되돌릴 수 없어요. 정말 지울까요?')) return;
    clearSave();
    window.location.reload();
  };
}

export { isValidPin };
