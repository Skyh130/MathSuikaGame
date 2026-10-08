#!/usr/bin/env python3
"""Jua 글꼴(Google Fonts, SIL OFL)을 내려받아 앱에 포함한다 → 인터넷 없이도 같은 글꼴로 보인다.

앱 코드에 실제로 나오는 글자가 들어 있는 조각(unicode-range)만 받는다.
  python3 tools/fetch-font.py
"""
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'fonts'
UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
CSS_URL = 'https://fonts.googleapis.com/css2?family=Jua&display=swap'


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def used_chars() -> set[int]:
    chars: set[int] = set()
    files = [ROOT / 'index.html', *sorted((ROOT / 'src').rglob('*.ts'))]
    for f in files:
        chars.update(ord(c) for c in f.read_text(encoding='utf-8') if not c.isspace())
    return chars


def parse_ranges(spec: str) -> list[tuple[int, int]]:
    out = []
    for part in spec.split(','):
        part = part.strip().removeprefix('U+')
        if '-' in part:
            a, b = part.split('-')
            out.append((int(a, 16), int(b, 16)))
        elif '?' in part:
            out.append((int(part.replace('?', '0'), 16), int(part.replace('?', 'F'), 16)))
        else:
            out.append((int(part, 16), int(part, 16)))
    return out


def main() -> None:
    css = get(CSS_URL).decode('utf-8')
    blocks = re.findall(r'@font-face\s*\{(.*?)\}', css, re.S)
    chars = used_chars()
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('jua-*.woff2'):
        old.unlink()
    faces, total = [], 0
    for body in blocks:
        url = re.search(r'url\((https:[^)]+)\)', body).group(1)
        rng = re.search(r'unicode-range:\s*([^;]+);', body).group(1)
        ranges = parse_ranges(rng)
        if not any(lo <= c <= hi for c in chars for lo, hi in ranges):
            continue
        idx = len(faces)
        data = get(url)
        (OUT / f'jua-{idx}.woff2').write_bytes(data)
        total += len(data)
        faces.append(
            f"/* {url.rsplit('/', 1)[-1]} */\n@font-face {{\n  font-family: 'Jua';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n"
            f"  src: url('/fonts/jua-{idx}.woff2') format('woff2');\n  unicode-range: {rng};\n}}\n"
        )
    header = '/* tools/fetch-font.py 가 만든 파일 — Jua (SIL Open Font License 1.1, Google Fonts) */\n'
    (ROOT / 'src' / 'fonts.css').write_text(header + '\n'.join(faces), encoding='utf-8')
    print(f'조각 {len(faces)}/{len(blocks)}개, 합계 {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()
