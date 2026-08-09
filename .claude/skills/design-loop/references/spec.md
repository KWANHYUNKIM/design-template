# 산출물 규격

산출물: `templates/run-NN-<slug>.html` **단 하나**. 외부 CSS/JS 파일 없음.
빌드 도구 없이 브라우저에서 바로 열려야 한다. 한국어 페이지.

## :root 토큰 (필수)

```css
:root{
  --sans:'Pretendard Variable',Pretendard,-apple-system,system-ui,sans-serif;
  --mono:'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace;

  /* 색 — 포인트 1색 + 중성 램프. 순백(#fff) 배경 금지 */
  --ink:…; --fg:…; --body:…; --mut:…; --k:…;

  /* 타입 스케일 — 모듈러 1.25배(base 16) + 디스플레이 */
  --t-xs:12px;--t-sm:14px;--t-base:16px;--t-md:20px;--t-lg:25px;--t-xl:31px;
  --t-2xl:39px;--t-3xl:49px;--t-4xl:61px;--t-d1:76px;--t-d2:96px;

  /* 간격 스케일 — 4배수 */
  --s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;
  --s6:32px;--s7:40px;--s8:56px;--s9:80px;--s10:120px;
}
```

**모든 `font-size` 는 `var(--t-*)` 참조. 하드코딩 px 0개가 합격 기준.**
치환 후 **"원래 A가 B보다 컸던 쌍"이 유지되는지** 반드시 대조한다 —
34px·40px가 둘 다 `--t-2xl(39)` 로 흡수돼 제품명과 가격이 같은 크기가 된 적이 있다 (RUN16).

**본문에 가장 많이 쓰는 텍스트 토큰은 정의 줄에 대비비를 실측 주석으로 남긴다.**
눈으로 "회색이면 됐다" 판단하면 반드시 미끄러진다 (RUN21: 3.3:1로 AA 미달).

## 반드시 지킬 함정 20종

각각 실제 RUN에서 터진 것들이다.

1. **Grid 자식에 `min-width:0`** — 없으면 이미지의 min-content가 원본폭이라 텍스트 열이 찌그러진다
2. **리빌 클래스는 `.rise`/`.vis` 같은 고유명** — `.in` 금지. 레이아웃 클래스와 충돌해 텍스트 div가 grid로 변한다
3. **한글: `word-break:keep-all` + `overflow-wrap:break-word`** — 없으면 "디스플레이 산세리/프."처럼 단어 중간이 끊긴다
4. **웹폰트는 `<link>`로 실제 로드** — 이름만 적으면 그 폰트가 깔린 기기에서만 보인다
   `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css`
5. **`scroll-behavior:smooth`는 스크롤복원 가드를 무력화** — `scrollTo(0,0)`이 애니메이션이 되어 브라우저 복원과 경합한다
   ```js
   if('scrollRestoration' in history)history.scrollRestoration='manual';
   (function(){var h=document.documentElement,p=h.style.scrollBehavior;h.style.scrollBehavior='auto';
    scrollTo(0,0);addEventListener('load',function(){scrollTo(0,0);
    setTimeout(function(){h.style.scrollBehavior=p},60)})})();
   ```
6. **`.wrap` 과 클래스를 겸하는 섹션에 `padding` 단축 금지** — 좌우값을 덮어써 그 섹션만 어긋난다.
   `padding-top`/`padding-bottom` 으로 쪼갤 것. **문서에 써두고도 두 번 재발한 항목이다**
7. **사진 위 모노 캡션에 어두운 중성색 금지** — 밝은 영역에서 안 읽힌다. 밝은 값 + `text-shadow` 또는 스크림 강화
8. **카운트업 단위는 `<span>` 분리 + `white-space:nowrap`** — 통째 텍스트면 좁은 칸에서 줄바꿈돼 베이스라인이 어긋난다.
   단, nowrap은 이번엔 **가로 오버플로**로 실패할 수 있다 → 트랙을 `minmax(max-content,1fr)` 로
9. **발명한 수치·단위는 라벨과 의미가 일치** — `71개국`(국가) + 라벨 `지원 언어`(언어)는 즉각 가짜 티
10. **마그네틱 버튼은 버튼+소반경 래퍼(`.mag-zone` padding~46px)로만 스코핑** — 부모 섹션에 걸면 가장자리에서 수백px 튄다
11. **footer 등 화면에 보이는 텍스트에 파이프라인 메타 노출 금지** — RUN 번호·프리셋명·티어. 추적정보는 HTML 주석으로
12. **표를 카드로 접을 때 `td`를 `display:flex`로 만들지 말 것** — `tr`이 `display:block`인 상태에서
    `td`가 flex가 되면 **크롬이 셀의 텍스트 노드를 통째로 잃는다**(RUN30 격리 재현). `display:grid` 로 할 것.
    그리고 접힌 셀에 **요소+텍스트가 섞여 있으면**(예: 색칩 `<span>` + 색이름) grid 아이템이 셋이 되어
    이름이 라벨 열로 떨어진다 → **하나의 `<span>`으로 감쌀 것.** 접힌 카드에서 `text-align:right`도 금지
    (값이 2열 밖으로 밀려 화면을 벗어난다)
13. **`display:block`이 된 표의 `caption`은 `display:block`을 함께 줄 것** — `table-caption`인 채로 두면
    shrink-to-fit 되어 한 단어씩 세로로 선다 (RUN30)
14. **`object-fit:cover`는 컨테이너가 원본보다 "세로로 길면" 세로를 자르지 않는다** — 사진 아래쪽의
    원치 않는 피사체를 지우려고 `object-position`의 Y만 만져도 아무 일도 안 일어난다.
    **`aspect-ratio`를 원본보다 납작하게 고정**해야 세로 크롭이 걸린다. 가로도 같은 원리 (RUN30)
15. **각주 참조와 각주 본문은 같은 뷰포트에 들어와야 한다** — 호버로 각주를 켜도
    3,000px 아래에 있으면 아무도 볼 수 없다. `shoot.mjs --probe` 의 `farFootnotes` 가 잰다 (RUN30)
16. **리빌은 `.js` 게이트 뒤에 둘 것** — `.rise{opacity:0}` 을 무조건 걸면 **스크립트가 꺼진 브라우저에서
    지면이 통째로 백지가 된다.** `<html class="js">` 를 페인트 전에 붙이고 `.js .rise{opacity:0}` 로 쓴다.
    `shoot.mjs --probe` 의 `noJS` 가 잰다 (RUN31 · 같은 결함이 RUN30에도 있었다)
17. **미디어쿼리에서 두 칸을 좁힐 때 열만 맞바꾸지 말 것** — 넓은 콘텐츠에 넓은 트랙을 주려고
    `grid-column` 을 바꾸면 DOM 순서와 시각 순서가 어긋난다. **한 칸으로 세울 것.**
    좁은 트랙에 표가 갇히는 것은 `--probe` 의 `trackMismatch` 가 잰다 (RUN31)
18. **두 칸 나란한 자리는 `grid-row` 를 명시할 것** — `margin-top` 으로 띄우면 좌우 기둥의
    시작 높이가 서로 달라져 읽기 순서가 실제로 뒤집힌다 (RUN31)
19. **격자 괘선·오버레이는 `z-index` 로 콘텐츠 뒤에 둘 것** — 앞에 두면 사진과 헤드라인 위를
    선이 가로지른다. "격자를 보이게"와 "콘텐츠를 가로지르게"는 다르다 (RUN31)
20. **"실제 비율로 그렸다"고 쓰려면 비율을 계산해 묶을 것** — RUN31은 1:1.667 을 선언하고
    1:2.308 로 그렸다. `calc(var(--pitch)*.6)` 처럼 **선언값과 구현을 한 변수로 연결**한다

## 이미지

- 실사 Unsplash. 쓰기 전 `curl -s -o /dev/null -w "%{http_code}"` 로 200 확인
- **그리고 컨택트시트로 눈으로 본다** — 로드 검증은 "맞는 이미지인가"를 보장하지 않는다
- 모든 `<img>` 에 `onerror` 그라디언트 폴백
- 기존 RUN이 쓴 ID와 중복 금지
- 상표 노출컷 제외

## 반응형·접근성

- **900px 이하**: sticky pin/스크럽류는 해제하고 `scroll-snap` 캐러셀 등으로 폴백
  (안 하면 빈 500vh 구간이 생긴다)
- `prefers-reduced-motion`: 같은 폴백 + 애니 정지
- `overflow-x` 절대 없을 것
- IntersectionObserver 리빌에는 **load 폴백** 필수 (뷰포트 안 요소 즉시 표시)

## 캡처 모드 (`?capture=1`)

디자인 툴 반출용. 없으면 캡처 시 리빌 섹션이 **빈 프레임**으로, 가로 스크럽은 **1/5 패널만** 넘어간다.

```js
var CAPTURE=/[?&]capture=1/.test(location.search);
if(CAPTURE)document.documentElement.classList.add('capture');
var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches||CAPTURE;
```
`.capture` 에서: 리빌 강제 표시 · 핀/스크럽 해제 후 세로로 펼침 · 무한 애니 정지 · 카운트업 최종값 고정

## "사람이 만든 티" 체크리스트

- 헤드라인 강조어 **1개만** (색 또는 마커)
- 포인트색 1~2개로 절제, 나머지 중성
- 넉넉한 여백 · 큰 타입 스케일 · 낮은 대비 본문
- 비대칭 히어로 + 플로팅 디테일(칩/배지)
- **제3자 트러스트 신호** — 평점·건수·실명 리뷰(이름·직함·소속)·사용 크레딧.
  내가 쓴 카피가 아니라 **남이 나에 대해 한 말**이어야 점수가 된다
- 스크롤 리빌 + hover + 미세 모션 **2종 이상 혼합**
- 그레인 텍스처 최소 1곳
- **방문자가 직접 조작해 결과가 눈에 보이는 인터랙션 1개**
  슬라이더는 값만 바꾸지 말고 **화면을 바꿔야** 한다.
  그리고 **직전 RUN과 "종류"가 달라야** 한다 — 조작 대상만 바꾼 같은 물건은 새 인터랙션이 아니다
