---
name: design-release
description: 템플릿을 공개 사이트에 반영하고 홍보 자산을 갱신한다. 갤러리(index.html) 카드 추가·카운트 갱신, 제작 기록(log.html) RUN 카드, 인스타 포스팅 카드·캡션 생성, GitHub Pages 배포 확인, 피그마 링크 연결. "갤러리 갱신", "배포해줘", "인스타 카드 만들어줘", "사이트에 올려줘", "포스팅 준비" 요청에 사용.
---

# 배포 · 홍보 갱신

공개 사이트: **https://kwanhyunkim.github.io/design-template/**
로컬 확인: `python3 -m http.server 5500` → http://localhost:5500

## 사이트 구조

```
index.html        갤러리 — 템플릿 미리보기 + 내려받기 (사이트 루트)
log.html          제작 기록 — RUN마다 무엇을 왜 바꿨는지 + 채점 결과
figma-links.json  피그마 디자인 시스템이 있는 RUN의 매핑
templates/        템플릿 원본
posts/            인스타 카드 + 캡션 (생성물)
```

## 새 RUN을 사이트에 반영

1. **갤러리 카드** — `index.html` 의 `.grid` 안에 `<article class="card">` 를 **번호 내림차순 맨 앞**에 추가.
   미리보기는 `<iframe src="templates/…">` 를 `transform:scale(.2)` 로 축소한 것이고,
   내려받기는 `<a download>` 다. 상단 `<span class="c">NN runs</span>` 카운트도 함께 갱신.

2. **제작 기록 카드** — `log.html` 에 RUN 카드 추가. 기존 카드 구조를 그대로 따른다:
   ① 컨셉(발명) ② 무드·구조·이펙트 ③ 크리틱 결과 ④ 결과물 링크.
   챔피언이 바뀌었으면 이전 카드의 🏆 배지를 떼고 새 카드에 붙인다.

3. **포스팅 자산** — `node scripts/make-posts.mjs` 실행. 전체가 다시 생성된다.

4. **배포 확인**
   ```bash
   git push origin main
   sleep 45
   curl -s -o /dev/null -w "%{http_code}" https://kwanhyunkim.github.io/design-template/
   ```
   Pages 빌드에 30초~2분 걸린다. 200이 아니면 조금 기다렸다 다시 확인한다.

## 인스타그램

`node scripts/make-posts.mjs` 가 `posts/card-NN.html`(1080×1350)과 `posts/captions.md` 를 만든다.
카드 안에 템플릿을 iframe으로 박아 넣어서 **템플릿을 고치면 카드도 따라 바뀐다.**

**업로드는 자동화하지 않는다.** 인스타 API 자동 포스팅은 비즈니스/크리에이터 계정 전환 +
Meta 앱 심사 + 장기 토큰이 전제이고, 통과해도 ToS 회색지대라 계정 정지 위험이 남는다.
사용자가 직접 올리도록 "올리기 직전" 상태까지만 만든다.

카드를 캡처할 때는 **iframe이 다 뜬 뒤에** 찍는다 — 늦게 뜨면 빈 칸으로 찍힌다.

## 피그마 연결

`figma-links.json` 에 `{"16": {"url": "...", "label": "디자인 시스템"}}` 형태로 매핑한다.
갤러리는 이 파일을 읽어 해당 RUN 카드에만 "피그마에서 보기" 버튼을 붙인다.

**주의:** 피그마 파일은 기본이 비공개다. 방문자가 열려면 파일 공유를
"링크가 있는 모든 사용자 — 보기 가능"으로 바꿔야 한다. 이건 사용자가 직접 해야 하는
공유 설정 변경이므로, 링크를 걸기 전에 확인한다.

피그마에 올리는 방법은 `design-automation-workflow.md` §STEP 7 참조.
요지: **피그마는 페이지가 아니라 디자인 시스템(토큰·컴포넌트)을 갖는다.**
랜딩을 통째로 옮기면 T3 모션이 전부 날아가고 편집 불가능한 프레임 덩어리가 된다.

## 체크리스트

- [ ] 갤러리 카드 추가 + `NN runs` 카운트 일치
- [ ] `log.html` RUN 카드 + 챔피언 배지 이동
- [ ] `node scripts/verify.mjs` 오류 0
- [ ] `node scripts/make-posts.mjs` 재생성
- [ ] 갤러리의 모든 링크가 200인지 확인
- [ ] push 후 Pages 배포 확인
