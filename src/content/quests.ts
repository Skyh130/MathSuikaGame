export type Topic =
  | 'make-expr'
  | 'pattern'
  | 'logic'
  | 'counting'
  | 'number-sense'
  | 'time'
  | 'measure'
  | 'fraction'
  | 'big-number'
  | 'angle'
  | 'multiply';

export type Difficulty = 1 | 2 | 3;

interface Base {
  /** 문제 하나(숫자까지 정해진 것)의 고유 번호. 오답 상자가 이걸로 구분한다 */
  id: string;
  /** 문제 틀(템플릿) 번호. 같은 틀이 연달아 나오지 않게 하는 데 쓴다 */
  tpl?: string;
  /** 난이도 1(쉬움) ~ 3(어려움). 없으면 학년에서 정한다 */
  diff?: Difficulty;
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
  measure: '길이 재기',
  fraction: '분수',
  'big-number': '큰 수',
  angle: '각도',
  multiply: '곱셈·나눗셈',
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

  // ── 길이 (길이 마을) ──
  {
    id: 'len-135', kind: 'input', grade: 2, topic: 'measure',
    prompt: '1 m 35 cm는 몇 cm일까요?', answer: 135, unit: 'cm',
    hints: ['1 m는 몇 cm인가요?', '1 m = 100 cm예요.', '100 cm + 35 cm = 135 cm'],
    explanation: '1 m = 100 cm이니까 1 m 35 cm = 135 cm예요.',
  },
  {
    id: 'len-longest', kind: 'choice', grade: 2, topic: 'measure',
    prompt: '가장 긴 길이는 어느 것일까요?',
    options: ['99 cm', '1 m 5 cm', '150 cm', '1 m 20 cm'], answer: 2,
    hints: ['단위를 cm로 똑같이 맞춰 보세요.', '1 m 5 cm = 105 cm, 1 m 20 cm = 120 cm', '99, 105, 150, 120 중 가장 큰 수는 150'],
    explanation: '모두 cm로 바꾸면 99, 105, 150, 120. 가장 긴 것은 150 cm예요.',
  },
  {
    id: 'len-rope', kind: 'input', grade: 2, topic: 'measure',
    prompt: '길이가 2 m인 끈에서 85 cm를 잘라 썼어요.\n남은 끈은 몇 cm일까요?', answer: 115, unit: 'cm',
    hints: ['2 m를 cm로 바꾸면?', '200 cm에서 85 cm를 빼요.', '200 − 85 = 115'],
    explanation: '2 m = 200 cm이고, 200 − 85 = 115 (cm)예요.',
  },
  {
    id: 'len-ant', kind: 'input', grade: 3, topic: 'measure',
    prompt: '개미가 1분에 30 cm를 가요.\n3 m를 가려면 몇 분이 걸릴까요?', answer: 10, unit: '분',
    hints: ['3 m는 몇 cm일까요?', '300 cm를 30 cm씩 나누어 보세요.', '300 ÷ 30 = 10'],
    explanation: '3 m = 300 cm이고, 30 cm씩 가니까 300 ÷ 30 = 10분이에요.',
  },
  {
    id: 'len-mm', kind: 'input', grade: 3, topic: 'measure',
    prompt: '1 cm = 10 mm예요.\n5 cm 3 mm는 몇 mm일까요?', answer: 53, unit: 'mm',
    hints: ['5 cm는 몇 mm일까요?', '5 cm = 50 mm', '50 mm + 3 mm = 53 mm'],
    explanation: '5 cm = 50 mm, 거기에 3 mm를 더해 53 mm예요.',
  },
  // ── 시간 (시계탑) ──
  {
    id: 'time-100', kind: 'input', grade: 2, topic: 'time',
    prompt: '1시간 40분은 모두 몇 분일까요?', answer: 100, unit: '분',
    hints: ['1시간은 몇 분일까요?', '1시간 = 60분', '60 + 40 = 100'],
    explanation: '1시간 = 60분이니까 60분 + 40분 = 100분이에요.',
  },
  {
    id: 'time-movie', kind: 'input', grade: 3, topic: 'time',
    prompt: '영화가 3시 30분에 시작해서 5시 10분에 끝났어요.\n영화는 모두 몇 분 동안 했을까요?', answer: 100, unit: '분',
    hints: ['먼저 4시 30분이 될 때까지 몇 분일까요?', '3:30 → 5:30 은 120분이에요. 5:10 은 거기서 20분 모자라요.', '120 − 20 = 100'],
    explanation: '3시 30분 → 5시 30분은 120분, 5시 10분은 20분 빠르니까 120 − 20 = 100분이에요.',
  },
  {
    id: 'time-hand', kind: 'input', grade: 3, topic: 'time',
    prompt: '시계의 긴바늘이 한 바퀴 돌면 60분이에요.\n긴바늘이 3바퀴 반을 돌면 몇 분일까요?', answer: 210, unit: '분',
    hints: ['3바퀴는 몇 분일까요?', '3바퀴 = 180분, 반 바퀴는 30분이에요.', '180 + 30 = 210'],
    explanation: '60 × 3 = 180, 반 바퀴는 30분이라 180 + 30 = 210분이에요.',
  },
  {
    id: 'time-school', kind: 'input', grade: 2, topic: 'time',
    prompt: '오전 9시부터 오후 3시까지는 몇 시간일까요?', answer: 6, unit: '시간',
    hints: ['낮 12시까지는 몇 시간일까요?', '9시 → 12시는 3시간, 12시 → 3시도 3시간', '3 + 3 = 6'],
    explanation: '오전 9시 → 낮 12시는 3시간, 낮 12시 → 오후 3시는 3시간. 모두 6시간이에요.',
  },
  // ── 분수 (분수 연못) ──
  {
    id: 'fr-pizza', kind: 'choice', grade: 3, topic: 'fraction',
    prompt: '피자 한 판을 똑같이 8조각으로 나눴어요.\n민수가 3조각, 지아가 2조각을 먹었다면 남은 피자는 전체의 얼마일까요?',
    options: ['3/8', '5/8', '2/8', '1/8'], answer: 0,
    hints: ['먹은 조각은 모두 몇 개일까요?', '3 + 2 = 5조각을 먹었어요.', '8 − 5 = 3조각이 남아요. 3/8'],
    explanation: '8조각 중 5조각을 먹었으니 남은 것은 3조각, 전체의 3/8이에요.',
  },
  {
    id: 'fr-equal', kind: 'input', grade: 3, topic: 'fraction',
    prompt: '1/4과 크기가 같은 분수 □/8 에서\n□에 알맞은 수는 얼마일까요?', answer: 2,
    hints: ['분모 4가 8이 되려면 몇 배 해야 하나요?', '분모가 2배가 되었으니 분자도 2배예요.', '1 × 2 = 2, 그래서 2/8'],
    explanation: '분모와 분자에 똑같이 2를 곱하면 크기가 같아요. 1/4 = 2/8.',
  },
  {
    id: 'fr-biggest', kind: 'choice', grade: 3, topic: 'fraction',
    prompt: '피자를 똑같이 나눈 한 조각이에요.\n가장 큰 조각은 어느 것일까요?',
    options: ['1/8', '1/5', '1/3', '1/2'], answer: 3,
    hints: ['전체를 몇 조각으로 나눴는지 보세요.', '많이 나눌수록 한 조각은 작아져요.', '2조각으로 나눈 1/2이 가장 커요'],
    explanation: '분자가 1로 같을 때는 분모가 작을수록 더 큰 분수예요. 가장 큰 것은 1/2.',
  },
  {
    id: 'fr-half-of-rest', kind: 'input', grade: 4, topic: 'fraction',
    prompt: '케이크를 똑같이 4조각으로 나누어 3조각을 먹었어요.\n남은 케이크를 다시 반으로 나누면, 한 조각은 전체의 1/□ 이에요. □는?', answer: 8,
    hints: ['남은 케이크는 전체의 얼마일까요?', '남은 것은 1/4이에요. 이것을 반으로 나눠요.', '1/4의 반은 1/8'],
    explanation: '남은 케이크는 1/4. 이것을 반으로 나누면 전체를 8조각으로 나눈 것 중 1조각이니 1/8이에요.',
  },
  {
    id: 'fr-sum1', kind: 'input', grade: 4, topic: 'fraction',
    prompt: '두 분수의 합이 1이에요. 한 분수가 5/9라면\n다른 분수는 □/9 예요. □는?', answer: 4,
    hints: ['1을 9/9로 바꿔 보세요.', '9/9 − 5/9 를 계산해요.', '9 − 5 = 4'],
    explanation: '1 = 9/9이니까 9/9 − 5/9 = 4/9예요.',
  },
  // ── 큰 수 (큰 수 산) ──
  {
    id: 'big-35200', kind: 'input', grade: 4, topic: 'big-number',
    prompt: '10000이 3개, 1000이 5개, 100이 2개인 수는 얼마일까요?', answer: 35200,
    hints: ['각각 얼마인지 먼저 구해 보세요.', '30000, 5000, 200이에요.', '30000 + 5000 + 200 = 35200'],
    explanation: '30000 + 5000 + 200 = 35200 (3만 5천 2백)이에요.',
  },
  {
    id: 'big-biggest', kind: 'choice', grade: 4, topic: 'big-number',
    prompt: '가장 큰 수는 어느 것일까요?',
    options: ['9만 8천', '10만', '99999', '9만 9천 9백'], answer: 1,
    hints: ['모두 숫자로 바꿔 보세요.', '98000, 100000, 99999, 99900', '자릿수가 가장 많은 수가 가장 커요'],
    explanation: '10만 = 100000은 여섯 자리 수이고 나머지는 다섯 자리 수예요.',
  },
  {
    id: 'big-jump', kind: 'input', grade: 4, topic: 'big-number',
    prompt: '1만 6천에서 3천씩 3번 뛰어 센 수는 얼마일까요?', answer: 25000,
    hints: ['3천씩 3번은 모두 얼마일까요?', '3000 × 3 = 9000', '16000 + 9000 = 25000'],
    explanation: '16000 → 19000 → 22000 → 25000. 25000(2만 5천)이에요.',
  },
  {
    id: 'big-cards', kind: 'input', grade: 4, topic: 'big-number',
    prompt: '숫자 카드 5, 0, 7, 2, 9를 한 번씩 모두 써서 만들 수 있는\n가장 작은 다섯 자리 수는 얼마일까요?', answer: 20579,
    hints: ['작은 수부터 놓으면 될까요? 0은 맨 앞에 올 수 없어요.', '맨 앞에는 0 다음으로 작은 2를 놓아요.', '2, 0, 5, 7, 9 → 20579'],
    explanation: '0은 맨 앞에 올 수 없으니 2를 맨 앞에, 그다음 0, 5, 7, 9 순서로 20579예요.',
  },
  // ── 각도 (각도 성) ──
  {
    id: 'ang-tri', kind: 'input', grade: 4, topic: 'angle',
    prompt: '삼각형의 두 각이 70°, 50°예요.\n나머지 한 각은 몇 도일까요?', answer: 60, unit: '도',
    hints: ['삼각형의 세 각을 모두 더하면 얼마일까요?', '세 각의 합은 180°예요.', '180 − 70 − 50 = 60'],
    explanation: '삼각형의 세 각의 합은 180°라서 180 − 70 − 50 = 60°예요.',
  },
  {
    id: 'ang-right', kind: 'input', grade: 4, topic: 'angle',
    prompt: '직각은 90°예요.\n직각에서 35°를 뺀 각은 몇 도일까요?', answer: 55, unit: '도',
    hints: ['직각은 몇 도일까요?', '90°에서 35°를 빼요.', '90 − 35 = 55'],
    explanation: '90° − 35° = 55°예요.',
  },
  {
    id: 'ang-quad', kind: 'input', grade: 4, topic: 'angle',
    prompt: '사각형의 네 각의 합은 360°예요.\n세 각이 90°, 90°, 100°라면 나머지 한 각은 몇 도일까요?', answer: 80, unit: '도',
    hints: ['세 각을 먼저 더해 보세요.', '90 + 90 + 100 = 280', '360 − 280 = 80'],
    explanation: '세 각의 합이 280°이니 나머지는 360 − 280 = 80°예요.',
  },
  {
    id: 'ang-clock', kind: 'choice', grade: 4, topic: 'angle',
    prompt: '시계가 3시 정각일 때, 시침과 분침이 이루는 작은 각은 몇 도일까요?',
    options: ['30°', '60°', '90°', '120°'], answer: 2,
    hints: ['3시 정각에 두 바늘의 모양을 떠올려 보세요.', '12와 3을 가리켜요. 직각 모양이에요.', '직각 = 90°'],
    explanation: '3시 정각에는 한 바늘은 12, 다른 바늘은 3을 가리켜 직각(90°)을 이뤄요.',
  },
  {
    id: 'ang-equi', kind: 'input', grade: 4, topic: 'angle',
    prompt: '세 각의 크기가 모두 같은 삼각형이 있어요.\n한 각은 몇 도일까요?', answer: 60, unit: '도',
    hints: ['세 각의 합은 180°예요.', '똑같이 3으로 나누어요.', '180 ÷ 3 = 60'],
    explanation: '세 각이 같고 합이 180°이니 한 각은 180 ÷ 3 = 60°예요.',
  },
];
