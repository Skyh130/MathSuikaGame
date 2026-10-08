# 🍉 Math Suika Game

작은 과일을 상자에 떨어뜨려 **값이 같은** 과일끼리 닿게 하면 더 큰 과일로 변하는 수박 게임(Suika Game)입니다.
과일에는 숫자 대신 식이 적혀 있어서, `6+6` 과 `3×4` 처럼 모양은 달라도 값이 같은 것을 찾아야 합니다.
초등학교 2~4학년 **창의 수학**을 게임으로 익히도록 만들었습니다.

## 지금 되는 것 (MVP)

- 물리 수박 게임 (Matter.js): 낙하, 합체, 게임오버 라인, 다음 과일 미리보기
- **더블 숲** 월드: 2 → 4 → 8 → … → 1024 (같은 값 2개 = 다음 단계)
- 식 생성기: 한 값을 `a+b`, `a×b`, `a−b`, `a×b+c` 등 여러 모양으로 표시
- 힌트 단계 설정: 쉬움(색이 단계를 알려줌) / 보통 / 어려움(긴 식)
- 🎁 미스터리 퀘스트: 합체 5~8번마다 창의 수학 문제 (식 만들기, 규칙 찾기, 논리, 경우의 수, 수 만들기, 시간) 20문제, 힌트 3단계, 시간제한 없음
- 아이템: 🔍 힌트 · 💣 폭탄 · 🌀 흔들기 · ⏪ 되돌리기 (퀘스트를 풀면 획득)
- 주제별 정답률 기록 (`localStorage`) → 덜 본 주제, 틀린 주제를 더 자주 출제

## 실행

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # 식 생성기 / 계산기 단위 테스트
npm run build   # dist/ 생성 (GitHub Pages 배포용)
```

`main` 브랜치에 푸시하면 GitHub Actions가 Pages로 배포합니다 (레포 Settings → Pages → Source: GitHub Actions).

## 구조

```
src/
  game/      물리, 합체, 게임오버, 그리기 (Game.ts, render.ts, config.ts)
  math/      식 계산(evaluate.ts), 식 생성(expr.ts)
  content/   월드 정의(worlds.ts), 퀘스트 문제 은행(quests.ts)
  state/     localStorage 저장
  ui/        퀘스트 카드
docs/DESIGN.md   전체 설계안
```

## 다음 단계

분수 연못 · 시간/길이 마을 · 큰 수 산 · 각도 성 월드, 모험 모드, 오답 상자, 부모 리포트, PWA. 자세한 내용은 [docs/DESIGN.md](docs/DESIGN.md).
