/**
 * 부모 확인용 PIN. 아이가 실수로 열지 못하게 하는 "잠금"이지, 강한 보안은 아니다
 * (데이터는 이 기기의 브라우저에만 있고, 사이트 데이터를 지우면 PIN도 함께 사라진다).
 */
export const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

/** crypto.subtle 은 https/localhost 에서만 있다. 없으면 간단한 해시로 대신한다. */
async function digest(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `f${h.toString(16)}`;
}

const newSalt = () =>
  Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

/** 저장할 문자열 `솔트:해시` */
export async function makePinHash(pin: string, salt = newSalt()): Promise<string> {
  return `${salt}:${await digest(`${salt}|${pin}`)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!stored) return true; // PIN이 없으면 통과
  const [salt] = stored.split(':');
  return (await makePinHash(pin, salt)) === stored;
}
