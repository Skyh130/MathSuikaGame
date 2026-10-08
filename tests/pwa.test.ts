import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { manifest, THEME_COLOR } from '../pwa.config';

const root = new URL('../', import.meta.url);
const file = (p: string) => new URL(p, root);
const read = (p: string) => readFileSync(file(p), 'utf-8');

/** PNG 머리 부분(IHDR)에서 가로·세로를 읽는다 */
function pngSize(path: string): [number, number] {
  const b = readFileSync(file(path));
  expect(b.subarray(1, 4).toString()).toBe('PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

describe('웹앱 매니페스트', () => {
  it('설치에 필요한 항목이 있다', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name!.length).toBeLessThanOrEqual(12);
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('ko');
    expect(manifest.orientation).toBe('portrait');
  });
  it('하위 경로(GitHub Pages)에서도 동작하도록 모두 상대 경로다', () => {
    for (const v of [manifest.start_url, manifest.scope, manifest.id]) expect(v, String(v)).toMatch(/^\./);
    for (const icon of manifest.icons!) expect(icon.src.startsWith('/'), icon.src).toBe(false);
  });
  it('아이콘 파일이 있고 크기가 선언과 같다', () => {
    for (const icon of manifest.icons!) {
      const path = `public/${icon.src}`;
      expect(existsSync(file(path)), path).toBe(true);
      const [w, h] = icon.sizes!.split('x').map(Number);
      expect(pngSize(path), icon.src).toEqual([w, h]);
    }
  });
  it('192, 512, 마스크 가능한 아이콘이 모두 있다', () => {
    const sizes = manifest.icons!.map((i) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toContain('192x192:any');
    expect(sizes).toContain('512x512:any');
    expect(sizes).toContain('512x512:maskable');
  });
});

describe('index.html', () => {
  const html = read('index.html');
  it('테마 색이 매니페스트와 같다', () => expect(html).toContain(`<meta name="theme-color" content="${THEME_COLOR}"`));
  it('아이콘 링크가 가리키는 파일이 있다', () => {
    for (const m of html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="\/([^"]+)"/g)) {
      expect(existsSync(file(`public/${m[1]}`)), m[1]).toBe(true);
    }
    expect(pngSize('public/icons/apple-touch-icon.png')).toEqual([180, 180]);
  });
  it('외부 글꼴 서버를 부르지 않는다 (오프라인 · 개인정보)', () => {
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});

describe('내장 글꼴', () => {
  const css = read('src/fonts.css');
  it('모든 글꼴 파일이 앱 안에 있다', () => {
    const urls = [...css.matchAll(/url\('\/(fonts\/[^']+)'\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(5);
    for (const u of urls) expect(existsSync(file(`public/${u}`)), u).toBe(true);
  });
  it('외부 주소가 없다', () => expect(css).not.toMatch(/https?:\/\//));
  it('한글이 들어 있는 조각이 포함되어 있다 (한글 범위 U+AC00~D7A3)', () => {
    expect(css).toMatch(/U\+(ac|ad|ae|af|b[0-9a-f]|c[0-9a-f]|d[0-7])[0-9a-f]{2}/i);
  });
});
