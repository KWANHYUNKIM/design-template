# Instagram → MUDS 무드 주입 자동화 워크플로우

Instagram `#디자인` 피드에서 영감을 한 장 뽑아 그 "느낌"을 MUDS 디자인 시스템에 주입하고,
그 시스템으로 웹사이트 프로젝트를 뽑아내는 파이프라인. 스케줄로 반복 실행하는 것이 목표.

---

## 0. 개념 (순서 중요)

```
[base MUDS 복제] → [Instagram 사진 1장] → [느낌 추출] → [MUDS에 느낌 주입] → [프로젝트(웹사이트) 생성]
```

- 핵심: **먼저 사진의 느낌을 MUDS 파운데이션(토큰·가이드라인)에 넣는다.** 페이지를 먼저 만들지 않는다.
- 토큰 **이름은 절대 바꾸지 않고 값만** 바꾼다 → 모든 컴포넌트/ui_kit이 자동으로 새 무드를 입는다.

---

## 1. 설정 (config)

| 변수 | 값 | 비고 |
|---|---|---|
| `BASE_PROJECT_ID` | `79a6f9c7-6f89-4213-9450-f352bae2aaf7` | 깨끗한 base = "MUDS (Farm-In-Main-Website)". **복제 원본은 항상 깨끗한 base여야 함** (이미 무드 주입된 프로젝트를 재복제하지 말 것) |
| `INSTAGRAM_URL` | `https://www.instagram.com/explore/search/keyword/?q=%23%EB%94%94%EC%9E%90%EC%9D%B8` | `#디자인` 검색 — **무드(토큰)** 소스 |
| `STRUCTURE_SOURCE` | `landingfolio.com`(섹션별) · `land-book.com`(풀페이지) · `godly.website` · `lapa.ninja` | **구조(레이아웃 레시피)** 소스 갤러리. 로그인 불필요 |
| `EFFECT_SOURCE` | GitHub 이펙트 레포 (§이펙트 라이브러리 참고) | **프리미엄 인터랙션(Liquid Glass·Liquid Metal·GSAP)** 소스 |
| `NAMING` | `MUDS (auto-YYYYMMDD-HHmm)` | 새 프로젝트 이름 규칙 |

> 날짜/시간은 실행 시점 값으로 채운다. (스케줄 러너가 주입하거나, 프로젝트 목록의 `updatedAt`으로 대체)

---

## 2. 매 실행 단계 (each run)

### STEP 0 — 아트디렉터 배정 (매 RUN 최우선) ★
> **수렴은 만든 뒤가 아니라 만들기 전에 깨야 한다.**
> RUN 17~22에서 구조는 이미 갈라졌는데(오리지널리티 5가 두 번) 결과물이 여전히 비슷해 보이는 이유는
> 구조가 아니라 **손맛**이다 — 한 모델이 다 그리면 여백 감각·라운드·그림자·대비가 한 점으로 수렴한다.

1. `art-directors.md` 에서 `RUN 번호 % 3` 으로 디렉터를 배정한다 (연속 두 RUN이 같은 디렉터 금지).
   - **AD-1 한서린** 스위스 그리드파 — 격자를 드러냄 · 라운드 12px 초과 금지 · 그림자 금지
   - **AD-2 도진** 브루탈리스트 — 압도적으로 큰 요소 하나 · 유리질/블러 금지 · 균등 카드 그리드 금지
   - **AD-3 유서경** 편집디자인파 — 본문 조판 먼저 · 캡션 없는 사진 금지 · 균일 섹션 패딩 금지
2. 배정된 디렉터의 **do / don't 를 둘 다** 지킨다. **don't 위반은 완성도 −1**.
3. 크리틱은 기존 8기준에 더해 **"결과물만 보고 어느 AD인지 맞힐 수 있는가"** 를 판정한다.
   못 맞히면 수렴 실패로 보고 **오리지널리티 상한 3**.
4. 화면에 디렉터 이름을 노출하지 않는다.

---

### STEP 8 — 반자동 루프 (생성은 무인 · 검증은 사람이 있는 세션에서) ★
> **왜 완전 무인이 아닌가:** 지금까지 잡은 결함의 절반 이상이 브라우저로 눈으로 본 것들이다 —
> `.wrap` padding 붕괴 · 사진↔캡션 불일치(CNC 캡션 아래 석유화학 플랜트) · 지형이 배경과 같은 밝기 ·
> CSS 도판 특이도 사고. 검증 없는 무인 루프는 **점수만 오르고 품질은 안 오른다**.

**무인 구간 (스케줄러가 밤새 돌림)**
1. STEP 0 디렉터 배정 → STEP 3 컨셉·콘텐츠 발명 → STEP 5 생성
2. `node scripts/verify.mjs` 자동 통과까지 반복 — 오류 0이 될 때까지 스스로 고친다
3. 결과를 `templates/` 에 두되 **갤러리에는 아직 올리지 않는다**

**사람 있는 구간 (다음 세션에서 일괄)**
4. 브라우저로 **390 / 1024 / 1440 세 폭**을 직접 본다
5. 후보 이미지는 **컨택트시트로 한 번에** 확인 — `curl 200` 은 "뜨는가"만 보장하고 "맞는가"는 보장하지 않는다
6. 독립 크리틱 채점 → 결함 수정 → `EVOLUTION.md` 기록 → 갤러리 반영 → 커밋

**검사기가 잡는 것 / 못 잡는 것**
| 자동으로 잡힘 | 눈으로만 잡힘 |
|---|---|
| 하드코딩 font-size · keep-all · 웹폰트 로드 · onerror · 스크롤 가드 · `.wrap` padding 단축 · reduced-motion · 모바일 폴백 · 파이프라인 메타 누출 | 레이아웃 붕괴 · 사진↔캡션 불일치 · 실제 대비 · 인터랙션 동작 · 위계가 실제로 읽히는지 |

---

### STEP 1 — base MUDS 복제
- **방식 A (권장, 사람 로그인 세션):** 브라우저로 `claude.ai/design` 열기 → base 프로젝트 카드의 `...` 메뉴 → **Duplicate** 클릭 → 복제본 projectId 확보.
- **방식 B (API 폴백):** `DesignSync create_project` 로 새 프로젝트 생성 후, base의 파일을 `get_file`→`write_files`로 복사. (느리고 바이너리 폰트/이미지 손실 위험 → 방식 A 실패 시에만)
- 결과: `NEW_PROJECT_ID` 확정.

### STEP 2 — Instagram 사진 1장 선택
- `claude-in-chrome`으로 `INSTAGRAM_URL` 열기 (로그인된 크롬 필요).
- 첫 화면 스크린샷 → 타일 중 **무드가 가장 뚜렷한 1장** 선택 (브랜드 라벨/제품컷/편집형 타이포가 있는 것 우선).
- 선택 타일을 `zoom`으로 확대해 색을 정확히 샘플링.

### STEP 2.5 — 구조 선택 (structure preset)
- **§A-5 프리셋 라이브러리에서 `상태=available`인 프리셋 하나**를 꺼낸다(이전 RUN과 다른 것). 무드/업종에 맞는 것 우선.
- 라이브러리가 부족하거나 새 시도를 원하면 `STRUCTURE_SOURCE` 갤러리/GitHub에서 **새 구조를 조사 → 모듈 시퀀스로 분해 → P9, P10…으로 A-5에 append** 후 사용.
- 그 프리셋의 **시그니처 이펙트**(§이펙트 라이브러리)도 함께 채택.
- 레퍼런스는 **대기업·유명 제품 페이지를 적극적으로 뜯어 온다** — 그리드·타입 시스템·컬러 로직·
  모션 패턴·정보 설계·완성도 기준까지. 가져오는 것과 가져오지 않는 것의 목록은 `taste` §5.
  선은 하나다: **로고·브랜드자산·그 회사인 척하기는 안 된다.** 이 저장소는 매 RUN 브랜드를 발명하므로
  자연히 지켜진다. 카피·이미지·수치는 STEP 3 무드에서 온다.
- 한 곳만 보고 만들면 그 회사처럼 보인다 → **두 곳 이상 섞고**, 배정된 AD의 don't를 레퍼런스보다 우선한다.
- 사용 후 해당 프리셋 상태를 `used`로 바꾸고, 대시보드 RUN 카드의 `구조 레시피`에 프리셋명 기록.

### STEP 3 — 무드 추출 + 컨셉·콘텐츠 발명 ★
> **가장 중요:** 색만 뽑지 말고 **사진을 보고 브랜드·서사·콘텐츠를 통째로 상상**한다.
> 지금까지의 문제: 콘텐츠 아카이타입(hero→기능3→리뷰→CTA)이 매번 같아 "내용·구조가 똑같다"는 느낌 → 콘텐츠를 **매번 새로 발명**한다.

**3-1. 무드(디자인)**
- 팔레트(브랜드색 1·중성 온도/hue·배경 톤) · 타이포 성격 · 질감 · 무드 키워드 5~8 + do/don't

**3-2. 컨셉 발명 (사진에서 상상)**
- **브랜드/주체:** 이 사진이 광고한다면 무엇? (업종·이름·톤) — 이전 RUN과 겹치지 않게
- **한 줄 서사(빅 아이디어):** 이 페이지가 하려는 말 한 문장
- **콘텐츠 아카이타입 선택 (§A-0):** 매번 다르게

**3-3. 콘텐츠 실제 작성**
- 위 컨셉으로 **섹션 주제·헤드라인·본문·제품/항목명·수치·리뷰를 직접 창작**한다. 템플릿 채우기가 아니라 그 브랜드가 실제로 쓸 법한 카피.
- **이전 RUN들과 섹션 주제·문구가 겹치면 안 됨** (대시보드로 대조).

### STEP 4 — MUDS에 느낌 주입 (핵심)
`DesignSync`로 `NEW_PROJECT_ID`에 두 파일을 쓴다. `finalize_plan`(deletes: `[]` 필수) → `write_files`.

1. **`tokens/colors.css` 교체** — 아래 규칙 유지:
   - 원본의 **모든 토큰 이름 그대로** (`--grey-50..900`, `--brand-50/500/600/700`, `--emerald/green/red/amber/blue-*`, `--sky-600`, `--palette-*`, `--text-*`, `--background-*`, `--action-*`, `--alert-*`, `--stat-*`, `--chart-*`).
   - 중성 램프 = 추출한 온도/hue로 이동 · 브랜드 = 포인트색 · 시맨틱 채도 ≤ 브랜드.
   - 상단 주석에 **영감 원본과 근거**를 기록.
2. **`guidelines/mood-instagram.html` 추가** — 첫 줄 `<!-- @dsCard group="Guidelines" ... -->` 마커 포함. 추출 팔레트 스와치·무드 키워드·적용 원칙을 담은 무드보드 카드. (템플릿: 이 저장소 이전 실행본 참고)

### STEP 5 — 레이아웃 레시피 결정 + 랜딩 생성
1. **레이아웃 레시피 선택 (§규격 A-3):** 이전 RUN의 구조와 **최소 3개 다르게** 모듈 구성·순서·변주를 정한다. 이미지 구도로 힌트를 받는다.
2. 그 레시피에 STEP 3의 무드(토큰·타이포·라운드·이미지)를 입혀 랜딩 한 장을 만든다.
- 산출물: `templates/run-NN-<brand>.html` — **자체완결**(MUDS 토큰을 `:root`에 인라인, 실사 이미지 URL 포함).
- (병행, 선택) MUDS 프로젝트의 `ui_kits/website/*`도 토큰을 참조하므로 자동 반영됨 → 디자인시스템-of-record용.
- **이미지는 쓰기 전에 브라우저 로드 검증**(§함정). **합격 기준 = §체크리스트 통과.**

### STEP 6 — 렌더 검증 & 대시보드 기록
- 로컬 서버로 렌더 확인: `python3 -m http.server` → 크롬으로 `templates/run-NN-*.html` 열기(§함정: `file://` 차단). 이상 시 `javascript_tool`로 계산폭 조회.
- **메인 `index.html` 대시보드에 RUN 카드 append**: ①채택 사진(+why) ②MUDS Before→After 표 ③**구조 레시피**(모듈 순서·변주, 이전 RUN과 무엇이 다른지) ④사람티 체크 ⑤결과물 링크. `실행 기록` 카운트 +1.
- 대시보드는 **`http://localhost:5500/`** 에서 확인(로컬 Live Server / `python3 -m http.server 5500`).

### STEP 7 — 피그마 동기화 (매 RUN 필수) ★
> **원칙: 피그마는 "디자인 시스템"을 갖고, 페이지 원본은 코드다.**
> 랜딩 자체를 피그마로 옮기려 하지 말 것 — 스크롤 스크럽·CSS filter·드래그 비교 같은 T3 모션은
> 피그마가 표현할 수 없고, 억지로 옮기면 편집 불가능한 프레임 덩어리가 된다(RUN16에서 실증).

1. **파일 준비** — `create_new_file`로 RUN별 파일 1개 (`<BRAND> Design System`). `planKey`는 `whoami`로 조회.
2. **토큰 등록** — `use_figma`로 `:root`의 3종 스케일을 Variables에 1:1로 올린다.
   - `ui/*` (색) · `spectrum/*` 등 RUN 고유 팔레트 · `type/*` (타입 스케일) · `space/*` (간격)
   - `v.scopes`를 **반드시 명시** (`FONT_SIZE` / `GAP,WIDTH_HEIGHT` / `TEXT_FILL` 등). 기본 ALL_SCOPES는 피커를 오염시킨다.
3. **명세서 생성** — 스와치 보드 + 타입 스케일 보드. 각 노드를 `setBoundVariable`로 변수에 **바인딩**해야
   피그마에서 값을 고쳤을 때 화면이 따라 움직인다(= 튜닝 가능한 상태).
4. **왕복 확인** — `get_variable_defs`로 되읽어 `:root`와 일치하는지 대조.
5. **역방향 반영** — 사용자가 피그마에서 값을 고치면 `get_variable_defs`로 읽어 `:root`를 갱신한다.

**캡처(`generate_figma_design`)를 쓸 경우 — 반드시 캡처 모드로:**
- 그냥 캡처하면 `.rise{opacity:0}` 리빌 섹션이 **빈 프레임**으로, 가로 스크럽은 **1/5 패널만** 넘어간다.
- 템플릿에 `?capture=1` 모드를 넣어 ①리빌 강제 표시 ②핀/스크럽 해제 후 세로로 펼침
  ③무한 애니 정지 ④카운트업 최종값 고정 을 처리한 뒤 캡처한다 (RUN16 구현 참고).
- 그래도 결과는 **오토레이아웃·컴포넌트가 없는 생짜 프레임 덤프**다. 레이아웃 참고용으로만 쓰고,
  편집 가능한 산출물로 착각하지 말 것. 편집 대상은 어디까지나 STEP 7-2/7-3의 토큰·컴포넌트다.

**연결 정보:** 원격 서버 `https://mcp.figma.com/mcp` (쓰기는 원격 전용 · 로컬 데스크톱 서버는 읽기만).
무료 Starter라도 **Full 시트면 일 200회**. View/Collab 시트는 월 6회라 사실상 불가.

---

## 규격 (표준 SPEC v1 — RUN 01·02로 확정)

무드는 매번 바뀌지만 **아래 규격은 고정**한다. "사진만 바꾸면 다른 브랜드가 같은 규격에서 나온다"가 목표.

### A. 섹션 모듈 라이브러리 & 레이아웃 레시피 (구조도 변주)

> **왜 바뀌었나:** RUN 01~03이 무드는 달랐지만 **뼈대가 동일**(같은 9섹션·같은 순서)해서 "구조가 똑같다"는 문제가 있었다.
> 해결: 매 RUN이 **레이아웃 레시피**를 새로 골라 **구조(모듈 구성·순서·각 모듈의 변주)**도 달라지게 한다.

**A-0. 콘텐츠 아카이타입 (매 RUN 다르게 발명 — 구조·내용의 뿌리)**
> 같은 "랜딩 틀"만 반복하지 말 것. 사진 컨셉에 맞는 **페이지의 종류 자체**를 바꾼다:
- `제품 커머스`(구매 중심) · `에디토리얼/피처`(잡지 기사형) · `매니페스토/브랜드 선언` · `룩북/갤러리`(비주얼 중심) · `이벤트/런칭`(카운트다운·라인업) · `리포트/데이터`(수치·인사이트) · `카탈로그/컬렉션` · `서비스/프로그램`(과정·플랜) · `스토리/저널`(내러티브 스크롤)
- 아카이타입이 바뀌면 **필요한 섹션·카피의 종류가 달라짐** → 구조·내용이 근본적으로 달라진다.

**A-1. 모듈 목록**
- **필수:** Header · Hero · Social-proof(아래 중 1+) · 메인 컬렉션(Product/Program/Feature) · CTA/Newsletter · Footer
- **선택(2~4개 골라 섞기):** Story · Editorial-split · Quote/Review · Stat-band · Gallery/Lookbook · FAQ/Accordion · Comparison · Bento · Process-steps · Video/Full-bleed

**A-2. 모듈별 레이아웃 변주 (RUN마다 하나 선택)**
- **Hero:** `split-L` · `split-R` · `centered`(중앙 스택+하단 풀블리드) · `fullbleed`(배경이미지+오버레이) · `collage`(다중 이미지)
- **Collection:** `grid-3` · `grid-2-big` · `row-scroll(캐러셀)` · `bento`(크기 혼합) · `list-rows`
- **Social-proof:** `marquee` · `logo-strip` · `stat-band` · `avatar-cluster`
- **Story:** `split` · `centered-quote` · `image-left-timeline` · `dark-fullbleed`
- **Editorial:** `2-col` · `sticky-scroll` · `zigzag(교차)` · `numbered-steps`
- **Proof:** `single-quote` · `review-grid(3)` · `rating-summary+cards`
- **CTA:** `banner` · `centered-cta` · `split-form` · `sticky-bar`

**A-3. 레시피 규칙 (매 RUN)**
- 모듈 8~11개를 **순서 포함** 결정. 필수 모듈은 반드시 포함.
- **이전 RUN과 최소 3개**의 모듈 변주 또는 순서를 다르게 (대시보드의 이전 `구조 레시피`와 대조).
- **이미지 구도로 구조 힌트:** 중앙 포스터형 → `Hero:centered` · 편집/그리드형 → `Hero:split`+`Collection:bento` · 드라마틱 풀샷 → `Hero:fullbleed`.
- **컨텐츠 타입도 무드 따라:** 제품 브랜드 → Product grid · 서비스 → Program/Process-steps.

**A-4. 예시 레시피**
- **현재 RUN 01·02·03 (동일 — 이래서 똑같아 보였음):** Header → Hero:split-R → marquee → grid-3 → Story:split → Editorial:2-col → single-quote → CTA-banner → Footer
- **예시 X:** Header → Hero:**fullbleed** → **stat-band** → **bento** → **zigzag** editorial → **review-grid** → **process-steps** → **sticky** CTA → Footer
- **예시 Y:** Header → Hero:**centered** → **logo-strip** → **list-rows** → **dark-fullbleed** story → **FAQ** → **banner** CTA → Footer

> 불변: §C 체크리스트(사람티)·§D 함정은 어떤 레시피든 공통 적용. 바뀌는 건 **모듈 구성/순서/변주**뿐.

### A-5. 구조 프리셋 라이브러리 (저장소 · 회전 사용)

> **이 표가 "저장된 구조"다.** 매 RUN은 여기서 `상태=available`인 프리셋 하나를 꺼내 쓰고 `used`로 바꾼다.
> 계속 조사해 **새 프리셋을 아래에 append**한다(전부 소진되면 회전 재시작 or 신규 조사). 각 프리셋은 §A-1/A-2 모듈·변주로 구성.

| # | 이름 | 모듈 시퀀스 | 시그니처 이펙트 | 어울리는 무드 | 상태 |
|---|---|---|---|---|---|
| P1 | **Classic Split** | Header → Hero:split-R → marquee → grid-3 → Story:split → Editorial:2col → single-quote → CTA-banner → Footer | GSAP reveal | 범용·커머스 | **used** (RUN 01·02·03) |
| P2 | **Editorial Magazine** | 마스트헤드 → 기사 헤드/바이라인 → 커버 → 본문(드롭캡·풀쿼트·피규어) → 관련기사 → 레터 | 세리프·그레인 | 패션·매거진·아트 | **used** (RUN 06) |
| P3 | **Bento Product** | Header → Hero:centered → logo-strip → bento(대형혼합) → comparison → review-grid → sticky-CTA → Footer | 컬러블록 벤토 | 제품·문구·가전 | **used** (RUN 10) |
| P4 | **Scrollytelling** | 다크 히어로 → sticky 비주얼 + N스텝 스크롤 서사 → 스탯 밴드 → 인용 → 다크 CTA | sticky disc 전환(IO 기반, GSAP 없이) | 브랜드 스토리·캠페인 | **used** (RUN 11) |
| P5 | **Showcase / Portfolio (룩북)** | Header → Hero:collage → masonry gallery → featured split → index → contact | hover-reveal | 스튜디오·룩북·포트폴리오 | **used** (RUN 07) |
| P6 | **SaaS Landing** | Header → Hero:split-L(CSS 앱목업) → logo-cloud → feature 교차 → metrics band → pricing → FAQ 아코디언 → CTA → Footer | CSS 대시보드 목업 | 소프트웨어·앱 | **used** (RUN 12) |

| P11 | **Split Diptych (스플릿 대비형)** | 풀하이트 세로 스플릿 히어로(대비 2색) → 교차 스플릿 패널(숫자/비주얼 ∥ 텍스트) ×N → 데이터 밴드(CSS 차트+카운트업) → 풀쿼트 → 마그네틱 CTA | 커스텀 커서·카운트업·글자 리빌·마그네틱 버튼(T2) | 리포트·데이터·에이전시 | **used** (RUN 13) |
| P12 | **Kinetic Type Specimen (활자 카탈로그)** | 워드마크 히어로(글자 리빌) → 웨이트 마퀴 → **sticky pin + 가로 스크롤-스크럽 웨이트 패널 ×N** → 라이브 테스터(입력+슬라이더) → 스펙 밴드(카운트업) → 사용예 2×2 에디토리얼 → 라이선스 list-rows → 다크 CTA | 스크롤-스크럽 가로 핀(T3, 라이브러리 0) · 인터랙티브 테스터 | 활자·에디토리얼·아카이브·"제품=화면"인 업종 | **used** (RUN 15) |
| P13 | **Kinetic Spectrum (P12 리믹스 · 스펙트럼형)** | 풀블리드 사진 히어로(워드마크 리빌) → 프로파일 마퀴 → **sticky pin + 가로 스크럽 풀스크린 사진 패널 ×N(패널마다 필터가 다름) + 하단 그라디언트 진행바** → 드래그 before/after 그레이더(칩+강도 슬라이더) → **라이트 반전 트러스트 밴드**(평점·검증리뷰·사용 크레딧) → 스펙 밴드 → 팩 grid-2-big → 다크 CTA | 가로 스크럽(T3) · CSS `filter` 보간 실시간 그레이딩 · 드래그 비교 | 컬러·사진·영상·프리셋·"결과를 눈으로 비교시키는" 제품 | **used** (RUN 16) |

| P14 | **Spec Sheet / Industrial Index (밀도형 사양서)** | 모노 인덱스 바 → **스탯·트러스트 밴드(히어로보다 먼저 — 순서 파괴)** → 크롭 초대형 워드마크 히어로(좌우 overflow)+풀블리드 사진 → 비대칭 인덱스 그리드(칸마다 비율 다름·모노 캡션·치수선) → 마퀴 → **사양 컨피규레이터**(마감칩+두께 슬라이더 → 표면·두께·스펙 동시 변화) → 공정 numbered-steps → 라이트 반전 트러스트 밴드 → 다크 CTA | 3D 틸트 + 포인터 추적 스페큘러(T3) · CSS 부품 도판 | 제조·하드웨어·부품·"사양이 곧 카피"인 업종 | **used** (RUN 21) |
| P15 | **Color Band Switch (밴드 색전환형)** | 섹션마다 배경색이 통째로 바뀌며 진행(옐로 밴드 → 다크 밴드 → 페이퍼 밴드…), 각 밴드가 하나의 주장만 담당 | 스크롤 연동 배경 색전환 · 밴드 경계 마스크 | 소프트웨어·에이전시·강한 브랜드색 보유 | available |
| P16 | **Invitation / Ceremony (초대장형)** | 세리프 워드마크 → 풀블리드 인물/공간 사진 → 날짜·장소 센터 스택 → 타임라인(식순) → 안내 아코디언 → RSVP 폼 | 조용한 페이드·세리프 이탤릭 · 사진 마스크 | 웨딩·전시 오프닝·초대·공간 브랜드 | available |

> 조사 출처(2026-08-08): land-book.com 갤러리 — AKLR(밀도형 스튜디오 인덱스) · Airmee(스탯을 최상단에) · North(크롭 초대형 워드마크) · Agentcard(밴드 색전환) · Emily & Alfie(초대장형).

> **P1~P10 소진, P11부터 신규.** 다음도 새 구조를 조사해 P17+로 append(예: 비대칭 브루탈리즘, 3D/WebGL 씬, 타임라인/연혁 등).
> **P12/P13 교훈:** 모바일에선 pin/scrub을 끄고 `scroll-snap-type:x mandatory` 캐러셀로 폴백해야 함(안 그러면 빈 500vh 구간이 생김). `prefers-reduced-motion`도 같은 폴백.
> **P13이 남긴 숙제:** P12를 리믹스하면 점수는 오르지만(35→37) 모듈 **순서**가 거의 같아 오리지널리티가 4에서 막힌다. 다음 리믹스는 계승하되 순서를 깰 것(예: 스크럽을 히어로 앞에, 트러스트를 상단에).
| P7 | **Immersive Dark** | Header → Hero:fullbleed(크롬 오브 센터피스) → 텍스트 밴드 → 스펙 4열 → 컬렉션 인덱스 → 풀스크린 CTA | **CSS 리퀴드 크롬 오브**(회전+모프, 외부레포 0) | 다크·럭셔리·퍼포먼스 | **used** (RUN 09) |
| P8 | **Glass Premium** | Header(glass) → Hero:centered(그라데이션) → glass 카드 bento → glass pricing → testimonial → glass CTA → Footer | Liquid Glass 전면 | 프리미엄·핀테크·뷰티테크 | **used** (RUN 04) |
| P9 | **Event / Ticker** | 풀블리드 히어로+카운트다운 → 컬러 티커 → 스피커 라인업 → 일정표(agenda) → 티켓 3티어 → 베뉴 → 빅 CTA | 무한 티커·카운트다운 | 컨퍼런스·런칭·페스티벌 | **used** (RUN 05) |
| P10 | **Manifesto** | 풀스크린 선언 섹션 ×3 → 원칙 리스트 → 구호 마퀴 → 풀스크린 CTA (이미지 0) | 단어 분할 스크롤 리빌 | 스튜디오·브랜드 선언 | **used** (RUN 08) |

> 조사 출처: Land-book·Landingfolio·Godly·Awwwards(구조) + §이펙트 라이브러리(GitHub). 새 구조 발견 시 P9, P10… 으로 계속 추가.

### B. MUDS 토큰 규격 (사진에서 전부 설정 · 이름 불변)
- `--grey-50..900` : 사진 배경의 **온도/hue**로 이동 (웜↔쿨). `paper`는 순백 금지 → 크림/틴트
- `--brand-50/500/600/700` : 사진 **포인트색**. hover는 더 진한 단색
- (선택) 보조 포인트 1색 (`--sun` 등) — 절제 사용
- **타이포** : 헤드라인 서체 성격 결정 (세리프=우아/정적 ↔ 헤비 산세리프=볼드/생기) + 스케일
- **라운드** : 무드에 맞는 radius 스케일 (미니멀=중간 ↔ 플레이풀=큰 둥금)
- 시맨틱 채도 ≤ 브랜드

### C. "사람이 만든 티" 체크리스트 (= 합격 기준)
**필수**
- [ ] 실사 이미지(로드 검증됨) · CSS 목업 금지 · 각 `img`에 `onerror` gradient 폴백
- [ ] 헤드라인 강조어 **1개만** (색 또는 마커)
- [ ] 포인트색 1~2개로 절제, 나머지는 중성
- [ ] 넉넉한 여백 · 큰 타입 스케일 · 낮은 대비 본문
- [ ] 비대칭 히어로 + 플로팅 디테일(칩/배지)
- [ ] 트러스트 신호(평점·구독자·Verified 리뷰)
- [ ] 스크롤 리빌 + hover + 마퀴 미세 모션
- [ ] 질감(그레인) 최소 1곳
- [ ] **콘텐츠가 사진에서 상상한 고유 브랜드·서사** — 아카이타입/섹션 주제/카피가 이전 RUN과 안 겹침(§A-0, §3-2)

**지양** : 형광/고채도 남발 · 순백 배경 · 균일 그리드만 · 스톡틱한 카피 · 강조어 남발

### D. 템플릿 제작 함정 (필수 준수)
- **Grid + 큰 이미지** → 그리드 자식에 `min-width:0` (안 하면 이미지 min-content가 원본폭이라 텍스트 열 찌그러짐)
- **스크롤 리빌 클래스는 `.vis` 등 고유명** — `.in` 금지 (레이아웃 `.hero .in{display:grid}`와 이름 충돌해 텍스트 div가 grid로 변함)
- **이미지 사전 검증** — imgtest용 HTML로 브라우저 로드 확인 후 사용. **상표 노출컷(예: Coca-Cola) 제외**
- **로컬 렌더** — `python3 -m http.server`로 서빙(브라우저가 `file://` 차단). 렌더 이상 시 `javascript_tool`로 계산폭 직접 조회해 원인 특정
- **스크롤 리빌 + 스크롤 복원 충돌** — 재방문 시 브라우저가 하단으로 스크롤 복원 → 히어로가 뷰포트 밖이라 IntersectionObserver 미발동 → 히어로가 `opacity:0`로 빈 것처럼 보임. 스크립트 상단에 `history.scrollRestoration='manual'; scrollTo(0,0);` + 로드 시 뷰포트 내 `.rise` 즉시 표시 폴백 넣을 것

---

## 이펙트 & 인터랙션 라이브러리 (GitHub 소스)

무드(색)·구조(레시피)에 더해, **RUN마다 시그니처 인터랙션 1~2개**를 GitHub 오픈소스에서 골라 얹는다. 이게 "그럴싸함"을 한 단계 더 올린다.

### 카탈로그
| 효과 | 레포 | 형태 | 어울리는 무드 |
|---|---|---|---|
| **Liquid Glass** (유리 굴절) | `dashersw/liquid-glass-js`(WebGL·바닐라) · `rdev/liquid-glass-react` · `Mael-667/Liquid-Glass-CSS`(경량) | 카드/네비/모달 유리 | 프리미엄·미니멀·테크 |
| **Liquid Metal / 크롬** | `paper-design/liquid-logo`+`@paper-design/shaders`(정석) · `seangeng/argent`(CSS+SVG 경량) · `collidingScopes/liquid-logo` · `Saganaki22/MetalFlow` | 로고·히어로 오브젝트 | 다크·퍼포먼스·럭셔리 |
| **GSAP 스크롤** (무료) | `greensock/GSAP` + ScrollTrigger/ScrollSmoother · 예제 `zhengdechang/awesome-gsap` · `DesAnshuJoshi/Creative-GSAP-Scroll` | 스크롤 리빌·핀·패럴랙스·텍스트 | 전 무드 공통 |

> 계속 확장: 추가 후보 — Three.js 파티클/셰이더 배경, `lenis`(부드러운 스크롤), `splitting.js`(글자 단위 애니), `barba.js`(페이지 전환), `vanta.js`(WebGL 배경), Codrops 데모. 새 레포 발견 시 이 표에 append.

### 적용 규칙
- **RUN당 시그니처 1~2개만.** 과다 사용 금지(성능·산만).
- **무드 매칭:** RUN 03(다크 크롬) → Liquid Metal 히어로/로고. 프리미엄 유리 UI RUN → Liquid Glass 카드. 전 RUN 공통으로 GSAP ScrollTrigger 리빌.
- **로드:** 로컬 http.server라 CDN/모듈 로드 가능. 무거운 WebGL은 히어로 1곳에 한정, 모바일·`prefers-reduced-motion` 폴백 필수.
- **라이선스:** 얹기 전 레포 LICENSE 확인(대개 MIT). 출처를 결과물 주석/푸터 또는 대시보드 RUN 카드에 표기.
- **폴백:** JS 실패 시에도 §C대로 페이지가 정적으로 완성돼 보여야 함(이펙트는 enhancement).

---

## 디자인 진화 루프 (Evolve — 매 RUN 더 나아지기)

다양성만으론 좋아지지 않는다. 매 RUN이 **평가·학습·챔피언 초과**를 거쳐 진화한다.

**매 RUN 순서 (STEP 5 뒤에 추가):**
1. **읽기** — `EVOLUTION.md`의 챔피언·학습·정교화 티어를 먼저 읽는다. 검증된 학습은 반영, 약점 패턴은 회피.
2. **생성** — 홀수 RUN=새 방향 탐색 / 짝수 RUN=챔피언 remix·개선. 현재 티어의 기법을 도입.
3. **채점(적대적)** — `design-rubric.md` 8기준으로 냉정하게 채점. **독립 디자인-크리틱 서브에이전트를 띄워** 강점 2·약점 2·다음 개선 1을 받는다(자화자찬 방지). 렌더 가능하면 스크린샷을 근거로.
4. **기록** — `EVOLUTION.md` 점수 로그에 `RUN·합계·강점→개선점` append. **챔피언 초과 시 챔피언 교체.** 새 학습은 "검증된 학습"에 추가.
5. **정체 감지** — 3연속 챔피언 미달 → 정교화 티어 +1(T2→T3…) 또는 방향 전환.

> 효과: 점수가 우상향하고, 통한 패턴이 복리로 쌓이며, 세대마다 기법이 고도화된다.

---

## 3. 제약 & 실패 처리 (자동화 주의)

- **Instagram 로그인/자동화 차단:** 스케줄(헤드리스) 실행에서는 `claude-in-chrome` 확장과 로그인 세션이 없을 수 있음 → 그 경우 STEP 2를 건너뛰고 **미리 저장해 둔 이미지 풀**(예: `inspiration/`)에서 1장 선택하도록 폴백.
- **비결정성:** 피드는 매번 바뀜 → "무드가 뚜렷한 1장" 기준으로 자율 선택. 같은 무드 반복을 피하려면 `runs.log`의 최근 키워드와 겹치지 않게.
- **base 오염 금지:** 복제 원본은 항상 `BASE_PROJECT_ID`(깨끗한 base). 무드 주입된 프로젝트를 다시 base로 쓰지 말 것.
- **되돌리기:** claude.ai/design 버전 히스토리로 복구 가능. 파괴적 삭제 금지.

---

## 4. 스케줄링

이 문서 전체를 스케줄 에이전트의 지시로 사용. 예:

```
/schedule 매일 오전 9시에 design-automation-workflow.md의 STEP 1~6을 실행해라.
Instagram #디자인에서 무드 1개를 뽑아 §규격 B로 토큰을 설정하고,
§규격 A 스켈레톤으로 templates/run-NN-*.html 랜딩을 만들되 §규격 C 체크리스트를 통과시켜라.
§규격 D 함정을 지키고, 렌더 검증 후 index.html 대시보드에 RUN 카드를 append 해라.
Instagram 접근 불가 시 inspiration/ 폴더 이미지로 폴백.
```

> 주의: 브라우저(Instagram/Duplicate) 단계는 **로그인된 로컬 크롬**이 필요하므로,
> 완전 무인 클라우드 스케줄에서는 STEP 1을 API 방식(B), STEP 2를 이미지 풀 폴백으로 돌리는 구성을 권장.

---

## 5. 참고 — 이 워크플로우로 만든 이전 실행

로컬 산출 구조:
```
index.html                    ← 실행 기록 대시보드(메인, RUN 카드 누적)
templates/run-01-bare.html    ← RUN 01 결과 랜딩
templates/run-02-ripe.html    ← RUN 02 결과 랜딩
design-automation-workflow.md ← 이 문서(규격)
```

- **RUN 01 · BARE** (`2026-08-02`) — 영감: "느좋 브랜드"(Innisfree 컷) · 무드: 차분·크림·**딥 볼케닉 그린 #2f7d4c**·세리프 · 브랜드=자연주의 스킨케어
- **RUN 02 · RIPE** (`2026-08-02`) — 영감: "여름 제철 과일" · 무드: 생기·피치크림·**코랄레드 #e5462f**+선옐로·헤비 산세리프 · 브랜드=제철 콜드프레스 주스
- 두 RUN은 **§규격 A 스켈레톤 동일**, 무드(토큰·타이포·라운드·이미지)만 다름 = 파이프라인 반복 증명됨.
- (MUDS 프로젝트 트랙) Project_1(`98b73b5c…`)에 RUN 01 무드 주입: `tokens/colors.css` + `guidelines/mood-instagram.html`
