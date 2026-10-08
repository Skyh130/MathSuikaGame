/** 식 문자열(예: "3×4+5", "20−8")을 정수로 계산한다. 괄호 없이 +, −, ×만 지원. */
export type Token = number | '+' | '−' | '×';

export function tokenize(text: string): Token[] | null {
  const parts = text.replace(/\s+/g, '').match(/\d+|[+\-−×x*]/g);
  if (!parts || parts.join('') !== text.replace(/\s+/g, '')) return null;
  return parts.map((p): Token => {
    if (/^\d+$/.test(p)) return Number(p);
    if (p === '+') return '+';
    if (p === '×' || p === 'x' || p === '*') return '×';
    return '−';
  });
}

/** 숫자, 연산자가 번갈아 나오는 토큰을 계산한다. 형식이 틀리면 null. */
export function evaluate(tokens: Token[]): number | null {
  if (tokens.length === 0 || tokens.length % 2 === 0) return null;
  for (let i = 0; i < tokens.length; i++) {
    const isNum = typeof tokens[i] === 'number';
    if (isNum !== (i % 2 === 0)) return null;
  }
  // 1) 곱셈 먼저
  const terms: Token[] = [tokens[0]];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i] as '+' | '−' | '×';
    const rhs = tokens[i + 1] as number;
    if (op === '×') {
      terms[terms.length - 1] = (terms[terms.length - 1] as number) * rhs;
    } else {
      terms.push(op, rhs);
    }
  }
  // 2) 덧셈, 뺄셈은 왼쪽부터
  let acc = terms[0] as number;
  for (let i = 1; i < terms.length; i += 2) {
    const rhs = terms[i + 1] as number;
    acc = terms[i] === '+' ? acc + rhs : acc - rhs;
  }
  return acc;
}

export function evalText(text: string): number | null {
  const tokens = tokenize(text);
  return tokens ? evaluate(tokens) : null;
}
