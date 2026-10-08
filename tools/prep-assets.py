#!/usr/bin/env python3
"""docs/art/ 의 원본 이미지를 게임용 스프라이트(public/assets/)로 가공한다.

  python3 tools/prep-assets.py        (필요: pillow, numpy)
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'docs' / 'art'
OUT = ROOT / 'public' / 'assets'
MARK = (255, 0, 255)


def white_to_alpha(im: Image.Image, thresh: int = 38) -> Image.Image:
    """바깥쪽 흰 배경만 투명하게 (캐릭터 안쪽의 흰색은 유지)."""
    rgb = im.convert('RGB')
    w, h = rgb.size
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1)]:
        if rgb.getpixel(seed) != MARK:
            ImageDraw.floodfill(rgb, seed, MARK, thresh=thresh)
    a = np.array(rgb)
    bg = (a == np.array(MARK)).all(axis=2)
    out = np.array(im.convert('RGBA'))
    out[bg, 3] = 0
    return Image.fromarray(out)


def trim(im: Image.Image, pad: int = 0) -> Image.Image:
    box = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if not box:
        return im
    l, t, r, b = box
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def square(im: Image.Image, size: int) -> Image.Image:
    s = max(im.size)
    canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - im.width) // 2, (s - im.height) // 2), im)
    return canvas.resize((size, size), Image.LANCZOS)


def components(mask: np.ndarray, step: int = 4):
    """다운샘플한 마스크에서 연결 요소를 찾아 원본 좌표 bbox를 돌려준다."""
    small = mask[::step, ::step]
    h, w = small.shape
    seen = np.zeros_like(small, dtype=bool)
    boxes = []
    for y in range(h):
        for x in range(w):
            if small[y, x] and not seen[y, x]:
                q = deque([(y, x)])
                seen[y, x] = True
                ys, xs, n = [y], [x], 0
                while q:
                    cy, cx = q.popleft()
                    n += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True
                                q.append((ny, nx))
                                ys.append(ny)
                                xs.append(nx)
                boxes.append((n, min(xs) * step, min(ys) * step, (max(xs) + 1) * step, (max(ys) + 1) * step))
    return boxes


def fruits():
    im = Image.open(ART / 'fruits.png').convert('RGBA')
    a = np.array(im)
    # 반투명한 빛무리는 걷어내고 본체만 남긴다
    alpha = np.clip((a[..., 3].astype(int) - 100) * 255 / 120, 0, 255).astype(np.uint8)
    a[..., 3] = alpha
    clean = Image.fromarray(a)
    boxes = sorted(components(alpha > 128), reverse=True)[:10]
    assert len(boxes) == 10, f'과일 10개를 찾지 못했어요: {len(boxes)}'
    boxes = [b[1:] for b in boxes]
    mid = im.height / 2
    top = sorted([b for b in boxes if (b[1] + b[3]) / 2 < mid], key=lambda b: b[0])
    bottom = sorted([b for b in boxes if (b[1] + b[3]) / 2 >= mid], key=lambda b: b[0])
    body, dy, crops = [], [], []
    for i, (l, t, r, b) in enumerate(top + bottom):
        pad = 6
        crop = clean.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))
        crops.append(trim(crop))
        sq = square(trim(crop), 256)
        sq.save(OUT / 'fruits' / f'{i}.png', optimize=True)
        # 면적이 같은 원의 반지름 / 한 변 → 물리 원과 그림 크기를 맞추는 데 쓴다
        solid = np.array(sq.getchannel('A')) > 128
        body.append(round(float(np.sqrt(solid.sum() / np.pi) / 256), 3))
        # 잎·꼭지 때문에 몸통 중심이 그림 중심과 다르다 (세로 방향만 보정)
        dy.append(round(float((np.where(solid)[0].mean() - 128) / 256), 3))
    (ROOT / 'src' / 'content' / 'sprite-meta.ts').write_text(
        '// tools/prep-assets.py 가 만든 파일 (직접 수정하지 마세요)\n'
        '/** 과일 그림 한 변 대비, 면적이 같은 원의 반지름 */\n'
        f'export const FRUIT_BODY_RATIO = {body} as const;\n'
        '/** 몸통 중심의 세로 위치 (그림 한 변 대비, 아래쪽이 +) */\n'
        f'export const FRUIT_BODY_DY = {dy} as const;\n',
        encoding='utf-8',
    )
    return crops[-1]  # 수박 (원본 해상도) → 앱 아이콘에 쓴다


def icons(melon: Image.Image) -> None:
    """홈 화면 아이콘: 하늘 → 풀밭 배경 위의 수박"""
    from PIL import ImageFilter

    out = ROOT / 'public' / 'icons'
    out.mkdir(parents=True, exist_ok=True)

    def render(size: int, rounded: bool, fill: float) -> Image.Image:
        s = size * 2  # 부드럽게 그린 뒤 줄인다
        top, bottom = np.array([191, 227, 255]), np.array([140, 205, 120])
        t = np.linspace(0, 1, s)[:, None, None]
        bg = (top * (1 - t) + bottom * t).astype(np.uint8)
        canvas = Image.fromarray(np.broadcast_to(bg, (s, s, 3)).copy()).convert('RGBA')
        w, h = melon.size
        k = s * fill / max(w, h)
        m = melon.resize((round(w * k), round(h * k)), Image.LANCZOS)
        cx, cy = s // 2, round(s * 0.52)
        # 바닥 그림자
        sh = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse((cx - m.width * 0.42, cy + m.height * 0.40, cx + m.width * 0.42, cy + m.height * 0.56), fill=(40, 90, 40, 90))
        canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(s * 0.012)))
        canvas.alpha_composite(m, (cx - m.width // 2, cy - m.height // 2))
        if rounded:
            mask = Image.new('L', (s, s), 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=round(s * 0.22), fill=255)
            canvas.putalpha(mask)
        return canvas.resize((size, size), Image.LANCZOS)

    render(192, True, 0.66).save(out / 'icon-192.png', optimize=True)
    render(512, True, 0.66).save(out / 'icon-512.png', optimize=True)
    # 마스크 가능한 아이콘: 가장자리를 기기가 잘라내므로 그림은 안쪽 안전 영역(약 60%)에만 둔다
    render(512, False, 0.52).save(out / 'icon-maskable-512.png', optimize=True)
    render(180, False, 0.62).save(out / 'apple-touch-icon.png', optimize=True)
    render(64, True, 0.78).save(out / 'favicon.png', optimize=True)


def powerups():
    im = white_to_alpha(Image.open(ART / 'powerups.png'))
    w, h = im.size
    names = ['hint', 'bomb', 'shake', 'undo']
    for i, name in enumerate(names):
        cell = im.crop(((i % 2) * w // 2, (i // 2) * h // 2, (i % 2 + 1) * w // 2, (i // 2 + 1) * h // 2))
        square(trim(cell), 160).save(OUT / 'ui' / f'pu-{name}.png', optimize=True)


def fox():
    im = white_to_alpha(Image.open(ART / 'fox.png'), thresh=48)
    w, h = im.size
    # 포즈가 살짝 겹쳐 있어서, 1/3 · 2/3 근처에서 그림이 가장 적은 세로줄을 경계로 쓴다
    counts = (np.array(im.getchannel('A')) > 24).sum(axis=0)
    cuts = []
    for k in (1, 2):
        c = k * w // 3
        lo, hi = c - 110, c + 110
        cuts.append(lo + int(np.argmin(counts[lo:hi])))
    edges = [0, *cuts, w]
    for i, name in enumerate(['cheer', 'think', 'thumb']):
        t = trim(im.crop((edges[i], 0, edges[i + 1], h)))
        t.thumbnail((300, 300), Image.LANCZOS)
        t.save(OUT / 'fox' / f'{name}.png', optimize=True)


def logo():
    t = trim(white_to_alpha(Image.open(ART / 'logo.png')), pad=4)
    t.thumbnail((560, 560), Image.LANCZOS)
    t.save(OUT / 'ui' / 'logo.png', optimize=True)


def box():
    t = trim(white_to_alpha(Image.open(ART / 'box.png'), thresh=14))
    t = t.resize((700, round(t.height * 700 / t.width)), Image.LANCZOS)
    t.save(OUT / 'ui' / 'box.png', optimize=True)
    # 상자 안쪽(나무가 아닌 부분)의 위치를 재서 알려준다 → src/game/config.ts 에 반영
    a = np.array(t).astype(int)
    inside = (a[..., 3] > 200) & (a[..., 2] > 130)
    mid_y, mid_x = t.height // 2, t.width // 2

    def longest_run(v):
        best, cur, start = (0, 0), 0, 0
        for i, flag in enumerate(list(v) + [False]):
            if flag:
                if cur == 0:
                    start = i
                cur += 1
            else:
                if cur > best[1] - best[0]:
                    best = (start, start + cur)
                cur = 0
        return best

    x0, x1 = longest_run(inside[mid_y])
    y0, y1 = longest_run(inside[:, mid_x])
    print('box image', t.size, 'interior x', x0, x1, 'y', y0, y1)


def background():
    """바탕 그림에 박혀 있는 나무 상자를 지우고(풀밭으로 채움) 게임이 자기 상자를 그리도록 한다."""
    im = Image.open(ART / 'bg.png').convert('RGB')
    a = np.array(im).astype(float)
    h, w, _ = a.shape
    top_end, bot_start = 676, 1640
    top_row = a[top_end - 12 : top_end].mean(axis=0)
    bot_row = a[bot_start + 6 : bot_start + 30].mean(axis=0)
    ys = np.linspace(0, 1, bot_start - top_end)[:, None, None]
    fill = top_row[None] * (1 - ys) + bot_row[None] * ys
    rng = np.random.default_rng(1)
    fill += rng.normal(0, 3, fill.shape)
    a[top_end:bot_start] = fill
    # 이음새를 부드럽게
    for k in range(14):
        t = k / 14
        a[top_end - 14 + k] = a[top_end - 14 + k] * (1 - t) + fill[0] * t
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(OUT / 'bg.jpg', quality=84, optimize=True)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    icons(fruits()); powerups(); fox(); logo(); box(); background()
    print('done')
