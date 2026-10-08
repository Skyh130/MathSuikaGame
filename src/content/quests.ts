export type Topic = 'make-expr' | 'pattern' | 'logic' | 'counting' | 'number-sense' | 'time';

interface Base {
  id: string;
  grade: 2 | 3 | 4;
  topic: Topic;
  prompt: string;
  hints: [string, string, string];
  explanation: string;
}
export interface ChoiceQuest extends Base {
  kind: 'choice';
  options: string[];
  answer: number;
}
export interface InputQuest extends Base {
  kind: 'input';
  answer: number;
  unit?: string;
}
export interface BuildQuest extends Base {
  kind: 'build';
  cards: number[];
  target: number;
}
export type Quest = ChoiceQuest | InputQuest | BuildQuest;

export const TOPIC_NAMES: Record<Topic, string> = {
  'make-expr': '식 만들기',
  pattern: '규칙 찾기',
  logic: '논리·추리',
  counting: '경우의 수',
  'number-sense': '수 만들기',
  time: '시각과 시간',
};

export const QUESTS: Quest[] = [
  // ── 식 만들기 ──
  {
    id: 'build-3-4-5-17', kind: 'build', grade: 2, topic: 'make-expr',
    prompt: '카드 3, 4, 5를 모두 한 번씩 써서 17을 만들어 보세요.',
    cards: [3, 4, 5], target: 17,
    hints: ['×는 +보다 먼저 계산해요.', '3과 4를 곱하면 얼마일까요?', '3×4+5 = 12+5 = 17'],
    explanation: '3×4=12, 12+5=17. 곱셈을 먼저 계산해서 큰 수를 만드는 것이 비결이에요.',
  },
  {
    id: 'build-2-3-4-10', kind: 'build', grade: 2, topic: 'make-expr',
    prompt: '카드 2, 3, 4를 모두 한 번씩 써서 10을 만들어 보세요.',
    cards: [2, 3, 4], target: 10,
    hints: ['곱셈을 하나 넣어 보세요.', '3×4는 12예요. 거기서 2를 빼면?', '4×3−2 = 10 (또는 3×4−2)'],
    explanation: '3×4=12, 12−2=10. 한쪽으로 크게 만들고 줄이는 방법도 있어요.',
  },
  {
    id: 'build-1-2-3-7', kind: 'build', grade: 2, topic: 'make-expr',
    prompt: '카드 1, 2, 3을 모두 한 번씩 써서 7을 만들어 보세요.',
    cards: [1, 2, 3], target: 7,
    hints: ['2와 3을 곱해 볼까요?', '2×3=6이에요. 거기에 1을 더하면?', '1+2×3 = 7'],
    explanation: '2×3=6을 먼저 계산하고 1을 더해요. 1+2+3은 6밖에 안 돼요.',
  },
  {
    id: 'build-2-5-6-16', kind: 'build', grade: 2, topic: 'make-expr',
    prompt: '카드 2, 5, 6을 모두 한 번씩 써서 16을 만들어 보세요.',
    cards: [2, 5, 6], target: 16,
    hints: ['2×5는 10이에요.', '10에 나머지 카드를 더해 보세요.', '2×5+6 = 16'],
    explanation: '2×5=10, 10+6=16.',
  },
  {
    id: 'build-3-3-4-13', kind: 'build', grade: 3, topic: 'make-expr',
    prompt: '카드 3, 3, 4를 모두 한 번씩 써서 13을 만들어 보세요.',
    cards: [3, 3, 4], target: 13,
    hints: ['같은 수 3이 두 장 있어요. 곱해 볼까요?', '3×3=9예요.', '3×3+4 = 13'],
    explanation: '3×3=9, 9+4=13.',
  },
  {
    id: 'build-2-4-5-13', kind: 'build', grade: 3, topic: 'make-expr',
    prompt: '카드 2, 4, 5를 모두 한 번씩 써서 13을 만들어 보세요.',
    cards: [2, 4, 5], target: 13,
    hints: ['2×4=8이에요.', '8에 5를 더하면?', '2×4+5 = 13'],
    explanation: '2×4=8, 8+5=13.',
  },
  // ── 규칙 찾기 ──
  {
    id: 'pat-double', kind: 'input', grade: 2, topic: 'pattern',
    prompt: '규칙을 찾아 □에 알맞은 수를 쓰세요.\n2, 4, 8, 16, □', answer: 32,
    hints: ['앞의 수와 다음 수를 비교해 보세요.', '2→4, 4→8, 8→16. 어떻게 변하나요?', '2배씩 커져요. 16의 2배는 32'],
    explanation: '앞의 수의 2배가 다음 수예요. 이 게임의 과일 사다리와 같은 규칙이에요!',
  },
  {
    id: 'pat-plus3', kind: 'input', grade: 2, topic: 'pattern',
    prompt: '규칙을 찾아 □에 알맞은 수를 쓰세요.\n1, 4, 7, 10, □', answer: 13,
    hints: ['이웃한 두 수의 차를 구해 보세요.', '4−1=3, 7−4=3 …', '3씩 커져요. 10+3=13'],
    explanation: '3씩 더해지는 규칙이에요.',
  },
  {
    id: 'pat-minus10', kind: 'input', grade: 2, topic: 'pattern',
    prompt: '규칙을 찾아 □에 알맞은 수를 쓰세요.\n100, 90, 80, 70, □', answer: 60,
    hints: ['커지나요, 작아지나요?', '10씩 작아져요.', '70−10=60'],
    explanation: '10씩 작아지는 규칙이에요.',
  },
  {
    id: 'pat-grow', kind: 'input', grade: 3, topic: 'pattern',
    prompt: '규칙을 찾아 □에 알맞은 수를 쓰세요.\n1, 2, 4, 7, 11, □', answer: 16,
    hints: ['이웃한 두 수의 차를 적어 보세요.', '차가 1, 2, 3, 4 …로 커져요.', '다음 차는 5. 11+5=16'],
    explanation: '더하는 수가 1, 2, 3, 4, 5로 하나씩 커져요.',
  },
  // ── 논리·추리 ──
  {
    id: 'logic-balance', kind: 'input', grade: 2, topic: 'logic',
    prompt: '🍎 2개 = 🍐 1개\n🍐 1개 = 🍌 4개\n🍎 1개는 🍌 몇 개와 같을까요?', answer: 2, unit: '개',
    hints: ['🍐 1개는 🍎 몇 개와 같나요?', '🍎 2개가 🍌 4개와 같아요.', '4개를 똑같이 둘로 나누면 2개'],
    explanation: '🍎 2개 = 🍌 4개이니까 🍎 1개 = 🍌 2개예요.',
  },
  {
    id: 'logic-sumdiff', kind: 'input', grade: 2, topic: 'logic',
    prompt: '두 수를 더하면 12, 두 수의 차는 2예요.\n두 수 중 큰 수는 얼마일까요?', answer: 7,
    hints: ['합이 12인 두 수를 하나씩 적어 보세요.', '5와 7, 6과 6, 4와 8 중에 차가 2인 것은?', '7과 5: 7+5=12, 7−5=2'],
    explanation: '7+5=12이고 7−5=2예요. 큰 수는 7.',
  },
  // ── 경우의 수 ──
  {
    id: 'count-outfit', kind: 'input', grade: 3, topic: 'counting',
    prompt: '티셔츠 3벌과 바지 2벌이 있어요.\n티셔츠 한 벌과 바지 한 벌을 짝지어 입는 방법은 모두 몇 가지일까요?', answer: 6, unit: '가지',
    hints: ['티셔츠 한 벌마다 바지를 몇 가지로 고를 수 있나요?', '티셔츠 1벌에 바지 2가지예요.', '3×2 = 6'],
    explanation: '티셔츠 3벌 × 바지 2벌 = 6가지예요.',
  },
  {
    id: 'count-handshake', kind: 'input', grade: 3, topic: 'counting',
    prompt: '4명이 모두 한 번씩 서로 악수를 해요.\n악수는 모두 몇 번일까요?', answer: 6, unit: '번',
    hints: ['한 사람이 몇 명과 악수하나요?', '1번은 3명, 2번은 (1번과 이미 했으니) 2명 …', '3+2+1 = 6'],
    explanation: '3+2+1=6번이에요. 같은 악수를 두 번 세지 않는 것이 중요해요.',
  },
  {
    id: 'count-stairs', kind: 'input', grade: 4, topic: 'counting',
    prompt: '한 번에 1칸 또는 2칸을 오를 수 있어요.\n4칸짜리 계단을 오르는 방법은 모두 몇 가지일까요?', answer: 5, unit: '가지',
    hints: ['1칸, 2칸, 3칸 계단부터 세어 보세요.', '1칸:1가지, 2칸:2가지, 3칸:3가지', '앞의 두 개를 더해요. 2+3 = 5'],
    explanation: '1, 2, 3, 5 …로 앞의 두 수를 더하는 규칙이 있어요. 4칸은 5가지예요.',
  },
  {
    id: 'count-trees', kind: 'input', grade: 3, topic: 'counting',
    prompt: '길이 12 m인 길의 한쪽에 3 m 간격으로 처음부터 끝까지 나무를 심어요.\n나무는 모두 몇 그루일까요?', answer: 5, unit: '그루',
    hints: ['간격이 몇 개인지 먼저 세어 보세요.', '12÷3 = 4개의 간격이 있어요.', '나무는 간격보다 하나 더 많아요. 4+1 = 5'],
    explanation: '간격이 4개이고, 양 끝에 모두 심으니 나무는 4+1=5그루예요.',
  },
  // ── 수 만들기 ──
  {
    id: 'num-max', kind: 'input', grade: 2, topic: 'number-sense',
    prompt: '숫자 카드 3, 7, 5를 한 번씩 모두 써서 만들 수 있는 가장 큰 세 자리 수는?', answer: 753,
    hints: ['백의 자리에는 어떤 수를 놓아야 클까요?', '큰 수부터 차례로 놓아요.', '7, 5, 3 → 753'],
    explanation: '가장 큰 수는 큰 숫자부터 백, 십, 일의 자리에 차례로 놓아요.',
  },
  {
    id: 'num-min', kind: 'input', grade: 2, topic: 'number-sense',
    prompt: '숫자 카드 3, 7, 5를 한 번씩 모두 써서 만들 수 있는 가장 작은 세 자리 수는?', answer: 357,
    hints: ['백의 자리에는 어떤 수를 놓아야 작을까요?', '작은 수부터 차례로 놓아요.', '3, 5, 7 → 357'],
    explanation: '가장 작은 수는 작은 숫자부터 백, 십, 일의 자리에 놓아요.',
  },
  {
    id: 'num-100', kind: 'choice', grade: 2, topic: 'number-sense',
    prompt: '더해서 100이 되는 두 수는 어느 것일까요?',
    options: ['35 + 55', '48 + 52', '67 + 43', '29 + 81'], answer: 1,
    hints: ['일의 자리부터 더해 보세요.', '일의 자리를 더해서 0이 되어야 해요.', '48+52 = 100'],
    explanation: '8+2=10이라 일의 자리가 0이 되고, 십의 자리까지 올림해서 100이 돼요.',
  },
  // ── 시각과 시간 ──
  {
    id: 'time-40', kind: 'choice', grade: 2, topic: 'time',
    prompt: '지금 3시 45분이에요. 40분 뒤는 몇 시 몇 분일까요?',
    options: ['4시 15분', '4시 25분', '4시 35분', '3시 85분'], answer: 1,
    hints: ['먼저 4시 정각까지 몇 분 남았나요?', '15분 후에 4시예요. 남은 25분은?', '4시 + 25분 = 4시 25분'],
    explanation: '45분+40분=85분이고, 60분은 1시간이에요. 85−60=25분이라 4시 25분.',
  },
];
