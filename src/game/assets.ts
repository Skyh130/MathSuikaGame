export interface Assets {
  fruits: HTMLImageElement[];
  box: HTMLImageElement;
}

export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;

function load(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    // 그림을 못 불러와도 게임은 동그란 과일로 계속된다
    img.onerror = () => resolve(img);
    img.src = assetUrl(path);
  });
}

export async function loadAssets(count: number): Promise<Assets> {
  const [box, ...fruits] = await Promise.all([
    load('ui/box.png'),
    ...Array.from({ length: count }, (_, i) => load(`fruits/${i}.png`)),
  ]);
  return { box, fruits };
}

export const isReady = (img?: HTMLImageElement): img is HTMLImageElement => !!img && img.complete && img.naturalWidth > 0;
