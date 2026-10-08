/** PWA 설정 (홈 화면 설치 + 오프라인). vite.config.ts 와 테스트가 함께 쓴다. */
import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa';

export const THEME_COLOR = '#bde7d0';

export const manifest: Partial<ManifestOptions> = {
  // 상대 경로: GitHub Pages(/MathSuikaGame/)처럼 하위 경로에 올려도 그대로 동작한다
  id: './',
  start_url: './',
  scope: './',
  name: 'Math Suika Game',
  short_name: 'Math Suika',
  description: '같은 값의 과일을 합치며 초등 2~4학년 창의 수학을 익히는 수박 게임',
  lang: 'ko',
  dir: 'ltr',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#bfe3ff',
  theme_color: THEME_COLOR,
  categories: ['education', 'games', 'kids'],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export const pwaOptions: Partial<VitePWAOptions> = {
  // 새 버전이 나와도 하던 판을 갑자기 새로고침하지 않는다 → 시작 화면에서 "새 버전으로 바꾸기"
  registerType: 'prompt',
  manifest,
  workbox: {
    // 게임에 필요한 모든 파일(그림, 글꼴 포함)을 미리 저장해서 인터넷이 없어도 열린다
    globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2,webmanifest}'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  },
  devOptions: { enabled: false },
};
