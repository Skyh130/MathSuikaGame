/**
 * 홈 화면 설치 안내, 오프라인 준비 상태, 새 버전 알림.
 * 서비스 워커는 배포본(npm run build)에서만 켜진다.
 */
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const state = { installEvent: null as BeforeInstallPromptEvent | null, updateReady: false, offlineReady: false };
const listeners = new Set<() => void>();
let updateSW: ((reload?: boolean) => Promise<void>) | undefined;

const emit = () => listeners.forEach((fn) => fn());

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

const isIos = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export interface PwaStatus {
  /** 설치 버튼을 보여줄 수 있다 (안드로이드 크롬·삼성 인터넷) */
  canInstall: boolean;
  /** 아이폰·아이패드: 설치 버튼이 없어서 안내 문구를 보여준다 */
  iosHint: boolean;
  updateReady: boolean;
  /** 인터넷 없이도 열 수 있도록 파일을 모두 저장해 두었다 */
  offlineReady: boolean;
  standalone: boolean;
}

export function pwaStatus(): PwaStatus {
  const standalone = isStandalone();
  return {
    canInstall: !!state.installEvent && !standalone,
    iosHint: isIos() && !standalone,
    updateReady: state.updateReady,
    offlineReady: state.offlineReady,
    standalone,
  };
}

export function initPwa(onChange: () => void): void {
  listeners.add(onChange);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // 브라우저 기본 배너 대신 우리 버튼으로 보여준다
    state.installEvent = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    state.installEvent = null;
    emit();
  });
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  updateSW = registerSW({
    onNeedRefresh() {
      state.updateReady = true;
      emit();
    },
    onOfflineReady() {
      state.offlineReady = true;
      emit();
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // 열어 둔 채로도 가끔 새 버전을 확인한다
      setInterval(() => void reg.update(), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void reg.update();
      });
    },
  });
  // 이미 서비스 워커가 맡고 있으면 이전에 저장이 끝난 것이다
  if (navigator.serviceWorker.controller) state.offlineReady = true;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const ev = state.installEvent;
  if (!ev) return 'unavailable';
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  state.installEvent = null;
  emit();
  return outcome;
}

/** 새 버전으로 바꾸고 다시 불러온다 (시작 화면에서만 부른다) */
export function applyUpdate(): void {
  void updateSW?.(true);
}
